// src/services/aiService.ts
// ✅ C-01: Chave removida do cliente — todas as chamadas vão para /api/ai
// ✅ C-04: Anonimização adicional no cliente antes de enviar ao proxy
// ✅ Modelo: Gemma 4 27B (free) para chat + visão
// ✅ Q-02: stripThinking() remove bloco <think>…</think> antes de exibir
// ✅ CACHE: getCacheKey usa msgCount:lastContent (não SYSTEM_PROMPT)

import type { ClinicalCase } from '@/types/index';
import type { ClinicalCopilotPayload } from '@/types/clinicalCopilot';
import {
  buildClinicalCopilotSystemMessage,
  REFINE_ANALYSIS_PROMPT,
} from '@/services/veterinaryPrompts';
import { getSupabaseAccessToken } from '@/services/supabase';
import { RespostaOrtopedicaSchema, validarRespostaMedica, ORTOBOLT_STRUCTURED_PROMPT, buscarContextoRAG, type RespostaOrtopedica } from './ortoboltEngine';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface CacheEntry {
  response: string;
  expiresAt: number;
}

type MessageContent =
  | string
  | Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: { url: string };
    }>;

interface ProxyMessage {
  role: 'user' | 'assistant' | 'system';
  content: MessageContent;
}

interface AIResponse {
  choices?: Array<{
    message?: { content?: string; role?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string };
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCacheKey(model: string, messages: ProxyMessage[]): string {
  const msgCount = messages.length;
  const lastMsg = messages[messages.length - 1];
  const lastContent =
    typeof lastMsg?.content === 'string'
      ? lastMsg.content
      : Array.isArray(lastMsg?.content)
      ? lastMsg.content
          .map((c) =>
            c.type === 'text'
              ? c.text ?? ''
              : `img:${c.image_url?.url?.length ?? 0}`
          )
          .join('|')
      : '';
  return `${model}:${msgCount}:${lastContent.slice(0, 300)}`;
}

function getCachedResponse(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.response;
}

function setCachedResponse(key: string, response: string): void {
  if (responseCache.size >= 50) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
  responseCache.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS });
}

function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now > entry.expiresAt) responseCache.delete(key);
  }
}

setInterval(cleanupExpiredCache, 2 * 60 * 1000);

// ── ✅ NOVO: Compressão de imagem para otimizar upload ────────────────────────
export async function compressImageBase64(
  base64: string,
  maxWidthPx = 1024,
  quality = 0.80
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      // Remove prefix 'data:image/jpeg;base64,' se presente
      resolve(dataUrl.split(',')[1] ?? base64);
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    // Garante que o src tenha o prefixo data: se não tiver
    img.src = base64.startsWith('data:')
      ? base64
      : `data:image/jpeg;base64,${base64}`;
  });
}

const AI_PROXY = '/api/ai';
const PRIMARY_MODEL = 'gemini-2.5-flash-lite';  // Gemini API direta

const AUTH_ERROR_MESSAGE =
  '⚠️ Sessão expirada ou não autenticada. Faça login novamente para usar a IA.';

async function buildAiProxyHeaders(): Promise<Record<string, string>> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function mapAiProxyError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.message === 'AUTH_REQUIRED') return AUTH_ERROR_MESSAGE;
    if (err.message.includes('AI proxy 401')) return AUTH_ERROR_MESSAGE;
  }
  return fallback;
}

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>|<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
}

function buildImageDataUrl(compressedBase64: string): string {
  return `data:image/jpeg;base64,${compressedBase64}`;
}

function buildMultimodalUserContent(
  text: string,
  imageDataUrl: string
): Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> {
  return [
    { type: 'text', text },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ];
}

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é o OrthoAI, assistente clínico veterinário da plataforma OrtoBolt.
Especialidade primária: ortopedia (TPLO, FHO, TTA, fixação de fraturas, cirurgia espinhal, artroscopia).
Também analisa casos clínicos gerais: oftalmologia, dermatologia, neurologia, oncologia e outros.
Espécies: caninos, felinos, equinos, bovinos.
=== PROTOCOLOS ORTOPÉDICOS ===
TPA normal canino: 18–25°; TPLO indicado: TPA > 23–27°
avanço_mm = raio × [sin(TPA_atual) - sin(TPA_alvo)] | TPA alvo: 5–6°
Raio por peso: <15kg→18mm; 15–30kg→24mm; 30–50kg→30mm; >50kg→36mm
TTA: espaçador = sin(TPA–90°) × LP (LP = 3× altura plateau) | Tamanhos: 3–21mm
FHO: corte 110–115° | Felinos: 2–3mm; Caninos: 3–5mm; clearance ≥2mm
FRS = 0.6 × peso | DCP 4.5mm: ≤300Nm; DCP 3.5mm: ≤120Nm; LCP 5.0mm: ≤450Nm
Equinos >400kg: LCP 5.0mm obrigatório; mín. 8 parafusos
Norberg ≥105° (normal) | Femorotibial: 135–145°
=== DOSAGENS ===
Meloxicam: cão 0.1mg/kg SID; gato 0.05mg/kg SID; equino 0.6mg/kg SID
Tramadol: cão 2–5mg/kg TID; gato 1–2mg/kg BID
Dexmedetomidina: cão 5–20mcg/kg IM; gato 10–40mcg/kg IM
Cetamina: cão/gato 5–10mg/kg IV; equino 2.2mg/kg IV
Morfina: cão 0.3–0.5mg/kg IM; gato 0.1–0.2mg/kg IM
=== REGRAS ===
Responda em português brasileiro técnico e preciso.
Seja conciso: respeite o teto de palavras indicado em cada solicitação.
Nunca faça diagnóstico definitivo sem exame físico e imaginologia confirmada.
Cite intervalo de normalidade ao reportar valores.
Para casos críticos, indique urgência na primeira linha.
Cálculos são ORIENTATIVOS — confirmar com instrumentação física antes de qualquer procedimento.`;

// ── proxyRequest (modo JSON — analyzeImage, getCaseAISuggestion) ──────────────
export async function proxyRequest(body: {
  model: string;
  messages: ProxyMessage[];
  max_tokens?: number;
}): Promise<string> {
  const cacheKey = getCacheKey(body.model, body.messages);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    if (import.meta.env.DEV) console.log('📦 Cache hit:', cacheKey.slice(0, 40));
    return cached;
  }

  const res = await fetch(AI_PROXY, {
    method: 'POST',
    headers: await buildAiProxyHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI proxy ${res.status}: ${errorText}`);
  }

  const d: AIResponse = await res.json();
  const raw = d.choices?.[0]?.message?.content ?? 'Resposta não disponível.';
  const result = stripThinking(raw);

  if (result !== 'Resposta não disponível.' && !result.includes('⚠️')) {
    setCachedResponse(cacheKey, result);
  }

  return result;
}

// ── Anonimizador de paciente (LGPD — camada cliente) ─────────────────────────
function anonymizePatientName(
  name: string | undefined,
  id: string | undefined
): string {
  if (!name) return 'Paciente';
  return id ? `Paciente-${id.slice(-4).toUpperCase()}` : 'Paciente-XXXX';
}

// ── sendChatMessage (legado — mantido para compatibilidade) ───────────────────
export async function sendChatMessage(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  try {
    return await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1000,
    });
  } catch (err) {
    console.error('AI chat error:', err);
    return mapAiProxyError(
      err,
      '⚠️ OrthoAI temporariamente indisponível.\n\nVerifique sua conexão e tente novamente.'
    );
  }
}

// ── sendChatMessageStream — streaming SSE token a token ──────────────────────
export async function sendChatMessageStream(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  onChunk: (accumulatedText: string) => void
): Promise<string> {
  const messages: ProxyMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    const res = await fetch(AI_PROXY, {
      method: 'POST',
      headers: await buildAiProxyHeaders(),
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        messages,
        max_tokens: 1000,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI proxy ${res.status}: ${errText}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content ?? '';
            if (token) {
              accumulated += token;
              onChunk(stripThinking(accumulated));
            }
          } catch {
            /* chunk SSE inválido — ignorar */
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return stripThinking(accumulated) || 'Resposta não disponível.';
  } catch (err) {
    console.error('AI chat stream error:', err);
    const msg = mapAiProxyError(
      err,
      '⚠️ OrthoAI temporariamente indisponível.\n\nVerifique sua conexão e tente novamente.'
    );
    onChunk(msg);
    return msg;
  }
}

// ── analyzeImage — ✅ COM COMPRESSÃO DE IMAGEM ───────────────────────────────
export async function analyzeImage(
  imageBase64: string,
  caseInfo?: Partial<ClinicalCase>
): Promise<string> {
  try {
    // ✅ Comprimir imagem antes de enviar (reduz payload em ~70%)
    const compressed = await compressImageBase64(imageBase64);
    
    const patientRef = caseInfo
      ? anonymizePatientName(caseInfo.patientName, caseInfo.id)
      : 'Paciente';

    const ctx = caseInfo
      ? `Paciente: ${patientRef}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears}a, ${caseInfo.weightKg}kg. Procedimento: ${caseInfo.procedure}. Status: ${caseInfo.status ?? 'pending'}.`
      : '';

    const promptText = caseInfo
      ? caseInfo.status === 'completed'
        ? `\n\n${ctx}\n\nAnalise a evolução radiográfica pós-operatória. Máx. 120 palavras: achados pós-cirúrgicos, comparação com baseline e prognóstico.`
        : `\n\n${ctx}\n\nAnalise esta imagem médica veterinária. Primeiro, identifique o tipo de exame (radiografia, ultrassom, foto clínica, etc.) e a região anatômica visível. Depois, descreva os achados relevantes e sugira condutas. Máx. 150 palavras.`
      : `\n\nAnalise esta imagem veterinária. Determine o tipo de imagem (radiografia, ultrassom, foto clínica, etc.) e a região anatômica visível. Descreva objetivamente os achados, sugira diagnósticos diferenciais e condutas. Máx. 150 palavras. Seja direto e objetivo.`;

    return await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        {
          role: 'user',
          content: buildMultimodalUserContent(
            promptText,
            buildImageDataUrl(compressed)
          ),
        },
      ],
      max_tokens: 1000,
    });
  } catch (err) {
    console.error('Vision error:', err);
    return mapAiProxyError(
      err,
      '⚠️ Erro na análise de imagem. Verifique o formato (JPG/PNG/WEBP, máx. 15MB) e tente novamente.'
    );
  }
}



// ── analyzeImagesComparison (Comparação Pré/Pós-Operatória) ─────────────────
export async function analyzeImagesComparison(
  beforeBase64: string,
  afterBase64: string,
  caseInfo?: Partial<ClinicalCase>
): Promise<{
  alignment: string;
  boneDensity: string;
  recommendation: string;
  fullAnalysis: string;
}> {
  try {
    const compressedBefore = await compressImageBase64(beforeBase64);
    const compressedAfter = await compressImageBase64(afterBase64);

    const patientRef = caseInfo
      ? anonymizePatientName(caseInfo.patientName, caseInfo.id)
      : 'Paciente';

    const ctx = caseInfo
      ? `Paciente: ${patientRef}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears}a, ${caseInfo.weightKg}kg. Procedimento: ${caseInfo.procedure}.`
      : '';

    const promptText = `Você é um especialista em ortopedia veterinária analisando uma comparação pré e pós-operatória.

${ctx}

IMAGEM 1: Exame Pré-Operatório (baseline)
IMAGEM 2: Exame Pós-Operatório (resultado cirúrgico)

Analise COMPARATIVAMENTE as duas imagens e forneça:

1. ALINHAMENTO E GEOMETRIA: Avalie eixo mecânico, ângulos articulares, posicionamento de implantes, congruência articular. Seja específico sobre melhorias ou desvios.

2. DENSIDADE ÓSSEA E ZONA DE INTERFACE: Avalie qualidade óssea, integração de implantes, sinais de consolidação, presença de halos radiolúcidos, distribuição de carga.

3. RECOMENDAÇÃO CLÍNICA: Sugira conduta pós-operatória, restrições de atividade, necessidade de acompanhamento, prognóstico funcional.

Responda APENAS em formato JSON válido:
{
  "alignment": "texto conciso sobre alinhamento (máx 80 palavras)",
  "boneDensity": "texto conciso sobre densidade óssea (máx 80 palavras)",
  "recommendation": "recomendação clínica direta (máx 60 palavras)",
  "fullAnalysis": "análise completa comparativa (máx 200 palavras)"
}

Seja objetivo, técnico e baseado em evidências radiográficas visíveis.`;

    const response = await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: buildImageDataUrl(compressedBefore) } },
            { type: 'image_url', image_url: { url: buildImageDataUrl(compressedAfter) } },
          ],
        },
      ],
      max_tokens: 1500,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          alignment: parsed.alignment || 'Análise de alinhamento indisponível.',
          boneDensity: parsed.boneDensity || 'Análise de densidade óssea indisponível.',
          recommendation: parsed.recommendation || 'Recomendação indisponível.',
          fullAnalysis: parsed.fullAnalysis || response,
        };
      }
    } catch (parseErr) {
      console.warn('Failed to parse AI comparison response as JSON, using fallback');
    }

    return {
      alignment: 'Análise de alinhamento concluída.',
      boneDensity: 'Avaliação de densidade óssea disponível.',
      recommendation: 'Recomendação clínica gerada.',
      fullAnalysis: response,
    };
  } catch (err) {
    console.error('Comparison analysis error:', err);
    throw new Error(
      mapAiProxyError(
        err,
        'Erro na análise comparativa. Verifique as imagens e tente novamente.'
      )
    );
  }
}

// ── getCaseAISuggestion ───────────────────────────────────────────────────────
export async function getCaseAISuggestion(
  caseInfo: Partial<ClinicalCase>
): Promise<string> {
  try {
    const patientRef = anonymizePatientName(
      caseInfo.patientName,
      caseInfo.id
    );
    const ctx =
      `CASO: ${caseInfo.title}. Paciente: ${patientRef}, ${caseInfo.species},` +
      `${caseInfo.breed}, ${caseInfo.ageYears} anos, ${caseInfo.weightKg}kg.` +
      `Procedimento: ${caseInfo.procedure}. Status: ${caseInfo.status}. Risco: ${caseInfo.riskLevel}.`;

    return await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: (
            caseInfo.status === 'completed'
              ? `${ctx}\n\nAvalie a evolução pós-operatória. Máx. 120 palavras: evolução clínica, achados atuais, prognóstico e condutas recomendadas.`
              : caseInfo.status === 'critical'
              ? `${ctx}\n\nUrgência clínica. Máx. 80 palavras: conduta imediata, estabilização e encaminhamento se necessário.`
              : caseInfo.status === 'in_analysis'
              ? `${ctx}\n\nAnalise o caso. Máx. 150 palavras: achados, diagnóstico diferencial, implante com dimensões e protocolo anestésico com doses pelo peso.`
              : `${ctx}\n\nPlanejamento pré-cirúrgico. Máx. 150 palavras: implante com dimensões, cálculo cirúrgico se aplicável e protocolo anestésico com doses pelo peso.`
          ),
        },
      ],
      max_tokens: 800,
    });
  } catch (err) {
    console.error('AI suggestion error:', err);
    return '⚠️ Erro ao gerar sugestão de IA. Tente novamente em alguns instantes.';
  }
}

// ── Copiloto Clínico — radiografia + contexto + histórico ─────────────────────

export async function sendClinicalCopilotStream(
  payload: ClinicalCopilotPayload,
  onChunk: (accumulatedText: string) => void
): Promise<string> {
  const compressed = await compressImageBase64(payload.imageBase64);
  const imageDataUrl = buildImageDataUrl(compressed);

  const systemContent = buildClinicalCopilotSystemMessage({
    visionAnalysis: payload.visionAnalysis,
    refinedAnalysis: payload.refinedAnalysis,
    clinicalContext: payload.clinicalContext,
  });

  const userText = `[Radiografia anexada]\n\nPergunta do veterinário:\n${payload.userMessage}`;

  const messages: ProxyMessage[] = [
    { role: 'system', content: systemContent },
    ...payload.history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user',
      content: buildMultimodalUserContent(userText, imageDataUrl),
    },
  ];

  try {
    const res = await fetch(AI_PROXY, {
      method: 'POST',
      headers: await buildAiProxyHeaders(),
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        messages,
        max_tokens: 1200,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI proxy ${res.status}: ${errText}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content ?? '';
            if (token) {
              accumulated += token;
              onChunk(stripThinking(accumulated));
            }
          } catch {
            /* chunk inválido */
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return stripThinking(accumulated) || 'Resposta não disponível.';
  } catch (err) {
    console.error('Clinical copilot stream error:', err);
    const msg = mapAiProxyError(err, 'Erro ao conectar com o copiloto.');
    onChunk(msg);
    throw new Error(msg);
  }
}

/** Consolida chat + contexto em análise visual refinada (multimodal) */
export async function refineClinicalAnalysis(
  payload: ClinicalCopilotPayload
): Promise<string> {
  const compressed = await compressImageBase64(payload.imageBase64);
  const imageDataUrl = buildImageDataUrl(compressed);

  const chatBlock = payload.history.length
    ? payload.history
        .map((m) => `${m.role === 'user' ? 'Veterinário' : 'Copiloto'}: ${m.content}`)
        .join('\n\n')
    : '(Sem mensagens no copiloto ainda.)';

  const contextBlock = buildClinicalCopilotSystemMessage({
    visionAnalysis: payload.visionAnalysis,
    refinedAnalysis: payload.refinedAnalysis,
    clinicalContext: payload.clinicalContext,
  });

  const prompt = `${REFINE_ANALYSIS_PROMPT}${chatBlock}\n\n---\n${contextBlock}`;

  try {
    return await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        {
          role: 'user',
          content: buildMultimodalUserContent(prompt, imageDataUrl),
        },
      ],
      max_tokens: 1200,
    });
  } catch (err) {
    console.error('Refine analysis error:', err);
    throw err;
  }
}

// ── ✅ NOVO: Análise Ortopédica Estruturada (JSON + Validação em Camadas) ──
export async function getStructuredOrthopedicAnalysis(caseDescription: string): Promise<RespostaOrtopedica> {
  try {
    const contextoRAG = await buscarContextoRAG(caseDescription);
    const promptFinal = contextoRAG 
      ? `${ORTOBOLT_STRUCTURED_PROMPT}\n\nCONTEXTO DE LITERATURA/CASOS SIMILARES (Use estritamente se aplicável):\n${contextoRAG}`
      : ORTOBOLT_STRUCTURED_PROMPT;

    const response = await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: promptFinal },
        { role: 'user', content: caseDescription }
      ],
      max_tokens: 800,
    });

    // Limpeza de markdown caso a IA insira `json ... `
    const cleanJson = response.replace(/^\\\json\s*|\s*\\\$/g, '').trim();
    
    // Parse e Validação em Camadas (Zod + Regras Clínicas)
    const parsed = JSON.parse(cleanJson);
    return validarRespostaMedica(parsed);
  } catch (err) {
    console.error('Erro na análise estruturada:', err);
    throw new Error('Falha ao gerar análise estruturada. Verifique os dados do caso.');
  }
}

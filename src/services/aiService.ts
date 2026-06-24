// src/services/aiService.ts
// Chave removida do cliente — todas as chamadas vão para /api/ai
// Anonimização no cliente + servidor; consentimento via aiConsent
// Modelo: Gemini 2.5 Flash Lite (primary) → Flash (fallback)

import type { ClinicalCase } from '@/types/index';
import type { ClinicalCopilotPayload } from '@/types/clinicalCopilot';
import {
  buildClinicalCopilotSystemMessage,
  REFINE_ANALYSIS_PROMPT,
} from '@/services/veterinaryPrompts';
import { getSupabaseAccessToken } from '@/services/supabase';
import {
  assertAiConsentGranted,
  AI_CONSENT_DENIED_MESSAGE,
  AiConsentDeniedError,
} from '@/services/aiConsent';
import {
  anonymizeCaseContext,
  sanitizeProxyMessages,
  anonymizeClinicalText,
} from '@/lib/anonymizeClinical';
import {
  validarRespostaMedica,
  ORTOBOLT_STRUCTURED_PROMPT,
  buscarContextoRAG,
  type RespostaOrtopedica,
} from './ortoboltEngine';

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

function hashContent(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function contentFingerprint(content: unknown): string {
  if (typeof content === 'string') return content.slice(0, 300);
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        c.type === 'text'
          ? c.text ?? ''
          : `img:${c.image_url?.url?.slice(-64) ?? 'none'}`
      )
      .join('|')
      .slice(0, 300);
  }
  return '';
}

function getCacheKey(model: string, messages: ProxyMessage[]): string {
  const systemSig = messages
    .filter((m) => m.role === 'system')
    .map((m) => contentFingerprint(m.content))
    .join('|');
  const msgCount = messages.length;
  const lastMsg = messages[messages.length - 1];
  const lastContent = contentFingerprint(lastMsg?.content);
  return `${model}:${hashContent(systemSig)}:${msgCount}:${lastContent}`;
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
export const PRIMARY_MODEL = 'gemini-2.5-flash-lite';  // Gemini API direta

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

// ── proxyRequest (modo JSON — analyzeImage, structured analysis) ──────────────
export async function proxyRequest(body: {
  model: string;
  messages: ProxyMessage[];
  max_tokens?: number;
  json_mode?: boolean;
}): Promise<string> {
  assertAiConsentGranted();

  const sanitizedMessages = sanitizeProxyMessages(body.messages);
  const cacheKey = getCacheKey(body.model, sanitizedMessages);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    if (import.meta.env.DEV) console.log('📦 Cache hit:', cacheKey.slice(0, 40));
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  let res: Response;
  try {
    res = await fetch(AI_PROXY, {
      method: 'POST',
      headers: await buildAiProxyHeaders(),
      body: JSON.stringify({
        model: body.model,
        messages: sanitizedMessages,
        max_tokens: body.max_tokens,
        ...(body.json_mode && { json_mode: true }),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI_PROXY_TIMEOUT: A requisição excedeu 60 segundos.');
    }
    throw err;
  }
  clearTimeout(timeoutId);

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

export { AI_CONSENT_DENIED_MESSAGE, AiConsentDeniedError };

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
    if (err instanceof AiConsentDeniedError) return err.message;
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
  assertAiConsentGranted();

  const messages: ProxyMessage[] = sanitizeProxyMessages([
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]);

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
    const msg =
      err instanceof AiConsentDeniedError
        ? err.message
        : mapAiProxyError(
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

    const ctx = caseInfo ? anonymizeCaseContext(caseInfo) : '';

    const patientContext = caseInfo
      ? `PACIENTE: ${caseInfo.species} | ${caseInfo.breed} | ${caseInfo.ageYears} anos | ${caseInfo.weightKg} kg
IMPLICAÇÃO BIOMECÂNICA: Ajuste sua análise baseado no peso e porte deste paciente.`
      : '';

    const promptText = caseInfo
      ? caseInfo.status === 'completed'
        ? `\n\n${patientContext}\n\n${ctx}\n\nAnalise a evolução radiográfica pós-operatória. Máx. 120 palavras: achados pós-cirúrgicos, comparação com baseline e prognóstico.`
        : `\n\n${patientContext}\n\n${ctx}\n\nAnalise esta imagem médica veterinária. Primeiro, identifique o tipo de exame (radiografia, ultrassom, foto clínica, etc.) e a região anatômica visível. Depois, descreva os achados relevantes e sugira condutas. Máx. 150 palavras.`
      : `\n\nAnalise esta imagem veterinária. Determine o tipo de imagem (radiografia, ultrassom, foto clínica, etc.) e a região anatômica visível. Descreva objetivamente os achados, sugira diagnósticos diferenciais e condutas. Máx. 150 palavras. Seja direto e objetivo.`;

    return await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
    if (err instanceof AiConsentDeniedError) return err.message;
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
  metrics?: {
    norbergAngle?: number;
    acetabularAngle?: number;
    tpaAngle?: number;
    boneDensityPercent?: number;
    anatomicalPoints?: Array<{ x: number; y: number; label: string }>;
  };
}> {
  try {
    const compressedBefore = await compressImageBase64(beforeBase64);
    const compressedAfter = await compressImageBase64(afterBase64);

    const ctx = caseInfo ? anonymizeCaseContext(caseInfo) : '';

    const promptText = `Você é um especialista em ortopedia veterinária analisando uma comparação pré e pós-operatória.

${ctx}

IMAGEM 1: Exame Pré-Operatório (baseline)
IMAGEM 2: Exame Pós-Operatório (resultado cirúrgico)

⚠️ VALIDAÇÃO DE SEGURANÇA OBRIGATÓRIA:
1. VERIFIQUE A SEQUÊNCIA TEMPORAL: IMAGEM 1 deve mostrar ANTES da cirurgia. IMAGEM 2 deve mostrar DEPOIS.
2. CONSISTÊNCIA DE IMPLANTES: Se menciona procedimento, IMAGEM 2 DEVE conter implante.
3. Se detectar INVERSÃO ou inconsistência, retorne validationPassed=false.

Se validações passarem, analise:

4. ALINHAMENTO E GEOMETRIA: Avalie eixo mecânico, ângulos articulares, posicionamento de implantes.
5. DENSIDADE ÓSSEA: Avalie qualidade óssea, integração de implantes, sinais de consolidação.
6. RECOMENDAÇÃO CLÍNICA: Sugira conduta pós-operatória e prognóstico.

7. MÉTRICAS QUANTITATIVAS (estimativas visuais):
   - norbergAngle: ângulo de Norberg em graus (normal: 105°±7°)
   - acetabularAngle: ângulo acetabular em graus (normal: 30°-35°)
   - tpaAngle: ângulo do plateau tibial em graus (normal: 18°-25°)
   - boneDensityPercent: estimativa visual 0-100 (100=ótima)
   - anatomicalPoints: pontos relevantes [{x: 0-100, y: 0-100, label: string}]

Responda APENAS em JSON válido:

{
  "validationPassed": true ou false,
  "validationError": "descrição do erro ou null",
  "alignment": "texto conciso (máx 80 palavras)",
  "boneDensity": "texto conciso (máx 80 palavras)",
  "recommendation": "recomendação direta (máx 60 palavras)",
  "fullAnalysis": "análise completa (máx 200 palavras)",
  "clinicalReasoning": "raciocínio passo a passo",
  "metrics": {
    "norbergAngle": número ou null,
    "acetabularAngle": número ou null,
    "tpaAngle": número ou null,
    "boneDensityPercent": número ou null,
    "anatomicalPoints": []
  }
}

⚠️ ADICIONE no fullAnalysis: "Métricas são estimativas visuais - validar manualmente."
Seja objetivo e técnico. NUNCA alucine dados não visíveis.`;

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
      max_tokens: 1000,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validação de segurança: se IA detectou inconsistência, abortar
        if (parsed.validationPassed === false) {
          const errorMsg = parsed.validationError || 'Inconsistência detectada nas imagens pré/pós-operatórias.';
          console.warn('[SAFETY] AI validation failed:', errorMsg);
          throw new Error(`⚠️ VALIDAÇÃO DE SEGURANÇA: ${errorMsg}`);
        }
        
        // Validação defensiva dos campos obrigatórios
        if (!parsed.alignment && !parsed.fullAnalysis) {
          console.warn('AI comparison response missing required fields');
        }
        return {
          alignment: parsed.alignment || 'Análise de alinhamento indisponível.',
          boneDensity: parsed.boneDensity || 'Análise de densidade óssea indisponível.',
          recommendation: parsed.recommendation || 'Recomendação indisponível.',
          fullAnalysis: parsed.fullAnalysis || response,
          metrics: parsed.metrics || undefined,
        };
      }
    } catch (parseErr) {
      // Se for erro de segurança, propagar
      if (parseErr instanceof Error && parseErr.message.includes('VALIDAÇÃO DE SEGURANÇA')) {
        throw parseErr;
      }
      console.warn('Failed to parse AI comparison response as JSON, using fallback');
    }

    return {
      alignment: 'Análise de alinhamento concluída.',
      boneDensity: 'Avaliação de densidade óssea disponível.',
      recommendation: 'Recomendação clínica gerada.',
      fullAnalysis: response,
      metrics: undefined,
    };
  } catch (err) {
    console.error('Comparison analysis error:', err);
    if (err instanceof AiConsentDeniedError) throw err;
    throw new Error(
      mapAiProxyError(
        err,
        'Erro na análise comparativa. Verifique as imagens e tente novamente.'
      )
    );
  }
}

// ── Copiloto Clínico — radiografia + contexto + histórico ─────────────────────

export async function sendClinicalCopilotStream(
  payload: ClinicalCopilotPayload,
  onChunk: (accumulatedText: string) => void
): Promise<string> {
  assertAiConsentGranted();

  const compressed = await compressImageBase64(payload.imageBase64);
  const imageDataUrl = buildImageDataUrl(compressed);

  const systemContent = buildClinicalCopilotSystemMessage({
    visionAnalysis: payload.visionAnalysis,
    refinedAnalysis: payload.refinedAnalysis,
    clinicalContext: payload.clinicalContext,
  });

  const userText = `[Radiografia anexada]\n\nPergunta do veterinário:\n${payload.userMessage}`;

  const messages: ProxyMessage[] = sanitizeProxyMessages([
    { role: 'system', content: systemContent },
    ...payload.history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user',
      content: buildMultimodalUserContent(userText, imageDataUrl),
    },
  ]);

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
    const msg =
      err instanceof AiConsentDeniedError
        ? err.message
        : mapAiProxyError(err, 'Erro ao conectar com o copiloto.');
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
      max_tokens: 1000,
    });
  } catch (err) {
    console.error('Refine analysis error:', err);
    throw err;
  }
}

// ── Análise Ortopédica Estruturada (JSON + Validação em Camadas) ──
export async function getStructuredOrthopedicAnalysis(
  caseDescription: string
): Promise<RespostaOrtopedica> {
  try {
    const descAnon = anonymizeClinicalText(caseDescription);
    const contextoRAG = await buscarContextoRAG(descAnon);
    const promptFinal =
      contextoRAG && contextoRAG.trim().length > 0
        ? `${ORTOBOLT_STRUCTURED_PROMPT}\n\nCONTEXTO DE LITERATURA/CASOS SIMILARES (Use estritamente se aplicável):\n${contextoRAG}`
        : ORTOBOLT_STRUCTURED_PROMPT;

    const response = await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: promptFinal },
        { role: 'user', content: descAnon },
      ],
      max_tokens: 1000,
      json_mode: true,
    });

    const cleanJson = response.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return validarRespostaMedica(parsed);
  } catch (err) {
    console.error('Erro na análise estruturada:', err);
    if (err instanceof AiConsentDeniedError) throw err;
    throw new Error('Falha ao gerar análise estruturada. Verifique os dados do caso.');
  }
}

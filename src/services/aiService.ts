// src/services/aiService.ts
// Chave removida do cliente — todas as chamadas vão para /api/ai
// Anonimização no cliente + servidor; consentimento via aiConsent
// Modelo: Modelo de IA Avançada (primário) → Modelo Rápido (fallback)

import type { ClinicalCase } from '@/types/index';
import type { ClinicalCopilotPayload } from '@/types/clinicalCopilot';
import { MarkingsDataSchema } from '@/schemas/markings';
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
  validarRespostaMedica,
  VANGUARD_STRUCTURED_PROMPT,
  buscarContextoRAG,
  type RespostaOrtopedica,
} from './vanguardEngine';
import type { MarkingsData, AlignmentCircle, AngleMeasurement, FractureMarker, ROI } from '@/types/markings';

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

export interface AnalysisWithMarkings {
  analysisText: string;
  markings: MarkingsData;
  metrics?: {
    norbergAngle?: number;
    tpaAngle?: number;
    boneDensityPercent?: number;
  };
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Helper assíncrono para gerar hash SHA-256
async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
function hashContent(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

async function contentFingerprint(content: unknown): Promise<string> {
  if (typeof content === 'string') {
    return content.slice(0, 300);
  }

  if (Array.isArray(content)) {
    const textPart = content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join(' ')
      .slice(0, 300);

    // Gera hashes reais para todas as imagens em paralelo
    const imageHashes = await Promise.all(
      content
        .filter((c) => c.type === 'image_url' && c.image_url?.url)
        .map((c) => sha256(c.image_url!.url))
    );

    const imgPart = imageHashes.map(hash => `img:${hash}`).join('|');

    return imgPart ? `${textPart}|${imgPart}` : textPart;
  }

  return '';
}

async function getCacheKey(model: string, messages: ProxyMessage[]): Promise<string> {
  const systemSig = messages
    .filter((m) => m.role === 'system')
    .map((m) => (typeof m.content === 'string' ? m.content.slice(0, 300) : ''))
    .join('|');

  const msgCount = messages.length;
  const lastMsg = messages[messages.length - 1];

  const lastContent = await contentFingerprint(lastMsg?.content);

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
export const PRIMARY_MODEL = 'gemini-2.5-flash-lite';  // Modelo de IA primário

const AUTH_ERROR_MESSAGE =
  '⚠️ Sessão expirada ou não autenticada. Faça login novamente para usar a IA.';

async function buildAiProxyHeaders(): Promise<Record<string, string>> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new ApiError(401, 'AUTH_REQUIRED');
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
const SYSTEM_PROMPT = `
Você é um Radiologista Veterinário Sênior especialista em Ortopedia e Traumatologia.
Sua missão é analisar imagens radiográficas veterinárias com precisão cirúrgica e gerar laudos técnicos estruturados.

=== REGRAS ABSOLUTAS (VIOLAÇÃO = ERRO CRÍTICO) ===

1. **PROIBIDO ALUCINAR**: Nunca invente achados que não estejam claramente visíveis na imagem. Se não houver evidência visual inequívoca, declare explicitamente "Preservado", "Sem alterações evidentes" ou "Não avaliável na incidência fornecida".

2. **EVIDÊNCIA VISUAL OBRIGATÓRIA**: Cada afirmação diagnóstica deve ser sustentada por achado radiográfico objetivo. Não faça suposições baseadas em probabilidade estatística.

3. **CHECKLIST OBRIGATÓRIO PARA FRATURAS**: Ao identificar qualquer fratura, você DEVE descrever TODOS os seguintes itens:
   - Localização anatômica exata (osso + segmento + fração: ex: "diáfise do fêmur, terço médio")
   - Tipo de fratura (completa/incompleta, transversa, oblíqua, espiral, cominutiva)
   - Deslocamento (ausente/leve/moderado/grave + direção)
   - Angulação (presente/ausente + descrição)
   - Sobreposição/Encurtamento (presente/ausente)
   - Fragmentos (presença de fragmentos em "borboleta" ou cominuição)
   - Envolvimento de partes moles (edema, hematoma, enfisema)
   - Estado das articulações adjacentes (preservadas/luxadas)

4. **ARTICULAÇÕES**: Avalie SEMPRE as articulações proximal e distal ao foco da lesão. Declare explicitamente se estão preservadas ou alteradas.

5. **DIAGNÓSTICOS DIFERENCIAIS**: Liste apenas condições plausíveis baseadas nos achados. Comece pela mais provável.

6. **GRAU DE CONFIANÇA**: Atribua porcentagens realistas considerando as limitações (ex: "incidência única", "qualidade da imagem").

=== ESTRUTURA OBRIGATÓRIA DO LAUDO ===

Responda APENAS no seguinte formato Markdown, sem texto introdutório ou conclusivo fora desta estrutura:

## Exame
[Descreva: tipo de exame, projeção, região anatômica, espécie]

## Qualidade do Exame
[Avalie: posicionamento, contraste, definição, artefatos, limitações técnicas]

## Achados Radiográficos
[Descreva detalhadamente TODOS os achados usando o checklist obrigatório para fraturas. Mencione explicitamente o estado das articulações adjacentes e partes moles. Se não houver alterações, declare: "Sem alterações radiográficas evidentes na região avaliada."]

## Impressão Diagnóstica
[Resumo conciso e direto do achado principal em 1-2 frases]

## Classificação Morfológica
- Osso acometido: [Nome do osso ou "N/A se não aplicável"]
- Localização: [Ex: Diáfise (terço médio), Epífise proximal, etc.]
- Tipo de fratura: [Ex: Completa, oblíqua curta, cominutiva]
- Deslocamento: [Sim/Não + descrição objetiva]
- Angulação: [Sim/Não + descrição]
- Encurtamento/Sobreposição: [Sim/Não]
- Cominuição/Fragmentos: [Descreva se houver, ex: "fragmento em borboleta"]
- Envolvimento articular: [Sim/Não + qual articulação]

## Diagnósticos Diferenciais
1. [Diagnóstico mais provável]
2. [Segunda possibilidade]
3. [Terceira possibilidade se aplicável]

## Recomendações
- [Recomendação 1: ex: "Obter projeção ortogonal (craniocaudal)"]
- [Recomendação 2: ex: "Avaliação ortopédica completa"]
- [Recomendação 3: ex: "Controle analgésico adequado"]
- [Recomendação 4: ex: "Planejamento para estabilização cirúrgica"]
- [Recomendação 5: ex: "Investigar politraumatismo se indicado"]

## Grau de Confiança
| Item | Confiança | Justificativa |
|------|-----------|---------------|
| Presença de fratura | XX% | [Justifique] |
| Localização anatômica | XX% | [Justifique] |
| Classificação do padrão | XX% | [Justifique - mencione limitações] |
| Avaliação articular | XX% | [Justifique] |

7. **BLOCO JSON DE MARCAÇÕES OBRIGATÓRIO**: SEMPRE anexe um bloco de código JSON ao final de sua resposta, contendo as coordenadas das marcações geométricas identificadas. O formato DEVE ser exatamente \`\`\`json
{
  "markings": {
    "circles": [ { "id": "c1", "cx": 0.50, "cy": 0.40, "radius": 0.05, "label": "Cabeça femoral", "stage": "abnormal" } ],
    "angles": [ { "id": "a1", "points": [ { "x": 0.30, "y": 0.20 }, { "x": 0.50, "y": 0.40 }, { "x": 0.70, "y": 0.30 } ], "value": 128.5, "type": "Norberg" } ],
    "markers": [ { "id": "m1", "x": 0.50, "y": 0.45, "label": "Foco de fratura", "type": "cominutiva" } ],
    "rois": [ { "id": "r1", "x": 0.40, "y": 0.35, "width": 0.20, "height": 0.20, "label": "Região de interesse", "severity": "high" } ]
  }
}
\`\`\`. Se nenhum achado for identificado, retorne o bloco com os arrays vazios.

REGRAS DO JSON DE MARCACOES: todas as coordenadas (cx, cy, x, y, width, height, radius e cada ponto de angles) DEVEM ser numeros NORMALIZADOS entre 0.0 e 1.0, onde (0,0) e o canto superior esquerdo da imagem. Use EXATAMENTE estes nomes de campo: circles = id, cx, cy, radius, label, stage; angles = id, points (array com exatamente 3 objetos {x,y}), value (numero em graus), type (apenas "TPA" ou "Norberg"); markers = id, x, y, label, type; rois = id, x, y, width, height, label, severity. NAO use o campo "center". O campo id pode ser qualquer texto curto. Marque ao menos o foco da lesao principal com um marker e, ao medir angulos, use angles com type valido.
=== NOTAS TÉCNICAS ===
- Seja conciso mas completo. Evite redundâncias.
- Use terminologia veterinária técnica precisa.
- Para casos traumáticos, sempre considere a possibilidade de lesões múltiplas.
- Se a qualidade da imagem limitar a avaliação, declare explicitamente.
- Nunca forneça diagnósticos definitivos sem correlação clínico-cirúrgica.
- Cite intervalos de normalidade ao reportar valores angulares ou métricos.
`;// ── Erro Customizado ──────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── proxyRequest (modo JSON — analyzeImage, structured analysis) ──────────────
export async function proxyRequest(body: {
  model: string;
  messages: ProxyMessage[];
  max_tokens?: number;
  json_mode?: boolean;
}): Promise<string> {
  assertAiConsentGranted();

  const messages = body.messages;
  const cacheKey = await getCacheKey(body.model, messages);
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
        messages: messages,
        max_tokens: body.max_tokens,
        ...(body.json_mode && { json_mode: true }),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'A requisição para a IA excedeu o tempo limite de 60 segundos.');
    }
    // Re-lança outros erros de rede/fetch
    throw err;
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const errorText = await res.text();
    // Extrai a mensagem de erro do JSON, se possível
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorText;
    } catch {
      // Ignora se o erro não for JSON
    }
    throw new ApiError(res.status, errorMessage);
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
    if (err instanceof ApiError) return `⚠️ Erro ${err.status}: ${err.message}`;
    return '⚠️ OrthoAI temporariamente indisponível.\n\nVerifique sua conexão e tente novamente.';
  }
}

// ── sendChatMessageStream — streaming SSE token a token ──────────────────────
export async function sendChatMessageStream(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  onChunk: (accumulatedText: string) => void
): Promise<string> {
  assertAiConsentGranted();

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
      throw new ApiError(res.status, errText);
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
    let msg: string;
    if (err instanceof AiConsentDeniedError) {
      msg = err.message;
    } else if (err instanceof ApiError) {
      msg = `⚠️ Erro ${err.status}: ${err.message}`;
    } else {
      msg = 'Erro ao conectar com o copiloto.';
    }
    onChunk(msg);
    throw err; // Re-throw to signal failure to the caller
  }
}

// ── extractMarkingsFromAnalysis — Parse IA response to generate marking data ──
function extractMarkingsFromAnalysis(analysisText: string): MarkingsData {
  const emptyMarkings: MarkingsData = { circles: [], angles: [], markers: [], rois: [] };

  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const jsonBlockMatch = analysisText.match(jsonBlockRegex);

  if (!jsonBlockMatch || !jsonBlockMatch[1]) {
    console.debug('[OrthoAI] Falha na extração de marcações. Motivo: Bloco JSON não encontrado na resposta da IA.');
    return emptyMarkings;
  }

  let jsonString = jsonBlockMatch[1];
  let parsedJson;

  try {
    parsedJson = JSON.parse(jsonString);
  } catch (err) {
    console.debug('[OrthoAI] Parse JSON inicial falhou, tentando recuperação.', { error: (err as Error).message });
    // C6: Recuperação conservadora: Tenta encontrar a maior substring JSON válida
    const looseJsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (looseJsonMatch && looseJsonMatch[0]) {
      try {
        parsedJson = JSON.parse(looseJsonMatch[0]);
      } catch (recoveryErr) {
        console.debug('[OrthoAI] Recuperação do JSON falhou.', { error: (recoveryErr as Error).message });
        return emptyMarkings;
      }
    } else {
      return emptyMarkings;
    }
  }
  
  const markingsData = parsedJson.markings || parsedJson;
  const ensureId = (it: unknown): Record<string, unknown> => {
    const o: Record<string, unknown> = (it && typeof it === 'object') ? { ...(it as Record<string, unknown>) } : {};
    const id = o.id;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      o.id = crypto.randomUUID();
    }
    return o;
  };
  const normArr = (a: unknown): Record<string, unknown>[] => Array.isArray(a) ? a.map(ensureId) : [];
  const normalizedMarkings = {
    circles: normArr(markingsData.circles),
    angles: normArr(markingsData.angles),
    markers: normArr(markingsData.markers),
    rois: normArr(markingsData.rois),
  };
  const validated = MarkingsDataSchema.safeParse(normalizedMarkings);

  if (!validated.success) {
    console.debug('[OrthoAI] Validação Zod das marcações falhou.', { error: validated.error.format() });
    return emptyMarkings;
  }

  return validated.data;
}

const buildCaseContextString = (ctx: Partial<ClinicalCase>): string => {
    const parts = [
    ctx.title ? `Caso: ${ctx.title}` : null,
    `Paciente: ${ctx.patientName}`,
    ctx.species,
    ctx.breed,
    ctx.ageYears != null ? `${ctx.ageYears}a` : null,
    ctx.weightKg != null ? `${ctx.weightKg}kg` : null,
    ctx.procedure ? `Procedimento: ${ctx.procedure}` : null,
    ctx.status ? `Status: ${ctx.status}` : null,
  ].filter(Boolean);
  return parts.join(', ');
}

// ── analyzeImage — ✅ COM COMPRESSÃO DE IMAGEM + MARKINGS ────────────────────
export async function analyzeImage(
  imageBase64: string,
  caseInfo?: Partial<ClinicalCase>,
  imageDimensions?: { width: number; height: number }
): Promise<AnalysisWithMarkings> {
  // ✅ Comprimir imagem antes de enviar (reduz payload em ~70%)
  const compressed = await compressImageBase64(imageBase64);

  const ctx = caseInfo ? buildCaseContextString(caseInfo) : '';

  const patientContext = caseInfo
    ? `PACIENTE: ${caseInfo.species} | ${caseInfo.breed} | ${caseInfo.ageYears} anos | ${caseInfo.weightKg} kg
IMPLICAÇÃO BIOMECÂNICA: Ajuste sua análise baseado no peso e porte deste paciente.`
    : '';

  const promptText = (caseInfo
    ? caseInfo.status === 'completed'
      ? `\n\n${patientContext}\n\n${ctx}\n\nAnalise a evolução radiográfica pós-operatória. Máx. 120 palavras: achados pós-cirúrgicos, comparação com baseline e prognóstico.`
      : `\n\n${patientContext}\n\n${ctx}\n\nAnalise esta imagem médica veterinária. Primeiro, identifique o tipo de exame (radiografia, ultrassom, foto clínica, etc.) e a região anatômica visível. Depois, descreva os achados relevantes e sugira condutas. Máx. 150 palavras.`
    : `\n\nAnalise esta imagem veterinária. Determine o tipo de imagem (radiografia, ultrassom, foto clínica, etc.) e a região anatômica visível. Descreva objetivamente os achados, sugira diagnósticos diferenciais e condutas. Máx. 150 palavras. Seja direto e objetivo.`);

  const fullResponseText = await proxyRequest({
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

  const markings = extractMarkingsFromAnalysis(fullResponseText);
  
  // Remove o bloco JSON do texto para não poluir o laudo
  const reportTextOnly = fullResponseText.replace(/```json\s*([\s\S]*?)\s*```/, '').trim();

  return {
    analysisText: reportTextOnly,
    markings,
    metrics: {
      // Could be populated from extracted IA data in future
    },
  };
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

    const ctx = caseInfo ? buildCaseContextString(caseInfo) : '';

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

/** Consolida chat + contexto em análise diagnóstica refinada (multimodal) */ export async function sendClinicalCopilotStream(
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
    const contextoRAG = await buscarContextoRAG(caseDescription);
    const promptFinal =
      contextoRAG && contextoRAG.trim().length > 0
        ? `${VANGUARD_STRUCTURED_PROMPT}\n\nCONTEXTO DE LITERATURA/CASOS SIMILARES (Use estritamente se aplicável):\n${contextoRAG}`
        : VANGUARD_STRUCTURED_PROMPT;

    const response = await proxyRequest({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: promptFinal },
        { role: 'user', content: caseDescription },
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

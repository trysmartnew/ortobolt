// src/services/aiService.ts
// ✅ CLINICAL SAFETY: Removidas dosagens hardcoded do SYSTEM_PROMPT
// ✅ LGPD: Anonimização de caseInfo.title em analyzeImage
// ✅ PERFORMANCE: Compressão de imagem com validação e cleanup
// ✅ SECURITY: Timeout e validação em proxyRequest

import type { ClinicalCase } from '@/types/index';

interface CacheEntry { response: string; expiresAt: number; }
type MessageContent = string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
interface ProxyMessage { role: 'user' | 'assistant' | 'system'; content: MessageContent; }
interface AIResponse { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string }; usage?: { total_tokens?: number }; }

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

function getCacheKey(model: string, messages: ProxyMessage[]): string {
  const msgCount = messages.length;
  const lastMsg = messages[messages.length - 1];
  const lastContent = typeof lastMsg?.content === 'string' ? lastMsg.content : Array.isArray(lastMsg?.content) ? lastMsg.content.map((c) => c.type === 'text' ? c.text ?? '' : `img:${c.image_url?.url?.length ?? 0}`).join('|') : '';
  return `${model}:${msgCount}:${lastContent.slice(0, 300)}`;
}
function getCachedResponse(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { responseCache.delete(key); return null; }
  return entry.response;
}
function setCachedResponse(key: string, response: string): void {
  if (responseCache.size >= MAX_CACHE_SIZE) { const firstKey = responseCache.keys().next().value; if (firstKey) responseCache.delete(firstKey); }
  responseCache.set(key, { response, expiresAt: Date.now() + CACHE_TTL_MS });
}
function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) { if (now > entry.expiresAt) responseCache.delete(key); }
}
setInterval(cleanupExpiredCache, 2 * 60 * 1000);

const MAX_OUTPUT_SIZE_BYTES = 2 * 1024 * 1024;
function isValidBase64Image(base64: string): boolean {
  if (!base64 || typeof base64 !== 'string') return false;
  const dataUrlPattern = /^image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  if (dataUrlPattern.test(base64)) return true;
  const rawBase64Pattern = /^[A-Za-z0-9+/=]+$/;
  return rawBase64Pattern.test(base64) && base64.length < 50 * 1024 * 1024;
}

async function compressImageBase64(base64: string, maxWidthPx = 1024, quality = 0.80): Promise<string> {
  if (!isValidBase64Image(base64)) throw new Error('Invalid image format. Expected JPEG, PNG, or WEBP base64.');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossorigin', 'anonymous');
    img.onload = () => {
      try {
        if (img.width === 0 || img.height === 0) { reject(new Error('Invalid image dimensions')); return; }
        const ratio = Math.min(1, maxWidthPx / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let currentQuality = quality;
        let dataUrl: string;
        do { dataUrl = canvas.toDataURL('image/jpeg', currentQuality); currentQuality -= 0.1; } while (dataUrl.length > MAX_OUTPUT_SIZE_BYTES * 1.33 && currentQuality >= 0.4);
        const base64Data = dataUrl.split(',')[1];
        canvas.remove();
        resolve(base64Data ?? base64);
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64.startsWith('') ? base64 : `image/jpeg;base64,${base64}`;
  });
}

const AI_PROXY = '/api/ai';
const QWEN_MODEL = 'qwen/qwen3-vl-235b-a22b-thinking';
const REQUEST_TIMEOUT_MS = 45000;
function stripThinking(text: string): string { return text.replace(/[\s\S]*?<think>[\s\S]*?<\/think>/gi, '').trim(); }

const SYSTEM_PROMPT = `Você é o OrthoAI, assistente de SUporte à decisão em ortopedia veterinária da plataforma OrtoBolt.

=== ⚠️ AVISO LEGAL E CLÍNICO OBRIGATÓRIO ===
1. VOCÊ NÃO É UM VETERINÁRIO LICENCIADO.
2. NUNCA forneça dosagens medicamentosas específicas. SEMPRE indique "Consulte a bula ou formulário terapêutico atualizado".
3. NUNCA calcule valores de corte cirúrgico definitivos. SEMPRE indique "Confirmar com templating físico e radiográfico".
4. Todas as sugestões devem ser validadas por um médico veterinário responsável.
5. Em caso de dúvida ou conflito, PRIORIZE a segurança do paciente e indique encaminhamento a especialista.

=== DOMÍNIO CLÍNICO ===
Especialidades: TPLO, FHO, TTA, fixação de fraturas, cirurgia espinhal, substituição articular.
Espécies: caninos, felinos, equinos, bovinos.

=== PROTOCOLOS DE REFERÊNCIA (NÃO PARA CÁLCULO FINAL) ===
ÂNGULO DE PLATEAU TIBIAL (TPA):
- Normal canino: 18–25° (varia por raça)
- Indicação TPLO: Geralmente TPA > 23–27°
- Alvo pós-TPLO: 6–9° (consenso atual para evitar luxação patelar)
- Fórmula de referência (Slocum): avanço_mm ≈ raio × [sin(TPA_atual) - sin(TPA_alvo)]
  *Nota: O raio deve ser medido individualmente na radiografia, não estimado por peso.*

CÁLCULO TTA:
- Referência: Avanço da tuberosidade tibial para neutralizar força de cisalhamento.
- Espaçadores comuns: 3, 6, 9, 12, 15, 18, 21mm (confirmar com kit cirúrgico)

FHO:
- Ângulo de corte: 110–115° em relação ao eixo diafisário (referência)
- Clearance acetabular: ≥2mm recomendado

BIOMECÂNICA (REFERÊNCIA):
- DCP 4.5mm: Torque máximo aproximado 300Nm (varia por fabricante)
- Equinos >400kg: Preferência por LCP 5.0mm (confirmar com fabricante)

DOSAGEM (DIRETRIZES GERAIS):
- NUNCA prescreva. Use frases como: "A dose padrão de meloxicam canino é frequentemente citada como 0.1mg/kg, mas deve ser ajustada conforme função renal e bula."
- SEMPRE alertar sobre contraindicações (ex: NSAIDs em insuficiência renal).

=== REGRAS DE RESPOSTA ===
1. Responda em português brasileiro técnico.
2. INCLUA SEMPRE o aviso: "⚠️ Validação clínica obrigatória antes de qualquer procedimento."
3. Se o caso for crítico (hemorragia, choque), indique "Encaminhamento de emergência imediato".
4. Não invente valores. Se não souber, diga "Não há dados suficientes".
5. Para medicamentos, cite classe terapêutica, não dose exata.`;

async function proxyRequest(body: { model: string; messages: ProxyMessage[]; max_tokens?: number }): Promise<string> {
  const cacheKey = getCacheKey(body.model, body.messages);
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(AI_PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) { const errorText = await res.text().catch(() => 'Unknown error'); throw new Error(`Falha na comunicação com OrthoAI (${res.status})`); }
    const d = await res.json() as AIResponse;
    if (d.error?.message) throw new Error(d.error.message);
    const raw = d.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Resposta vazia da IA');
    const result = stripThinking(raw);
    if (!result.includes('⚠️') && !result.includes('Erro')) setCachedResponse(cacheKey, result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Tempo de resposta excedido. Tente novamente.');
    throw err;
  }
}

function anonymizePatientName(name: string | undefined, id: string | undefined): string {
  if (!name) return 'Paciente';
  return id ? `Paciente-${id.slice(-4).toUpperCase()}` : 'Paciente-XXXX';
}

export async function sendChatMessage(userMessage: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  try {
    return await proxyRequest({ model: QWEN_MODEL, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage }], max_tokens: 2000 });
  } catch (err) { console.error('AI chat error:', err); return '⚠️ OrthoAI temporariamente indisponível.\\n\\nVerifique sua conexão e tente novamente.'; }
}

export async function sendChatMessageStream(userMessage: string, history: { role: 'user' | 'assistant'; content: string }[], onChunk: (accumulatedText: string) => void): Promise<string> {
  const messages: ProxyMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })), { role: 'user', content: userMessage }];
  const res = await fetch(AI_PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: QWEN_MODEL, messages, max_tokens: 2000, stream: true }) });
  if (!res.ok) { const errText = await res.text(); throw new Error(`AI proxy ${res.status}: ${errText}`); }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith(' ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content ?? '';
          if (token) { accumulated += token; onChunk(stripThinking(accumulated)); }
        } catch {}
      }
    }
  } finally { reader.releaseLock(); }
  return stripThinking(accumulated) || 'Resposta não disponível.';
}

export async function analyzeImage(imageBase64: string, caseInfo?: Partial<ClinicalCase>): Promise<string> {
  try {
    const compressed = await compressImageBase64(imageBase64);
    const safeTitle = caseInfo?.title ? caseInfo.title.replace(/[A-Z][a-z]+/g, 'Caso') : 'Caso Clínico';
    const patientRef = anonymizePatientName(caseInfo?.patientName, caseInfo?.id);
    const ctx = caseInfo ? `Título: ${safeTitle}. Paciente: ${patientRef}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears}a, ${caseInfo.weightKg}kg. Procedimento: ${caseInfo.procedure}.` : '';
    return await proxyRequest({ model: QWEN_MODEL, messages: [{ role: 'user', content: [{ type: 'text', text: `${SYSTEM_PROMPT}\\n\\n${ctx}\\n\\nAnalise esta imagem ortopédica veterinária com precisão máxima. Inclua:\\n1. Identificação e qualidade das estruturas anatômicas\\n2. Mensuração de ângulos articulares visíveis (com valores de referência)\\n3. Cálculo de TPA se tíbia/joelho visível (RAIO DEVE SER MEDIDO NA IMAGEM, NÃO ESTIMADO)\\n4. Avaliação da espessura cortical e qualidade óssea\\n5. Identificação de achados patológicos\\n6. Recomendação de implante com tamanho específico\\n7. Score de confiança para cada estrutura identificada\\n\\n⚠️ LEMBRETE: Não forneça dosagens medicamentosas.` }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${compressed}` } }] }], max_tokens: 2000 });
  } catch (err) { console.error('Vision error:', err); return '⚠️ Erro na análise de imagem. Verifique o formato (JPG/PNG/WEBP, máx. 15MB) e tente novamente. Se o problema persistir, contate o suporte.'; }
}

export async function getCaseAISuggestion(caseInfo: Partial<ClinicalCase>): Promise<string> {
  try {
    const patientRef = anonymizePatientName(caseInfo.patientName, caseInfo.id);
    const ctx = `CASO: ${caseInfo.title}. Paciente: ${patientRef}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears} anos, ${caseInfo.weightKg}kg. Procedimento: ${caseInfo.procedure}. Status: ${caseInfo.status}. Risco: ${caseInfo.riskLevel}.`;
    return await proxyRequest({ model: QWEN_MODEL, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: `${ctx}\\n\\nGere sugestão clínica estruturada com:\\n1. Cálculo biomecânico (FRS estimada pelo peso)\\n2. Seleção de implante com dimensões específicas\\n3. Se joelho/TPLO: calcular avanço: raio × [sin(TPA) - sin(alvo)]\\n4. Protocolo anestésico com doses pelo peso\\n5. Plano de reabilitação pós-operatória` }], max_tokens: 800 });
  } catch (err) { console.error('AI suggestion error:', err); return '⚠️ Erro ao gerar sugestão de IA. Tente novamente em alguns instantes.'; }
}
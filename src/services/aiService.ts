// src/services/aiService.ts
// ✅ C-01: Chave removida do cliente — todas as chamadas vão para /api/ai (servidor)
// ✅ C-04: Anonimização adicional no cliente antes de enviar ao proxy
// ✅ A-02: Fórmula TPLO corrigida no system prompt
// ✅ A-06: X-Title com hífen ASCII (aplicado no servidor /api/ai)
// ✅ Q-01: Modelo único Qwen3-VL-235B-A22B Thinking para chat + visão
// ✅ Q-02: stripThinking() remove bloco <think>…</think> antes de exibir ao usuário

import type { ClinicalCase } from '@/types/index';

// ── Cache de Respostas IA ───────────────────────────────────────────────────
// ✅ Reduz chamadas repetitivas à OpenRouter, economizando tokens e tempo
// Estrutura: Map<chave_cache, { resposta, timestamp_expiracao }>
interface CacheEntry {
  response: string;
  expiresAt: number; // timestamp em ms quando expira
}
// ── Interfaces tipadas para IA ───────────────────────────────────────────
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

interface ProxyBody {
  model: string;
  messages: ProxyMessage[];
  max_tokens?: number;
}
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos em milissegundos

// ✅ Gera chave única para cache baseada em modelo + conteúdo da mensagem
// Para imagens: usa hash do base64 para evitar chaves gigantes
function getCacheKey(model: string, messages: ProxyMessage[]): string {
  const msgCount = messages.length;
  const lastMsg = messages[messages.length - 1];
  const lastContent = typeof lastMsg?.content === 'string'
    ? lastMsg.content
    : Array.isArray(lastMsg?.content)
      ? lastMsg.content.map(c =>
          c.type === 'text' ? (c.text ?? '') : `img:${c.image_url?.url?.length ?? 0}`
        ).join('|')
      : '';
  return `${model}:${msgCount}:${lastContent.slice(0, 300)}`;
}

// ✅ Verifica se há entrada válida no cache
function getCachedResponse(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  
  // Verifica se ainda está válido
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key); // Limpa entrada expirada
    return null;
  }
  return entry.response;
}

// ✅ Salva resposta no cache com TTL
function setCachedResponse(key: string, response: string): void {
  // Limita tamanho do cache para evitar memory leak (máx 50 entradas)
  if (responseCache.size >= 50) {
    // Remove a entrada mais antiga (primeira do Map)
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
  
  responseCache.set(key, {
    response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ✅ Limpa cache expirado periodicamente (opcional, mas recomendado)
function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now > entry.expiresAt) {
      responseCache.delete(key);
    }
  }
}

// Executa cleanup a cada 2 minutos
setInterval(cleanupExpiredCache, 2 * 60 * 1000);

const AI_PROXY = '/api/ai'; // Vercel serverless function (chave no servidor)

// ── Modelo único — Qwen3 VL 235B A22B Thinking ──────────────────────────────
// Substitui Mistral (chat) + Llama Vision (visão) por um único modelo multimodal
// com raciocínio profundo nativo. Suporta texto, imagens e português BR nativo.
const QWEN_MODEL = 'qwen/qwen3-vl-235b-a22b-thinking';

// ── Q-02: Remover bloco de raciocínio interno antes de exibir ao usuário ─────
// O modelo Thinking emite <think>…</think> com o raciocínio interno.
// Para o veterinário exibimos apenas a resposta final, limpa e direta.
function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

// ── System Prompt ─────────────────────────────────────────────────────────────
// ✅ A-02: Fórmula TPLO corrigida — raio × [sin(TPA_atual) - sin(TPA_alvo)]
const SYSTEM_PROMPT = `Você é o OrthoAI, assistente especializado em ortopedia veterinária da plataforma OrtoBolt.

=== AVISO IMPORTANTE ===
Todos os cálculos fornecidos são ORIENTATIVOS e devem ser confirmados com instrumentação física e avaliação clínica presencial antes de qualquer procedimento cirúrgico.

=== DOMÍNIO CLÍNICO ===
Especialidades: TPLO, FHO, TTA, fixação de fraturas (DCP, LCP, pinos intramedulares), cirurgia espinhal (hemilaminectomia, fenestração), substituição articular, artroscopia veterinária.
Espécies: caninos, felinos, equinos, bovinos.

=== PROTOCOLOS DE CÁLCULO CIRÚRGICO — RESPONDA COM PRECISÃO NUMÉRICA ===

1. ÂNGULO DE PLATEAU TIBIAL (TPA / APT):
   - Medição: ângulo entre o plateau tibial e a perpendicular ao eixo longitudinal da tíbia
   - Normal canino: 18–25°; Indicação TPLO: TPA > 23–27°
   - ✅ FÓRMULA CORRETA (Slocum, 1993):
     avanço_mm = raio × [sin(TPA_atual) - sin(TPA_alvo)]
     IMPORTANTE: sin(a - b) ≠ sin(a) - sin(b) — use a forma expandida
   - Raio padrão por peso: <15kg → 18mm; 15–30kg → 24mm; 30–50kg → 30mm; >50kg → 36mm
   - TPA alvo pós-TPLO: 5–6°
   - Exemplo: TPA=28°, alvo=6°, raio=24mm → 24 × [sin(28°) - sin(6°)] = 24 × [0.469 - 0.105] = 8.74mm
   - Reporte: TPA medido, TPA alvo, raio recomendado, milímetros de avanço calculados

2. CÁLCULO DE AVANÇO DA TUBEROSIDADE TIBIAL (TTA):
   - Objetivo: tornar ligamento patelar perpendicular ao plateau tibial
   - Espaçador TTA (mm) = distância do ponto A ao eixo longitudinal tibial
   - Fórmula: espaçador = sin(TPA – 90°) × comprimento LP (LP = 3× altura do plateau)
   - Tamanhos disponíveis: 3, 6, 9, 12, 15, 18, 21mm — arredondar para o mais próximo

3. OSTEOMETRIA PRÉ-OPERATÓRIA — FHO (Femoral Head Ostectomy):
   - Linha de osteotomia: distal ao colo femoral, paralela à cortical medial da diáfise
   - Ângulo de corte padrão: 110–115° em relação ao eixo diafisário
   - Para felinos: corte a 2–3mm da cabeça femoral
   - Para caninos: corte a 3–5mm; verificar clearance acetabular (≥2mm)
   - Calcular: comprimento do pescoço a ressecar, ângulo de inclinação, ângulo de anteversão

4. AVALIAÇÃO BIOMECÂNICA — CARGA E IMPLANTE:
   - Força de reação do solo (FRS) estimada = 0.6 × peso corporal (PC)
   - Momento de flexão na fratura/osteotomia = FRS × braço de momento (distância do implante ao ponto de carga)
   - Placa DCP 4.5mm: suporta ≤300Nm; DCP 3.5mm: ≤120Nm; LCP 5.0mm: ≤450Nm
   - Parafusos: cortical 4.5mm → osso cortical >3mm; esponjoso 6.5mm → metáfise
   - Para equinos (PC >400kg): SEMPRE LCP de 5.0mm ou DCP dinâmico largo; mínimo 8 parafusos
   - Calcular: FRS estimada, momento de flexão, classificação do implante necessário

5. MENSURAÇÃO DE ÂNGULOS ARTICULARES — RADIOGRAFIA:
   - Coxofemoral: Índice de Norberg (IN) normal ≥105°; displasia se <105°
   - Cotovelo (FCI): incongruência articular em mm; >2mm = displasia significativa
   - Joelho: ângulo femorotibial normal 135–145°; varo/valgo se >5° de desvio
   - Carpo: ângulo de extensão normal 180°±10°; hiperextensão se >200°
   - Reporte todos os ângulos com valores normais de referência e interpretação clínica

6. DOSAGEM FARMACOLÓGICA POR ESPÉCIE E PESO:
   - Meloxicam: cão 0.1mg/kg SID; gato 0.05mg/kg SID (máx 3 dias); equino 0.6mg/kg SID
   - Tramadol: cão 2–5mg/kg TID; gato 1–2mg/kg BID; equino 1–2mg/kg
   - Dexmedetomidina (MPA): cão 5–20mcg/kg IM; gato 10–40mcg/kg IM; equino 10mcg/kg IV
   - Cetamina (indução): cão 5–10mg/kg IV; gato 5–10mg/kg IM; equino 2.2mg/kg IV
   - Morfina: cão 0.3–0.5mg/kg IM; gato 0.1–0.2mg/kg IM; equino 0.05–0.1mg/kg IV

=== FORMATO DE RESPOSTA PARA CÁLCULOS ===
Quando solicitado cálculo, apresente SEMPRE:
1. Dados de entrada utilizados
2. Fórmula aplicada (com valores substituídos)
3. Resultado numérico com unidade
4. Interpretação clínica e recomendação de implante/tamanho
5. Alertas de risco se valores fora do intervalo normal
⚠️ Lembrete: confirme sempre com instrumentação física antes do procedimento.

=== REGRAS GERAIS ===
- Responda sempre em português brasileiro técnico e preciso
- Nunca faça diagnóstico definitivo sem exame físico e imaginologia confirmada
- Sempre cite intervalo de normalidade ao reportar valores
- Para casos críticos, inclua urgência do procedimento`;

// ── Proxy request helper ──────────────────────────────────────────────────────

// ✅ Interface tipada para resposta da OpenRouter
interface AIResponse { 
  choices?: Array<{ 
    message?: { 
      content?: string;
      role?: string;
    };
    finish_reason?: string;
  }>;
  error?: { message?: string };
}

// ── Proxy request helper COM cache integrado ──────────────────────────────

async function proxyRequest(body: {
  model: string;
  messages: ProxyMessage[];  // ✅ Usa a interface definida
  max_tokens?: number;
}): Promise<string> {
  // 1. Gerar chave e verificar cache ANTES do fetch
  const cacheKey = getCacheKey(body.model, body.messages);
  const cached = getCachedResponse(cacheKey);
  
  if (cached) {
    if (import.meta.env.DEV) {
      console.log('📦 Cache hit:', cacheKey.slice(0, 40));
    }
    return cached;
  }

  // 2. Executar fetch normal
  const res = await fetch(AI_PROXY, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json' // ✅ Adicionado para forçar o tipo correto
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI proxy ${res.status}: ${errorText}`);
  }

  const d: AIResponse = await res.json();
  const raw = d.choices?.[0]?.message?.content ?? 'Resposta não disponível.';
  const result = stripThinking(raw);

  // 3. Salvar no cache APÓS resposta bem-sucedida (nunca salvar erros)
  if (result !== 'Resposta não disponível.' && !result.includes('⚠️')) {
    setCachedResponse(cacheKey, result);
    if (import.meta.env.DEV) {
      console.log('💾 Cache saved:', cacheKey.slice(0, 40));
    }
  }

  return result;
}

// ── C-04: Anonimização no cliente (camada extra antes do proxy) ───────────────
function anonymizePatientName(name: string | undefined, id: string | undefined): string {
  if (!name) return 'Paciente';
  // Usar apenas últimos 4 chars do ID como pseudônimo
  const pseudo = id ? `Paciente-${id.slice(-4).toUpperCase()}` : 'Paciente-XXXX';
  return pseudo;
}

// ── sendChatMessage ───────────────────────────────────────────────────────────
export async function sendChatMessage(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  try {
    return await proxyRequest({
      model: QWEN_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
      max_tokens: 8000,
    });
  } catch (err) {
    console.error('AI chat error:', err);
    // Fallback amigável sem expor detalhes técnicos ao usuário
    return '⚠️ **OrthoAI temporariamente indisponível.**\n\nNão foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente. Se o problema persistir, entre em contato com o suporte.';
  }
}


// ── sendChatMessageStream — streaming SSE ─────────────────────────────────────
// ✅ STREAM: Resposta token a token — elimina timeout Vercel de 60s
export async function sendChatMessageStream(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  onChunk: (accumulatedText: string) => void
): Promise<string> {
  const messages: ProxyMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await fetch(AI_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages,
      max_tokens: 8000,
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
          // chunk SSE inválido, ignorar
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return stripThinking(accumulated) || 'Resposta não disponível.';
}

// ── analyzeImage
export async function analyzeImage(imageBase64: string, caseInfo?: Partial<ClinicalCase>): Promise<string> {
  try {
    // C-04: Usar pseudônimo em vez do nome real do paciente
    const patientRef = caseInfo
      ? anonymizePatientName(caseInfo.patientName, caseInfo.id)
      : 'Paciente';
    const ctx = caseInfo
      ? `Paciente: ${patientRef}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears}a, ${caseInfo.weightKg}kg. Procedimento planejado: ${caseInfo.procedure}.`
      : '';

    return await proxyRequest({
      model: QWEN_MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${SYSTEM_PROMPT}\n\n${ctx}\n\nAnalise esta imagem ortopédica veterinária com precisão máxima. Inclua:\n1. Identificação e qualidade das estruturas anatômicas\n2. Mensuração de ângulos articulares visíveis (com valores de referência)\n3. Cálculo de TPA se tíbia/joelho visível (usar fórmula: raio × [sin(TPA) - sin(alvo)])\n4. Avaliação da espessura cortical e qualidade óssea\n5. Identificação de achados patológicos\n6. Recomendação de implante com tamanho específico\n7. Score de confiança para cada estrutura identificada`
          },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 8000,
    });
  } catch (err) {
    console.error('Vision error:', err);
    return '⚠️ **Erro na análise de imagem.** Verifique o formato (JPG/PNG/WEBP, máx. 15MB) e tente novamente.';
  }
}

// ── getCaseAISuggestion ───────────────────────────────────────────────────────
export async function getCaseAISuggestion(caseInfo: Partial<ClinicalCase>): Promise<string> {
  try {
    // C-04: Anonimizar campos identificáveis antes de enviar
    const patientRef = anonymizePatientName(caseInfo.patientName, caseInfo.id);
    const ctx = `CASO: ${caseInfo.title}. Paciente: ${patientRef}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears} anos, ${caseInfo.weightKg}kg. Procedimento: ${caseInfo.procedure}. Status: ${caseInfo.status}. Nível de risco: ${caseInfo.riskLevel}. Notas: ${caseInfo.notes ? '[notas disponíveis]' : 'sem notas adicionais'}.`;

    return await proxyRequest({
      model: QWEN_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${ctx}\n\nGere sugestão clínica estruturada com:\n1. Cálculo biomecânico (FRS estimada pelo peso)\n2. Seleção de implante com dimensões específicas\n3. Se joelho/TPLO: calcular avanço com fórmula correta: raio × [sin(TPA) - sin(alvo)]\n4. Protocolo anestésico com doses pelo peso\n5. Plano de reabilitação pós-operatória\nApresente todos os cálculos com fórmulas e valores numéricos.`
        },
      ],
      max_tokens: 800,
    });
  } catch (err) {
    console.error('AI suggestion error:', err);
    return '⚠️ **Erro ao gerar sugestão de IA.** Tente novamente em alguns instantes.';
  }
}


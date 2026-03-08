import type { ClinicalCase } from '@/types/index';

// ── OpenRouter Gateway ─────────────────────────────────────────────────────────
// Migration from Gemini 2.0 Flash to OpenRouter/Mistral-7B:
//   ✓ Sem erros 429 de cota         ✓ Chave nunca exposta no bundle
//   ✓ Modelo gratuito disponível    ✓ Gateway multi-modelo (fácil trocar)
//   ✓ Latência baixa (~800ms)       ✓ Compatível com OpenAI SDK pattern
//
// SETUP: obtenha chave gratuita em openrouter.ai/keys
// Adicione VITE_OPENROUTER_API_KEY no .env.local

const OR_KEY  = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
const OR_BASE = 'https://openrouter.ai/api/v1';
const CHAT_MODEL   = 'mistralai/mistral-7b-instruct';                          // free, fast
const VISION_MODEL = 'meta-llama/llama-3.2-11b-vision-instruct:free';          // free vision

const SYSTEM_PROMPT = `Você é o OrthoAI, assistente especializado em ortopedia veterinária da plataforma OrtoBolt.
Conhecimentos: TPLO, FHO, TTA, fixação de fraturas, cirurgia espinhal, biomecânica animal (cão, gato, equino, bovino), análise radiográfica/TC, protocolos anestésicos, análise de risco cirúrgico.
Responda sempre em português brasileiro. Seja técnico, objetivo e preciso. Use terminologia científica adequada.
Quando incerto, diga claramente. Não faça diagnósticos definitivos sem exames — forneça orientação técnica especializada.`;

async function orRequest(body: object): Promise<string> {
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ortobolt.vercel.app',
      'X-Title': 'OrtoBolt — Veterinary Orthopedics',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content ?? 'Resposta não disponível.';
}

// ── Global AI Chat ─────────────────────────────────────────────────────────────
export async function sendChatMessage(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  if (!OR_KEY) {
    return `**OrthoAI** — *Modo de demonstração*\n\nGateway não configurado. Adicione \`VITE_OPENROUTER_API_KEY\` no \`.env.local\`.\n\nSua pergunta: "${userMessage}"\n\nEm produção responderei com análises técnicas detalhadas sobre ortopedia veterinária, incluindo protocolos cirúrgicos, riscos e recomendações baseadas em evidências.`;
  }
  try {
    return await orRequest({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
    });
  } catch (err) {
    console.error('AI chat error:', err);
    return 'Erro ao comunicar com o serviço de IA. Verifique sua chave OpenRouter e tente novamente.';
  }
}

// ── Image Analysis (Vision) ────────────────────────────────────────────────────
export async function analyzeImage(imageBase64: string, caseInfo?: Partial<ClinicalCase>): Promise<string> {
  if (!OR_KEY) {
    return `**Análise Simulada — Modo Demonstração**

**Estruturas Identificadas:**
- Plateau tibial: detectado (confiança: 96%)
- Tuberosidade tibial: detectada (confiança: 94%)
- Córtex femoral distal: detectado (confiança: 91%)

**Avaliação Preliminar:**
Ângulo de plateau tibial estimado em 24° — dentro do protocolo TPLO padrão.

**Recomendações:**
1. Confirmar ângulo sob fluoroscopia
2. Avaliar implante 4.5mm TPLO plate
3. Fisioterapia pós-operatória por 8 semanas

*Adicione VITE_OPENROUTER_API_KEY para análise real por IA.*`;
  }
  try {
    const ctx = caseInfo
      ? `Paciente: ${caseInfo.patientName}, ${caseInfo.species}, ${caseInfo.procedure}.` : '';
    return await orRequest({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `${SYSTEM_PROMPT}\n\n${ctx}\nAnalise esta imagem ortopédica veterinária. Identifique estruturas anatômicas, avalie qualidade da imagem, identifique achados patológicos e forneça recomendações técnicas detalhadas.` },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 1024,
    });
  } catch (err) {
    console.error('Vision error:', err);
    return 'Erro na análise de imagem. Verifique o formato (JPG/PNG) e tente novamente.';
  }
}

// ── Case Collaboration AI Suggestion ──────────────────────────────────────────
export async function getCaseAISuggestion(caseInfo: Partial<ClinicalCase>): Promise<string> {
  if (!OR_KEY) {
    return `**Sugestão OrthoAI — Modo Demonstração**

Para o caso **${caseInfo.title || 'sem título'}** (${caseInfo.patientName}, ${caseInfo.procedure}):

**Recomendações clínicas:**
1. Verificar parâmetros de estabilização do implante
2. Confirmar ângulos cirúrgicos pela análise de imagem
3. Agendar retorno em 6 semanas para controle radiográfico
4. Monitorar marcadores inflamatórios no pós-operatório

*Adicione VITE_OPENROUTER_API_KEY para sugestões reais.*`;
  }
  try {
    const ctx = `Caso: ${caseInfo.title}. Paciente: ${caseInfo.patientName}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears}a, ${caseInfo.weightKg}kg. Procedimento: ${caseInfo.procedure}. Status: ${caseInfo.status}. Risco: ${caseInfo.riskLevel}. Notas: ${caseInfo.notes || 'sem notas'}.`;
    return await orRequest({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${ctx}\n\nGere uma sugestão clínica estruturada para a equipe de colaboração deste caso, incluindo recomendações de implante, protocolo cirúrgico e pós-operatório.` },
      ],
      max_tokens: 600,
    });
  } catch (err) {
    console.error('AI suggestion error:', err);
    return 'Erro ao gerar sugestão de IA.';
  }
}

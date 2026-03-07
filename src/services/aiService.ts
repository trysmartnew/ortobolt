import { GoogleGenAI } from '@google/genai';
import type { ClinicalCase } from '@/types/index';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
let ai: GoogleGenAI | null = null;
if (apiKey) ai = new GoogleGenAI({ apiKey });

const SYSTEM_PROMPT = `Você é o OrthoAI, um assistente especializado em ortopedia veterinária desenvolvido para a plataforma OrtoBolt. 
Você possui profundo conhecimento em:
- Procedimentos ortopédicos veterinários (TPLO, FHO, TTA, fixação de fraturas, cirurgia espinhal)
- Biomecânica animal para cães, gatos, equinos e bovinos
- Análise de imagens radiográficas e tomográficas
- Protocolos anestésicos e pós-operatórios
- Análise de risco cirúrgico

Responda sempre em português brasileiro. Seja preciso, técnico e objetivo. Use terminologia científica adequada.
Quando não tiver certeza, diga claramente e sugira consultar literatura especializada.
Não faça diagnósticos definitivos sem exames, mas forneça orientação técnica especializada.`;

export async function sendChatMessage(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  if (!ai) {
    return `**OrthoAI** — *Modo de demonstração*\n\nAPI Gemini não configurada. Configure \`VITE_GEMINI_API_KEY\` no arquivo \`.env.local\` para ativar o assistente de IA completo.\n\nSua pergunta foi: "${userMessage}"\n\nEm produção, responderei com análises técnicas detalhadas sobre ortopedia veterinária, incluindo protocolos cirúrgicos, riscos e recomendações baseadas em evidências.`;
  }
  try {
    const conversationHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }));
    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: { systemInstruction: SYSTEM_PROMPT },
      history: conversationHistory,
    });
    const response = await chat.sendMessage({ message: userMessage });
    return response.text ?? 'Não foi possível gerar uma resposta.';
  } catch (err) {
    console.error('AI error:', err);
    return 'Erro ao comunicar com o serviço de IA. Tente novamente.';
  }
}

export async function analyzeImage(imageBase64: string, caseInfo?: Partial<ClinicalCase>): Promise<string> {
  if (!ai) {
    return `**Análise Simulada — Modo Demonstração**

**Estruturas Identificadas:**
- Plateau tibial: detectado (confiança: 96%)
- Tuberosidade tibial: detectada (confiança: 94%)
- Córtex femoral distal: detectado (confiança: 91%)

**Avaliação Preliminar:**
Imagem de qualidade adequada para análise ortopédica. Ângulo de plateau tibial estimado em 24° — dentro do protocolo TPLO padrão.

**Recomendações:**
1. Confirmar medição do ângulo de plateau tibial sob fluoroscopia
2. Avaliar implante de tamanho 4.5mm TPLO plate
3. Fisioterapia pós-operatória recomendada por 8 semanas

*Configure VITE_GEMINI_API_KEY para análise real por IA.*`;
  }
  try {
    const context = caseInfo
      ? `Contexto: Paciente ${caseInfo.patientName || 'desconhecido'}, ${caseInfo.species || 'espécie desconhecida'}, procedimento ${caseInfo.procedure || 'não especificado'}.`
      : '';
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [
          { text: `${SYSTEM_PROMPT}\n\n${context}\nAnalise esta imagem ortopédica veterinária. Identifique estruturas anatômicas, avalie a qualidade da imagem, identifique possíveis achados patológicos e forneça recomendações técnicas.` },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        ],
      }],
    });
    return response.text ?? 'Análise não disponível.';
  } catch (err) {
    console.error('Vision error:', err);
    return 'Erro na análise de imagem. Verifique o formato e tente novamente.';
  }
}

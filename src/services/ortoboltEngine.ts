// src/services/ortoboltEngine.ts
// ✅ Validação em Camadas + Structured Output (Zod)
// ✅ Complementa aiService.ts sem quebrar arquitetura existente
// ✅ Importar em: AIAssistant.tsx, AnalysisPage.tsx

import { z } from 'zod';

// Schema rígido para respostas ortopédicas estruturadas
export const RespostaOrtopedicaSchema = z.object({
  // Campos originais (obrigatórios)
  diagnostico_principal: z.string(),
  diagnosticos_diferenciais: z.array(z.string()),
  confianca: z.number().min(0).max(1),
  proximos_passos: z.array(z.string()),
  tratamento_inicial_sugerido: z.string(),
  alertas_criticos: z.array(z.string()),
  
  // Campos quantitativos opcionais (para análise de imagens)
  implantCount: z.object({
    proximal: z.number().min(0).optional(),
    distal: z.number().min(0).optional(),
    total: z.number().min(0).optional(),
  }).optional().describe('Contagem de parafusos/pinos visíveis na imagem'),
  
  alignmentStatus: z.enum(['Neutro', 'Varo', 'Valgo', 'Procurvatum', 'Recurvatum', 'Indeterminado']).optional()
    .describe('Avaliação do eixo mecânico do membro'),
  
  healingStage: z.enum(['Agudo', 'Calo Mole', 'Calo Duro', 'Consolidado', 'Não União', 'Indeterminado']).optional()
    .describe('Estágio de consolidação da fratura'),
  
  boneSegment: z.string().optional()
    .describe('Segmento ósseo afetado (ex: diáfise média da tíbia)'),
  
  redFlags: z.array(z.string()).optional()
    .describe('Lista de problemas críticos detectados (parafuso intra-articular, falha do implante, etc)'),
  
  clinicalReasoning: z.string().optional()
    .describe('Raciocínio clínico passo a passo (Chain-of-Thought)'),
});

export type RespostaOrtopedica = z.infer<typeof RespostaOrtopedicaSchema>;

// Validação em Camadas (Segurança Clínica)
export function validarRespostaMedica(resposta: any): RespostaOrtopedica {
  const parsed = RespostaOrtopedicaSchema.parse(resposta);
  const erros: string[] = [];
  const texto = JSON.stringify(parsed).toLowerCase();

  // Regra 1: AINEs devem ter alerta renal/hepático
  if ((texto.includes('meloxicam') || texto.includes('carprofeno') || texto.includes('aines')) && 
      !texto.includes('renal') && !texto.includes('hepática')) {
    erros.push('⚠️ REGRA DE SEGURANÇA: Menção a AINEs sem alerta de avaliação renal/hepática.');
  }

  // Regra 2: Baixa confiança exige revisão humana
  if (parsed.confianca < 0.6 && !parsed.alertas_criticos.some((a: string) => a.toLowerCase().includes('revisão humana'))) {
    erros.push('⚠️ REGRA DE SEGURANÇA: Confiança < 60%. Revisão humana por especialista é obrigatória.');
  }

  if (erros.length > 0) {
    return { ...parsed, alertas_criticos: [...parsed.alertas_criticos, ...erros] };
  }
  return parsed;
}

// System Prompt para Structured Output (JSON mode)
export const ORTOBOLT_STRUCTURED_PROMPT = `Você é o OrtoBolt, assistente de IA especializado em ortopedia veterinária.
REGRAS:
1. NUNCA alucine. Se faltarem dados, diga "Insuficiente para diagnóstico".
2. NUNCA prescreva sem o aviso: "Confirmar dose com base no peso e função renal/hepática".
3. Retorne APENAS um objeto JSON válido com esta estrutura exata:
{
  "diagnostico_principal": "string",
  "diagnosticos_diferenciais": ["string", "string"],
  "confianca": 0.85,
  "proximos_passos": ["string", "string"],
  "tratamento_inicial_sugerido": "string",
  "alertas_criticos": ["string", "string"]
}

EXEMPLO REAL:
Entrada: "Cão Labrador, 8 anos, 35kg. Claudicação em membro pélvico direito. Raio-x mostra achatamento do colo femoral."
Saída: {
  "diagnostico_principal": "Displasia Coxofemoral com Osteoartrite Secundária",
  "diagnosticos_diferenciais": ["Ruptura do LCC", "Neoplasia óssea"],
  "confianca": 0.85,
  "proximos_passos": ["Radiografia de bacia em posição VD com extensão", "Avaliação de função renal"],
  "tratamento_inicial_sugerido": "Restrição de exercício, controle de peso, AINE (ex: Meloxicam 0.1mg/kg/dia).",
  "alertas_criticos": ["Verificar função renal e hepática antes de iniciar AINEs."]
}

Caso clínico:
`;

// ── ✅ NOVO: RAG (Retrieval-Augmented Generation) ──
export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Falha ao gerar embedding');
  const data = await res.json();
  return data.embedding;
}

export async function buscarContextoRAG(descricaoCaso: string): Promise<string> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const embedding = await getEmbedding(descricaoCaso);

    const { data, error } = await supabase.rpc('match_documentos_ortopedia', {
      query_embedding: embedding,
      match_threshold: 0.75,
      match_count: 3
    });

    if (error || !data || data.length === 0) return '';

    return data.map((doc: any) => `FONTE: \nCONTEÚDO: `).join('\n\n');
  } catch (err) {
    console.error('Erro no RAG:', err);
    return '';
  }
}

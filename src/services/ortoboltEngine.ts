// src/services/ortoboltEngine.ts
// ✅ Validação em Camadas + Structured Output (Zod)
// ✅ Complementa aiService.ts sem quebrar arquitetura existente
// ✅ Importar em: AIAssistant.tsx, AnalysisPage.tsx

import { z } from 'zod';
import { getSupabaseAccessToken } from '@/services/supabase';

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

  // Novos campos para validação cirúrgica
  reductionQuality: z.enum(['Anatômica', 'Aceitável', 'Inaceitável', 'Falha']).optional()
    .describe('Qualidade da redução da fratura'),

  implantPositioning: z.enum(['Adequado', 'Subótimo', 'Inadequado', 'Não Aplicável']).optional()
    .describe('Posicionamento do implante'),

  dosagem: z.object({
    medicamento: z.string().min(1),
    dose_mg_kg: z.number().min(0.01, 'Dosagem não pode ser zero'),
    frequencia: z.string().min(1),
    duracao_dias: z.number().min(1).optional(),
  }).optional().describe('Dosagem estruturada com validação clínica'),

  redFlagsEstruturadas: z.array(z.object({
    tipo: z.enum(['Parafuso Intra-Articular', 'Falha do Implante', 'Redução Inaceitável', 'Lise Óssea', 'Não União', 'Outro']),
    severidade: z.enum(['leve', 'moderada', 'grave', 'crítica']),
    descricao: z.string().min(10),
  })).optional().describe('Lista de problemas críticos detectados'),
}).superRefine((data, ctx) => {
  // Validação cruzada: fratura fixada deve ter implantCount
  if (data.diagnostico_principal.toLowerCase().includes('fratura') && 
      data.diagnostico_principal.toLowerCase().includes('fixada')) {
    if (!data.implantCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fratura fixada deve ter implantCount preenchido',
        path: ['implantCount'],
      });
    }
  }
  
  // Validação cruzada: red flags graves exigem alertas_criticos
  if (data.redFlagsEstruturadas?.some((f: any) => f.severidade === 'grave' || f.severidade === 'crítica')) {
    if (!data.alertas_criticos || data.alertas_criticos.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Red flags graves exigem alertas_criticos',
        path: ['alertas_criticos'],
      });
    }
  }
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
  // Regra 3: Dosagem mínima
  if (parsed.dosagem && parsed.dosagem.dose_mg_kg < 0.01) {
    erros.push(`⚠️ REGRA DE SEGURANÇA: Dosagem de ${parsed.dosagem.medicamento} abaixo do mínimo terapêutico (${parsed.dosagem.dose_mg_kg}mg/kg).`);
  }

  // Regra 4: Redução inaceitável exige reoperação
  if (parsed.reductionQuality === 'Inaceitável' || parsed.reductionQuality === 'Falha') {
    if (!parsed.alertas_criticos.some((a: string) => a.toLowerCase().includes('reoperação'))) {
      erros.push('⚠️ REGRA DE SEGURANÇA: Redução inaceitável detectada. Reoperação deve ser recomendada.');
    }
  }

  // Regra 5: Parafuso intra-articular é crítico
  if (parsed.redFlagsEstruturadas?.some((f: any) => f.tipo === 'Parafuso Intra-Articular')) {
    if (!parsed.alertas_criticos.some((a: string) => a.toLowerCase().includes('intra-articular'))) {
      erros.push('⚠️ REGRA DE SEGURANÇA: Parafuso intra-articular detectado. Alerta crítico obrigatório.');
    }
  }

  // Regra 6: Implante sem contagem
  if (texto.includes('parafuso') && !parsed.implantCount) {
    erros.push('⚠️ REGRA DE SEGURANÇA: Menção a parafusos sem contagem estruturada (implantCount).');
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
  "alertas_criticos": ["Verificar função renal e hepática antes de iniciar AINEs."],
  "implantCount": { "proximal": 3, "distal": 4, "total": 7 },
  "alignmentStatus": "Neutro",
  "healingStage": "Calo Duro",
  "boneSegment": "diáfise distal do fêmur",
  "redFlags": [],
  "clinicalReasoning": "Paciente com histórico de fratura femoral, radiografia mostra consolidação progressiva com alinhamento adequado.",
  "reductionQuality": "Anatômica",
  "implantPositioning": "Adequado",
  "healingStage": "Calo Duro",
  "boneSegment": "diáfise distal do fêmur",
  "redFlags": [],
  "clinicalReasoning": "Paciente com histórico de fratura femoral, radiografia mostra consolidação progressiva com alinhamento adequado."
}

Caso clínico:
`;

// ── ✅ NOVO: RAG (Retrieval-Augmented Generation) ──
export async function getEmbedding(text: string): Promise<number[]> {
  const token = await getSupabaseAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch('/api/embeddings', {
    method: 'POST',
    headers,
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

    return data.map((doc: any) => `FONTE: ${doc.source ?? ''}\nCONTEÚDO: ${doc.content ?? ''}`).join('\n\n');
  } catch (err) {
    console.error('Erro no RAG:', err);
    return '';
  }
}

import { z } from 'zod';

export const tutorGuideSchema = z.object({
  avaliado: z.string().max(400),
  achados: z.array(z.string().max(300)).min(1).max(4),
  significado: z.string().max(400),
  agora: z.array(z.string().max(300)).min(1).max(5),
  proximos: z.array(z.string().max(300)).max(5).optional(),
  atencao: z.array(z.string().max(300)).max(5).optional(),
  mensagem: z.string().max(300),
});

export type TutorGuide = z.infer<typeof tutorGuideSchema>;

export function validateTutorGuide(
  guide: unknown, 
  source: { recommendations: string[]; riskFactors: any[] }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const g = guide as any;
  
  // Guard 1: cardinalidade (não pode inventar mais itens que a fonte)
  if (Array.isArray(g?.agora) && g.agora.length > source.recommendations.length) {
    errors.push(`agora.length (${g.agora.length}) > recommendations.length (${source.recommendations.length})`);
  }
  
  // Guard 2: regex de proibidos (doses, prognóstico, cura, garantia)
  const proibidosRegex = /\b(mg|ml|mg\/kg|progn[óo]stico|cura|garantia|definitivo)\b|100%/gi;
  const guideText = JSON.stringify(g);
  const matches = guideText.match(proibidosRegex);
  if (matches) {
    errors.push(`Termos proibidos encontrados: ${matches.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function generateSafeFallback(source: { 
  recommendations: string[]; 
  riskFactors: any[] 
}): TutorGuide {
  return {
    avaliado: 'Exame radiográfico realizado pela equipe veterinária.',
    achados: ['Foram identificados achados que requerem avaliação adicional.'],
    significado: 'A equipe veterinária está avaliando o caso e fornecerá orientações específicas.',
    agora: (source.recommendations.length ? source.recommendations.slice(0, 5) : ['Seguir as orientações da equipe veterinária.']).map(r => `Conforme recomendação da equipe: ${r}`),
    proximos: ['Retornar para avaliação complementar conforme orientação veterinária.'],
    atencao: source.riskFactors.slice(0, 3).map(rf => `Ponto de atenção: ${rf.description}`),
    mensagem: 'Siga as orientações da equipe veterinária e retorne conforme agendado.',
  };
}

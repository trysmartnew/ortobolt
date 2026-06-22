// src/schemas/clinicalEvidence.ts
// Schema Registry para validação de evidências clínicas (Fase 1 CEP)
// Usa Zod para validação em tempo de compilação + runtime

import { z } from 'zod';

/**
 * Schema de medições clínicas objetivas
 * Extraídas da análise de imagem pelo LLM, validadas deterministicamente
 */
export const ClinicalMeasurementsSchema = z.object({
  angle: z.number().min(0).max(360).optional().describe('Ângulo em graus (0-360)'),
  displacement: z.number().optional().describe('Deslocamento em mm'),
  alignment: z.enum(['normal', 'mild', 'moderate', 'severe']).optional().describe('Alinhamento articular'),
  gap: z.number().min(0).optional().describe('Abertura articular em mm'),
});

/**
 * Schema de achados clínicos estruturados
 * Cada achado é validado contra regras de negócio
 */
export const ClinicalFindingSchema = z.object({
  location: z.string().min(1).describe('Localização anatômica'),
  severity: z.enum(['none', 'mild', 'moderate', 'severe']).describe('Severidade do achado'),
  description: z.string().min(1).describe('Descrição clínica do achado'),
  confidence: z.number().min(0).max(1).optional().describe('Confiança da detecção (0-1)'),
});

/**
 * Schema principal de evidência clínica
 * Contrato entre Vision Engine (LLM) e Clinical Engine (regras)
 */
export const ClinicalEvidenceSchema = z.object({
  measurements: ClinicalMeasurementsSchema.describe('Métricas objetivas extraídas da imagem'),
  findings: z.array(ClinicalFindingSchema).min(1).describe('Achados clínicos estruturados'),
  confidence: z.number().min(0).max(1).describe('Confiança geral da evidência (0-1)'),
  validatedAt: z.string().datetime().describe('Timestamp de validação ISO 8601'),
  schemaVersion: z.string().default('1.0.0').describe('Versão do schema para evolução futura'),
});

/**
 * Tipos TypeScript inferidos do schema Zod
 * Garante type-safety em tempo de compilação
 */
export type ClinicalMeasurements = z.infer<typeof ClinicalMeasurementsSchema>;
export type ClinicalFinding = z.infer<typeof ClinicalFindingSchema>;
export type ClinicalEvidence = z.infer<typeof ClinicalEvidenceSchema>;

/**
 * Função de validação com tratamento de erros
 * Retorna resultado estruturado (success/failure) em vez de throw
 */
export function validateClinicalEvidence(data: unknown): {
  success: boolean;
  data?: ClinicalEvidence;
  error?: z.ZodError;
} {
  const result = ClinicalEvidenceSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

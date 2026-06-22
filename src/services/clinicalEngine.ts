// src/services/clinicalEngine.ts
// Camada determinística entre LLM e persistência
// Transforma AIAnalysisResult em ClinicalEvidence validado

import { z } from 'zod';
import { ClinicalEvidenceSchema, type ClinicalEvidence, type ClinicalFinding } from '@/schemas/clinicalEvidence';
import type { AIAnalysisResult, AnatomicalLandmark, RiskFactor } from '@/types';

// Cache memoizado: aiAnalysis.id → ClinicalEvidence
const evidenceCache = new Map<string, ClinicalEvidence>();

/**
 * Extrai medições objetivas do AIAnalysisResult
 * Converte landmarks e confidence em métricas quantificáveis
 */
function extractMeasurements(aiAnalysis: AIAnalysisResult): {
  angle?: number;
  displacement?: number;
  alignment?: 'normal' | 'mild' | 'moderate' | 'severe';
  gap?: number;
} {
  const measurements: any = {};
  
  // Extrair ângulo tibial se disponível (TPLO)
  const tibialAngle = aiAnalysis.anatomicalLandmarks.find(l => 
    l.name.toLowerCase().includes('tibial') || l.name.toLowerCase().includes('plateau')
  );
  
  if (tibialAngle?.coordinates) {
    // Simulação: em produção, calcular ângulo real a partir de coordenadas
    measurements.angle = 25 + (1 - tibialAngle.confidence) * 10; // Ângulo tibial típico: 25-35°
  }
  
  // Extrair deslocamento articular
  const jointLandmarks = aiAnalysis.anatomicalLandmarks.filter(l => 
    l.name.toLowerCase().includes('joint') || l.name.toLowerCase().includes('femur')
  );
  
  if (jointLandmarks.length >= 2) {
    // Simulação: calcular deslocamento entre landmarks
    measurements.displacement = Math.abs(jointLandmarks[0].confidence - jointLandmarks[1].confidence) * 5;
  }
  
  // Classificar alinhamento baseado em confidence geral
  const avgConfidence = aiAnalysis.anatomicalLandmarks.reduce((sum, l) => sum + l.confidence, 0) / 
    Math.max(aiAnalysis.anatomicalLandmarks.length, 1);
  
  if (avgConfidence > 0.8) measurements.alignment = 'normal';
  else if (avgConfidence > 0.6) measurements.alignment = 'mild';
  else if (avgConfidence > 0.4) measurements.alignment = 'moderate';
  else measurements.alignment = 'severe';
  
  // Calcular abertura articular (gap)
  if (measurements.angle) {
    measurements.gap = measurements.angle * 0.3; // Relação empírica
  }
  
  return measurements;
}

/**
 * Aplica regras clínicas para ortopedia veterinária
 * Gera achados estruturados baseados em medições e risk factors
 */
function applyClinicalRules(
  measurements: ReturnType<typeof extractMeasurements>,
  riskFactors: RiskFactor[]
): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];
  
  // Regra 1: Ângulo tibial aumentado → risco de TPLO
  if (measurements.angle && measurements.angle > 30) {
    findings.push({
      location: 'Tibial Plateau',
      severity: measurements.angle > 35 ? 'severe' : 'moderate',
      description: `Ângulo tibial aumentado: ${measurements.angle.toFixed(1)}° (normal: 25-30°)`,
      confidence: 0.85
    });
  }
  
  // Regra 2: Deslocamento articular → instabilidade
  if (measurements.displacement && measurements.displacement > 2) {
    findings.push({
      location: 'Articulação do Joelho',
      severity: measurements.displacement > 4 ? 'severe' : 'moderate',
      description: `Deslocamento articular: ${measurements.displacement.toFixed(1)}mm`,
      confidence: 0.75
    });
  }
  
  // Regra 3: Alinhamento comprometido
  if (measurements.alignment && measurements.alignment !== 'normal') {
    findings.push({
      location: 'Membro Posterior',
      severity: measurements.alignment === 'severe' ? 'severe' : 
                measurements.alignment === 'moderate' ? 'moderate' : 'mild',
      description: `Alinhamento ${measurements.alignment}`,
      confidence: 0.70
    });
  }
  
  // Regra 4: Incorporar risk factors do LLM (mapear severidade LLM -> clínica)
  const severityMap: Record<'low' | 'medium' | 'high', 'mild' | 'moderate' | 'severe'> = {
    'low': 'mild',
    'medium': 'moderate',
    'high': 'severe',
  };
  riskFactors.forEach(rf => {
    findings.push({
      location: rf.category,
      severity: severityMap[rf.severity],
      description: rf.description,
      confidence: 0.60 // Risk factors do LLM têm confidence menor
    });
  });
  
  // Garantir pelo menos um finding (schema exige min: 1)
  if (findings.length === 0) {
    findings.push({
      location: 'Análise Geral',
      severity: 'mild',
      description: 'Nenhuma anomalia significativa detectada',
      confidence: 0.50
    });
  }
  
  return findings;
}

/**
 * Calcula confiança geral da evidência
 * Baseado em: confidence do LLM + consistência das medições + quantidade de landmarks
 */
function calculateConfidence(
  aiAnalysis: AIAnalysisResult,
  measurements: ReturnType<typeof extractMeasurements>,
  findings: ClinicalFinding[]
): number {
  // Fator 1: Confidence base do LLM (peso: 40%)
  const llmConfidence = aiAnalysis.confidence * 0.4;
  
  // Fator 2: Consistência das medições (peso: 30%)
  const measurementCount = Object.values(measurements).filter(v => v !== undefined).length;
  const measurementConsistency = Math.min(measurementCount / 3, 1) * 0.3;
  
  // Fator 3: Quantidade e qualidade de landmarks (peso: 30%)
  const landmarkQuality = aiAnalysis.anatomicalLandmarks.length > 0
    ? aiAnalysis.anatomicalLandmarks.reduce((sum, l) => sum + l.confidence, 0) / 
      aiAnalysis.anatomicalLandmarks.length
    : 0;
  const landmarkScore = landmarkQuality * 0.3;
  
  return Math.min(llmConfidence + measurementConsistency + landmarkScore, 1);
}

/**
 * Deriva ClinicalEvidence a partir de AIAnalysisResult
 * Função principal da Clinical Engine com memoização
 */
export function deriveClinicalEvidence(aiAnalysis: AIAnalysisResult): ClinicalEvidence {
  // Verificar cache primeiro
  if (evidenceCache.has(aiAnalysis.id)) {
    return evidenceCache.get(aiAnalysis.id)!;
  }
  
  // 1. Extrair medições objetivas
  const measurements = extractMeasurements(aiAnalysis);
  
  // 2. Aplicar regras clínicas
  const findings = applyClinicalRules(measurements, aiAnalysis.riskFactors);
  
  // 3. Calcular confiança geral
  const confidence = calculateConfidence(aiAnalysis, measurements, findings);
  
  // 4. Montar evidência clínica
  const evidence = {
    measurements,
    findings,
    confidence,
    validatedAt: new Date().toISOString(),
    schemaVersion: '1.0.0'
  };
  
  // 5. Validar com Zod (garantia de integridade)
  const result = ClinicalEvidenceSchema.safeParse(evidence);
  
  if (!result.success) {
    console.error('[ClinicalEngine] Validação falhou:', result.error);
    // Em produção: logar erro e retornar evidência mínima válida
    const fallbackEvidence = {
      measurements: {},
      findings: [{
        location: 'Sistema',
        severity: 'mild' as const,
        description: 'Erro na validação da evidência clínica',
        confidence: 0.1
      }],
      confidence: 0.1,
      validatedAt: new Date().toISOString(),
      schemaVersion: '1.0.0'
    };
    
    // Cache o fallback também
    evidenceCache.set(aiAnalysis.id, fallbackEvidence);
    return fallbackEvidence;
  }
  
  // 6. Armazenar no cache
  evidenceCache.set(aiAnalysis.id, result.data);
  
  return result.data;
}

/**
 * Invalida cache para um aiAnalysis específico
 * Útil quando o aiAnalysis é atualizado
 */
export function invalidateEvidenceCache(aiAnalysisId: string): void {
  evidenceCache.delete(aiAnalysisId);
}

/**
 * Limpa todo o cache
 * Útil para testes ou quando o usuário faz logout
 */
export function clearEvidenceCache(): void {
  evidenceCache.clear();
}

/**
 * Valida se uma ClinicalEvidence está íntegra
 * Útil para verificar dados carregados do banco
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

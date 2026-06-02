import { describe, it, expect } from 'vitest';
import {
  buildIntegratedClinicalCase,
  hashTextScore,
  inferRiskLevel,
  parseAnalysisTextToAIResult,
  buildCaseTitle,
  formatIntegratedNotes,
} from './clinicalCaseIntegrationService';

describe('clinicalCaseIntegrationService', () => {
  it('hashTextScore retorna valor entre 85 e 97', () => {
    const score = hashTextScore('radiografia de tíbia com fratura');
    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(97);
  });

  it('parseAnalysisTextToAIResult extrai recomendações em bullets', () => {
    const ai = parseAnalysisTextToAIResult(
      'Achados:\n- Repouso relativo\n- Controle radiográfico em 14 dias'
    );
    expect(ai.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(ai.anatomicalLandmarks.length).toBeGreaterThanOrEqual(1);
    expect(ai.precisionScore).toBeGreaterThanOrEqual(85);
  });

  it('inferRiskLevel detecta urgência no texto', () => {
    expect(inferRiskLevel('caso crítico com emergência')).toBe('high');
    expect(inferRiskLevel('fratura moderada')).toBe('medium');
    expect(inferRiskLevel('evolução estável')).toBe('low');
  });

  it('buildIntegratedClinicalCase monta caso com tags de pipeline', () => {
    const c = buildIntegratedClinicalCase({
      veterinarianId: 'vet-1',
      imageDataUrl: 'data:image/png;base64,abc',
      analysisText: 'Análise ortopédica sem urgência.',
      clinicalContext: {
        patientName: 'Thor',
        species: 'canine',
        breed: 'Labrador',
        weightKg: 30,
        procedure: 'TPLO',
      },
    });
    expect(c.patientName).toBe('Thor');
    expect(c.procedure).toBe('TPLO');
    expect(c.status).toBe('completed');
    expect(c.tags).toContain('integrado');
    expect(c.tags).toContain('analise-ia');
    expect(c.aiAnalysis).toBeDefined();
    expect(c.imageUrl).toContain('data:image');
  });

  it('buildCaseTitle usa paciente e procedimento', () => {
    expect(buildCaseTitle('Luna', 'FHO')).toBe('FHO — Luna');
    expect(buildCaseTitle(undefined, 'other')).toBe('other — Paciente');
  });

  it('formatIntegratedNotes inclui bloco do copiloto', () => {
    const notes = formatIntegratedNotes('Laudo base', [
      { id: '1', role: 'user', content: 'Dúvida sobre LCA', timestamp: '' },
    ]);
    expect(notes).toContain('Análise IA');
    expect(notes).toContain('Copiloto');
    expect(notes).toContain('Dúvida sobre LCA');
  });
});

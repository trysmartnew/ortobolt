import { describe, it, expect } from 'vitest';
import { validarRespostaMedica } from '@/services/ortoboltEngine';

const baseResposta = {
  diagnostico_principal: 'Fratura fixada de tíbia',
  diagnosticos_diferenciais: ['Não união'],
  confianca: 0.85,
  proximos_passos: ['Controle radiográfico'],
  tratamento_inicial_sugerido: 'Restrição de exercício',
  alertas_criticos: ['Monitorar consolidação'],
  implantCount: { proximal: 2, distal: 3, total: 5 },
};

describe('validarRespostaMedica', () => {
  it('aceita resposta válida sem alterações críticas', () => {
    const result = validarRespostaMedica(baseResposta);
    expect(result.diagnostico_principal).toBe(baseResposta.diagnostico_principal);
  });

  it('exige alerta renal/hepático ao mencionar AINEs', () => {
    const result = validarRespostaMedica({
      ...baseResposta,
      tratamento_inicial_sugerido: 'Meloxicam 0.1mg/kg SID',
      alertas_criticos: [],
    });
    expect(result.alertas_criticos.some((a) => a.includes('AINEs'))).toBe(true);
  });

  it('exige revisão humana quando confiança < 60%', () => {
    const result = validarRespostaMedica({
      ...baseResposta,
      confianca: 0.4,
      alertas_criticos: [],
    });
    expect(result.alertas_criticos.some((a) => a.includes('Revisão humana'))).toBe(true);
  });

  it('alerta reoperação para redução inaceitável', () => {
    const result = validarRespostaMedica({
      ...baseResposta,
      reductionQuality: 'Inaceitável',
      alertas_criticos: [],
    });
    expect(result.alertas_criticos.some((a) => a.toLowerCase().includes('reoperação'))).toBe(true);
  });
});

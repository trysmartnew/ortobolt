import { describe, it, expect } from 'vitest';
import {
  anonymizeClinicalText,
  anonymizePatientRef,
  anonymizeCaseContext,
  sanitizeProxyMessages,
} from '@/lib/anonymizeClinical';

describe('anonymizeClinical', () => {
  it('substitui nomes próprios compostos', () => {
    expect(anonymizeClinicalText('Dr. João Silva avaliou o caso')).toContain('[NOME]');
  });

  it('substitui email, telefone e CPF', () => {
    const text = 'Contato: vet@clinica.com (11) 98765-4321 CPF 123.456.789-00';
    const out = anonymizeClinicalText(text);
    expect(out).toContain('[EMAIL]');
    expect(out).toContain('[TELEFONE]');
    expect(out).toContain('[CPF]');
  });

  it('anonimiza referência de paciente por ID', () => {
    expect(anonymizePatientRef('Thor', 'abc123def456')).toBe('Paciente-F456');
  });

  it('anonimiza contexto de caso sem nome real', () => {
    const ctx = anonymizeCaseContext({
      id: 'case-99',
      patientName: 'Thor',
      species: 'canine',
      breed: 'Labrador',
      weightKg: 30,
      procedure: 'TPLO',
    });
    expect(ctx).toContain('Paciente-');
    expect(ctx).not.toContain('Thor');
  });

  it('sanitiza mensagens multimodais (texto only)', () => {
    const msgs = sanitizeProxyMessages([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Paciente: Maria Santos' },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
        ],
      },
    ]);
    const parts = msgs[0].content as Array<{ type: string; text?: string }>;
    expect(parts[0].text).toContain('[PACIENTE]');
  });
});

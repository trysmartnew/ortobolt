import { describe, it, expect } from 'vitest';
import { anonymizeClinicalText, isAnonymized } from '../anonymizeClinical';

describe('anonymizeClinicalText', () => {
  describe('padrões básicos (existentes)', () => {
    it('deve redactar emails', () => {
      const text = 'Contato: joao.silva@email.com';
      expect(anonymizeClinicalText(text)).toBe('Contato: [EMAIL]');
    });

    it('deve redactar telefones', () => {
      const text = 'Tel: (11) 99999-9999';
      expect(anonymizeClinicalText(text)).toBe('Tel: [TELEFONE]');
    });

    it('deve redactar CPF formatado', () => {
      const text = 'CPF: 123.456.789-00';
      expect(anonymizeClinicalText(text)).toBe('CPF: [CPF]');
    });

    it('deve redactar linha Paciente:', () => {
      const text = 'Paciente: João Silva';
      expect(anonymizeClinicalText(text)).toBe('Paciente: [PACIENTE]');
    });

    it('deve redactar prefixo Caso:', () => {
      const text = 'Caso: Fratura de fêmur';
      expect(anonymizeClinicalText(text)).toBe('Caso: [CASO]');
    });
  });

  describe('novos padrões LGPD', () => {
    it('deve redactar nomes com abreviações (Dr., Dra., etc.)', () => {
      const text = 'Dr. João Silva avaliou o caso';
      expect(anonymizeClinicalText(text)).toBe('[NOME] avaliou o caso');
    });

    it('deve redactar Dra. Maria Santos', () => {
      const text = 'Dra. Maria Santos, CRM 12345';
      expect(anonymizeClinicalText(text)).toBe('[NOME], CRM 12345');
    });

    it('deve redactar CPF não formatado (11 dígitos)', () => {
      const text = 'CPF: 12345678901';
      expect(anonymizeClinicalText(text)).toBe('CPF: [CPF]');
    });

    it('deve redactar telefone com +55', () => {
      const text = 'Tel: +55 11 99999-9999';
      expect(anonymizeClinicalText(text)).toBe('Tel: [TELEFONE]');
    });

    it('deve redactar telefone sem DDD', () => {
      const text = 'Tel: 99999-9999';
      expect(anonymizeClinicalText(text)).toBe('Tel: [TELEFONE]');
    });

    it('deve redactar número de prontuário (PRM)', () => {
      const text = 'Prontuário PRM-12345';
      expect(anonymizeClinicalText(text)).toBe('Prontuário [PRONTUARIO]');
    });

    it('deve redactar ID médico', () => {
      const text = 'ID: 98765';
      expect(anonymizeClinicalText(text)).toBe('ID: [PRONTUARIO]');
    });

    it('deve redactar data de nascimento BR', () => {
      const text = 'Paciente nascido em 15/03/1985';
      expect(anonymizeClinicalText(text)).toBe('Paciente nascido em [DATA_NASC]');
    });

    it('deve redactar data de nascimento ISO', () => {
      const text = 'DOB: 1985-03-15';
      expect(anonymizeClinicalText(text)).toBe('DOB: [DATA_NASC]');
    });

    it('deve redactar data standalone', () => {
      const text = 'Data da consulta: 15/03/2024';
      expect(anonymizeClinicalText(text)).toBe('Data da consulta: [DATA]');
    });
  });

  describe('preservação de termos clínicos', () => {
    it('NÃO deve redactar "Ortopedia Veterinária"', () => {
      const text = 'Especialidade: Ortopedia Veterinária';
      expect(anonymizeClinicalText(text)).toBe('Especialidade: Ortopedia Veterinária');
    });

    it('NÃO deve redactar "Cirurgia Ortopédica"', () => {
      const text = 'Tipo: Cirurgia Ortopédica';
      expect(anonymizeClinicalText(text)).toBe('Tipo: Cirurgia Ortopédica');
    });

    it('NÃO deve redactar "Placa Bloqueada"', () => {
      const text = 'Implante: Placa Bloqueada';
      expect(anonymizeClinicalText(text)).toBe('Implante: Placa Bloqueada');
    });

    it('NÃO deve redactar "Fratura de Fêmur"', () => {
      const text = 'Diagnóstico: Fratura de Fêmur';
      expect(anonymizeClinicalText(text)).toBe('Diagnóstico: Fratura de Fêmur');
    });

    it('NÃO deve redactar "Coluna Vertebral"', () => {
      const text = 'Região: Coluna Vertebral';
      expect(anonymizeClinicalText(text)).toBe('Região: Coluna Vertebral');
    });

    it('NÃO deve redactar "Pós-Operatório"', () => {
      const text = 'Fase: Pós-Operatório';
      expect(anonymizeClinicalText(text)).toBe('Fase: Pós-Operatório');
    });
  });

  describe('casos combinados', () => {
    it('deve redactar múltiplos dados sensíveis', () => {
      const text = 'Paciente: João Silva, CPF: 123.456.789-00, Tel: (11) 99999-9999';
      const result = anonymizeClinicalText(text);
      expect(result).toContain('[PACIENTE]');
      expect(result).toContain('[CPF]');
      expect(result).toContain('[TELEFONE]');
    });

    it('deve redactar nome com título e data', () => {
      const text = 'Dr. João Silva, nascido em 15/03/1985';
      const result = anonymizeClinicalText(text);
      expect(result).toBe('[NOME], nascido em [DATA_NASC]');
    });
  });

  describe('idempotência', () => {
    it('deve ser idempotente (não redactar texto já anonimizado)', () => {
      const text = 'Paciente: [NOME], CPF: [EMAIL]';
      const result = anonymizeClinicalText(text);
      expect(result).toBe(text);
    });

    it('deve ser idempotente com múltiplos marcadores', () => {
      const text = '[NOME] [EMAIL] [TELEFONE] [CPF]';
      const result = anonymizeClinicalText(text);
      expect(result).toBe(text);
    });
  });

  describe('casos extremos', () => {
    it('deve retornar string vazia inalterada', () => {
      expect(anonymizeClinicalText('')).toBe('');
    });

    it('deve retornar null/undefined inalterado', () => {
      expect(anonymizeClinicalText(null as any)).toBe(null);
      expect(anonymizeClinicalText(undefined as any)).toBe(undefined);
    });

    it('deve retornar texto sem dados sensíveis inalterado', () => {
      const text = 'Paciente com fratura de fêmur, indicação de placa bloqueada';
      expect(anonymizeClinicalText(text)).toBe(text);
    });
  });
});

describe('isAnonymized', () => {
  it('deve detectar texto anonimizado com [NOME]', () => {
    expect(isAnonymized('Paciente: [NOME]')).toBe(true);
  });

  it('deve detectar texto anonimizado com [EMAIL]', () => {
    expect(isAnonymized('Email: [EMAIL]')).toBe(true);
  });

  it('deve detectar texto anonimizado com [DATA]', () => {
    expect(isAnonymized('Data: [DATA]')).toBe(true);
  });

  it('deve retornar false para texto não anonimizado', () => {
    expect(isAnonymized('João Silva')).toBe(false);
  });

  it('deve usar string.includes ao invés de regex', () => {
    const text = 'Texto com [NOME] e [EMAIL]';
    expect(isAnonymized(text)).toBe(true);
  });
});
/**
 * Anonimização LGPD — camada servidor (api/*).
 * Aplica-se a mensagens user/system (string ou multimodal).
 */

// Padrões existentes (mantidos para compatibilidade)
const NAME_PAIR =
  /\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g;
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE = /(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g;
const CPF = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;

// Padrões corrigidos
const PACIENTE_LINE = /^Paciente:\s*([^,\n]+)/gim;
const TUTOR_LINE = /^(?:Tutor\(a\)|Tutora|Tutor|Responsável)\s*:\s*([^,\n]+)/gim;
const CASO_PREFIX = /Caso:\s*[^\n,]+/gi;

// Novos padrões LGPD (adicionados)
const NAME_FULL = /\b(?:Dr\.|Dra\.|Sr\.|Sra\.|Prof\.|Profa\.)\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)+\b/g;
const PHONE_VARIANT = /(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g;
const PHONE_FULL = /\+?55\s?\(?\d{2}\)?\s?\d{4,5}[\s.-]?\d{4}/g;
const CPF_RAW = /\b\d{11}\b/g;
const MEDICAL_ID_PRESERVE_PREFIX = /(\b(?:ID|Prontuário|Número|Nº)[\s:#-]+)\d{3,10}\b/gi;
const MEDICAL_ID = /\b(?:PRM)[\s:#-]*\d{3,10}\b/gi;
const DATE_BR = /\b(nascido\s+em|nascida\s+em|nascimento\s+em|DOB:?\s*|Data de Nascimento:?\s*)\s*\d{2}\/\d{2}\/\d{4}\b/gi;
const DATE_ISO = /\b(nascido\s+em|nascida\s+em|nascimento\s+em|DOB:?\s*|Data de Nascimento:?\s*)\s*\d{4}-\d{2}-\d{2}\b/gi;
const DATE_STANDALONE = /\b\d{2}\/\d{2}\/\d{4}\b/g;

// Lista de termos clínicos que NÃO devem ser redactados como nomes
const CLINICAL_TERMS = [
  'Ortopedia', 'Veterinária', 'Veterinario', 'Cirurgia', 'Cirurgico',
  'Raio', 'Ultra', 'Ressonância', 'Tomografia', 'Placa', 'Parafuso',
  'Haste', 'Pino', 'Cortical', 'Esponjoso', 'Intra', 'Articular',
  'Pós', 'Pre', 'Operatório', 'Cirúrgico', 'Conservador', 'Crônico',
  'Agudo', 'Fratura', 'Luxação', 'Entorse', 'Tendão', 'Ligamento',
  'Fêmur', 'Tibia', 'Fibula', 'Umero', 'Radio', 'Ulna', 'Patela',
  'Pelve', 'Coluna', 'Vertebral', 'Cervical', 'Lombar', 'Torácica',
  'Direito', 'Esquerdo', 'Superior', 'Inferior', 'Anterior', 'Posterior',
  'Distal', 'Proximal', 'Segunda', 'Terça',
  'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo', 'Janeiro',
  'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
  'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Frases completas que não devem ser redigidas (comparação exata, não por palavra)
  const CLINICAL_PHRASES = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'];

/**
 * Verifica se um match de nome deve ser redactado (não é termo clínico).
 */
function shouldRedactName(match: string): boolean {
  const trimmed = match.trim();
  if (CLINICAL_PHRASES.some(phrase => phrase.toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }
  const words = trimmed.split(/\s+/);
  return !words.some(word => 
    CLINICAL_TERMS.some(term => 
      word.toLowerCase() === term.toLowerCase()
    )
  );
}

/**
 * Anonimiza texto clínico substituindo dados sensíveis por [REDACTED].
 * Aplica múltiplos padrões LGPD em sequência.
 * 
 * @param text - Texto a ser anonimizado
 * @returns Texto com dados sensíveis substituídos
 */
export function anonymizeClinicalText(text: string): string {
  if (typeof text !== 'string' || !text) return text;

  let result = text;

  // 1. Linhas de paciente e caso (ANTES de nomes para evitar conflito)
  result = result.replace(PACIENTE_LINE, (match, name) => {
    if (name.includes('[')) return match;
    return 'Paciente: [PACIENTE]';
  });
  result = result.replace(TUTOR_LINE, (match, name) => {
    if (name.includes('[')) return match;
    return 'Tutor: [TUTOR]';
  });
  result = result.replace(CASO_PREFIX, 'Caso: [CASO]');
  
  // 2. Datas de nascimento (ANTES de standalone para evitar conflito)
  result = result.replace(DATE_BR, (match, context) => {
    return `${context.trim()} [DATA_NASC]`;
  });
  result = result.replace(DATE_ISO, (match, context) => {
    return `${context.trim()} [DATA_NASC]`;
  });
  
  // 3. Números de prontuário/ID médico (com e sem preservação de prefixo)
  result = result.replace(MEDICAL_ID_PRESERVE_PREFIX, '$1[PRONTUARIO]');
  result = result.replace(MEDICAL_ID, '[PRONTUARIO]');
  
  // 4. CPF (formatado e não formatado)
  result = result.replace(CPF, '[CPF]');
  result = result.replace(CPF_RAW, '[CPF]');
  
  // 5. Telefones (formatos variados)
  result = result.replace(PHONE_FULL, '[TELEFONE]');
  result = result.replace(PHONE_VARIANT, '[TELEFONE]');
  
  // 6. Emails
  result = result.replace(EMAIL, '[EMAIL]');
  
  // 7. Nomes com abreviações (Dr., Dra., etc.)
  result = result.replace(NAME_FULL, '[NOME]');
  
  // 8. Nomes compostos (padrão original) - com verificação de termos clínicos
  result = result.replace(NAME_PAIR, (match) => 
    shouldRedactName(match) ? '[NOME]' : match
  );
  
  // 9. Datas standalone (DEPOIS de datas de nascimento, apenas se não for DATA_NASC)
  result = result.replace(DATE_STANDALONE, (match) => {
    return match.includes('DATA_NASC') ? match : '[DATA]';
  });

  return result;
}

/**
 * Verifica se o texto já está anonimizado (idempotência).
 */
export function isAnonymized(text: string): boolean {
  const markers = ['[NOME]', '[EMAIL]', '[TELEFONE]', '[CPF]', 
                   '[PACIENTE]', '[TUTOR]', '[CASO]', '[DATA_NASC]', '[PRONTUARIO]', '[DATA]'];
  return markers.some(marker => text.includes(marker));
}

export function anonymizeMessageContent(content: unknown): unknown {
  if (typeof content === 'string') {
    return anonymizeClinicalText(content);
  }
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (part && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string') {
        return { ...part, text: anonymizeClinicalText(part.text) };
      }
      return part;
    });
  }
  return content;
}

export function sanitizeAiMessages(
  messages: Array<{ role: string; content: unknown }>
): Array<{ role: string; content: unknown }> {
  return messages.map((msg) => {
    if (msg.role === 'user' || msg.role === 'system') {
      return { ...msg, content: anonymizeMessageContent(msg.content) };
    }
    return msg;
  });
}
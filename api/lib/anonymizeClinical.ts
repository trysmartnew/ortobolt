/**
 * Anonimização LGPD — camada servidor (api/*).
 * Aplica-se a mensagens user/system (string ou multimodal).
 */

const NAME_PAIR =
  /\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g;
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE = /(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g;
const CPF = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;
const PACIENTE_LINE = /^Paciente:\s*.+$/gim;
const CASO_PREFIX = /Caso:\s*[^\n,]+/gi;

export function anonymizeClinicalText(text: string): string {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(NAME_PAIR, '[NOME]')
    .replace(EMAIL, '[EMAIL]')
    .replace(PHONE, '[TELEFONE]')
    .replace(CPF, '[CPF]')
    .replace(PACIENTE_LINE, 'Paciente: [PACIENTE]')
    .replace(CASO_PREFIX, 'Caso: [CASO]');
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

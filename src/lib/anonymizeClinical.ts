/**
 * Anonimização LGPD — camada cliente (pré-envio ao proxy).
 * Espelha regras do servidor para defesa em profundidade.
 */

const NAME_PAIR =
  /\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g;
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE = /(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g;
const CPF = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;
const PACIENTE_LINE = /^Paciente:\s*.+$/gim;

export function anonymizeClinicalText(text: string): string {
  if (!text) return text;
  return text
    .replace(NAME_PAIR, '[NOME]')
    .replace(EMAIL, '[EMAIL]')
    .replace(PHONE, '[TELEFONE]')
    .replace(CPF, '[CPF]')
    .replace(PACIENTE_LINE, 'Paciente: [PACIENTE]');
}

export function anonymizePatientRef(
  name: string | undefined,
  id: string | undefined
): string {
  if (!name) return 'Paciente';
  return id ? `Paciente-${id.slice(-4).toUpperCase()}` : 'Paciente-XXXX';
}

export function anonymizeCaseContext(ctx: {
  patientName?: string;
  id?: string;
  species?: string;
  breed?: string;
  ageYears?: number;
  weightKg?: number;
  procedure?: string;
  status?: string;
  title?: string;
}): string {
  const ref = anonymizePatientRef(ctx.patientName, ctx.id);
  const parts = [
    ctx.title ? `Caso: ${ctx.title}` : null,
    `Paciente: ${ref}`,
    ctx.species,
    ctx.breed,
    ctx.ageYears != null ? `${ctx.ageYears}a` : null,
    ctx.weightKg != null ? `${ctx.weightKg}kg` : null,
    ctx.procedure ? `Procedimento: ${ctx.procedure}` : null,
    ctx.status ? `Status: ${ctx.status}` : null,
  ].filter(Boolean);
  return parts.join(', ');
}

type ContentPart = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
};

export function sanitizeProxyMessages<T extends { role: string; content: unknown }>(
  messages: T[]
): T[] {
  return messages.map((msg) => {
    if (msg.role !== 'user' && msg.role !== 'system') return msg;

    const content = msg.content;
    if (typeof content === 'string') {
      return { ...msg, content: anonymizeClinicalText(content) };
    }
    if (Array.isArray(content)) {
      return {
        ...msg,
        content: (content as ContentPart[]).map((part) =>
          part.type === 'text' && part.text
            ? { ...part, text: anonymizeClinicalText(part.text) }
            : part
        ),
      };
    }
    return msg;
  });
}

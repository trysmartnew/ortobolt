// api/ai.ts — Vercel Serverless Function (Node.js Runtime)
// ✅ Fallback automático: DeepSeek (primário) → Llama 4 Maverick (fallback)
// ✅ Retry 3x por modelo em caso de 429/503/500
// ✅ OPENROUTER_API_KEY apenas no servidor (process.env)

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Modelos ───────────────────────────────────────────────────────────────────
const PRIMARY_MODEL  = 'deepseek/deepseek-chat-v3-0324:free';
const FALLBACK_MODEL = 'meta-llama/llama-4-maverick:free';

// Whitelist — aceita também o modelo legado para não quebrar clientes antigos
const ALLOWED_MODELS = [
  PRIMARY_MODEL,
  FALLBACK_MODEL,
  'google/gemma-4-31b-it:free', // legado — roteado para o primário
] as const;
type AllowedModel = typeof ALLOWED_MODELS[number];

// ── Anonimizador LGPD ────────────────────────────────────────────────────────
function anonymizeCaseContext(ctx: string): string {
  if (typeof ctx !== 'string') return ctx;
  return ctx
    .replace(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g, '[NOME]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g, '[TELEFONE]')
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF]');
}

// ── Chamada OpenRouter com retry ──────────────────────────────────────────────
async function callOpenRouter(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens: number,
  key: string
): Promise<Response> {
  const maxAttempts = 3;
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ortobolt.vercel.app',
          'X-Title': 'OrtoBolt - Veterinary Orthopedics',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      });

      // Sucesso ou erro não-retryable → retorna imediatamente
      if (response.status !== 429 && response.status !== 503) {
        return response;
      }
      lastResponse = response;
    } catch (err) {
      lastError = err;
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error('OpenRouter unreachable');
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://ortobolt.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ];
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Chave
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error('[AI Proxy] OPENROUTER_API_KEY não configurada');
    return res.status(500).json({ error: 'OpenRouter API key not configured on server' });
  }

  try {
    const body = req.body as {
      model: string;
      messages: { role: string; content: unknown }[];
      max_tokens?: number;
    };

    // 3. Whitelist
    if (!ALLOWED_MODELS.includes(body.model as AllowedModel)) {
      return res.status(400).json({ error: `Modelo não permitido: ${body.model}` });
    }

    // 4. Payload size
    if (JSON.stringify(body).length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large (max 5MB)' });
    }

    // 5. LGPD
    const sanitizedMessages = body.messages.map((msg) => {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        return { ...msg, content: anonymizeCaseContext(msg.content) };
      }
      return msg;
    });

    const maxTokens = Math.min(body.max_tokens ?? 1000, 1000);

    // 6. Primário
    let response: Response;
    try {
      response = await callOpenRouter(PRIMARY_MODEL, sanitizedMessages, maxTokens, key);
    } catch (err) {
      console.error('[AI Proxy] Primary network error:', err);
      response = new Response(null, { status: 503 });
    }

    // 7. Fallback (429, 503, 500 ou erro de rede)
    if (!response.ok && [429, 503, 500].includes(response.status)) {
      console.warn(
        `[AI Proxy] Primary ${PRIMARY_MODEL} failed (${response.status}). Fallback → ${FALLBACK_MODEL}`
      );
      try {
        response = await callOpenRouter(FALLBACK_MODEL, sanitizedMessages, maxTokens, key);
      } catch (err) {
        console.error('[AI Proxy] Fallback network error:', err);
        return res.status(503).json({ error: 'All providers unreachable' });
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI Proxy] Final error ${response.status}: ${errText}`);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[AI Proxy] Internal error:', msg);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

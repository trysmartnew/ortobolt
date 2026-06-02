// api/ai.ts — Vercel Serverless Function (Node.js Runtime)
// ✅ Gemini API direta — 1.500 req/dia free, sem OpenRouter
// ✅ Cascade: gemini-2.5-flash-lite (primary) → gemini-2.5-flash (fallback)
// ✅ OpenAI-compatible endpoint do Google
// ✅ GEMINI_API_KEY apenas no servidor

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Modelos Gemini (OpenAI-compatible) ───────────────────────────────────────
const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/openai';
const PRIMARY_MODEL  = 'gemini-2.5-flash-lite';
const FALLBACK_MODEL = 'gemini-2.5-flash';

// ── Anonimizador LGPD ────────────────────────────────────────────────────────
function anonymizeCaseContext(ctx: string): string {
  if (typeof ctx !== 'string') return ctx;
  return ctx
    .replace(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g, '[NOME]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g, '[TELEFONE]')
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF]');
}

// ── Chamada Gemini com retry ──────────────────────────────────────────────────
async function callGemini(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens: number,
  key: string,
  stream = false
): Promise<Response> {
  const maxAttempts = 3;
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${GEMINI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          ...(stream && { stream: true }),
        }),
      });

      if (response.status !== 429 && response.status !== 503 && response.status !== 500) {
        return response;
      }
      lastResponse = response;
    } catch (err) {
      lastError = err;
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error('Gemini unreachable');
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
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('[AI Proxy] GEMINI_API_KEY não configurada');
    return res.status(500).json({ error: 'Gemini API key not configured on server' });
  }

  try {
    const body = req.body as {
      model?: string;
      messages: { role: string; content: unknown }[];
      max_tokens?: number;
      stream?: boolean;
    };

    // 3. Payload size
    if (JSON.stringify(body).length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large (max 5MB)' });
    }

    // 4. LGPD
    const sanitizedMessages = body.messages.map((msg) => {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        return { ...msg, content: anonymizeCaseContext(msg.content) };
      }
      return msg;
    });

    const maxTokens = Math.min(body.max_tokens ?? 1000, 1000);
    const isStream  = body.stream === true;

    // 5. Stream SSE
    if (isStream) {
      let streamRes = await callGemini(PRIMARY_MODEL, sanitizedMessages, maxTokens, key, true).catch(
        () => new Response(null, { status: 503 })
      );

      if (!streamRes.ok && [429, 503, 500].includes(streamRes.status)) {
        console.warn(`[AI Proxy] Stream primary failed (${streamRes.status}). Fallback → ${FALLBACK_MODEL}`);
        streamRes = await callGemini(FALLBACK_MODEL, sanitizedMessages, maxTokens, key, true).catch(
          () => new Response(null, { status: 503 })
        );
      }

      if (!streamRes.ok) {
        const errText = await streamRes.text();
        return res.status(streamRes.status).json({ error: errText });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      const reader = streamRes.body!.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
      return;
    }

    // 6. Request normal — Primary
    let response: Response;
    try {
      response = await callGemini(PRIMARY_MODEL, sanitizedMessages, maxTokens, key);
    } catch (err) {
      console.error('[AI Proxy] Primary network error:', err);
      response = new Response(null, { status: 503 });
    }

    // 7. Fallback
    if (!response.ok && [429, 503, 500].includes(response.status)) {
      console.warn(`[AI Proxy] Primary failed (${response.status}). Fallback → ${FALLBACK_MODEL}`);
      try {
        response = await callGemini(FALLBACK_MODEL, sanitizedMessages, maxTokens, key);
      } catch (err) {
        console.error('[AI Proxy] Fallback network error:', err);
        return res.status(503).json({ error: 'All Gemini providers unreachable' });
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
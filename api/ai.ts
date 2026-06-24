// api/ai.ts — Vercel Serverless Function (Node.js Runtime)
// Gemini API via proxy — cascade flash-lite → flash

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySupabaseBearer } from './lib/verifySupabaseJwt.js';
import { sanitizeAiMessages } from './lib/anonymizeClinical.js';
import { checkRateLimit, userIdFromBearer } from './lib/rateLimit.js';
import { applyCors } from './lib/cors.js';

const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';
const PRIMARY_MODEL = 'gemini-2.5-flash-lite';
const FALLBACK_MODEL = 'gemini-2.5-flash';

async function callGemini(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens: number,
  key: string,
  options: { stream?: boolean; jsonMode?: boolean } = {}
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
          ...(options.stream && { stream: true }),
          ...(options.jsonMode && { response_format: { type: 'json_object' } }),
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin || '');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifySupabaseBearer(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : req.headers.authorization?.[0];
  const userId = userIdFromBearer(authHeader);
  const rl = checkRateLimit(`ai:${userId}`, RL_MAX, RL_WINDOW_MS);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({
      error: `Taxa de requisicoes excedida. Aguarde ${rl.retryAfter}s.`,
    });
  }

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
      json_mode?: boolean;
    };

    if (JSON.stringify(body).length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large (max 5MB)' });
    }

    const sanitizedMessages = sanitizeAiMessages(body.messages);
    const maxTokens = Math.min(body.max_tokens ?? 1000, 1000);
    const isStream = body.stream === true;
    const jsonMode = body.json_mode === true;

    if (isStream) {
      let streamRes = await callGemini(
        PRIMARY_MODEL,
        sanitizedMessages,
        maxTokens,
        key,
        { stream: true }
      ).catch(() => new Response(null, { status: 503 }));

      if (!streamRes.ok && [429, 503, 500].includes(streamRes.status)) {
        console.warn(
          `[AI Proxy] Stream primary failed (${streamRes.status}). Fallback → ${FALLBACK_MODEL}`
        );
        streamRes = await callGemini(FALLBACK_MODEL, sanitizedMessages, maxTokens, key, {
          stream: true,
        }).catch(() => new Response(null, { status: 503 }));
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

    let response: Response;
    try {
      response = await callGemini(PRIMARY_MODEL, sanitizedMessages, maxTokens, key, { jsonMode });
    } catch (err) {
      console.error('[AI Proxy] Primary network error:', err);
      response = new Response(null, { status: 503 });
    }

    if (!response.ok && [429, 503, 500].includes(response.status)) {
      console.warn(
        `[AI Proxy] Primary failed (${response.status}). Fallback → ${FALLBACK_MODEL}`
      );
      try {
        response = await callGemini(FALLBACK_MODEL, sanitizedMessages, maxTokens, key, {
          jsonMode,
        });
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

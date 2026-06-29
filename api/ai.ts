// api/ai.ts — Vercel Serverless Function (Node.js Runtime)
// Real-time fallback chain: Gemini Flash Lite → Gemini Flash → OpenRouter → Groq

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySupabaseBearer } from './lib/verifySupabaseJwt.js';
import { sanitizeAiMessages } from './lib/anonymizeClinical.js';
import { checkRateLimit, userIdFromBearer } from './lib/rateLimit.js';
import { applyCors } from './lib/cors.js';

const RL_WINDOW_MS = 60_000;
const RL_MAX = 30; // Rate limit per user, per minute

// Provider Endpoints
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

// Fallback Model Chain
const PRIMARY_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';
const OPENROUTER_MODEL = 'openai/gpt-4o'; // Standard model name for OpenRouter
const GROQ_MODEL = 'llama3-70b-8192'; // Standard model name for Groq

const OPENROUTER_REFERRER = 'https://ortobolt.vercel.app';

// --- API Callers with Retry Logic ---

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
      const response = await fetch(GEMINI_BASE, {
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

async function callOpenRouter(
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
      const response = await fetch(OPENROUTER_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': OPENROUTER_REFERRER,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
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
  throw lastError ?? new Error('OpenRouter unreachable');
}

async function callGroq(
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
      const response = await fetch(GROQ_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
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
  throw lastError ?? new Error('Groq unreachable');
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

  const { GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY } = process.env;

  try {
    const body = req.body as {
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

    let response: Response | null = null;
    const options = { stream: isStream, jsonMode };

    // --- Fallback Chain ---
    
    // 1. Gemini Primary
    if (GEMINI_API_KEY) {
      console.log('[AI Proxy] Trying provider: Gemini Primary');
      response = await callGemini(PRIMARY_MODEL, sanitizedMessages, maxTokens, GEMINI_API_KEY, options)
        .catch(err => {
          console.warn(`[AI Proxy] Gemini Primary failed (network error: ${err.message})`);
          return null;
        });
    }

    // 2. Gemini Fallback
    if (GEMINI_API_KEY && (!response || !response.ok)) {
      if(response) console.warn(`[AI Proxy] Gemini Primary failed (status: ${response.status})`);
      console.log('[AI Proxy] Falling back to: Gemini Fallback');
      response = await callGemini(GEMINI_FALLBACK_MODEL, sanitizedMessages, maxTokens, GEMINI_API_KEY, options)
        .catch(err => {
          console.warn(`[AI Proxy] Gemini Fallback failed (network error: ${err.message})`);
          return null;
        });
    }

    // 3. OpenRouter
    if (OPENROUTER_API_KEY && (!response || !response.ok)) {
      if(response) console.warn(`[AI Proxy] Gemini Fallback failed (status: ${response.status})`);
      console.log('[AI Proxy] Falling back to: OpenRouter');
      response = await callOpenRouter(sanitizedMessages, maxTokens, OPENROUTER_API_KEY, options)
        .catch(err => {
          console.warn(`[AI Proxy] OpenRouter failed (network error: ${err.message})`);
          return null;
        });
    }

    // 4. Groq
    if (GROQ_API_KEY && (!response || !response.ok)) {
       if(response) console.warn(`[AI Proxy] OpenRouter failed (status: ${response.status})`);
       console.log('[AI Proxy] Falling back to: Groq');
       response = await callGroq(sanitizedMessages, maxTokens, GROQ_API_KEY, options)
        .catch(err => {
          console.warn(`[AI Proxy] Groq failed (network error: ${err.message})`);
          return null;
        });
    }

    // --- End of Fallback Chain ---

    if (!response || !response.ok) {
      if(response) console.warn(`[AI Proxy] Groq failed (status: ${response.status})`);
      console.error('[AI Proxy] All providers failed');
      return res.status(503).json({ error: 'All AI providers unavailable. Please try again in a few moments.' });
    }

    // Handle successful response
    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      const reader = response.body!.getReader();
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
    } else {
      const data = await response.json();
      return res.status(200).json(data);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[AI Proxy] Internal error:', msg);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

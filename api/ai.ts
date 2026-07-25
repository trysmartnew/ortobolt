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

// Fallback Model Chains (consolidated 8-briefing, Jul 2026)
interface ChainStep {
  provider: 'google' | 'groq' | 'openrouter';
  model: string;
}

const MULTIMODAL_CHAIN: ChainStep[] = [
  { provider: 'google', model: 'gemini-2.5-flash-lite' },
  { provider: 'google', model: 'gemini-3.1-flash-lite' },
  { provider: 'groq', model: 'qwen/qwen3.6-27b' },
  { provider: 'openrouter', model: 'google/gemma-4-31b-it:free' },
];

const TEXT_ONLY_CHAIN: ChainStep[] = [
  { provider: 'google', model: 'gemini-2.5-flash-lite' },
  { provider: 'groq', model: 'openai/gpt-oss-20b' },
  { provider: 'openrouter', model: 'nvidia/nemotron-nano-9b-v2:free' },
];

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
          reasoning_effort: 'none',
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
      const response = await fetch(OPENROUTER_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': OPENROUTER_REFERRER,
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
  throw lastError ?? new Error('OpenRouter unreachable');
}

async function callGroq(
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
      const response = await fetch(GROQ_BASE, {
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

    // S1: Detect multimodal request
    const isMultimodal = sanitizedMessages.some(
      (msg) => Array.isArray(msg.content) && msg.content.some((p: any) => p.type === 'image_url')
    );

    // S2: Structured JSON output (multimodal only)
    const finalMessages = isMultimodal
      ? [{
          role: 'system',
          content: `In addition to the clinical analysis text, append a structured JSON object with all identified geometric markings. The JSON object must follow this schema: { "markings": { "circles": [], "angles": [] } }. Enclose this JSON object in a markdown code block like this: \`\`\`json\n{...json...}\n\`\`\``
        }, ...sanitizedMessages]
      : sanitizedMessages;

    const maxTokens = Math.min(body.max_tokens ?? 4096, 8192);
    const isStream = body.stream === true;
    const jsonMode = body.json_mode === true;

    let response: Response | null = null;
    const options = { stream: isStream, jsonMode };

    // --- Fallback Chain (consolidated 8-briefing + FASE 3) ---
    const chain = isMultimodal ? MULTIMODAL_CHAIN : TEXT_ONLY_CHAIN;

    for (const step of chain) {
      const apiKey = step.provider === 'google' ? GEMINI_API_KEY
        : step.provider === 'groq' ? GROQ_API_KEY : OPENROUTER_API_KEY;
      if (!apiKey) { console.log(`[AI Proxy] Skip ${step.model}: no key`); continue; }
      if (response) console.warn(`[AI Proxy] Prev failed (${response.status})`);
      console.log(`[AI Proxy] Trying: ${step.model} (${step.provider})`);
      response = await (step.provider === 'google'
        ? callGemini(step.model, finalMessages, maxTokens, apiKey, options)
        : step.provider === 'groq'
        ? callGroq(step.model, finalMessages, maxTokens, apiKey, options)
        : callOpenRouter(step.model, finalMessages, maxTokens, apiKey, options)
      ).catch(err => {
        console.warn(`[AI Proxy] ${step.model} net-err: ${err.message}`);
        return null;
      });

      if (!response || !response.ok) continue;

      // FASE 3: Truncation + JSON validation (non-streaming only)
      if (!isStream) {
        try {
          const data = await response.clone().json();
          const fr = data.choices?.[0]?.finish_reason || data.candidates?.[0]?.finishReason || '';
          if (fr === 'length' || fr === 'MAX_TOKENS' || fr === 'max_tokens') {
            console.warn(`[AI Proxy] ${step.model} truncated (${fr}), trying next`);
            continue;
          }
          if (isMultimodal) {
            const txt = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (!txt.includes('```json')) {
              console.warn(`[AI Proxy] ${step.model}: no JSON block, trying next`);
              continue;
            }
          }
        } catch { /* parse error - accept response */ }
      }
      break;
    }
    // --- End of Fallback Chain ---

    if (!response || !response.ok) {
      if(response) console.warn(`[AI Proxy] Last provider failed (status: ${response.status})`);
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

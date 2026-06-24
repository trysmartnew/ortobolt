// api/embeddings.ts — Vercel Serverless Function para Embeddings (Gemini)
import type { VercelRequest, VercelResponse } from '@vercel/node';



import { verifySupabaseBearer } from './lib/verifySupabaseJwt.js';
import { checkRateLimit, userIdFromBearer } from './lib/rateLimit.js';
import { applyCors } from './lib/cors.js';

const RL_WINDOW_MS = 60_000;
const RL_MAX = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res, req.headers.origin || '');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifySupabaseBearer(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : req.headers.authorization?.[0];
  const userId = userIdFromBearer(authHeader);
  const rl = checkRateLimit(`emb:${userId}`, RL_MAX, RL_WINDOW_MS);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({
      error: `Taxa de requisicoes excedida. Aguarde ${rl.retryAfter}s.`,
    });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('[Embeddings] GEMINI_API_KEY não configurada');
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }

  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text' });
    }

    const truncatedText = text.length > 8000 ? text.slice(0, 8000) : text;

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: truncatedText }] },
        outputDimensionality: 768,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Embeddings] Final error ${response.status}: ${err}`);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();

    if (!data.embedding?.values || !Array.isArray(data.embedding.values)) {
      return res.status(500).json({ error: 'Invalid embedding response structure' });
    }

    return res.status(200).json({
      embedding: data.embedding.values,
      dimensions: data.embedding.values.length,
      model: 'gemini-embedding-001',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Embeddings] Internal error:', msg);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// api/ai.ts — Vercel Serverless Function
// ✅ C-01: Chave OpenRouter NUNCA vai ao cliente — fica 100% no servidor
// ✅ C-04: Anonimização de dados clínicos aplicada aqui antes do envio à IA
// ✅ STREAM: Suporte a SSE — elimina timeout de 60s em prompts longos

import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { maxDuration: 60 };

const ALLOWED_MODELS = ['qwen/qwen3-vl-235b-a22b-thinking'] as const;

// ── Anonimizador LGPD ──────────────────────────────────────────────────────
function anonymizeCaseContext(ctx: string): string {
  return ctx
    .replace(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g, '[NOME]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[TELEFONE]')
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF]');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS sempre primeiro
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

  // 2. Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'OpenRouter API key not configured on server.' });
  }

  try {
    const body = req.body as {
      model: string;
      messages: { role: string; content: unknown }[];
      max_tokens?: number;
      stream?: boolean;
    };

    if (!ALLOWED_MODELS.includes(body.model as typeof ALLOWED_MODELS[number])) {
      return res.status(400).json({ error: `Modelo não permitido: ${body.model}` });
    }

    const sanitizedMessages = body.messages.map((msg) => {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        return { ...msg, content: anonymizeCaseContext(msg.content) };
      }
      return msg;
    });

    const isStream = body.stream === true;

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ortobolt.vercel.app',
        'X-Title': 'OrtoBolt - Veterinary Orthopedics',
      },
      body: JSON.stringify({
        model: body.model,
        messages: sanitizedMessages,
        max_tokens: body.max_tokens ?? 8000,
        stream: isStream,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: errText });
    }

    // ── Modo streaming: pipar SSE direto ao cliente ──────────────────────────
    if (isStream && upstream.body) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
      return res.end();
    }

    // ── Modo normal (analyzeImage, getCaseAISuggestion) ──────────────────────
    const data = await upstream.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('AI proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

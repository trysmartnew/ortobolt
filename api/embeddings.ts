// api/embeddings.ts — Vercel Serverless Function para Embeddings (Gemini)
// ✅ Mesma arquitetura de auth/CORS/fallback do api/ai.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://ortobolt.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
  ];
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    // Truncar texto muito longo (limite Gemini ~30k tokens)
    const truncatedText = text.length > 8000 ? text.slice(0, 8000) : text;

    // Endpoint oficial Gemini Embeddings
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`;

    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: truncatedText }] },
        outputDimensionality: 768
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Embeddings] Final error ${response.status}: ${err}`);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    
    // Validar estrutura da resposta
    if (!data.embedding?.values || !Array.isArray(data.embedding.values)) {
      return res.status(500).json({ error: 'Invalid embedding response structure' });
    }

    return res.status(200).json({ 
      embedding: data.embedding.values,
      dimensions: data.embedding.values.length,
      model: 'gemini-embedding-001'
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Embeddings] Internal error:', msg);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



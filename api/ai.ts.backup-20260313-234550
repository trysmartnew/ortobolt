// api/ai.ts — Vercel Serverless Function (Node.js)
// ✅ REMOVIDO: runtime: 'edge' — usando Node.js para streaming
// ✅ OPENROUTER_API_KEY fica apenas no servidor (process.env)
// ✅ SUPORTA STREAMING via SSE (Server-Sent Events)
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Whitelist de modelos permitidos — impede uso indevido da chave
const ALLOWED_MODELS = ['qwen/qwen3-vl-235b-a22b-thinking'] as const;
type AllowedModel = typeof ALLOWED_MODELS[number];

// Anonimizador LGPD — remove dados identificáveis antes de enviar à IA
function anonymizeCaseContext(ctx: string): string {
  if (typeof ctx !== 'string') return ctx;
  return ctx
    // Mascarar nomes próprios
    .replace(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g, '[NOME]')
    // Mascarar e-mails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Mascarar telefones
    .replace(/(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g, '[TELEFONE]')
    // Mascarar CPF/CNPJ
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF]');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS — SEMPRE primeiro (ANTES de validar método)
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

  // 2. Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Validar método principal
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 4. Validar chave API (deve vir do ambiente Vercel, NÃO do cliente)
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error('[AI Proxy] OPENROUTER_API_KEY não configurada no servidor');
    return res.status(500).json({ error: 'OpenRouter API key not configured on server' });
  }

  try {
    const body = req.body as {
      model: string;
      messages: { role: string; content: unknown }[];
      max_tokens?: number;
      stream?: boolean;
    };

    // 5. Whitelist de modelos — rejeita qualquer modelo não autorizado
    if (!ALLOWED_MODELS.includes(body.model as AllowedModel)) {
      return res.status(400).json({ error: `Modelo não permitido: ${body.model}` });
    }

    // 6. Limitar tamanho do payload (evita DoS)
    const payloadSize = JSON.stringify(body).length;
    if (payloadSize > 5 * 1024 * 1024) { // 5MB
      return res.status(413).json({ error: 'Payload too large (max 5MB)' });
    }

    // 7. Anonimização LGPD — aplica em mensagens do usuário
    const sanitizedMessages = body.messages.map((msg) => {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        return { ...msg, content: anonymizeCaseContext(msg.content) };
      }
      return msg;
    });

    // 8. Request para OpenRouter
    const streamEnabled = body.stream === true;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        stream: streamEnabled,
        max_tokens: body.max_tokens ?? 1200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI Proxy] OpenRouter error: ${response.status} ${errText}`);
      return res.status(response.status).json({ error: errText });
    }

    // 9. ✅ STREAMING: Se stream=true, encaminhar o stream diretamente
    if (streamEnabled && response.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Encaminhar chunks do OpenRouter para o cliente
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Enviar chunk para o cliente
        res.write(chunk);
      }

      res.end();
      return;
    }

    // 10. Modo normal (JSON): analyzeImage, getCaseAISuggestion
    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[AI Proxy] Internal server error:', msg);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
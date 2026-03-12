// api/ai.ts — Vercel Serverless Function
// ✅ C-01: Chave OpenRouter NUNCA vai ao cliente — fica 100% no servidor
// ✅ C-04: Anonimização de dados clínicos aplicada aqui antes do envio à IA
//
// SETUP:
//   1. Criar este arquivo em /api/ai.ts na raiz do projeto
//   2. No painel Vercel → Settings → Environment Variables:
//      Adicionar: OPENROUTER_API_KEY = sk-or-v1-...  (SEM prefixo VITE_)
//   3. No .env.local manter apenas:
//      VITE_SUPABASE_URL=...
//      VITE_SUPABASE_ANON_KEY=...
//      (Remover VITE_OPENROUTER_API_KEY)

import type { VercelRequest, VercelResponse } from '@vercel/node';

const OR_BASE = 'https://openrouter.ai/api/v1';

// ✅ Q-01: Whitelist de modelos permitidos — rejeitar qualquer outro
// Isso impede que um atacante use a função serverless como proxy aberto
// para outros modelos da OpenRouter às custas da chave do OrtoBolt.
const ALLOWED_MODELS = ['qwen/qwen3-vl-235b-a22b-thinking'] as const;

// ── Anonimizador LGPD ──────────────────────────────────────────────────────
// C-04: Remove/mascara campos que possam identificar tutores ou pacientes
function anonymizeCaseContext(ctx: string): string {
  return ctx
    // Mascarar nomes próprios (padrão Maiúscula Minúsculas)
    .replace(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g, '[NOME]')
    // Mascarar possíveis e-mails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Mascarar possíveis telefones
    .replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[TELEFONE]')
    // Mascarar CPF/CNPJ
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF]');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração CORS SEMPRE primeiro (ANTES de validar método)
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

  // 2. Preflight CORS ANTES de qualquer validação de método
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. SÓ ENTÃO valida método principal
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 4. Validação da chave API
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'OpenRouter API key not configured on server.' });
  }

  try {
    const body = req.body as {
      model: string;
      messages: { role: string; content: unknown }[];
      max_tokens?: number;
      caseContext?: string;
    };

    // Whitelist de modelos
    const ALLOWED_MODELS = ['qwen/qwen3-vl-235b-a22b-thinking'] as const;
    if (!ALLOWED_MODELS.includes(body.model as typeof ALLOWED_MODELS[number])) {
      return res.status(400).json({ error: `Modelo não permitido: ${body.model}` });
    }

    // Anonimização LGPD
    const sanitizedMessages = body.messages.map((msg) => {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        return { ...msg, content: anonymizeCaseContext(msg.content) };
      }
      return msg;
    });

    // Request para OpenRouter
    const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
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
        max_tokens: body.max_tokens ?? 1200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (err) {
    console.error('AI proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
// api/ai.ts — versão CORRIGIDA
// ✅ BUG-01 FIX: stream === true  (não ?? true)
// ✅ BUG-02 FIX: ALLOWED_MODELS whitelist
// ✅ BUG-03 FIX: max_tokens respeita o cliente
// ✅ BUG-04 FIX: IncomingMessage type — sem any

export const config = {
  runtime: 'edge',
};

// ✅ BUG-04 FIX: tipo explícito para mensagens recebidas
type IncomingMessage = {
  role: string;
  content: unknown;
};

// ✅ BUG-02 FIX: whitelist — rejeita qualquer modelo não autorizado
const ALLOWED_MODELS = ['qwen/qwen3-vl-235b-a22b-thinking'] as const;
type AllowedModel = typeof ALLOWED_MODELS[number];

// ── Anonimizador LGPD ──────────────────────────────────────────────────────
function anonymizeCaseContext(ctx: string): string {
  if (typeof ctx !== 'string') return ctx;
  return ctx
    .replace(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\s([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)\b/g, '[NOME]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[TELEFONE]')
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF]');
}

export default async function handler(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://ortobolt.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ];

  const headers = new Headers({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  if (allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await req.json() as {
      model: string;
      messages: IncomingMessage[];
      max_tokens?: number;
      stream?: boolean;
    };

    const { model, messages, max_tokens, stream } = body;

    // ✅ BUG-02 FIX: rejeita modelos não autorizados
    if (!ALLOWED_MODELS.includes(model as AllowedModel)) {
      return new Response(
        JSON.stringify({ error: `Modelo não permitido: ${model}` }),
        {
          status: 400,
          headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
        }
      );
    }

    // ✅ BUG-04 FIX: IncomingMessage — sem any
    const sanitizedMessages = messages.map((m: IncomingMessage) => ({
      ...m,
      content:
        m.role === 'user' && typeof m.content === 'string'
          ? anonymizeCaseContext(m.content)
          : m.content,
    }));

    // ✅ BUG-01 FIX: default FALSE — só streama se cliente pedir explicitamente
    const isStream = stream === true;

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ortobolt.vercel.app',
        'X-Title': 'OrtoBolt AI Assistant',
      },
      body: JSON.stringify({
        model,
        messages: sanitizedMessages,
        stream: isStream,
        // ✅ BUG-03 FIX: respeita max_tokens do cliente (800 ou 8000)
        max_tokens: max_tokens ?? 8000,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: upstream.status,
        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
      });
    }

    // ✅ BUG-01 FIX: só entra aqui se isStream for verdadeiro
    if (isStream) {
      headers.set('Content-Type', 'text/event-stream; charset=utf-8');
      headers.set('Cache-Control', 'no-cache');
      return new Response(upstream.body, { status: 200, headers });
    }

    // Modo normal: analyzeImage, getCaseAISuggestion recebem JSON
    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    // ✅ BUG-04 FIX: unknown em vez de any
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Edge Function error:', msg);
    return new Response(
      JSON.stringify({ error: 'Erro interno no processamento da IA' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
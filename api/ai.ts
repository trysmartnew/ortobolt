// 1. Definir o runtime como 'edge' para suportar streams longos
export const config = {
  runtime: 'edge',
};

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
  // 2. Configuração de CORS para Edge
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://ortobolt.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ];

  const headers = new Headers({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  if (allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  // 3. Resposta de Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const body = await req.json();
    const { model, messages, stream } = body;

    // Anonimizar mensagens do usuário antes de enviar para a IA
    const sanitizedMessages = messages.map((m: any) => ({
      ...m,
      content: m.role === 'user' ? anonymizeCaseContext(m.content) : m.content
    }));

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ortobolt.vercel.app',
        'X-Title': 'OrtoBolt AI Assistant',
      },
      body: JSON.stringify({
        model,
        messages: sanitizedMessages,
        stream: stream ?? true,
        max_tokens: 16000, // Margem para o "Thinking" do modelo
        temperature: 0.7,
      }),
    });

    // 4. Repasse do Stream ou JSON
    if (stream) {
      headers.set('Content-Type', 'text/event-stream; charset=utf-8');
      return new Response(openRouterResponse.body, { status: 200, headers });
    }

    const data = await openRouterResponse.json();
    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Erro na Edge Function:', error);
    return new Response(JSON.stringify({ error: 'Erro interno no processamento da IA' }), { 
      status: 500, 
      headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' } 
    });
  }
}
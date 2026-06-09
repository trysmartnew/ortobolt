export async function callGroq(prompt: string): Promise<string> {
  // Modelo menor para economizar tokens: llama-3.1-8b-instant
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq Error: ${res.status} - ${errorText}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function callOpenRouter(prompt: string): Promise<string> {
  // Modelo gratuito funcional: Llama 3.1 8B Instruct
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "OrtoBolt"
    },
    body: JSON.stringify({
      model: "qwen/qwen3-8b:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter Error: ${res.status} - ${errorText}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function callGemini(prompt: string): Promise<string> {
  // Modelo mais estável no free tier: gemini-2.0-flash (em vez de 2.5)
  const apiKey = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.1, 
        responseMimeType: "application/json",
        maxOutputTokens: 32768
      }
    })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini Error: ${res.status} - ${errorText}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
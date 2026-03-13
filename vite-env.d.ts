/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // ❌ NUNCA adicionar VITE_OPENROUTER_API_KEY aqui
  // A chave deve ficar apenas no servidor (/api/ai.ts)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
# OrtoBolt

SaaS de suporte clínico para ortopedia veterinária.

## Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind v4
- Backend: Supabase (Auth, Database, Storage, Edge Functions)
- Deploy: Vercel
- Testes: Vitest

## Requisitos
- Node.js 18+ | npm 9+

## Instalação
```bash
npm install
```

## Variáveis de Ambiente
Crie `.env.local` na raiz com:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Scripts
- `npm run dev` (Desenvolvimento)
- `npm run build` (Build produção)
- `npm run test` (Testes)
- `npm run lint` (Lint)
- `npx tsc --noEmit` (Type check)

## Estrutura
- `src/` (frontend: components, contexts, pages, services, types, utils)
- `api/lib/` (Supabase Edge Functions)

## Deploy
Automático via Vercel ao push para `main`.

## Licença
Privado.

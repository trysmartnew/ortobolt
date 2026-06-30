# OrtoBolt — Instruções para o Agente

## Stack
React 19 + TypeScript + Vite + Tailwind v4 + Supabase + Vercel

## Projeto
- Local: C:\Dev\OrtoBolt
- Deploy: Vercel (push → main) | github.com/trysmartnew/ortobolt
- OS: Windows 10 Pro + PowerShell 7

## Prioridades (ordem de decisão)
1. Incremental — uma mudança por vez, escopo mínimo
2. Baixo risco — sem refatoração fora do escopo solicitado
3. Idempotência — operações seguras para reexecução
4. Memoização — useMemo/useCallback onde aplicável
5. Segurança estrutural — JWT server-side, RLS ativo, sem dados expostos
6. Estabilidade operacional — nunca quebrar o que já funciona

## Regras obrigatórias

### Edição de arquivos
1. Dry-run antes de qualquer escrita
2. Validar exact-match-count = 1 (abortar se ≠ 1)
3. Criar backup .bkp antes de aplicar
4. Após qualquer mudança: `npx tsc --noEmit` → `npm run build`

### PowerShell 7
- `Select-String` (não grep)
- `Copy-Item` (não cp)
- Aspas simples em paths
- `curl.exe -4` para chamadas HTTP (não Invoke-RestMethod)

### Proibido
- Mocks, placeholders, dados fictícios, TODOs
- Refatorações fora do escopo solicitado
- Commitar: .py, .ps1, .bkp, .json de auditoria

### Paths canônicos
- `src/contexts/`
- `src/services/supabase.ts`
- `api/lib/verifySupabaseJwt.ts`
- `src/pages/`
- `api/ai.ts`, `api/embeddings.ts`

### Deploy (ordem obrigatória)
1. `git pull origin main`
2. `npx tsc --noEmit`
3. `npm run build`
4. `git add` (arquivos específicos — nunca `git add .`)
5. `git commit -m "type: descrição"`
6. `git push origin main`

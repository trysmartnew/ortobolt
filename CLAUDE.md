# OrtoBolt - Development & AI Agent Rules

## 💻 Ambiente & Stack
- **Repositório:** github.com/trysmartnew/ortobolt
- **Local:** `C:\Dev\OrtoBolt`
- **SO:** Windows 10 Pro + PowerShell 7
- **Comandos PS7:** Use obrigatoriamente `Select-String` (nunca grep) e `Copy-Item` (nunca cp).
- **Stack:** React 19 · TypeScript strict · Vite · Tailwind v4 + tailwind.config.js centralizado · Supabase · Vercel serverless
- **Integridade:** Zero mocks, placeholders ou dados fictícios. Tudo deve ser implementado de forma real e funcional.

## 🚀 Fluxo de Git & Deploy

### Pipeline Obrigatório de Pré-Commit
**Ordem Exata (inviolável):**
1. `npx tsc --noEmit` — Checagem de tipos TypeScript (zero erros permitidos)
2. `npm run build` — Compilação de produção Vite (The Rule of One: executar UMA VEZ após consolidar edits)
3. `git add [arquivos específicos]` — Stage APENAS arquivos validados
4. `git commit -m "..."` — Mensagem descritiva (Conventional Commits)
5. Vercel deployment (push para `main` dispara build automático)

### Protocolo de Segurança Git
- **Proibido Commitar:** Arquivos com extensões `.py`, `.ps1`, `.bkp`, pasta `_audit/` e arquivos `.json` de auditoria
- **Regra de Ouro Stage:** ⚠️ **TERMINANTEMENTE PROIBIDO** usar `git add .` ou `git add -A`
- **Obrigatoriedade:** Stage deve ser feito sempre apontando arquivos específicos: `git add src/components/File.tsx`

## 🚨 CRITICAL: Quota & Execution Protocol (RPM/TPM Protection)
To prevent "429 Too Many Requests" and optimize Google AI Studio quota usage, you MUST strictly adhere to these execution rules:

### 1. Smart Compilation & Validation Throttling
- **The Rule of One:** Do NOT run build commands (`npx tsc` or `npm run build`) recursively after every small line edit.
- **Execution Timing:** Apply ALL planned edits to the files first. Only run the validation terminal commands ONCE per task phase, or when explicitly requested by the user.

### 2. Batch Processing (No Chain-Tooling)
- Never call a tool immediately after another tool without a consolidated plan. Group your file reads and file edits into the fewest steps possible.
- State your rationale before opening or scanning files.

### 3. Preventing Loop Hallucinations
- If a compilation error occurs, do not blindly attempt to fix it and re-run the build immediately. Pause, analyze the error output completely, apply the definitive fix, and only then re-run the validation.
- If you fail to fix a bug after 2 attempts, STOP tool execution immediately and ask the user for guidance.

## 🏗️ Padrões de Desenvolvimento & Arquitetura

### 1. Navegação Centralizada via AppContext
- **Princípio:** Roteamento interno de telas é controlado **exclusivamente** via estado nativo do `AppContext`
- **Mecanismo:** Usar `setCurrentPage(page: Page)` do contexto — **NUNCA** usar React Router ou outros roteadores externos
- **Benefício:** Single source of truth; navegação acoplada a estado global (cases, notifications, user context)
- **Implementação:** Componentes disparam `setCurrentPage()` para navegar; `App.tsx` renderiza página baseada em `currentPage`
- **Exemplo:** Modal de análises chama `setCurrentPage('analysis')` em vez de `navigate('/analysis')`

### 2. Memoização Incremental (Performance Crítica)
Todos os componentes de **lista**, **modal interativo** ou **hub de ações rápidas** devem seguir:

**2.1 Arrays Estáticos Fora do Escopo**
- Declarar arrays de configuração/dados **FORA** do componente funcional
- Evita realocação de memória a cada render
- Exemplo: `const ANALYSIS_TYPES = [...]` (fora do componente)

**2.2 Sub-componentes Memoizados**
- Envolver componentes "folha" (que recebem poucos props) em `React.memo()`
- Exemplo: `const CardItem = memo(({ data, onClick }) => ...)` com `displayName`

**2.3 Handlers em useCallback**
- Encapsular funções de evento em `useCallback` com array de dependências apropriado
- Protege re-renders desnecessários da lista/grid
- Exemplo: `const handleSelect = useCallback((id) => { ... }, [dependência])`

**2.4 Validação de Tipos**
- Interfaces bem definidas para props do sub-componente
- TypeScript strict para garantir contrato entre pai e filho

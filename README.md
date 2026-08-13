# Vanguard Veterinary

## Visão Geral

**Nome do Projeto:** Vanguard Veterinary
**Propósito Clínico:** Plataforma de ortopedia veterinária de precisão.
**URL de Produção:** `https://vanguard-veterinary.vercel.app`
**Repositório:** `https://github.com/trysmartnew/ortobolt`

## Stack Técnica

**Dependências:**
- `@supabase/supabase-js`: `^2.98.0`
  - Projeto: `ortobolt-v2` | Região: `sa-east-1` | RLS ativo
- `@tailwindcss/vite`: `^4.1.14`
- `@types/dompurify`: `^3.0.5`
- `@vitejs/plugin-react`: `^5.0.4`
- `dompurify`: `^3.4.11`
- `jspdf`: `^4.2.0`
- `konva`: `^10.3.0`
- `lucide-react`: `^0.546.0`
- `react`: `^19.0.0`
- `react-dom`: `^19.0.0`
- `react-konva`: `^19.2.5`
- `recharts`: `^2.15.4`
- `tailwindcss`: `^4.1.14`
- `zod`: `^4.4.3`

**Dev Dependências:**
- `@types/node`: `^22.19.15`
- `@types/react`: `^19.0.0`
- `@types/react-dom`: `^19.0.0`
- `@vercel/node`: `^5.8.4`
- `sharp`: `^0.35.2`
- `typescript`: `~5.8.2`
- `vite`: `^6.2.0`
- `vitest`: `^3.2.4`

## Ambiente & Comandos

**Sistema Operacional:** Windows 10
**Shell:** PowerShell 7 (PS7)

**Scripts do `package.json`:**
- `dev`: `vite --port 3000 --host 0.0.0.0` (Inicia o servidor de desenvolvimento)
- `build`: `vite build` (Compila o projeto para produção)
- `preview`: `vite preview` (Pré-visualiza a build de produção localmente)
- `lint`: `tsc --noEmit` (Executa o TypeScript para verificar erros sem gerar arquivos JS)
- `test`: `vitest run` (Executa os testes unitários com Vitest)

## Arquitetura de Navegação

**Tipo `Page`:**
```typescript
  | 'dashboard' | 'chat' | 'analysis' | 'gallery'
  | 'case' | 'reports' | 'settings' | 'notifications'
  | 'patients' | 'patientDetail' | 'evolutionaryAnalysis' | 'alignmentAnalysis' | 'comparative' | 'help' | 'login';
```

**`PAGE_MAP` (Mapeamento de Páginas para Componentes):**
```typescript
const PAGE_MAP = {
  dashboard: DashboardPage,
  chat: ChatPage,
  analysis: AnalysisPage,
  gallery: GalleryPage,
  case: CasePage,
  reports: ReportsPage,
  settings: SettingsPage,
  help: HelpPage,
  notifications: NotificationsPage,
  patients: PatientsPage,
  patientDetail: PatientDetailPage,
  evolutionaryAnalysis: EvolutionaryAnalysisPage,
  alignmentAnalysis: AlignmentAnalysisPage,
  comparative: ComparativeAnalysisPage,
} as const;
```

**Regra `setCurrentPage`:** A função `setCurrentPage` persiste a página atual no `sessionStorage` sob a chave `vanguard-veterinary_page`, para sobreviver a recarregamentos (F5). A chave legada `ortobolt_page` é lida como fallback e removida automaticamente após migração.

## Páginas do Sistema

- `AlignmentAnalysisPage.tsx`: Exibe análises de alinhamento ósseo.
- `AnalysisPage.tsx`: Página principal para análises de casos clínicos.
- `CasePage.tsx`: Detalhes de um caso clínico específico.
- `ChatPage.tsx`: Interface de chat com o OrthoAI.
- `ComparativeAnalysisPage.tsx`: Permite a comparação entre diferentes análises.
- `DashboardPage.tsx`: Painel clínico com visão geral de atividades e casos.
- `EvolutionaryAnalysisPage.tsx`: Apresenta a evolução de casos clínicos ao longo do tempo.
- `GalleryPage.tsx`: Galeria de imagens e casos clínicos.
- `HelpPage.tsx`: Seção de ajuda e FAQs.
- `HomePage.tsx`: Página inicial da aplicação.
- `LoginPage.tsx`: Página de autenticação para entrada no sistema.
- `NotificationsPage.tsx`: Exibe notificações do sistema para o usuário.
- `PatientDetailPage.tsx`: Detalhes de um paciente específico.
- `PatientsPage.tsx`: Lista e gerencia pacientes.
- `RegisterPage.tsx`: Página para registro de novos usuários.
- `ReportsPage.tsx`: Geração e visualização de relatórios.
- `ResetPasswordPage.tsx`: Funcionalidade para redefinição de senha.
- `SettingsPage.tsx`: Configurações do usuário e da aplicação.

## Componentes Principais

- `AIAssistant.tsx`: Componente para interação com o assistente de IA.
- `AnalysisQuickSelectModal.tsx`: Modal para seleção rápida de tipo de análise.
- `AppLayout.tsx`: Layout geral da aplicação.
- `CaseAnalysisTab.tsx`: Aba de análise dentro da página de caso.
- `ClinicalEvidenceView.tsx`: Exibição de evidências clínicas.
- `CopilotClinical.tsx`: Componente para o copilot clínico.
- `ErrorBoundary.tsx`: Componente para captura de erros na UI.
- `OrthoDeepAnalysis.tsx`: Componente para análises ortopédicas aprofundadas.
- `PatientForm.tsx`: Formulário para cadastro ou edição de pacientes.
- `ProductTour.tsx`: Componente para tour guiado do produto.
- `RadiographGallery.tsx`: Galeria de radiografias.
- `Sidebar.tsx`: Barra lateral de navegação.
- `ToastContainer.tsx`: Container para exibir mensagens de notificação (toasts).
- `TopBar.tsx`: Barra superior da aplicação.
- `ui.tsx`: Coleção de componentes de UI genéricos.
- `WorkflowStepper.tsx`: Stepper de workflow para processos clínicos multi-etapas.

## Serviços & API

**Serviços Locais (`src/services/`):**
- `aiConsent.ts`: Gerencia o consentimento do usuário para análises de IA.
- `aiService.ts`: Funções para interagir com serviços de IA.
- `clinicalCaseIntegrationService.ts`: Integração de casos clínicos com a plataforma.
- `clinicalCopilotService.ts`: Funções do copilot clínico.
- `clinicalEngine.ts`: Lógica central do motor clínico.
- `feedbackService.ts`: Gerencia o envio de feedback.
- `imageService.ts`: Serviços para manipulação e processamento de imagens.
- `localAuditService.ts`: Serviços de auditoria local.
- `pdfService.ts`: Geração de documentos PDF.
- `storageMigration.ts`: Migração de chaves legadas do localStorage (ortobolt_* → vanguard-veterinary_*).
- `vanguardEngine.ts`: Motor principal do Vanguard com validação em camadas e structured output (Zod).
- `supabase.ts`: Configuração e interação com o Supabase.
- `veterinaryPrompts.ts`: Gerencia prompts específicos para veterinária.

**Endpoints Serverless (`api/`):**
- `ai.ts`: Endpoint da API para operações de IA.
- `embeddings.ts`: Endpoint da API para geração de embeddings.
- `anonymizeClinical.ts`: Lógica para anonimização de dados clínicos.
- `cors.ts`: Configurações CORS para a API.
- `rateLimit.ts`: Lógica de rate limiting para a API.
- `verifySupabaseJwt.ts`: Middleware para verificação de JWT do Supabase.

## Design System (OrtoBolt Prime):

- **Primária / IA:** `#29a399` (verde água)
- **Fundo Canvas:** `linear-gradient(180deg, #0a0c0d, #121517)`
- **Sidebar:** `#0e1011`
- **Painel Raio-X:** `#050607`
- **Glassmorphism:** `rgba(22, 26, 30, 0.45)` + `backdrop-blur(20px)`
- **Dimensões:**
    - Sidebar: `280px`
    - Painel Direito: `380px`
    - Input: `42px`
- **Proibições:** `#0A3D8F`, `#3caea3`, `bg-blue-600`, `bg-slate-50`, `bg-white`
- **Obrigatório em todo novo componente:** `glass-panel-premium`, `premium-header-bg`
- **UI legada:** as ocorrências sólidas de `bg-white` e `bg-slate-50` foram migradas para tokens premium; variantes translúcidas `bg-white/*` permanecem como overlays permitidos no design escuro.

## Pipeline de Pré-Commit

A ordem de execução do pipeline de pré-commit é inviolável para garantir a qualidade do código e a integridade da build:

1.  **`tsc --noEmit`**: Garante que o código TypeScript não possui erros de tipo.
2.  **`npm run build`**: Compila o projeto para produção, verificando possíveis erros de build.
3.  **`git add [arquivos específicos]`**: Stage apenas dos arquivos validados (nunca `git add .` ou `git add -A`).
4.  **`git commit -m "docs: update README with current project state, navigation map and known gaps"`**: Confirma as alterações com uma mensagem padronizada.
5.  **`git push`**: Envia as alterações para o repositório remoto.

## Regras de Segurança Git

- **Proibido:** Fazer commit diretamente na branch `main`. Sempre utilize branches de feature ou correção.
- **Obrigatório:** Revisão de código (pull request) para todas as alterações que serão mescladas na `main`.
- **Proibido:** Commitar credenciais, chaves de API ou informações sensíveis diretamente no código.
- **Obrigatório:** Utilizar `.gitignore` para arquivos e diretórios que não devem ser versionados.

## Padrões de Desenvolvimento

- **Rule of One:** Evitar chain-tooling (chamar uma ferramenta imediatamente após a outra sem um plano consolidado). Agrupar leituras e edições de arquivos nas menores etapas possíveis.
- **Backup:** Sempre fazer backup de arquivos importantes antes de modificá-los (`Copy-Item 'file.ext' 'file.ext.bkp'`).
- **Anti-Loop:** Em caso de erro de compilação, não tentar corrigir cegamente e re-executar a build. Analisar o erro, formular a correção definitiva, aplicar a correção e só então re-executar a validação. Se a correção falhar após 2 tentativas, parar a execução e pedir orientação ao usuário.
- **Memoização:** Utilizar `useMemo` e `useCallback` em React para otimizar re-renders e evitar cálculos desnecessários, como no `unreadCount` em `AppContext.tsx`.

## Gaps & Pendências Conhecidas:

- Nenhum gap crítico de navegação ou mapeamento pendente.
- A rota `profile` foi removida do tipo `Page` (commit c37870ba).
- `ComparativeAnalysisPage` possui saídas funcionais para `gallery` (commit c37870ba).

## Pendências de Auditoria (estado real)

- A chave de página foi migrada para `vanguard-veterinary_page`, com fallback legado `ortobolt_page`.
- As chaves legadas de storage `ortobolt_*` e `ortobolt-*` são migradas automaticamente no startup para `vanguard-veterinary_*` e `vanguard-veterinary-*`; referências remanescentes são apenas fallback/migração ou branding interno.
- As classes claras legadas (`bg-white`, `bg-slate-50`) foram migradas para tokens premium; novos componentes devem usar `glass-panel-premium` e `premium-header-bg`.
- O branding interno foi migrado para `Vanguard Veterinary`; o nome `OrtoBoltAuditDB` (IndexedDB) é mantido como legado para preservar dados locais de auditoria.


## Diretrizes de Implementação

> Regras canônicas obrigatórias para IA (Nemotron, Cline, Copilot) e desenvolvedores humanos.
> Ultima atualizacao: 2026-08-09

### Stack Tecnica Validada
- **React**: ^19.0.0 (usar use() hook; useContext esta depreciado)
- **TypeScript**: ~5.8.2 (strict mode)
- **Vite**: ^6.2.0
- **Tailwind CSS**: ^4.1.14 (v4 - usar bg-neutral-*, text-neutral-*; bg-gray-* depreciado)
- **Supabase**: ^2.98.0 (RLS ativo; projeto ortobolt-v2, regiao sa-east-1)
- **Zod**: ^4.4.3 (validacao de schemas)
- **Konva**: ^10.3.0 + react-konva ^19.2.5
- **Recharts**: ^2.15.4, **lucide-react**: ^0.546.0, **jspdf**: ^4.2.0, **dompurify**: ^3.4.11

### Ambiente de Desenvolvimento
- **Sistema Operacional**: Windows 10
- **Shell**: PowerShell 7 (PS7)
- **Extensao de IA recomendada**: Kilo Code + Nvidia Nemotron 3 Super Free (via OpenRouter)

### Regras Absolutas (Zero Tolerancia)
- **Nenhum mock, placeholder, dado ficticio ou implementacao temporaria**
- **Nenhum TODO/FIXME como solucao**
- **Nunca inventar arquivos, comandos, APIs, caminhos ou dependencias**
- **Nunca editar .env, *.bkp, *.py, *.ps1 ou *.json de auditoria**
- **Nunca commitar: *.py, *.ps1, *.bkp, *.json de auditoria, scripts utilitarios da raiz**

### PowerShell 7 Obrigatorio
- Use Select-String em vez de grep
- Use Copy-Item em vez de cp
- Use aspas simples sempre que possivel
- Nao assumir compatibilidade com Bash/Linux

### Fluxo de Trabalho Obrigatorio

**Antes de qualquer modificacao:**
1. **Dry-run** (sem alterar arquivos) para validar existencia, padroes e contexto
2. **exact-match-count** - abortar se quantidade de ocorrencias diferente do esperado (normalmente 1)
3. **Backup .bkp** obrigatorio antes de qualquer escrita

**Apos qualquer modificacao:**
    npx tsc --noEmit
    npm run build

**Rollback/Reversão:**
- Em caso de falha crítica, use `Copy-Item arquivo.bkp arquivo -Force` para reverter
- Para reverter commits: `git revert HEAD` ou `git reset --hard HEAD~1`
- Nunca force-push sem backup local

**Deploy (NUNCA usar git add .):**
    git add arquivo-especifico.ts
    git commit -m 'fix: descricao clara e objetiva'
    git push origin main

### Regras de Implementacao

**Supabase e RLS:**
- Sempre usar .eq() ou .in() para respeitar Row Level Security
- Validar JWT em API routes: api/lib/verifySupabaseJwt.ts
- Service client apenas em contextos seguros: src/services/supabase.ts

**React 19:**
- Usar use() hook para promises e context
- **Nunca** usar useContext
- Componentes funcionais apenas

**Tailwind CSS v4:**
- Usar bg-neutral-*, text-neutral-*, border-neutral-*
- **Nunca** usar bg-gray-* (depreciado no v4)
- Consultar src/components/ui.tsx antes de criar novos componentes

**TypeScript:**
- Strict mode ativo
- Tipos explicitos em props e retornos
- Evitar any (preferir unknown + type guards)

### Caminhos Canonicos (Previamente Validados)
- src/contexts/
- src/services/supabase.ts
- api/lib/verifySupabaseJwt.ts

### Investigacao de Problemas

**Monitoramento e Observabilidade:**
- Use `createLogger` (src/utils/logger) para logs estruturados
- Logs são visíveis no console do navegador (desenvolvimento) e Vercel Logs (produção)
- Sempre logar erros com contexto completo antes de lançar exceções
- Exibir **todos os erros reais** encontrados
- **Nunca** esconder erros de compilacao, TypeScript, runtime, Supabase ou Vercel
- **Nunca** substituir erros por interpretacoes ou suposicoes
- Diferenciar claramente **fatos verificados** de **hipoteses**

### Principio Geral
- Alteracoes **reproduziveis, auditaveis, minimas e tecnicamente corretas**
- Priorizar **precisao sobre velocidade**
- Mudancas pequenas, isoladas e facilmente reversiveis
- Nunca alterar multiplas areas em uma unica etapa quando dificultar validacao

### Gate Pre-Commit Obrigatorio
    npm run lint
Se qualquer validacao falhar: **INTERROMPA IMEDIATAMENTE**, informe o motivo exato, nao proponha solucoes baseadas em suposicoes.

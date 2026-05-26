# 🏥 OrtoBolt - Contexto do Projeto

> **Última atualização:** 26/05/2026
> **Repositório:** https://github.com/trysmartnew/ortobolt
> **Deploy:** https://ortobolt.vercel.app

---

## 📋 Visão Geral

Plataforma SaaS para ortopedia veterinária que une inteligência artificial, análise de imagens radiográficas e ferramentas clínicas práticas para elevar o padrão da cirurgia ortopédica veterinária no Brasil.

### Proposta de Valor
- Diagnóstico por imagem com IA especializada (protocolos TPLO, FHO, TTA)
- Planejamento cirúrgico preciso com cálculos biomecânicos
- Protocolos pós-operatórios completos com calculadora de dosagem
- Orientação clínica objetiva para tomada de decisão veterinária
- Conformidade LGPD e segurança hospitalar

---

## 🛠️ Stack Tecnológico

| Categoria | Tecnologia |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS |
| Ícones | Lucide React |
| Gráficos | Recharts |
| PDF | jsPDF + html2canvas |
| Backend/BaaS | Supabase (Auth, Database, Realtime, Storage) |
| Deploy | Vercel |
| Controle de versão | Git + GitHub |
| Fontes | Montserrat (UI) + Roboto Mono (código/dados) |

---

## 📁 Estrutura de Diretórios

src/
├── App.tsx                    # Roteamento por view
├── main.tsx                   # Entry point
├── index.css                  # Tailwind base
├── contexts/
│   └── AppContext.tsx         # Estado global (auth, casos, notificações, toasts)
├── services/
│   ├── supabase.ts            # Cliente Supabase
│   └── aiService.ts           # Integração com OrthoAI
├── types/index.ts             # Tipagens TypeScript
├── components/
│   ├── Sidebar.tsx, TopBar.tsx, ToastContainer.tsx
│   ├── ProductTour.tsx, ErrorBoundary.tsx, ui.tsx
└── pages/
    ├── HomePage.tsx (landing)
    ├── LoginPage.tsx, RegisterPage.tsx (auth)
    ├── DashboardPage.tsx (métricas)
    ├── ChatPage.tsx (OrthoAI)
    ├── AnalysisPage.tsx (análise IA)
    ├── GalleryPage.tsx (casos)
    ├── CasePage.tsx (protocolo pós-op)
    ├── ProfilePage.tsx, ReportsPage.tsx
    ├── SettingsPage.tsx, NotificationsPage.tsx

---

## 🎯 Páginas e Fluxos

### Públicas (sem autenticação)
- HomePage: Landing page com HERO gradiente azul, features e CTAs
- LoginPage: Login com email/senha + Google/Apple
- RegisterPage: Cadastro com validação

### Privadas (requer autenticação)
- Dashboard: Métricas e casos recentes
- Chat IA: OrthoAI - assistente especializado
- Análise: Upload e análise de radiografias
- Galeria: Lista de casos clínicos
- Caso: Detalhe do caso com protocolo pós-operatório
- Perfil: Dados do veterinário
- Relatórios: Exportação PDF
- Configurações: Preferências do sistema
- Notificações: Central de alertas

---

## 🧠 Estado Global (AppContext)

### Autenticação
- user / isLoggedIn / authLoading
- login() / logout() / setUserFromSession()
- Rate limiting: 5 tentativas → bloqueio 15min (C-02)
- Remember Me: localStorage vs sessionStorage (U-01)

### Casos Clínicos
- CRUD completo com persistência Supabase (clinical_cases)
- Mapeamento snake_case → camelCase (mapCaseFromDB)
- openCase() / closeCase() / updateCase()

### Notificações
- Fetch real do Supabase
- markAllRead() / markRead() com persistência
- unreadCount memoizado (A-05)

### Sistema de Toasts (U-02)
- addToast(message, type) → auto-dismiss em 4s
- Tipos: success / error / info / warning

---

## 🏥 CasePage - Protocolos Pós-Operatórios

A CasePage foi completamente reestruturada com foco em valor clínico prático para o veterinário, substituindo o antigo sistema de colaboração em tempo real.

### Protocolos Completos (8 procedimentos)

| Procedimento | Descrição | Dias |
|--------------|-----------|------|
| TPLO | Osteotomia Niveladora do Platô Tibial | 21 |
| FHO | Excisão da Cabeça e Colo do Fêmur | 30 |
| TTA | Avanço da Tuberosidade Tibial | 14 |
| LCP_repair | Placa de Compressão Bloqueada | 30 |
| fracture_fixation | Fixação Interna de Fratura | 30 |
| joint_replacement | Artroplastia Total (Prótese) | 45 |
| spinal_surgery | Hemilaminectomia (Coluna) | 45 |
| other | Protocolo genérico | 14 |

### Categorias de Etapas
- Medicamento (com dosagem calculada por peso)
- Restrição (repouso, guia curta)
- Cuidado (colar, curativo, crioterapia)
- Retorno (reavaliações, retirada de pontos, fisioterapia)

### Funcionalidades Principais
1. Calculadora automática de dosagem baseada no peso
2. Checklist interativo de recuperação (persistência localStorage)
3. Notas clínicas expansíveis com timestamp
4. Guia imprimível para tutores
5. Modal de edição rápida de dados do caso
6. Score de precisão IA e risk level

---

## 🔐 Segurança Implementada

| Feature | Status | Localização |
|---------|--------|-------------|
| Rate limiting de login | OK | AppContext (C-02) |
| Remember Me seguro | OK | AppContext (U-01) |
| Stale closure effects | OK | App.tsx (C-05) |
| Guarda de ID vazio | OK | setUserFromSession |
| OAuth Google/Apple | OK | LoginPage |
| Sem segredos hardcoded | OK | Auditoria validada |

---

## 🗄️ Integrações Supabase

### Tabelas utilizadas
- users (perfil veterinário)
- clinical_cases (casos clínicos)
- notifications (alertas)
- kpi_metrics (métricas dashboard)
- weekly_stats (dados gráficos semanais)

### Mappers de dados
Todos os dados Supabase (snake_case) são convertidos para camelCase via mapCaseFromDB() e mapNotificationFromDB().

---

## 📊 Features Principais (Marketing)

1. OrthoAI Avançado - IA especializada em ortopedia veterinária
2. Análise de Imagens - Detecção automática de landmarks anatômicos
3. Laudos em PDF - Relatórios completos + protocolo anestésico
4. Protocolos Pós-Operatórios - 8 procedimentos + calculadora de dosagem
5. Segurança LGPD - Criptografia AES-256, backups automáticos
6. Dashboard de Métricas - Taxa de sucesso, precisão, evolução

---

## ⚠️ Limitações Conhecidas (SettingsPage)

A página de Configurações possui controles visuais sem efeito real:

| Controle | Estado |
|----------|--------|
| Tema Claro/Escuro | Removido (dark mode não implementado) |
| Notificações (toggle) | Apenas estado local |
| Idioma (PT/EN) | Apenas estado local |
| Análise Automática | Apenas estado local |
| Formato de Relatório | Apenas estado local |
| Salvar Configurações | Simula gravação (setTimeout) |
| Limpar Cache | Apenas toast |

TODO (v1.1): Implementar persistência real via Supabase (coluna preferences JSONB).

---

## 📦 Commits Recentes

0e66c05 refactor: remove colaboração em tempo real e reestrutura CasePage com foco clínico
ecdce6d refactor: move logo para dentro do HERO
8c3a255 style: aumenta logos da LoginPage para h-60
ab4f280 refactor: remove position fixed do logo

---

## 🚀 Como Rodar Localmente

npm install
cp .env.example .env
# Editar .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
npx tsc --noEmit
npm run build

---

## 📈 Auditoria Pré-Deploy (26/05/2026)

| Camada | Status |
|--------|--------|
| Type-Check TypeScript | Zero erros |
| Referências órfãs (colaboração) | Zero ocorrências |
| Imports AppContext | 14 arquivos corretos |
| Segurança (segredos) | Zero expostos |
| Build Vite | Exit code 0 |

---

## 📊 Estatísticas do Projeto

- Total de páginas: 12
- Total de componentes: 6
- Total de linhas de código: ~3.200
- Arquivo maior: CasePage.tsx (513 linhas)

---

*Documento atualizado em 26/05/2026. Para regenerar, re-execute este script.*

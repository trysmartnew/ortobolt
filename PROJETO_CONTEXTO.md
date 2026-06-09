# OrtoBolt - Contexto do Projeto

> Ultima atualizacao: 08/06/2026 18:26 (auto-gerado)
> Branch: ?
> Repositorio: ?
> Deploy: https://ortobolt.vercel.app

---

## Stack (lido de package.json)

| Pacote | Versao |
|--------|--------|
| react | ^19.0.0 |
| typescript | ~5.8.2 |
| vite | ^6.2.0 |
| @supabase/supabase-js | ^2.98.0 |
| tailwindcss | ^4.1.14 |
| recharts | ^2.15.4 |
| lucide-react | ^0.546.0 |
| jspdf | ^4.2.0 |

---

## Paginas src/pages/

| Arquivo | Linhas |
|---------|--------|
| AnalysisPage.tsx | 350 |
| CasePage.tsx | 626 |
| ChatPage.tsx | 183 |
| DashboardPage.tsx | 242 |
| GalleryPage.tsx | 452 |
| HomePage.tsx | 399 |
| LoginPage.tsx | 296 |
| NotificationsPage.tsx | 66 |
| ProfilePage.tsx | 190 |
| RegisterPage.tsx | 346 |
| ReportsPage.tsx | 298 |
| ResetPasswordPage.tsx | 147 |
| SettingsPage.tsx | 118 |
| **TOTAL** | **3713** |

## Componentes src/components/

| Arquivo | Linhas |
|---------|--------|
| AIAssistant.tsx | 179 |
| ErrorBoundary.tsx | 57 |
| ProductTour.tsx | 340 |
| Sidebar.tsx | 85 |
| ToastContainer.tsx | 60 |
| TopBar.tsx | 84 |
| ui.tsx | 162 |
| **TOTAL** | **967** |

## Protocolos (CasePage.tsx)

- TPLO - Osteotomia Niveladora do Platô Tibial
- FHO - Excisão da Cabeça e Colo do Fêmur
- TTA - Avanço da Tuberosidade Tibial
- LCP - Placa de Compressão Bloqueada
- Fixação Interna de Fratura
- Artroplastia Total (Prótese Articular)
- Cirurgia de Coluna (Hemilaminectomia)

## Features (HomePage.tsx)

- OrthoAI Avançado
- Laudos em PDF
- Dashboard de Métricas

## Variaveis de Ambiente

- `OPENROUTER_API_KEY`
- `VERCEL_OIDC_TOKEN`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`

---

## Commits (ultimos 8)

| Hash | Tipo | Mensagem |
|------|------|----------|

---

## Supabase

- Projeto: ortobolt-v2 | Ref: fhecacefkmnqtkdsldsy | Regiao: sa-east-1
- RLS ativo | Storage: radiografias | Realtime: case_messages + presence

## Seguranca e IA

- Modelo: string via OpenRouter — proxy /api/ai.ts
- CORS: ortobolt.vercel.app | ALLOWED_MODELS | anonymizeCaseContext()
- Cache IA: Map TTL 5min max 50 entradas
- Rate-limit login: 5 tentativas -> bloqueio 15min

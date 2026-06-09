// src/components/ProductTour.tsx
import { useState, useEffect, useCallback, memo } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
}

export const TOUR_STEPS: Record<string, TourStep[]> = {
  // ── Dashboard (inclui onboarding da Sidebar) ──────────────────────────────
  dashboard: [
    { target: '__welcome__', title: '👋 Bem-vindo ao OrtoBolt', content: 'Seu centro de comando para ortopedia veterinária. Este tour apresenta todos os módulos da plataforma — leva menos de 2 minutos.', placement: 'center' },
    { target: 'tour-sidebar-analysis', title: '🔬 Análise Visual com IA', content: 'Faça upload de radiografias e imagens clínicas. A IA descreve achados, sugere diagnósticos diferenciais e integra o resultado ao caso clínico em 1 clique.', placement: 'right', highlight: true },
    { target: 'tour-sidebar-chat', title: '🤖 OrthoAI — Assistente de Texto', content: 'Converse com a IA especializada em ortopedia veterinária para tirar dúvidas sobre protocolos, dosagens e diagnósticos diferenciais.', placement: 'right', highlight: true },
    { target: 'tour-sidebar-gallery', title: '🗂️ Galeria de Casos', content: 'Acervo completo de casos clínicos com filtros por status, espécie e procedimento. Casos aprovados via Análise chegam aqui automaticamente.', placement: 'right', highlight: true },
    { target: 'tour-sidebar-reports', title: '📄 Relatórios em PDF', content: 'Gere relatórios profissionais: mensal com métricas consolidadas ou individual por caso cirúrgico. Download em 1 clique.', placement: 'right', highlight: true },
    { target: 'tour-sidebar-profile', title: '👤 Perfil Profissional', content: 'Estatísticas de carreira, certificações e radar de competências por área de especialização.', placement: 'right', highlight: true },
    { target: 'tour-sidebar-settings', title: '⚙️ Configurações', content: 'Preferências de notificação, análise automática, idioma e formato de relatório.', placement: 'right', highlight: true },
    { target: 'tour-sidebar-notifications', title: '🔔 Notificações', content: 'Alertas de casos críticos, integrações de pipeline e atualizações ficam aqui. O badge vermelho indica itens não lidos.', placement: 'right', highlight: true },
    { target: 'tour-dashboard-hero', title: '☀️ Saudação Personalizada', content: 'Veja seu nome, data atual e resumo do dia: cirurgias, casos críticos e análises em andamento.', placement: 'bottom', highlight: true },
    { target: 'tour-dashboard-surgeries', title: '🏥 Cirurgias de Hoje', content: 'Procedimentos registrados hoje com status em tempo real. Clique em qualquer cirurgia para abrir o caso completo e o protocolo.', placement: 'bottom', highlight: true },
    { target: 'tour-dashboard-triage', title: '⚡ Triage Inteligente', content: 'Casos ordenados por prioridade clínica: críticos 🔴, em análise 🟡, estáveis 🟢. Clique para atendimento imediato.', placement: 'left', highlight: true },
    { target: 'tour-dashboard-metrics', title: '📊 Métricas Operacionais', content: 'Comparativo hoje vs ontem: casos novos, em análise e concluídos. Acesse Relatórios para o histórico mensal completo.', placement: 'top', highlight: true },
  ],
  // ── OrthoAI Chat ──────────────────────────────────────────────────────────
  chat: [
    { target: '__welcome__', title: '🤖 OrthoAI — Assistente de Texto', content: 'Converse com a IA especializada em ortopedia veterinária. Diferente do Copiloto Clínico (aba Análise), o OrthoAI responde dúvidas textuais sem vínculo a imagem ou caso específico.', placement: 'center' },
    { target: 'tour-chat-suggestions', title: '💡 Perguntas Sugeridas', content: 'Clique em qualquer sugestão para iniciar rapidamente: protocolos TPLO/FHO, cálculos de dosagem, diagnóstico diferencial.', placement: 'bottom', highlight: true },
    { target: 'tour-chat-messages', title: '💬 Histórico da Conversa', content: 'O OrthoAI mantém contexto ao longo da sessão. Respostas estruturadas com análise, possíveis causas e recomendação de ação.', placement: 'bottom', highlight: true },
    { target: 'tour-chat-input', title: '✍️ Envie sua Pergunta', content: 'Digite qualquer dúvida clínica em linguagem técnica ou simples. Pressione Enter ou clique no botão de envio.', placement: 'top', highlight: true },
  ],
  // ── Análise Visual ────────────────────────────────────────────────────────
  analysis: [
    { target: '__welcome__', title: '🔬 Análise de Imagem com IA', content: 'Analise radiografias, fotos cirúrgicas e imagens clínicas com IA multimodal. A IA descreve achados, sugere diagnósticos diferenciais e integra o resultado ao fluxo clínico em 1 clique.', placement: 'center' },
    { target: 'tour-upload', title: '📁 Upload de Imagem', content: 'Clique para selecionar a imagem. Suporta JPG, PNG e WEBP até 15MB. Após o upload, clique em "Iniciar Análise IA" para gerar o laudo.', placement: 'bottom', highlight: true },
    { target: 'tour-analysis-result', title: '🧠 Laudo da Análise', content: 'A IA descreve os achados da imagem e sugere diagnósticos diferenciais. Use o Copiloto ao lado para aprofundar a interpretação com contexto clínico do paciente.', placement: 'top', highlight: true },
    { target: 'tour-clinical-copilot', title: '💬 Copiloto Clínico', content: 'Chat contextual com memória de sessão: usa a imagem, o contexto clínico e o histórico da conversa. Clique "Refinar análise" para consolidar o chat no laudo principal.', placement: 'left', highlight: true },
    { target: 'tour-approve-case', title: '✅ Aprovar Caso Completo', content: 'Escolha o destino: "Caso" abre o protocolo pós-operatório, "Galeria" salva no acervo. O caso preenche automaticamente Dashboard, Galeria e Relatórios — sem retrabalho.', placement: 'top', highlight: true },
  ],
  // ── Galeria ───────────────────────────────────────────────────────────────
  gallery: [
    { target: '__welcome__', title: '🗂️ Galeria de Casos Clínicos', content: 'Acervo completo dos seus casos ortopédicos. Casos aprovados via Análise chegam aqui automaticamente com badge "IA integrada". Filtre, colabore e gerencie registros.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '🔍 Busca e Filtros', content: 'Busque por nome do paciente ou tag. Filtre por status (pendente, em análise, concluído, crítico). Os filtros combinam em tempo real.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🐕 Cards de Casos', content: 'Cada card exibe paciente, procedimento, score de precisão e risco. Use "Ver detalhes" para o resumo ou "Colaborar" para abrir o protocolo pós-operatório completo.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '➕ Novo Caso Manual', content: 'Registre um caso sem passar pela Análise Visual: preencha dados do paciente, procedimento e imagem. Disponível para análise futura e colaboração.', placement: 'left', highlight: true },
  ],
  // ── Caso Clínico (ordem corrigida para refletir layout visual) ─────────────
  case: [
    { target: '__welcome__', title: '🏥 Caso Clínico + Protocolo Pós-Operatório', content: 'Visualize dados do paciente, o laudo da IA e o protocolo pós-operatório para o procedimento realizado. Adicione notas e acompanhe o checklist de evolução.', placement: 'center' },
    { target: 'tour-case-patient', title: '🩺 Dados do Paciente', content: 'Visualize informações do pet e status do atendimento de forma rápida.', placement: 'bottom', highlight: true },
    { target: 'tour-case-image', title: '📷 Imagens e Radiografias', content: 'Analise os exames de imagem do caso diretamente na plataforma.', placement: 'bottom', highlight: true },
    { target: 'tour-case-ai-result', title: '🤖 Análise da OrthoAI', content: 'Confira o laudo gerado pela inteligência artificial com suporte à decisão clínica.', placement: 'bottom', highlight: true },
    { target: 'tour-case-notes', title: '📝 Notas Clínicas', content: 'Adicione anotações livres com timestamp automático. Histórico completo de observações e evolução do caso, visível para toda a equipe.', placement: 'top', highlight: true },

    { target: 'tour-case-checklist', title: '✅ Checklist Interativo', content: 'Marque as etapas conforme o paciente evolui. O progresso é sincronizado com a nuvem e disponível em qualquer dispositivo.', placement: 'bottom', highlight: true },
  ],
  // ── Relatórios ────────────────────────────────────────────────────────────
  reports: [
    { target: '__welcome__', title: '📄 Central de Relatórios', content: 'Gere relatórios profissionais em PDF automaticamente — mensal com métricas consolidadas ou individual por caso cirúrgico.', placement: 'center' },
    { target: 'tour-monthly-report', title: '📅 Relatório Mensal', content: 'PDF com volume de casos, taxa de precisão, procedimentos por tipo e comparativo com o mês anterior. Ideal para reuniões e auditorias.', placement: 'bottom', highlight: true },
    { target: 'tour-case-report', title: '🔖 Relatório de Caso', content: 'Relatório individual com dados do paciente, diagnóstico, procedimento e análise da IA. Selecione o caso mais recente ou qualquer caso do histórico.', placement: 'bottom', highlight: true },
    { target: 'tour-report-history', title: '📂 Histórico de Relatórios', content: 'Todos os PDFs gerados ficam listados com data e tipo. Baixe novamente qualquer relatório anterior sem precisar regerar.', placement: 'top', highlight: true },
  ],
  // ── Perfil ────────────────────────────────────────────────────────────────
  profile: [
    { target: '__welcome__', title: '👨‍⚕️ Perfil Profissional', content: 'Perfil clínico completo com estatísticas de desempenho, certificações e radar de competências por área de especialização.', placement: 'center' },
    { target: 'tour-profile-stats', title: '📊 Estatísticas de Carreira', content: 'Total de cirurgias, taxa de sucesso e certificações ativas. Dados atualizados automaticamente com cada caso concluído na plataforma.', placement: 'bottom', highlight: true },
    { target: 'tour-competency-chart', title: '🕸️ Radar de Competências', content: 'Gráfico radar com seu nível em cada área: Cirurgia, Diagnóstico, Reabilitação, Emergência, Anestesia e Oncologia.', placement: 'top', highlight: true },
  ],
  // ── Notificações ──────────────────────────────────────────────────────────
  notifications: [
    { target: '__welcome__', title: '🔔 Central de Notificações', content: 'Alertas de casos críticos, integrações de pipeline (casos aprovados via Análise) e atualizações do sistema ficam centralizados aqui.', placement: 'center' },
    { target: 'tour-unread-notifications', title: '🔴 Notificações Não Lidas', content: 'Notificações ainda não vistas ficam destacadas. Clique em "Marcar como lida" individualmente ou use "Marcar todas" para limpar de uma vez.', placement: 'bottom', highlight: true },
  ],
  // ── Configurações ─────────────────────────────────────────────────────────
  settings: [
    { target: '__welcome__', title: '⚙️ Configurações do Sistema', content: 'Personalize notificações, preferências de análise, idioma e privacidade. Suas configurações são salvas automaticamente.', placement: 'center' },
    { target: 'tour-settings-toggles', title: '🔧 Preferências da Plataforma', content: 'Ative ou desative: notificações push, análise automática ao upload, idioma da interface e salvamento automático de relatórios.', placement: 'bottom', highlight: true },
  ],
};

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// Detecta o container de scroll pai do elemento
function getScrollParent(element: HTMLElement | null): HTMLElement | Window {
  if (!element) return window;
  const style = window.getComputedStyle(element);
  const overflow = style.overflow + style.overflowX + style.overflowY;
  if (/auto|scroll|overlay/.test(overflow)) {
    return element;
  }
  return getScrollParent(element.parentElement);
}

function Spotlight({ rect }: { rect: Rect }) {
  const PAD = 10;
  return (
    <div
      className="fixed pointer-events-none z-[9998]"
      style={{
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 18,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
        border: '2px solid rgba(0,86,179,0.9)',
        animation: 'tourPulse 2s ease-in-out infinite',
        transition: 'top 0.2s ease-out, left 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out',
      }}
    />
  );
}

interface TooltipBoxProps {
  step: TourStep;
  rect: Rect | null;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function TooltipBox({ step, rect, stepIndex, total, onNext, onPrev, onClose }: TooltipBoxProps) {
  const isCenter = step.placement === 'center' || !rect;
  const TW = 360;
  const TH = 200;
  const PAD = 16;
  let style: React.CSSProperties = {};

  if (isCenter) {
    style = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 };
  } else if (rect) {
    const placement = step.placement || 'bottom';
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = 0, left = 0;

    if (placement === 'bottom') {
      top = rect.top + rect.height + PAD;
      left = Math.min(Math.max(rect.left + rect.width / 2 - TW / 2, 16), vw - TW - 16);
    } else if (placement === 'top') {
      top = rect.top - TH - PAD;
      left = Math.min(Math.max(rect.left + rect.width / 2 - TW / 2, 16), vw - TW - 16);
    } else if (placement === 'right') {
      top = Math.min(Math.max(rect.top + rect.height / 2 - TH / 2, 16), vh - TH - 16);
      left = rect.left + rect.width + PAD;
    } else if (placement === 'left') {
      top = Math.min(Math.max(rect.top + rect.height / 2 - TH / 2, 16), vh - TH - 16);
      left = rect.left - TW - PAD;
    }

    top = Math.max(16, Math.min(top, vh - TH - 16));
    left = Math.max(16, Math.min(left, vw - TW - 16));
    style = { position: 'fixed', top, left, zIndex: 9999, transition: 'top 0.2s ease-out, left 0.2s ease-out' };
  }

  return (
    <div style={{ ...style, width: TW }} className="bg-white rounded-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-slate-200/60 overflow-hidden">
      <div className="bg-gradient-to-r from-[#0056b3] to-[#38BDF8] px-5 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-base">{step.title}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="px-5 py-4">
        <p className="text-slate-700 text-[15px] leading-relaxed">{step.content}</p>
      </div>
      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${i === stepIndex ? 'w-5 h-2 bg-[#0056b3]' : 'w-2 h-2 bg-slate-200'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 px-4 py-2 rounded-[12px] text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
          )}
          {stepIndex < total - 1 ? (
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-4 py-2 rounded-[12px] text-[13px] font-semibold text-white bg-[#0056b3] hover:bg-[#004494] transition-colors"
            >
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-4 py-2 rounded-[12px] text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              Concluir ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ProductTourProps {
  page: string;
  active: boolean;
  onClose: () => void;
}

const TOUR_STORAGE_KEY = 'ortobolt-tour-completed';

export default memo(function ProductTour({ page, active, onClose }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const steps = TOUR_STEPS[page] || [];
  const currentStep = steps[stepIndex];

  // Atualiza a posição do elemento alvo
  const updateRect = useCallback(() => {
    if (!currentStep || currentStep.target === '__welcome__') {
      setRect(null);
      return;
    }
    setRect(getRect(currentStep.target));
  }, [currentStep]);

  // Reset do step quando página ou active mudar
  useEffect(() => {
    if (!active) return;
    setStepIndex(0);
  }, [active, page]);

  // Atualiza imediatamente quando step mudar
  useEffect(() => {
    if (!active) return;
    updateRect();
  }, [active, stepIndex, updateRect]);

  // 🔥 OTIMIZADO: Apenas 3 listeners precisos (sem polling)
  useEffect(() => {
    if (!active || !currentStep || currentStep.target === '__welcome__') return;

    const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement;
    if (!el) return;

    // Detecta o scroll parent correto (evita listeners em todos os elementos)
    const scrollParent = getScrollParent(el);

    // 1. Scroll listener (apenas no parent correto)
    scrollParent.addEventListener('scroll', updateRect, { passive: true });

    // 2. Resize listener (window)
    window.addEventListener('resize', updateRect, { passive: true });

    // 3. ResizeObserver (detecta mudanças de tamanho/posição do elemento)
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(el);

    // Atualização inicial
    updateRect();

    // Cleanup
    return () => {
      scrollParent.removeEventListener('scroll', updateRect);
      window.removeEventListener('resize', updateRect);
      resizeObserver.disconnect();
    };
  }, [active, currentStep, updateRect]);

  if (!active || steps.length === 0) return null;

  const handleClose = () => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
      completed[page] = true;
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
    } catch (e) {
      console.warn('Failed to save tour completion:', e);
    }
    onClose();
  };

  const handleNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex(s => s + 1);
    else handleClose();
  };

  const handlePrev = () => setStepIndex(s => Math.max(0, s - 1));

  return (
    <>
      <style>{`
        @keyframes tourPulse {
          0%, 100% {
            border-color: rgba(0,86,179,0.9);
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 20px rgba(0,86,179,0.4);
          }
          50% {
            border-color: rgba(56,189,248,1);
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 30px rgba(56,189,248,0.6);
          }
        }
      `}</style>
      {(currentStep?.target === '__welcome__' || !rect) && (
        <div className="fixed inset-0 bg-black/65 z-[9997]" onClick={handleClose} />
      )}
      {rect && currentStep?.target !== '__welcome__' && <Spotlight rect={rect} />}
      {currentStep && (
        <TooltipBox
          step={currentStep}
          rect={rect}
          stepIndex={stepIndex}
          total={steps.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={handleClose}
        />
      )}
    </>
  );
});

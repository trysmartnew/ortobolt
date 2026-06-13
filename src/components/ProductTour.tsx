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
  dashboard: [
    { target: '__welcome__', title: '👋 Bem-vindo ao OrtoBolt', content: 'Este guia rápido mostra como usar a plataforma no seu dia a dia clínico. Leva menos de 1 minuto.', placement: 'center' },
    { target: 'tour-dashboard-hero', title: '☀️ Resumo do Dia', content: 'Acompanhe aqui suas cirurgias agendadas e os casos críticos pendentes de hoje.', placement: 'bottom', highlight: true },
    { target: 'tour-dashboard-surgeries', title: '🏥 Cirurgias de Hoje', content: 'Lista de procedimentos do dia. Clique em qualquer cirurgia para abrir o caso e o protocolo.', placement: 'bottom', highlight: true },
    { target: 'tour-dashboard-triage', title: '⚡ Fila de Triagem', content: 'Casos ordenados por prioridade clínica. Críticos no topo. Clique para iniciar o atendimento.', placement: 'left', highlight: true },
    { target: 'tour-dashboard-metrics', title: '📊 Métricas do Dia', content: 'Acompanhe o volume de casos novos e em análise. Para o histórico mensal, acesse Relatórios.', placement: 'top', highlight: true },
    { target: 'tour-ai-widget', title: '🤖 OrthoAI Rápido', content: 'Tire dúvidas clínicas rápidas sem sair da tela atual.', placement: 'left', highlight: true },
  ],
  chat: [
    { target: '__welcome__', title: '🤖 OrthoAI', content: 'Assistente de texto para tirar dúvidas clínicas, protocolos e dosagens.', placement: 'center' },
    { target: 'tour-chat-suggestions', title: '💡 Perguntas Sugeridas', content: 'Clique em uma sugestão para iniciar (ex: protocolos TPLO, dosagens).', placement: 'bottom', highlight: true },
    { target: 'tour-chat-messages', title: '💬 Histórico', content: 'A conversa mantém o contexto durante sua sessão de trabalho.', placement: 'bottom', highlight: true },
    { target: 'tour-chat-input', title: '✍️ Digite sua dúvida', content: 'Escreva sua pergunta clínica e pressione Enter.', placement: 'top', highlight: true },
  ],
  analysis: [
    { target: '__welcome__', title: '🔬 Análise de Imagem', content: 'Envie radiografias para a IA analisar. O laudo e os landmarks serão integrados ao caso.', placement: 'center' },
    { target: 'tour-upload', title: '📁 Upload da Imagem', content: 'Selecione o arquivo (JPG, PNG, WEBP). Após o envio, clique em Iniciar Análise.', placement: 'bottom', highlight: true },
    { target: 'tour-analysis-preview', title: '🖼️ Preview e Landmarks', content: 'Visualize a radiografia carregada. Os landmarks anatômicos detectados pela IA serão plotados em verde sobre a imagem.', placement: 'right', highlight: true },
    { target: 'tour-analysis-result', title: '🧠 Resultado da IA', content: 'Leia o laudo e os diagnósticos diferenciais sugeridos pela inteligência artificial.', placement: 'top', highlight: true },
    { target: 'tour-clinical-copilot', title: '💬 Copiloto', content: 'Refine o laudo da IA cruzando com o contexto clínico do paciente.', placement: 'left', highlight: true },
    { target: 'tour-approve-case', title: '✅ Integrar ao Caso', content: 'Salve o laudo na Galeria de Casos ou abra diretamente o Protocolo Pós-Operatório.', placement: 'top', highlight: true },
  ],
  gallery: [
    { target: '__welcome__', title: '🗂️ Galeria de Casos', content: 'Seu acervo clínico. Todos os casos aprovados e registrados estão aqui.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '🔍 Busca e Filtros', content: 'Localize casos rapidamente pelo nome do paciente ou filtre por status.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🐕 Seus Casos', content: 'Clique no card para abrir os detalhes do paciente, o laudo da IA e o protocolo.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '➕ Novo Caso', content: 'Cadastre um paciente manualmente, sem precisar enviar uma imagem para análise.', placement: 'left', highlight: true },
  ],
  case: [
    { target: '__welcome__', title: '🏥 Caso Clínico', content: 'Aqui você gerencia o paciente, visualiza a análise da IA e aplica o protocolo pós-operatório.', placement: 'center' },
    { target: 'tour-case-patient', title: '🩺 Dados do Paciente', content: 'Informações do pet e status atual do atendimento.', placement: 'bottom', highlight: true },
    { target: 'tour-case-image', title: '📷 Imagem Analisada', content: 'A radiografia do caso. Os landmarks anatômicos detectados pela IA estão marcados em verde sobre a imagem.', placement: 'bottom', highlight: true },
    { target: 'tour-case-ai-result', title: '🤖 Laudo da IA', content: 'Diagnóstico sugerido, fatores de risco e recomendações da inteligência artificial.', placement: 'bottom', highlight: true },
    { target: 'tour-case-notes', title: '📝 Notas Clínicas', content: 'Registre a evolução do paciente e observações da equipe.', placement: 'top', highlight: true },
    { target: 'tour-case-checklist', title: '✅ Checklist Pós-Op', content: 'Marque as etapas do protocolo conforme o paciente evolui.', placement: 'bottom', highlight: true },
    { target: 'tour-case-actions', title: '⚡ Ações', content: 'Editar caso, gerar laudo em PDF para o tutor ou imprimir.', placement: 'left', highlight: true },
  ],
  reports: [
    { target: '__welcome__', title: '📄 Relatórios', content: 'Gere laudos em PDF para tutores ou relatórios gerenciais da sua clínica.', placement: 'center' },
    { target: 'tour-monthly-report', title: '📅 Relatório Mensal', content: 'Gere o PDF com métricas, volume de casos e comparativos do período.', placement: 'bottom', highlight: true },
    { target: 'tour-case-report', title: '🔖 Laudo Clínico', content: 'Selecione um caso e gere o PDF completo (Guia para o Tutor) com a logo da sua clínica.', placement: 'bottom', highlight: true },
    { target: 'tour-report-history', title: '📂 Histórico', content: 'Baixe novamente qualquer PDF gerado anteriormente.', placement: 'top', highlight: true },
  ],
  profile: [
    { target: '__welcome__', title: '👨‍⚕️ Perfil', content: 'Suas estatísticas profissionais e configurações de conta.', placement: 'center' },
    { target: 'tour-profile-stats', title: '📊 Estatísticas', content: 'Acompanhe seu volume de cirurgias e taxa de sucesso.', placement: 'bottom', highlight: true },
    { target: 'tour-competency-chart', title: '🕸️ Radar', content: 'Visualize seu desempenho por área de atuação clínica.', placement: 'top', highlight: true },
  ],
  notifications: [
    { target: '__welcome__', title: '🔔 Notificações', content: 'Alertas de casos críticos e atualizações do sistema.', placement: 'center' },
    { target: 'tour-unread-notifications', title: '🔴 Alertas não lidos', content: 'Clique para visualizar ou limpar seus alertas pendentes.', placement: 'bottom', highlight: true },
  ],
  settings: [
    { target: '__welcome__', title: '⚙️ Configurações', content: 'Ajuste as preferências da plataforma.', placement: 'center' },
    { target: 'tour-settings-toggles', title: '🔧 Preferências', content: 'Ative ou desative notificações, análise automática e idioma.', placement: 'bottom', highlight: true },
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

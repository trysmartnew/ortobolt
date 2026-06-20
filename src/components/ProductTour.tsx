// src/components/ProductTour.tsx
import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
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
    { target: '__welcome__', title: '🗂️ Memória Clínica Centralizada', content: 'Aqui fica o histórico completo de cada paciente. Acompanhe a evolução, reconsultas e protocolos em um só lugar.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '⚡ Triagem Rápida', content: 'Encontre casos urgentes ou recorrentes em segundos. Filtre por status para focar no que precisa de atenção agora.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🔍 Visão 360° do Paciente', content: 'Clique em qualquer card e acesse instantaneamente o laudo da IA, imagens, checklist pós-op e geração de PDF.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '📝 Registro Flexível', content: 'Adicione casos manuais ou provenientes de outras clínicas. A IA pode ser aplicada a qualquer momento depois.', placement: 'left', highlight: true },
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
    { target: 'tour-report-customize', title: '🎨 Personalização de Marca', content: 'Configure a identidade visual da sua clínica (logo, cores, cabeçalho) para que todos os PDFs saiam profissionais e padronizados.', placement: 'right', highlight: true },
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

function getScrollParent(element: HTMLElement | null): HTMLElement | Window {
  if (!element) return window;
  const style = window.getComputedStyle(element);
  const overflow = style.overflow + style.overflowX + style.overflowY;
  if (/auto|scroll|overlay/.test(overflow)) {
    return element;
  }
  return getScrollParent(element.parentElement);
}

function scrollToElement(target: string): void {
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement;
  if (!el) return;
  
  const rect = el.getBoundingClientRect();
  const isInViewport = (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
  
  if (!isInViewport) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

interface SpotlightProps {
  rect: Rect;
  visible: boolean;
}

function Spotlight({ rect, visible }: SpotlightProps) {
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
        border: '2px solid var(--color-primary)',
        animation: 'tourPulse 2s ease-in-out infinite',
        transition: 'top 0.3s ease-out, left 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out, opacity 0.3s ease-out',
        opacity: visible ? 1 : 0,
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
  onStepChange?: (stepIndex: number, step: TourStep) => void;
}

function TooltipBox({ step, rect, stepIndex, total, onNext, onPrev, onClose, onStepChange }: TooltipBoxProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isCenter = step.placement === 'center' || !rect;
  const PAD = 16;
  
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const TW = vw < 480 ? Math.min(320, vw - 32) : 360;
  const TH = 220;
  
  let style: React.CSSProperties = {};

  if (isCenter) {
    style = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 };
  } else if (rect) {
    const vh = window.innerHeight;
    let top = 0, left = 0;
    const placement = step.placement || 'bottom';

    if (placement === 'bottom') {
      top = rect.top + rect.height + PAD;
      left = Math.min(Math.max(rect.left + rect.width / 2 - TW / 2, 16), vw - TW - 16);
    } else if (placement === 'top') {
      top = rect.top - TH - PAD;
      left = Math.min(Math.max(rect.left + rect.width / 2 - TW / 2, 16), vw - TW - 16);
    } else if (placement === 'right') {
      top = Math.min(Math.max(rect.top + rect.height / 2 - TH / 2, 16), vh - TH - 16);
      left = rect.left + rect.width + PAD;
      if (left + TW > vw - 16) {
        left = rect.left - TW - PAD;
      }
    } else if (placement === 'left') {
      top = Math.min(Math.max(rect.top + rect.height / 2 - TH / 2, 16), vh - TH - 16);
      left = rect.left - TW - PAD;
      if (left < 16) {
        left = rect.left + rect.width + PAD;
      }
    }

    top = Math.max(16, Math.min(top, vh - TH - 16));
    left = Math.max(16, Math.min(left, vw - TW - 16));
    style = { position: 'fixed', top, left, zIndex: 9999, transition: 'top 0.3s ease-out, left 0.3s ease-out, opacity 0.3s ease-out' };
  }

  useEffect(() => {
    if (!tooltipRef.current) return;
    
    const focusableElements = tooltipRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    firstElement?.focus();
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    tooltipRef.current.addEventListener('keydown', handleTab);
    return () => tooltipRef.current?.removeEventListener('keydown', handleTab);
  }, [stepIndex]);

  useEffect(() => {
    onStepChange?.(stepIndex, step);
  }, [stepIndex, step, onStepChange]);

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-content"
      style={{ ...style, width: TW }}
      className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
    >
      <div className="bg-gradient-to-r from-primary to-accent px-5 py-4 flex items-center justify-between">
        <span id="tour-title" className="text-white font-bold text-base">{step.title}</span>
        <button
          onClick={onClose}
          aria-label="Fechar tour"
          className="text-white/80 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10"
        >
          <X size={18} />
        </button>
      </div>
      <div className="px-5 py-4">
        <p id="tour-content" className="text-slate-700 text-[15px] leading-relaxed">{step.content}</p>
      </div>
      <div className="px-5 pb-4 flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onClose}
          aria-label="Pular tour"
          className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
          Pular
        </button>
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={total}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${i === stepIndex ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-slate-200'}`}
              aria-label={`Passo ${i + 1} de ${total}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              onClick={onPrev}
              aria-label="Passo anterior"
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
          )}
          {stepIndex < total - 1 ? (
            <button
              onClick={onNext}
              aria-label="Próximo passo"
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              aria-label="Concluir tour"
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-accent hover:bg-accent/90 transition-colors"
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
  forceShow?: boolean;
  onStepChange?: (stepIndex: number, step: TourStep) => void;
}

const TOUR_STORAGE_KEY = 'ortobolt-tour-completed';

export default memo(function ProductTour({ page, active, onClose, forceShow = false, onStepChange }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const [targetMissing, setTargetMissing] = useState(false);
  const steps = useMemo(() => {
    const raw = TOUR_STEPS[page] || [];
    if (!active) return raw;
    return raw.filter(
      (s) => s.target === '__welcome__' || !!document.querySelector(`[data-tour="${s.target}"]`)
    );
  }, [page, active]);
  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (!active || forceShow) return;
    try {
      const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
      if (completed[page]) {
        onClose();
      }
    } catch (e) {
      console.warn('Failed to read tour completion:', e);
    }
  }, [active, page, forceShow, onClose]);

  const updateRect = useCallback(() => {
    if (!currentStep || currentStep.target === '__welcome__') {
      setRect(null);
      setTargetMissing(false);
      return;
    }
    const newRect = getRect(currentStep.target);
    if (!newRect) {
      setTargetMissing(true);
      setRect(null);
    } else {
      setTargetMissing(false);
      setRect(newRect);
    }
  }, [currentStep]);

  const debouncedUpdateRect = useCallback(debounce(updateRect, 50), [updateRect]);

  useEffect(() => {
    if (!active) return;
    setStepIndex(0);
    setSpotlightVisible(false);
  }, [active, page]);

  useEffect(() => {
    if (!active || !currentStep) return;
    
    if (currentStep.target !== '__welcome__') {
      scrollToElement(currentStep.target);
      const timeout = setTimeout(() => {
        updateRect();
        setSpotlightVisible(true);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setRect(null);
      setSpotlightVisible(true);
    }
  }, [active, stepIndex, currentStep, updateRect]);

  useEffect(() => {
    if (!active || !currentStep || currentStep.target === '__welcome__') return;

    const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement;
    if (!el) return;

    const scrollParent = getScrollParent(el);
    scrollParent.addEventListener('scroll', debouncedUpdateRect, { passive: true });
    window.addEventListener('resize', debouncedUpdateRect, { passive: true });

    const resizeObserver = new ResizeObserver(debouncedUpdateRect);
    resizeObserver.observe(el);

    updateRect();

    return () => {
      scrollParent.removeEventListener('scroll', debouncedUpdateRect);
      window.removeEventListener('resize', debouncedUpdateRect);
      resizeObserver.disconnect();
    };
  }, [active, currentStep, debouncedUpdateRect, updateRect]);

  const handleClose = useCallback(() => {
    try {
      const completed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
      completed[page] = true;
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
    } catch (e) {
      console.warn('Failed to save tour completion:', e);
    }
    onClose();
  }, [page, onClose]);

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, handleClose]);

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setSpotlightVisible(false);
      setTimeout(() => setStepIndex(s => s + 1), 150);
    } else {
      handleClose();
    }
  }, [stepIndex, steps.length, handleClose]);

  if (!active || steps.length === 0) return null;

  const handlePrev = () => {
    if (stepIndex > 0) {
      setSpotlightVisible(false);
      setTimeout(() => setStepIndex(s => Math.max(0, s - 1)), 150);
    }
  };

  return (
    <>
      <style>{`
        @keyframes tourPulse {
          0%, 100% {
            border-color: var(--color-primary);
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 20px rgba(10,61,143,0.4);
          }
          50% {
            border-color: var(--color-accent);
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 30px rgba(0,179,166,0.6);
          }
        }
        @keyframes fadeZoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in { animation: fadeZoomIn 0.3s ease-out; }
      `}</style>
      {(currentStep?.target === '__welcome__' || !rect) && (
        <div
          className="fixed inset-0 bg-black/65 z-[9997] transition-opacity duration-300"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
      {rect && currentStep?.target !== '__welcome__' && (
        <Spotlight rect={rect} visible={spotlightVisible} />
      )}
      {targetMissing && currentStep?.target !== '__welcome__' && (
        <div className="fixed top-4 right-4 z-[10000] bg-warning text-white px-4 py-2 rounded-xl shadow-lg" role="alert">
          ⚠️ Elemento do tour não encontrado: <code>{currentStep.target}</code>
        </div>
      )}
      {currentStep && (
        <TooltipBox
          step={currentStep}
          rect={rect}
          stepIndex={stepIndex}
          total={steps.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={handleClose}
          onStepChange={onStepChange}
        />
      )}
    </>
  );
});

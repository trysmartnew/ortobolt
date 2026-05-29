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
    { target: '__welcome__', title: '👋 Bem-vindo ao Centro de Comando Cirúrgico', content: 'Esta é sua central operacional. Aqui você vê suas cirurgias de hoje, casos críticos e métricas em tempo real — tudo focado no que importa AGORA.', placement: 'center' },
    { target: 'tour-dashboard-hero', title: '☀️ Saudação Personalizada', content: 'Veja seu nome, data atual e resumo do dia: número de cirurgias, casos críticos e análises pendentes. Comece o dia com clareza.', placement: 'bottom', highlight: true },
    { target: 'tour-dashboard-surgeries', title: '🏥 Cirurgias de Hoje', content: 'Suas cirurgias agendadas com status (concluída, próxima, agendada). Clique em qualquer cirurgia para ver o caso completo e protocolo.', placement: 'bottom', highlight: true },
    { target: 'tour-dashboard-triage', title: '⚡ Triage Inteligente', content: 'Casos ordenados por prioridade clínica: críticos (🔴), em análise (🟡) e estáveis (🟢). Atenção imediata aos casos urgentes.', placement: 'left', highlight: true },
    { target: 'tour-dashboard-metrics', title: '📊 Métricas Operacionais', content: 'Comparação hoje vs ontem: casos novos, análises feitas, laudos emitidos. Acompanhe sua produtividade em tempo real.', placement: 'top', highlight: true },
  ],
  chat: [
    { target: '__welcome__', title: '🤖 OrthoAI — Seu Copiloto Veterinário', content: 'Converse com a IA especializada em ortopedia veterinária. Tire dúvidas sobre protocolos, dosagens, cálculos biomecânicos e diagnósticos diferenciais.', placement: 'center' },
    { target: 'tour-chat-suggestions', title: '💡 Perguntas Sugeridas', content: 'Clique em qualquer sugestão para iniciar rapidamente: protocolos TPLO/FHO, cálculos de dosagem, diagnóstico diferencial.', placement: 'bottom', highlight: true },
    { target: 'tour-chat-messages', title: '💬 Histórico da Conversa', content: 'O OrthoAI mantém contexto ao longo da conversa. Respostas estruturadas com análise, possíveis causas e recomendação de ação.', placement: 'bottom', highlight: true },
    { target: 'tour-chat-input', title: '✍️ Envie sua Pergunta', content: 'Digite qualquer dúvida clínica. Use linguagem técnica ou simples. Pressione Enter para enviar.', placement: 'top', highlight: true },
  ],
  analysis: [
    { target: '__welcome__', title: '🔬 Análise Visual com IA', content: 'Analise radiografias e fotos clínicas com visão computacional. Detecta landmarks anatômicos, mede ângulos e sugere diagnósticos.', placement: 'center' },
    { target: 'tour-webcam', title: '📷 Captura ao Vivo', content: 'Ative a câmera para capturar imagens. O crosshair central ajuda no alinhamento. Clique em "Capturar" para fotografar.', placement: 'right', highlight: true },
    { target: 'tour-upload', title: '📁 Upload de Imagem', content: 'Arraste ou clique para fazer upload de radiografias, fotos cirúrgicas ou imagens de RM. Suporta JPG, PNG e WEBP.', placement: 'left', highlight: true },
    { target: 'tour-analysis-result', title: '🧠 Resultado da Análise', content: 'O OrthoVision AI identifica estruturas anatômicas, mede ângulos articulares e sugere diagnósticos diferenciais com score de confiança.', placement: 'top', highlight: true },
  ],
  gallery: [
    { target: '__welcome__', title: '🗂️ Galeria de Casos Clínicos', content: 'Acervo completo dos seus casos ortopédicos com filtros avançados por espécie, procedimento, status e data.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '🔍 Filtros Avançados', content: 'Filtre por status (pendente, em análise, concluído, crítico), espécie, procedimento e nível de risco.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🐕 Cards de Casos', content: 'Cada card mostra paciente, procedimento, score de precisão e nível de risco. Clique para abrir o caso completo.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '➕ Adicionar Caso', content: 'Registre um novo caso clínico com dados do paciente, procedimento e imagens. Disponível para análise futura.', placement: 'left', highlight: true },
  ],
  case: [
    { target: '__welcome__', title: '🏥 Detalhe do Caso + Protocolo Pós-Operatório', content: 'Veja todos os dados do paciente, análise da IA e o protocolo pós-operatório completo com calculadora de dosagem e checklist interativo.', placement: 'center' },
    { target: 'tour-case-protocol', title: '📋 Protocolo Pós-Operatório', content: 'Protocolo específico para o procedimento (TPLO, FHO, TTA, etc.) com etapas de medicação, restrição, cuidado e retorno.', placement: 'bottom', highlight: true },
    { target: 'tour-case-checklist', title: '✅ Checklist Interativo', content: 'Marque as etapas conforme o paciente evolui. O progresso é salvo automaticamente no seu navegador.', placement: 'bottom', highlight: true },
    { target: 'tour-case-notes', title: '📝 Notas Clínicas', content: 'Adicione anotações livres com timestamp. Histórico completo de observações do caso.', placement: 'top', highlight: true },
  ],
  reports: [
    { target: '__welcome__', title: '📄 Central de Relatórios', content: 'Gere relatórios profissionais em PDF automaticamente — relatório mensal completo ou relatório individual por caso cirúrgico.', placement: 'center' },
    { target: 'tour-monthly-report', title: '📅 Relatório Mensal', content: 'PDF completo com métricas do mês: volume de casos, taxa de precisão, procedimentos por tipo e comparativo com o mês anterior.', placement: 'bottom', highlight: true },
    { target: 'tour-case-report', title: '🔖 Relatório de Caso', content: 'Relatório individual de um caso específico com dados do paciente, diagnóstico, procedimento e análise pós-operatória.', placement: 'bottom', highlight: true },
    { target: 'tour-report-history', title: '📂 Histórico de Relatórios', content: 'Todos os relatórios gerados ficam listados aqui com data e tipo. Baixe novamente qualquer relatório anterior.', placement: 'top', highlight: true },
  ],
  profile: [
    { target: '__welcome__', title: '👨‍⚕️ Perfil Profissional', content: 'Seu perfil clínico completo com estatísticas de desempenho, certificações e gráfico de competências por área de especialização.', placement: 'center' },
    { target: 'tour-profile-stats', title: '📊 Estatísticas de Carreira', content: 'Resumo do seu histórico: total de cirurgias, anos de experiência, taxa de sucesso geral e certificações ativas.', placement: 'bottom', highlight: true },
    { target: 'tour-competency-chart', title: '🕸️ Radar de Competências', content: 'Gráfico radar que visualiza seu nível em cada área: Cirurgia, Diagnóstico, Reabilitação, Emergência, Anestesia e Oncologia.', placement: 'top', highlight: true },
  ],
  notifications: [
    { target: '__welcome__', title: '🔔 Central de Notificações', content: 'Alertas de casos críticos, lembretes de retorno, atualizações do sistema e notificações do OrthoAI ficam centralizados aqui.', placement: 'center' },
    { target: 'tour-unread-notifications', title: '🔴 Não Lidas', content: 'Notificações que ainda não foram vistas aparecem destacadas. Clique em "Marcar como lida" ou use o botão de marcar todas.', placement: 'bottom', highlight: true },
  ],
  settings: [
    { target: '__welcome__', title: '⚙️ Configurações do Sistema', content: 'Personalize notificações, preferências de análise, idioma e privacidade. Suas configurações ficam salvas automaticamente.', placement: 'center' },
    { target: 'tour-settings-toggles', title: '🔧 Preferências', content: 'Ative ou desative notificações, análise automática, idioma e salvamento automático de relatórios.', placement: 'bottom', highlight: true },
  ],
  sidebar: [
    { target: '__welcome__', title: '🧭 Navegação Lateral', content: 'Acesse todas as funcionalidades do OrtoBolt pela sidebar. Cada ícone leva a uma área específica da plataforma.', placement: 'center' },
    { target: 'tour-sidebar-dashboard', title: '📊 Dashboard', content: 'Centro de comando cirúrgico com suas cirurgias de hoje, casos críticos e métricas operacionais.', placement: 'right', highlight: true },
    { target: 'tour-sidebar-chat', title: '🤖 Chat IA', content: 'OrthoAI — seu copiloto veterinário especializado em ortopedia, protocolos e cálculos biomecânicos.', placement: 'right', highlight: true },
    { target: 'tour-sidebar-gallery', title: '🗂️ Galeria', content: 'Acervo completo dos seus casos clínicos com filtros avançados e busca inteligente.', placement: 'right', highlight: true },
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

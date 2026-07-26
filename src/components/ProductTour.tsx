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
    { target: '__welcome__', title: '👋 Bem-vindo ao Vanguard Veterinary', content: 'Este guia rápido mostra como usar a plataforma no seu dia a dia clínico. Leva menos de 1 minuto.', placement: 'center' },
    { target: 'tour-dashboard-surgeries', title: '🏥 Cirurgias de Hoje', content: 'Lista de procedimentos do dia. Clique em qualquer cirurgia para abrir o caso e o protocolo.', placement: 'bottom', highlight: true },
    { target: 'tour-dashboard-triage', title: '⚡ Fila de Triagem', content: 'Casos ordenados por prioridade clínica. Críticos no topo. Clique para iniciar o atendimento.', placement: 'left', highlight: true },
    { target: 'tour-dashboard-metrics', title: '📊 Métricas do Dia', content: 'Acompanhe o volume de casos novos e em análise. Para o histórico mensal, acesse Relatórios.', placement: 'top', highlight: true }, { target: 'tour-ai-widget', title: '🤖 Assistente Rápido', content: 'Tire dúvidas clínicas rápidas sem sair da tela atual.', placement: 'left', highlight: true },
  ],
  chat: [
    { target: '__welcome__', title: '🤖 Assistente IA', content: 'Assistente de texto para tirar dúvidas clínicas, protocolos e dosagens.', placement: 'center' },
    { target: 'tour-chat-suggestions', title: '💡 Perguntas Sugeridas', content: 'Clique em uma sugestão para iniciar (ex: protocolos TPLO, dosagens).', placement: 'bottom', highlight: true },
    { target: 'tour-chat-messages', title: '💬 Histórico', content: 'A conversa mantém o contexto durante sua sessão de trabalho.', placement: 'bottom', highlight: true },
    { target: 'tour-chat-input', title: '✍️ Digite sua dúvida', content: 'Escreva sua pergunta clínica e pressione Enter.', placement: 'top', highlight: true },
  ],
  analysis: [
    { target: '__welcome__', title: '🔬 Análise Diagnóstica', content: 'Envie radiografias para a IA analisar. O laudo e os landmarks serão integrados ao caso.', placement: 'center' },
    { target: 'tour-analysis-preview', title: '🖼️ Preview e Landmarks', content: 'Visualize a radiografia carregada. Os landmarks anatômicos detectados pela IA serão plotados em verde sobre a imagem.', placement: 'right', highlight: true },
    { target: 'tour-clinical-copilot', title: '💬 Copiloto', content: 'Refine o laudo da IA cruzando com o contexto clínico do paciente.', placement: 'left', highlight: true },
  ],
  comparative: [
    { target: '__welcome__', title: '🔁 Análise Comparativa', content: 'Compare duas radiografias do mesmo paciente (pré e pós-operatório) para avaliar a evolução lado a lado ou em superposição.', placement: 'center' },
    { target: 'tour-compare-upload', title: '🖼️ Mesa de Luz Digital', content: 'Carregue duas radiografias do mesmo paciente para comparar a evolução do caso, lado a lado ou em superposição.', placement: 'top' },
    { target: 'tour-compare-ai-analysis', title: '🧠 Análise de IA Comparativa', content: 'Rode a análise de IA para avaliar alinhamento, densidade óssea e recomendações entre os dois exames.', placement: 'bottom' },
    { target: 'tour-compare-save', title: '💾 Salvar Comparação', content: 'Salve o estudo comparativo como novo caso ou anexe a um caso clínico existente.', placement: 'top' },
  ],
  gallery: [
    { target: '__welcome__', title: '🗂️ Memória Clínica Centralizada', content: 'Aqui fica o histórico completo de cada paciente. Acompanhe a evolução, reconsultas e protocolos em um só lugar.', placement: 'center' },
    { target: 'tour-gallery-filters', title: '⚡ Triagem Rápida', content: 'Encontre casos urgentes ou recorrentes em segundos. Filtre por status para focar no que precisa de atenção agora.', placement: 'bottom', highlight: true },
    { target: 'tour-gallery-grid', title: '🔍 Visão 360° do Paciente', content: 'Clique em qualquer card e acesse instantaneamente o laudo da IA, imagens, checklist pós-op e geração de PDF.', placement: 'bottom', highlight: true },
    { target: 'tour-add-case', title: '📝 Registro Flexível', content: 'Adicione casos manuais ou provenientes de outras clínicas. A IA pode ser aplicada a qualquer momento depois.', placement: 'left', highlight: true },
  ],
  case: [
    { target: '__welcome__', title: '🏥 Caso Clínico', content: 'Aqui você gerencia o paciente, visualiza a análise da IA e aplica o protocolo pós-operatório.', placement: 'center' },
    { target: 'tour-case-patient', title: '🩺 Dados do Paciente', content: 'Informações do paciente e status atual do atendimento.', placement: 'bottom', highlight: true },
    { target: 'tour-case-image', title: '📷 Imagem Analisada', content: 'A radiografia do caso. Os landmarks anatômicos detectados pela IA estão marcados em verde sobre a imagem.', placement: 'bottom', highlight: true },
    { target: 'tour-case-ai-result', title: '🤖 Laudo da IA', content: 'Diagnóstico sugerido, fatores de risco e recomendações da inteligência artificial.', placement: 'bottom', highlight: true },
    { target: 'tour-case-actions', title: '⚡ Ações', content: 'Editar caso, gerar laudo em PDF para o tutor ou imprimir.', placement: 'left', highlight: true },
  ],
  reports: [
    { target: '__welcome__', title: '📄 Central de Relatórios', content: 'Gere relatórios gerenciais e laudos clínicos em PDF. Personalize com a identidade da clínica, acompanhe indicadores e exporte documentos para tutores e gestão.', placement: 'center' },
    { target: 'tour-report-customization', title: '🏥 Identidade da Clínica', content: 'Configure nome, subtítulo e logo da clínica. Essas informações aparecem no cabeçalho de todos os PDFs. Clique em Salvar Preferências para aplicar.', placement: 'bottom', highlight: true },
    { target: 'tour-report-monthly', title: '📊 Relatório Mensal', content: 'Visão gerencial do período: indicadores de precisão, volume de casos e taxa de sucesso, com gráfico de evolução dos últimos 7 meses.', placement: 'right', highlight: true },
    { target: 'tour-report-metrics', title: '🎯 Indicadores do Período', content: 'Métricas de Precisão (casos com análise de IA), Volume de Casos (últimos 30 dias) e Taxa de Sucesso (casos concluídos). Use-as para avaliar a performance da clínica.', placement: 'bottom', highlight: true },
    { target: 'tour-report-chart', title: '📈 Evolução Temporal', content: 'Gráfico com o volume de casos dos últimos 7 meses. Identifique tendências de crescimento ou sazonalidade da demanda.', placement: 'bottom', highlight: true },
    { target: 'tour-report-generate', title: '⬇️ Gerar e Exportar PDF', content: 'Clique para gerar e baixar o relatório mensal em PDF, pronto para impressão ou envio à gestão.', placement: 'top', highlight: true },
    { target: 'tour-report-clinical', title: '🩺 Laudos Clínicos e Guias', content: 'Gere o Laudo Técnico (com métricas de IA, landmarks anatômicos e fatores de risco) ou o Guia do Tutor (linguagem simplificada pós-operatória). Ao clicar em Selecionar Caso, você escolhe o caso clínico com busca por paciente ou procedimento.', placement: 'left', highlight: true },
    { target: 'tour-report-history', title: '📂 Histórico', content: 'Re-baixe qualquer relatório ou laudo gerado anteriormente, com data, tipo e tamanho do arquivo.', placement: 'top', highlight: true },
  ],
  notifications: [
    { target: '__welcome__', title: '🔔 Notificações', content: 'Alertas de casos críticos e atualizações do sistema.', placement: 'center' },
    { target: 'tour-unread-notifications', title: '🔴 Alertas não lidos', content: 'Clique para visualizar ou limpar seus alertas pendentes.', placement: 'bottom', highlight: true },
  ],
  settings: [
    { target: '__welcome__', title: '⚙️ Configurações', content: 'Ajuste as preferências da plataforma. Vamos percorrer cada seção.', placement: 'center' },
    { target: 'tour-settings-notifications', title: '🔔 Notificações e Interface', content: 'Configure alertas de casos críticos, análises concluídas e preferências visuais da interface.', placement: 'bottom', highlight: true },
    { target: 'tour-settings-language', title: '🌐 Idioma', content: 'Defina a língua da interface e dos relatórios gerados pela plataforma.', placement: 'bottom', highlight: true },
    { target: 'tour-settings-ai', title: '🧠 IA e Análise', content: 'Gerencie a análise automática de IA para melhorar a qualidade dos seus laudos.', placement: 'bottom', highlight: true },
    { target: 'tour-settings-report-format', title: '📄 Formato de Relatório', content: 'Escolha o formato padrão para exportação de relatórios clínicos.', placement: 'bottom', highlight: true },
    { target: 'tour-settings-upgrade', title: '👑 Upgrade de Plano', content: 'Visualize os recursos disponíveis no seu plano e opções de upgrade.', placement: 'bottom', highlight: true },
    { target: 'tour-settings-data', title: '💾 Meus Dados', content: 'Baixe todos os seus casos e dados pessoais em formato JSON para backup ou portabilidade.', placement: 'top', highlight: true },
  ],
  help: [
    { target: '__welcome__', title: '❓ Central de Ajuda', content: 'Documentação, guias rápidos e suporte para usar a plataforma no dia a dia.', placement: 'center' },
    { target: 'tour-help-faq', title: '💬 Perguntas Frequentes', content: 'Clique em uma pergunta para expandir a resposta: pacientes, laudos, análise de IA, exportação de dados e prontuário.', placement: 'bottom', highlight: true },
    { target: 'tour-help-docs', title: '📚 Documentação Rápida', content: 'Seis guias objetivos: ficha cadastral, prontuário, mesa de luz digital, análise diagnóstica, relatórios e configurações.', placement: 'bottom', highlight: true },
    { target: 'tour-help-support', title: '📧 Contato e Suporte', content: 'Fale com a equipe Vanguard Veterinary e abra um chamado de suporte especializado.', placement: 'top', highlight: true },
  ],
  patients: [
    { target: '__welcome__', title: '🐾 Página de Pacientes', content: 'Gerencie seus pacientes e acompanhe o histórico clínico. Vamos conhecer as principais ferramentas.', placement: 'center' },
    { target: 'tour-patients-search', title: '🔍 Busca', content: 'Pesquise pacientes pelo nome ou pela raça para encontrar rapidamente um registro.', placement: 'bottom', highlight: true },
    { target: 'tour-patients-filters', title: '⚙️ Filtros', content: 'Filtre a lista por raça, status clínico e data do último caso para focar no que importa.', placement: 'bottom', highlight: true },
    { target: 'tour-patients-add', title: '➕ Adicionar Paciente', content: 'Cadastre um novo paciente e tutor manualmente, com upload de exames.', placement: 'left', highlight: true },
    { target: 'tour-patients-table', title: '📋 Lista de Pacientes', content: 'Visualize foto, nome, espécie/raça, idade, proprietário, último caso e status clínico de cada paciente.', placement: 'top', highlight: true },
    { target: 'tour-patients-actions', title: '⚡ Ações', content: 'Por paciente: visualizar prontuário, abrir o Assistente Clínico IA, editar ou excluir o registro.', placement: 'left', highlight: true },
  ],
  patientDetail: [
    { target: '__welcome__', title: '🩺 Prontuário do Paciente', content: 'Visão completa do paciente: dados, histórico clínico, ferramentas de análise, exames e imagens.', placement: 'center' },
    { target: 'tour-patient-header', title: '🐾 Dados do Paciente', content: 'Nome, espécie, raça, idade, peso e profissional responsável pelo caso.', placement: 'bottom', highlight: true },
    { target: 'tour-patient-timeline', title: '📅 Timeline de Evoluções', content: 'Histórico cronológico das evoluções clínicas, com status e notas de cada atendimento. Abra qualquer caso para revisá-lo.', placement: 'right', highlight: true },
    { target: 'tour-patient-tools', title: '🧰 Ferramentas Clínicas', content: 'Acesse a Análise de Imagens, a Análise Evolutiva e a Análise de Alinhamento diretamente do prontuário.', placement: 'left', highlight: true },
    { target: 'tour-patient-labs', title: '🧪 Exames Laboratoriais', content: 'Resultados de exames do paciente, com data e indicação de laudo disponível.', placement: 'left', highlight: true },
    { target: 'tour-patient-gallery', title: '🖼️ Galeria de Imagens', content: 'Radiografias e fotos clínicas do paciente. Clique em Ver Galeria para navegar por todas.', placement: 'left', highlight: true },
  ],
  evolutionaryAnalysis: [
    { target: '__welcome__', title: '📈 Dashboard de Evolução', content: 'Acompanhe a evolução temporal do paciente com métricas de densidade óssea e espaço articular.', placement: 'center' },
    { target: 'tour-evolution-metrics', title: '🐾 Paciente em Análise', content: 'Identificação do paciente com idade, peso e status clínico do caso.', placement: 'bottom', highlight: true },
    { target: 'tour-evolution-bone-density', title: '🦴 Densidade Óssea', content: 'Gráfico de barras com a variação da densidade óssea ao longo dos exames.', placement: 'right', highlight: true },
    { target: 'tour-evolution-joint-space', title: '📉 Espaço Articular', content: 'Gráfico de linha com a evolução do espaço articular entre os exames.', placement: 'right', highlight: true },
    { target: 'tour-evolution-progress', title: '🧠 Análise de Progresso', content: 'Texto com a análise do progresso e a previsão evolutiva gerada a partir das tendências.', placement: 'top', highlight: true },
    { target: 'tour-evolution-report', title: '📄 Gerar Relatório', content: 'Gere o relatório de evolução e envie para a página de Relatórios.', placement: 'top', highlight: true },
  ],
  alignmentAnalysis: [
    { target: '__welcome__', title: '📐 Análise de Alinhamento', content: 'Avaliação biomecânica completa: ângulo femoral, simetria de membros, ângulo de Cobb e pontos de referência.', placement: 'center' },
    { target: 'tour-alignment-header', title: '🐾 Paciente em Análise', content: 'Identificação do paciente com idade, peso e status clínico do caso.', placement: 'bottom', highlight: true },
    { target: 'tour-alignment-images', title: '🩻 Exames e Pontos de Referência', content: 'Radiografias com pontos anatômicos e eixos de referência detectados pela IA (ângulos femoral, TPA, Norberg e Cobb).', placement: 'right', highlight: true },
    { target: 'tour-alignment-gauge', title: '🧭 Ângulo de Inclinação Femoral', content: 'Gráfico gauge com a inclinação femoral esquerda e direita, classificado por severidade.', placement: 'left', highlight: true },
    { target: 'tour-alignment-symmetry', title: '⚖️ Simetria de Membros', content: 'Gráfico de barras comparando o comprimento de fêmur e tíbia entre os membros esquerdo e direito.', placement: 'left', highlight: true },
    { target: 'tour-alignment-cobb', title: '📉 Ângulo de Cobb', content: 'Gráfico de linha com a evolução do ângulo de Cobb ao longo dos exames.', placement: 'left', highlight: true },
    { target: 'tour-alignment-report', title: '📄 Gerar Relatório', content: 'Gere o relatório de alinhamento e biometria e envie para a página de Relatórios.', placement: 'top', highlight: true },
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
      className="fixed z-[9998] pointer-events-none"
      style={{
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 18,
        boxShadow: '0 0 0 9999px var(--color-surface-dim)',
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

const TooltipBox = memo(function TooltipBox({ step, rect, stepIndex, total, onNext, onPrev, onClose, onStepChange }: TooltipBoxProps) {
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
      className="bg-[#16191b] border border-slate-800 overflow-hidden rounded-2xl duration-300 animate-in fade-in zoom-in-95"
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-primary to-accent px-5 py-4">
        <span id="tour-title" className="text-white font-bold text-base">{step.title}</span>
        <button
          onClick={onClose}
          aria-label="Fechar tour"
          className="rounded-lg p-1 text-white transition-colors hover:bg-slate-800 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
      <div className="px-5 py-4">
        <p id="tour-content" className="text-[15px] leading-relaxed text-slate-100">{step.content}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4">
        <button
          onClick={onClose}
          aria-label="Pular tour"
          className="text-xs font-medium text-slate-200 transition-colors hover:text-red-400"
        >
          Pular
        </button>
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={total}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${i === stepIndex ? 'h-2 w-5 bg-primary' : 'size-2 bg-slate-200 dark:bg-slate-400'}`}
              aria-label={`Passo ${i + 1} de ${total}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              onClick={onPrev}
              aria-label="Passo anterior"
              className="flex items-center gap-1 rounded-xl bg-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-900 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
          )}
          {stepIndex < total - 1 ? (
            <button
              onClick={onNext}
              aria-label="Próximo passo"
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1c6b62]"
            >
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              aria-label="Concluir tour"
              className="flex items-center gap-1 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#009a8f]"
            >
              Concluir ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
TooltipBox.displayName = 'TooltipBox';

export interface ProductTourProps {
  page: string;
  active: boolean;
  onClose: () => void;
  forceShow?: boolean;
  onStepChange?: (stepIndex: number, step: TourStep) => void;
}

const TOUR_STORAGE_KEY = 'vanguard-veterinary-tour-completed';

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

  const navigateTour = useCallback((newIndex: number) => {
    setSpotlightVisible(false);
    setTimeout(() => setStepIndex(newIndex), 150);
  }, []);

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      navigateTour(stepIndex + 1);
    } else {
      handleClose();
    }
  }, [stepIndex, steps.length, handleClose, navigateTour]);

  const handlePrev = useCallback(() => {
    if (stepIndex > 0) {
      navigateTour(stepIndex - 1);
    }
  }, [stepIndex, navigateTour]);

  if (!active || steps.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes tourPulse {
          0%, 100% {
            border-color: var(--color-primary);
              box-shadow: 0 0 0 9999px var(--color-surface-dim), 0 0 20px rgba(10,61,143,0.4);
            }
            50% {
              border-color: var(--color-accent);
              box-shadow: 0 0 0 9999px var(--color-surface-dim), 0 0 30px rgba(0,179,166,0.6);
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
          onClick={() => handleClose()}
          aria-hidden="true"
        />
      )}
      {rect && currentStep?.target !== '__welcome__' && (
        <Spotlight rect={rect} visible={spotlightVisible} />
      )}
      {targetMissing && currentStep?.target !== '__welcome__' && (
        <div className="fixed right-4 top-4 z-[10000] rounded-xl bg-warning px-4 py-2 text-slate-900 shadow-lg" role="alert">
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

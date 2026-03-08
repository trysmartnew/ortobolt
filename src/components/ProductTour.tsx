import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';

// ── Tour step definition ────────────────────────────────────────────────────
export interface TourStep {
  target: string;           // data-tour attribute value
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;      // draw glowing ring
}

// ── Steps per page ──────────────────────────────────────────────────────────
export const TOUR_STEPS: Record<string, TourStep[]> = {
  dashboard: [
    {
      target: '__welcome__',
      title: '👋 Bem-vindo ao OrtoBolt!',
      content: 'Esta é sua central de ortopedia veterinária inteligente. Vamos fazer um tour rápido para você conhecer tudo que a plataforma oferece.',
      placement: 'center',
    },
    {
      target: 'tour-kpis',
      title: '📊 Métricas em Tempo Real',
      content: 'Aqui ficam seus KPIs principais: casos ativos, taxa de precisão cirúrgica, procedimentos este mês e alertas críticos. Atualizam automaticamente.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-precision-chart',
      title: '📈 Tendência de Precisão',
      content: 'Gráfico de evolução da sua precisão cirúrgica ao longo do tempo. Você pode visualizar a tendência semanal e identificar padrões de melhoria.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-cases-chart',
      title: '📋 Volume por Procedimento',
      content: 'Distribuição dos seus casos por tipo de procedimento (TPLO, FHO, TTA, etc.). Útil para entender seu perfil de especialização.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-recent-cases',
      title: '🐾 Casos Recentes',
      content: 'Lista dos últimos casos clínicos com status, nível de risco e score de precisão. Clique em qualquer caso para ver os detalhes completos.',
      placement: 'top',
      highlight: true,
    },
  ],
  chat: [
    {
      target: '__welcome__',
      title: '🤖 OrthoAI — Consultor Especializado',
      content: 'O Chat IA conecta você ao Gemini 2.0 Flash com contexto especializado em ortopedia veterinária. Tire dúvidas sobre protocolos, dosagens e técnicas cirúrgicas.',
      placement: 'center',
    },
    {
      target: 'tour-chat-suggestions',
      title: '💡 Perguntas Sugeridas',
      content: 'Clique em qualquer sugestão para enviar rapidamente perguntas frequentes sobre protocolos TPLO, FHO, anestesia e reabilitação.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-chat-messages',
      title: '💬 Histórico da Conversa',
      content: 'O histórico completo da sessão fica aqui. O OrthoAI mantém contexto ao longo da conversa para respostas cada vez mais precisas.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-chat-input',
      title: '✍️ Envie sua Pergunta',
      content: 'Digite qualquer dúvida sobre ortopedia veterinária. Use linguagem técnica ou simples — o OrthoAI entende ambas. Pressione Enter ou clique em Enviar.',
      placement: 'top',
      highlight: true,
    },
  ],
  analysis: [
    {
      target: '__welcome__',
      title: '🔬 Análise Visual com IA',
      content: 'Esta página usa visão computacional para analisar imagens radiográficas e fotos clínicas. Capture pela câmera ou faça upload de uma imagem.',
      placement: 'center',
    },
    {
      target: 'tour-webcam',
      title: '📷 Captura ao Vivo',
      content: 'Ative a câmera para capturar imagens diretamente. O crosshair central ajuda no alinhamento. Clique em "Capturar" para fotografar.',
      placement: 'right',
      highlight: true,
    },
    {
      target: 'tour-upload',
      title: '📁 Upload de Imagem',
      content: 'Arraste e solte ou clique para fazer upload de radiografias, fotos cirúrgicas ou imagens de RM. Suporta JPG, PNG e WEBP.',
      placement: 'left',
      highlight: true,
    },
    {
      target: 'tour-analysis-result',
      title: '🧠 Resultado da Análise',
      content: 'Após o envio, o Gemini AI identifica estruturas anatômicas, possíveis lesões, angulações e sugere diagnósticos diferenciais com nível de confiança.',
      placement: 'top',
      highlight: true,
    },
  ],
  gallery: [
    {
      target: '__welcome__',
      title: '🗂️ Galeria de Casos Clínicos',
      content: 'Acervo completo dos seus casos ortopédicos com filtros avançados por espécie, procedimento, status e data.',
      placement: 'center',
    },
    {
      target: 'tour-gallery-filters',
      title: '🔍 Filtros Avançados',
      content: 'Filtre por status (Concluído, Em andamento, Aguardando), espécie (Cão, Gato), tipo de procedimento e nível de risco.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-gallery-grid',
      title: '🐕 Cards de Casos',
      content: 'Cada card exibe paciente, procedimento, score de precisão e nível de risco. Clique em "Ver detalhes" para abrir o caso completo com análise IA.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-add-case',
      title: '➕ Adicionar Caso',
      content: 'Registre um novo caso clínico com todas as informações do paciente, procedimento, imagens e notas. Os dados ficam disponíveis para análise futura.',
      placement: 'left',
      highlight: true,
    },
  ],
  reports: [
    {
      target: '__welcome__',
      title: '📄 Central de Relatórios',
      content: 'Gere relatórios profissionais em PDF automaticamente — relatório mensal completo ou relatório individual por caso cirúrgico.',
      placement: 'center',
    },
    {
      target: 'tour-monthly-report',
      title: '📅 Relatório Mensal',
      content: 'Gera um PDF completo com métricas do mês: volume de casos, taxa de precisão, procedimentos por tipo e comparativo com o mês anterior.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-case-report',
      title: '🔖 Relatório de Caso',
      content: 'Relatório individual de um caso específico, incluindo dados do paciente, diagnóstico, procedimento realizado e análise pós-operatória.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-report-history',
      title: '📂 Histórico de Relatórios',
      content: 'Todos os relatórios gerados ficam listados aqui com data e tipo. Você pode baixar novamente qualquer relatório anterior.',
      placement: 'top',
      highlight: true,
    },
  ],
  profile: [
    {
      target: '__welcome__',
      title: '👨‍⚕️ Perfil Profissional',
      content: 'Seu perfil clínico completo com estatísticas de desempenho, certificações e gráfico de competências por área de especialização.',
      placement: 'center',
    },
    {
      target: 'tour-profile-stats',
      title: '📊 Estatísticas de Carreira',
      content: 'Resumo do seu histórico: total de cirurgias, anos de experiência, taxa de sucesso geral e certificações ativas.',
      placement: 'bottom',
      highlight: true,
    },
    {
      target: 'tour-competency-chart',
      title: '🕸️ Radar de Competências',
      content: 'Gráfico radar que visualiza seu nível em cada área: Cirurgia, Diagnóstico, Reabilitação, Emergência, Anestesia e Oncologia.',
      placement: 'top',
      highlight: true,
    },
  ],
  notifications: [
    {
      target: '__welcome__',
      title: '🔔 Central de Notificações',
      content: 'Alertas de casos críticos, lembretes de retorno, atualizações do sistema e notificações do OrthoAI ficam centralizados aqui.',
      placement: 'center',
    },
    {
      target: 'tour-unread-notifications',
      title: '🔴 Não Lidas',
      content: 'Notificações que ainda não foram vistas aparecem destacadas. Clique em "Marcar como lida" ou use o botão de marcar todas.',
      placement: 'bottom',
      highlight: true,
    },
  ],

  case: [
    {
      target: '__welcome__',
      title: '🤝 Colaboração Clínica',
      content: 'Este é o espaço de colaboração do caso. Aqui você pode discutir o caso em tempo real com especialistas convidados, visualizar exames em conjunto e tomar decisões clínicas colaborativas.',
      placement: 'center',
    },
    {
      target: 'tour-collab-chat',
      title: '💬 Chat do Caso',
      content: 'Discuta o caso em tempo real com toda a equipe. O botão azul-violeta pede uma sugestão clínica ao OrthoAI para o caso específico.',
      placement: 'top',
      highlight: true,
    },
    {
      target: 'tour-collab-specialists',
      title: '👥 Especialistas Convidados',
      content: 'Convide especialistas por e-mail com controle de permissão (Consultor ou Observador). Veja quem está online no caso em tempo real.',
      placement: 'top',
      highlight: true,
    },
    {
      target: 'tour-collab-viewer',
      title: '🔬 Visualização Conjunta',
      content: 'Veja as imagens do caso com toda a equipe simultaneamente. Cursores de presença mostram onde cada especialista está focado na imagem.',
      placement: 'top',
      highlight: true,
    },
  ],
  settings: [
    {
      target: '__welcome__',
      title: '⚙️ Configurações do Sistema',
      content: 'Personalize notificações, preferências de análise, tema e privacidade. Suas configurações ficam salvas automaticamente.',
      placement: 'center',
    },
    {
      target: 'tour-settings-toggles',
      title: '🔧 Preferências',
      content: 'Ative ou desative notificações, análise automática, modo escuro e salvamento automático de relatórios.',
      placement: 'bottom',
      highlight: true,
    },
  ],
};

// ── Spotlight + tooltip overlay ─────────────────────────────────────────────
interface Rect { top: number; left: number; width: number; height: number; }

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
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
        borderRadius: 12,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
        border: '2px solid rgba(0,149,255,0.9)',
        animation: 'tourPulse 2s ease-in-out infinite',
      }}
    />
  );
}

function TooltipBox({
  step, rect, stepIndex, total,
  onNext, onPrev, onClose,
}: {
  step: TourStep; rect: Rect | null; stepIndex: number; total: number;
  onNext: () => void; onPrev: () => void; onClose: () => void;
}) {
  const isCenter = step.placement === 'center' || !rect;
  const TW = 320;
  const TH = 180;
  const PAD = 16;

  let style: React.CSSProperties = {};
  if (isCenter) {
    style = {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
    };
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
    // clamp
    top = Math.max(16, Math.min(top, vh - TH - 16));
    left = Math.max(16, Math.min(left, vw - TW - 16));
    style = { position: 'fixed', top, left, zIndex: 9999 };
  }

  return (
    <div style={{ ...style, width: TW }} className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0056b3] to-[#0077e6] px-4 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-sm" style={{ fontFamily: 'Montserrat' }}>{step.title}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-slate-600 text-sm leading-relaxed">{step.content}</p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${i === stepIndex ? 'w-4 h-1.5 bg-[#0056b3]' : 'w-1.5 h-1.5 bg-slate-200'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={12} /> Anterior
            </button>
          )}
          {stepIndex < total - 1 ? (
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0056b3] hover:bg-[#0047a0] transition-colors"
            >
              Próximo <ChevronRight size={12} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              Concluir ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ProductTour component ───────────────────────────────────────────────
interface ProductTourProps {
  page: string;
  active: boolean;
  onClose: () => void;
}

export default function ProductTour({ page, active, onClose }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const steps = TOUR_STEPS[page] || [];

  const currentStep = steps[stepIndex];

  const updateRect = useCallback(() => {
    if (!currentStep || currentStep.target === '__welcome__') {
      setRect(null);
      return;
    }
    const r = getRect(currentStep.target);
    if (r) {
      // scroll into view
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => setRect(getRect(currentStep.target)), 300);
    } else {
      setRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!active) return;
    setStepIndex(0);
  }, [active, page]);

  useEffect(() => {
    if (!active) return;
    updateRect();
  }, [active, stepIndex, updateRect]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => updateRect();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, updateRect]);

  if (!active || steps.length === 0) return null;

  const handleNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex(s => s + 1);
    else onClose();
  };
  const handlePrev = () => setStepIndex(s => Math.max(0, s - 1));

  return (
    <>
      {/* CSS animation */}
      <style>{`
        @keyframes tourPulse {
          0%, 100% { border-color: rgba(0,149,255,0.9); box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 20px rgba(0,149,255,0.4); }
          50% { border-color: rgba(0,200,255,1); box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 30px rgba(0,200,255,0.6); }
        }
      `}</style>

      {/* Dark overlay (only for center steps without spotlight) */}
      {(currentStep?.target === '__welcome__' || !rect) && (
        <div
          className="fixed inset-0 bg-black/65 z-[9997]"
          onClick={onClose}
        />
      )}

      {/* Spotlight */}
      {rect && currentStep?.target !== '__welcome__' && <Spotlight rect={rect} />}

      {/* Tooltip */}
      {currentStep && (
        <TooltipBox
          step={currentStep}
          rect={rect}
          stepIndex={stepIndex}
          total={steps.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={onClose}
        />
      )}
    </>
  );
}

// ── Floating Tour Button ─────────────────────────────────────────────────────
export function TourButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Tour desta página"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-[#0056b3] text-white text-xs font-semibold shadow-lg hover:bg-[#0047a0] hover:scale-105 transition-all duration-200 group"
      style={{ fontFamily: 'Montserrat' }}
    >
      <MapPin size={14} className="group-hover:animate-bounce" />
      <span>Tour</span>
    </button>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import type { ChatMessage } from '@/types/index';
import type { ClinicalContextDraft } from '@/types/clinicalCopilot';
import type { AnimalSpecies, ProcedureType } from '@/types/index';
import { Button, Spinner } from '@/components/ui';
import { SPECIES_LABELS, PROCEDURE_LABELS } from '@/constants/labels';

const COPILOT_SUGGESTIONS = [
  'Confirme a região anatômica e achados principais.',
  'Quais diagnósticos diferenciais considerar com este contexto?',
  'Sugira conduta e exames complementares.',
];

function CopilotBubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
          isUser ? 'bg-primary text-white' : 'bg-white/10 text-slate-200'
        }`}
      >
        {isUser ? <User size={12} /> : <Bot size={12} />}
      </div>
      <div className={`max-w-[85%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
            isUser
              ? 'bg-primary text-white rounded-tr-sm'
              : 'bg-[#0B0F19]/60 border border-white/10 text-slate-200 rounded-tl-sm'
          }`}
        >
          {msg.isLoading ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-xs text-slate-400">Processando análise...</span>
            </div>
          ) : (
            msg.content
          )}
        </div>
        {!isUser && !msg.isLoading && msg.content && (
          <button
            type="button"
            onClick={copy}
            className="text-[10px] text-slate-400 hover:text-primary flex items-center gap-1"
          >
            {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
            Copiar
          </button>
        )}
      </div>
    </div>
  );
}

export interface ClinicalCopilotPanelProps {
  enabled: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  refining: boolean;
  error: string | null;
  clinicalContext: ClinicalContextDraft;
  onContextChange: (ctx: ClinicalContextDraft) => void;
  onSend: (text: string) => void;
  onRefineAnalysis: () => void;
  onRetry: () => void;
}

export default function ClinicalCopilotPanel({
  enabled,
  messages,
  streaming,
  refining,
  error,
  clinicalContext,
  onContextChange,
  onSend,
  onRefineAnalysis,
  onRetry,
}: ClinicalCopilotPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || streaming || !enabled) return;
    setInput('');
    onSend(t);
  };

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-[#0B0F19]/60 p-6 text-center text-sm text-slate-400">
        Conclua a análise visual para ativar o Assistente Clínico contextual.
      </div>
    );
  }

  return (
    <div
      data-tour="tour-clinical-copilot"
      className="flex flex-col rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(26,29,31,0.65)] backdrop-blur-[12px] overflow-hidden min-h-[480px]"
    >
      <div className="px-4 py-3 border-b border-white/10 bg-[rgba(26,29,31,0.65)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <div>
            <p className="text-sm font-bold text-[#9a9fa5]">Assistente Clínico</p>
            <p className="text-[10px] text-[#9a9fa5] font-mono">
              Radiografia + contexto + histórico da sessão
            </p>
          </div>
        </div>
        <Button
            size="sm"
            variant="secondary"
            onClick={onRefineAnalysis}
            disabled={refining || streaming}
            loading={refining}
            title="Consolidar chat e contexto na análise visual"
            className="relative overflow-hidden"
          >
            {!refining && !streaming && messages.length > 0 && (
              <span className="absolute inset-0 rounded-md bg-primary opacity-10 animate-pulse" />
            )}
            <RefreshCw size={13} className="relative z-10" />
            <span className="relative z-10 ml-1.5">Refinar análise</span>
          </Button>
      </div>

      <div className="px-4 py-3 border-b border-white/10 bg-[rgba(26,29,31,0.65)] grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Paciente (opcional)"
          value={clinicalContext.patientName ?? ''}
          onChange={(e) => onContextChange({ patientName: e.target.value })}
          className="text-xs text-white border border-[#2a2d30] bg-[#111315] rounded-[6px] px-2 py-1.5 placeholder-[#6f767e] focus:border-[#29a399] transition-all"
        />
        <select
          value={clinicalContext.species ?? ''}
          onChange={(e) =>
            onContextChange({
              species: (e.target.value || undefined) as AnimalSpecies | undefined,
            })
          }
          className="text-xs text-white border border-[#2a2d30] bg-[#111315] rounded-[6px] px-2 py-1.5 placeholder-[#6f767e] focus:border-[#29a399] transition-all"
        >
          <option value="">Espécie</option>
          {(Object.keys(SPECIES_LABELS) as AnimalSpecies[]).map((s) => (
            <option key={s} value={s}>
              {SPECIES_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Raça"
          value={clinicalContext.breed ?? ''}
          onChange={(e) => onContextChange({ breed: e.target.value })}
          className="text-xs text-white border border-[#2a2d30] bg-[#111315] rounded-[6px] px-2 py-1.5 placeholder-[#6f767e] focus:border-[#29a399] transition-all"
        />
        <input
          type="number"
          placeholder="Peso (kg)"
          value={clinicalContext.weightKg ?? ''}
          onChange={(e) =>
            onContextChange({
              weightKg: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="text-xs text-white border border-[#2a2d30] bg-[#111315] rounded-[6px] px-2 py-1.5 placeholder-[#6f767e] focus:border-[#29a399] transition-all"
        />
        <select
          value={clinicalContext.procedure ?? ''}
          onChange={(e) =>
            onContextChange({
              procedure: (e.target.value || undefined) as ProcedureType | undefined,
            })
          }
          className="text-xs text-white border border-[#2a2d30] bg-[#111315] rounded-[6px] px-2 py-1.5 col-span-2 placeholder-[#6f767e] focus:border-[#29a399] transition-all"
        >
          <option value="">Procedimento</option>
          {(Object.keys(PROCEDURE_LABELS) as ProcedureType[]).map((p) => (
            <option key={p} value={p}>
              {PROCEDURE_LABELS[p]}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Notas clínicas (refinamento contextual)"
          value={clinicalContext.clinicalNotes ?? ''}
          onChange={(e) => onContextChange({ clinicalNotes: e.target.value })}
          rows={2}
          className="text-xs text-white border border-[#2a2d30] bg-[#111315] rounded-[6px] px-2 py-1.5 col-span-2 resize-none placeholder-[#6f767e] focus:border-[#29a399] transition-all"
        />
      </div>

      {error && (
        <div className="mx-4 mt-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={onRetry}
            className="text-white hover:text-primary font-bold underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[280px]">
        {messages.map((m) => (
          <CopilotBubble key={m.id} msg={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-2 flex flex-wrap gap-1">
        {COPILOT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={streaming}
            onClick={() => onSend(s)}
            className="text-[10px] text-[#29a399] bg-[#111315] border border-[#2a2d30] px-2 py-1 rounded-full hover:bg-white/5 disabled:opacity-50 transition-all"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-white/10 bg-[rgba(26,29,31,0.65)]">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Pergunte sobre a radiografia..."
            rows={2}
            disabled={streaming}
            className="flex-1 text-sm text-white bg-[#111315] border border-[#2a2d30] rounded-[6px] px-3 py-2 resize-none placeholder-[#6f767e] focus:border-[#29a399] transition-all"
          />
          <Button size="sm" onClick={handleSend} disabled={!input.trim() || streaming} loading={streaming}>
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

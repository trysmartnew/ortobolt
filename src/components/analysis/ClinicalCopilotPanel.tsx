import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import type { ChatMessage } from '@/types/index';
import type { ClinicalContextDraft } from '@/types/clinicalCopilot';
import type { AnimalSpecies, ProcedureType } from '@/types/index';
import { Button, Spinner } from '@/components/ui';
import { SPECIES_LABELS, PROCEDURE_LABELS } from '@/data/mockData';

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
          isUser ? 'bg-[#0056b3] text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {isUser ? <User size={12} /> : <Bot size={12} />}
      </div>
      <div className={`max-w-[85%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
            isUser
              ? 'bg-[#0056b3] text-white rounded-tr-sm'
              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
          }`}
        >
          {msg.isLoading ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-xs text-slate-400">Copiloto analisando...</span>
            </div>
          ) : (
            msg.content
          )}
        </div>
        {!isUser && !msg.isLoading && msg.content && (
          <button
            type="button"
            onClick={copy}
            className="text-[10px] text-slate-400 hover:text-[#0056b3] flex items-center gap-1"
          >
            {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
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
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
        Conclua a análise visual para ativar o Copiloto Clínico contextual.
      </div>
    );
  }

  return (
    <div
      data-tour="tour-clinical-copilot"
      className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden min-h-[480px]"
    >
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#0056b3]" />
          <div>
            <p className="text-sm font-bold text-slate-900">Copiloto Clínico</p>
            <p className="text-[10px] text-slate-500 font-mono">
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
        >
          <RefreshCw size={13} /> Refinar análise
        </Button>
      </div>

      <div className="px-4 py-3 border-b border-slate-100 bg-white grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Paciente (opcional)"
          value={clinicalContext.patientName ?? ''}
          onChange={(e) => onContextChange({ patientName: e.target.value })}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
        />
        <select
          value={clinicalContext.species ?? ''}
          onChange={(e) =>
            onContextChange({
              species: (e.target.value || undefined) as AnimalSpecies | undefined,
            })
          }
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
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
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
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
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
        />
        <select
          value={clinicalContext.procedure ?? ''}
          onChange={(e) =>
            onContextChange({
              procedure: (e.target.value || undefined) as ProcedureType | undefined,
            })
          }
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 col-span-2"
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
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 col-span-2 resize-none"
        />
      </div>

      {error && (
        <div className="mx-4 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
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
            className="text-[10px] text-[#0056b3] bg-blue-50 border border-blue-100 px-2 py-1 rounded-full hover:bg-blue-100 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-slate-200 bg-white">
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
            className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20"
          />
          <Button size="sm" onClick={handleSend} disabled={!input.trim() || streaming} loading={streaming}>
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

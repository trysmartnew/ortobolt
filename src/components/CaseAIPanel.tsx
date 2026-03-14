import React, { useState } from 'react';
import { Bot, Copy, Check, FolderPlus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { sendChatMessageStream } from '@/services/aiService';
import { Card } from '@/components/ui';

interface CaseAIPanelProps {
  caseId: string;
}

export default function CaseAIPanel({ caseId }: CaseAIPanelProps) {
  const { activeCase, addCaseMessage, addToast } = useApp();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ q: string; a: string }[]>([]);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const askAI = async () => {
    if (!question.trim() || loading || !activeCase) return;

    const q = question.trim();
    setQuestion('');
    setLoading(true);
    setStreamingAnswer('');

    const ctx = [
      'Caso clínico: ' + activeCase.title + '.',
      'Paciente: ' + activeCase.species + ' ' + activeCase.breed + ', ' +
      activeCase.ageYears + 'a, ' + activeCase.weightKg + 'kg.',
      'Procedimento: ' + activeCase.procedure + '. Status: ' + activeCase.status +
      '. Risco: ' + activeCase.riskLevel + '.',
      'Pergunta do médico: ' + q
    ].join(' ');

    let fullAnswer = '';
    try {
      await sendChatMessageStream(ctx, [], (chunk) => {
        fullAnswer = chunk;
        setStreamingAnswer(chunk);
      });
      setAiMessages(prev => [...prev, { q, a: fullAnswer }]);
      setStreamingAnswer('');
    } catch {
      addToast('Erro ao consultar OrthoAI. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveToCase = (answer: string) => {
    addToast('Resposta salva na discussão do caso!', 'success');
  };

  return (
    <Card className="border border-blue-100 bg-gradient-to-br from-blue-50/40 to-white">
      <div
        className="flex items-center justify-between cursor-pointer px-4 py-3 border-b border-blue-100"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Bot className="text-[#0056b3]" size={18} />
          <div>
            <h3 className="text-sm font-bold text-slate-800">OrthoAI — Consultor do Caso</h3>
            <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-semibold">
              IA Especializada
            </span>
          </div>
        </div>
        {collapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* History */}
          <div className="max-h-64 overflow-y-auto space-y-3">
            {aiMessages.map((msg, i) => (
              <div key={i} className="space-y-1">
                <div className="text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg px-3 py-2">
                  ▶ {msg.q}
                </div>
                <div className="text-xs text-slate-700 bg-white border border-blue-100 rounded-lg px-3 py-2">
                  {msg.a.split('\n').map((line, j) => (
                    <React.Fragment key={j}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => handleCopy(msg.a, i)}
                      className="text-[10px] text-slate-400 hover:text-[#0056b3] transition-colors flex items-center gap-0.5"
                    >
                      {copiedIndex === i ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                      {copiedIndex === i ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => handleSaveToCase(msg.a)}
                      className="text-[10px] text-slate-400 hover:text-[#0056b3] transition-colors flex items-center gap-0.5"
                    >
                      <FolderPlus size={10} />
                      Salvar na discussão
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {loading && streamingAnswer && (
              <div className="text-xs text-slate-600 bg-white border border-blue-100 rounded-lg px-3 py-2 italic">
                {streamingAnswer}
              </div>
            )}

            {loading && !streamingAnswer && (
              <div className="flex gap-2 items-center text-xs text-slate-400">
                <Loader2 className="animate-spin text-[#0056b3]" size={14} />
                OrthoAI analisando o caso...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="space-y-2">
            <textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  askAI();
                }
              }}
              placeholder="Pergunte sobre este caso específico..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#0056b3]/30 resize-none"
              disabled={loading}
            />
            <button
              onClick={askAI}
              disabled={loading || !question.trim()}
              className="w-full bg-[#0056b3] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#004494] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Perguntar
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
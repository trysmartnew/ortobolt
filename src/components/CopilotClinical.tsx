// src/components/CopilotClinical.tsx
// ✅ Copiloto Clínico reutilizável — integrado em AnalysisPage e CasePage
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Copy, Check, RefreshCw } from 'lucide-react';
import { useAnalysis, type ImageAnalysis } from '@/contexts/AnalysisContext';
import { sendChatMessage, PRIMARY_MODEL } from '@/services/aiService';
import { anonymizeCaseContext } from '@/lib/anonymizeClinical';
import { Card, Button, Spinner } from '@/components/ui';

interface CopilotClinicalProps {
  mode: 'analysis' | 'comparative' | 'case';
  originalAnalysis?: ImageAnalysis;
  followUpAnalysis?: ImageAnalysis;
  caseData?: any;
  onRefine?: () => void;
}

export default function CopilotClinical({
  mode,
  originalAnalysis,
  followUpAnalysis,
  caseData,
  onRefine,
}: CopilotClinicalProps) {
  const { copilotContext, setCopilotContext } = useAnalysis();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      // Construir contexto para a IA baseado no modo
      let context = '';
      
      if (mode === 'analysis' && originalAnalysis) {
        context = `Análise de imagem em andamento:\n\n${originalAnalysis.analysisResult}`;
      } else if (mode === 'comparative' && originalAnalysis && followUpAnalysis) {
        context = `Comparação entre análise original e follow-up:\n\nIMAGEM ORIGINAL:\n${originalAnalysis.analysisResult}\n\nIMAGEM FOLLOW-UP:\n${followUpAnalysis.analysisResult}`;
      } else if (mode === 'case' && caseData) {
        context = `Caso clínico: ${caseData.title || 'Sem título'}\n${anonymizeCaseContext(caseData)}\n\n${originalAnalysis ? `Análise de imagem:\n${originalAnalysis.analysisResult}` : ''}`;
      }

      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await sendChatMessage(
        `${context}\n\nPergunta do veterinário: ${userMsg}`,
        history
      );

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      console.error('Copilot error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Erro ao processar. Verifique sua conexão e tente novamente.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <strong key={i} className="font-semibold block">{line.slice(2, -2)}</strong>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="ml-4 text-sm list-disc">{line.slice(2)}</li>;
      }
      if (line.startsWith('#')) {
        return <h3 key={i} className="font-bold text-primary text-sm mt-2 mb-1">{line.replace(/^#+\s/, '')}</h3>;
      }
      if (line === '') return <br key={i} />;
      return <p key={i} className="text-sm">{line}</p>;
    });
  };

  return (
    <Card className="p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Copiloto Clínico</h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {mode === 'analysis' && 'Análise de Imagem'}
              {mode === 'comparative' && 'Estudo Comparativo'}
              {mode === 'case' && 'Caso Clínico'}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-[10px] text-slate-400 hover:text-error transition-colors flex items-center gap-1"
            title="Limpar conversa"
          >
            <RefreshCw size={10} />
            Limpar
          </button>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 max-h-80 min-h-[120px] pr-1">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Bot size={32} className="text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              Sou o Assistente Clínico. Como posso ajudar a refinar esta análise?
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
              {['Confirme a região anatômica', 'Quais diagnósticos diferenciais?', 'Sugira conduta'].map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="text-[10px] text-primary bg-blue-50 border border-blue-100 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
              msg.role === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-gradient-to-br from-blue-500 to-violet-500 text-white'
            }`}>
              {msg.role === 'user' ? 'V' : <Bot size={12} />}
            </div>
            <div className={`flex-1 max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-2xl px-3 py-2 ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-sm' 
                  : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="space-y-0.5">{renderContent(msg.content)}</div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => handleCopy(msg.content, i)}
                  className="text-[10px] text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                >
                  {copiedId === i ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                  {copiedId === i ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
              <Bot size={12} className="text-white" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-3 py-2">
              <Spinner size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Refinar análise..."
            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 shadow-sm"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>

         {/* Botão Refinar Análise */}
         {onRefine && (
           <div>
             <button
               onClick={onRefine}
               className="w-full px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
             >
               <RefreshCw size={12} />
               Refinar Análise
             </button>
           </div>
         )}

        <p className="text-[10px] text-slate-300 font-mono text-center">
          ⚡ Copiloto Clínico · OrthoAI · {PRIMARY_MODEL}
        </p>
      </div>
    </Card>
  );
}

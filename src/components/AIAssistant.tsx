// src/components/AIAssistant.tsx
// 🤖 OrthoAI Copiloto Global — Widget flutuante com diretrizes veterinárias
import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { sendChatMessageStream } from '@/services/aiService';
import { buildVetMessage } from '@/services/veterinaryPrompts';
import { anonymizeCaseContext } from '@/lib/anonymizeClinical';
import { useApp } from '@/contexts/AppContext';
import OrthoDeepAnalysis from './OrthoDeepAnalysis';
import { getStructuredOrthopedicAnalysis } from '@/services/aiService';
import type { RespostaOrtopedica } from '@/services/ortoboltEngine';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const { activeCase } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Olá! Sou o OrthoAI, seu copiloto veterinário.\n\nComo posso ajudar você hoje? Posso analisar casos, sugerir protocolos ou revisar diagnósticos.' }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<RespostaOrtopedica | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

    const handleDeepAnalysis = async () => {
    if (!activeCase) { alert('Selecione um caso clínico primeiro.'); return; }
    setIsAnalyzing(true);
    try {
      const ctx = anonymizeCaseContext(activeCase);
      const result = await getStructuredOrthopedicAnalysis(ctx);
      setDeepAnalysis(result);
    } catch (err) {
      console.error('Erro análise profunda:', err);
      alert('Erro ao gerar análise profunda.');
    } finally { setIsAnalyzing(false); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = { role: 'user', content: text };
    const contextualMessage = buildVetMessage(text, activeCase ? {
      patientName: activeCase.patientName,
      procedure: activeCase.procedure,
      caseId: activeCase.id
    } : undefined);

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      await sendChatMessageStream(
        contextualMessage,
        history.map(m => ({ role: m.role, content: m.content })),
        (accumulated) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: accumulated };
            return updated;
          });
        }
      );
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Desculpe, tive um problema ao processar sua solicitação. Tente novamente.'
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: '🩺 Análise Profunda (RAG)', action: 'deep' },
    { label: '🩺 Analisar caso atual', prompt: `Analise o caso atual e sugira próximos passos clínicos.` },
    { label: '💊 Calcular dosagem', prompt: 'Preciso calcular a dosagem de um medicamento. Me ajude a coletar os dados necessários.' },
    { label: '🔍 Diagnóstico diferencial', prompt: 'Preciso de ajuda com diagnóstico diferencial. Me faça perguntas sobre o caso.' },
  ];

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-primary to-accent text-white rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group"
          aria-label="Abrir OrthoAI"
          data-tour="tour-ai-widget"
        >
          <MessageCircle size={24} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
          <span className="absolute right-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            OrthoAI Copiloto
          </span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] glass-panel-premium rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-accent text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <div>
                <p className="font-bold text-sm">OrthoAI Copiloto</p>
                <p className="text-[10px] text-white/80">
                  {activeCase ? `Contexto: ${activeCase.patientName}` : 'Veterinário online'}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.content ? (
                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }} />
                  ) : (isStreaming && i === messages.length - 1 && (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Loader2 size={12} className="animate-spin" /> Pensando...
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-white flex-shrink-0">
              <p className="text-[10px] text-slate-500 mb-2 font-semibold uppercase">Ações rápidas:</p>
              <div className="flex flex-wrap gap-1">
                {quickActions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => { if (a.action === 'deep') { handleDeepAnalysis(); } else if (a.prompt) { setInput(a.prompt); textareaRef.current?.focus(); } }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex items-end gap-2 bg-slate-50 rounded-xl border border-slate-200 p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva o caso ou faça uma pergunta..."
                rows={2}
                disabled={isStreaming}
                className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder-slate-400 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="w-9 h-9 bg-primary hover:bg-primary-dark disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              >
                {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-1">
              OrthoAI segue diretrizes veterinárias · Sempre confirme com exame físico
            </p>
          </div>
        </div>
      )}
      {deepAnalysis && activeCase && (
        <OrthoDeepAnalysis
          analysis={deepAnalysis}
          casoClinico={`Paciente: ${activeCase.patientName}, ${activeCase.species}, ${activeCase.breed}, ${activeCase.ageYears}a, ${activeCase.weightKg}kg.`}
          onClose={() => setDeepAnalysis(null)}
        />
      )}
    </>
  );
}


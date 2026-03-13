// src/pages/ChatPage.tsx
// ✅ BUG-05 FIX: Modelo atualizado para Qwen3-VL-235B
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, Bot, User, Copy, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { sendChatMessage } from '@/services/aiService';
import { Button, Spinner } from '@/components/ui';
import type { ChatMessage } from '@/types/index';

const SUGGESTED = [
  'Quais são as indicações para TPLO vs TTA em cães de grande porte?',
  'Protocolo de fisioterapia pós FHO em felinos',
  'Dosagem de meloxicam para equinos de 400kg',
  'Critérios de avaliação radiográfica do ângulo de plateau tibial',
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} className="font-semibold block">{line.slice(2, -2)}</strong>;
      if (line === '') return <br key={i} />;
      return <p key={i} className="text-sm">{line}</p>;
    });
  };

  return (
    <div className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isUser ? 'bg-[#0056b3] text-white' : 'bg-slate-100 text-slate-600'}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 ${isUser ? 'bg-[#0056b3] text-white rounded-tr-sm' : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-sm'}`}>
          {msg.isLoading ? (
            <div className="flex items-center gap-2 py-0.5">
              <Spinner size="sm" />
              <span className="text-xs font-mono text-slate-400 animate-pulse">OrthoAI está analisando...</span>
            </div>
          ) : (
            <div className={`space-y-0.5 ${isUser ? 'text-white' : 'text-slate-800'}`}>
              {renderContent(msg.content)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isUser && !msg.isLoading && (
            <button onClick={copy} className="text-[10px] text-slate-400 hover:text-[#0056b3] transition-colors">
              {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
            </button>
          )}
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { chatHistory, setChatHistory, addToast } = useApp();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    setInput('');
    setSending(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };

    const loadingMsg: ChatMessage = {
      id: 'loading',
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    setChatHistory(prev => [...prev, userMsg, loadingMsg]);

    const history = chatHistory.filter(m => !m.isLoading).map(m => ({ role: m.role, content: m.content }));

    try {
      const reply = await sendChatMessage(msg, history);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setChatHistory(prev => [...prev.filter(m => m.id !== 'loading'), aiMsg]);
    } catch (err) {
      setChatHistory(prev => prev.filter(m => m.id !== 'loading'));
      addToast('Erro ao conectar com a IA. Verifique sua conexão e tente novamente.', 'error');
      console.error('Chat error:', err);
    } finally {
      setSending(false);
    }
  }, [input, sending, chatHistory, setChatHistory, addToast]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Montserrat' }}>OrthoAI Assistant</h1>
          <p className="text-xs text-slate-400 font-mono">Ativo · OpenRouter · Qwen3-VL-235B</p>
        </div>
        <button
          onClick={() => setChatHistory(h => h.length > 0 ? [h[0]] : h)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={13} /> Limpar conversa
        </button>
      </div>

      <div data-tour="tour-chat-messages" className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white">
        {chatHistory.map(m => <MessageBubble key={m.id} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      {chatHistory.length <= 1 && (
        <div data-tour="tour-chat-suggestions" className="px-6 pb-3 flex flex-wrap gap-2 bg-white">
          {SUGGESTED.map((s, i) => (
            <button key={i} onClick={() => send(s)} className="text-xs text-[#0056b3] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors text-left">
              {s}
            </button>
          ))}
        </div>
      )}

      <div data-tour="tour-chat-input" className="flex-shrink-0 px-6 py-4 border-t border-slate-100 bg-white">
        <div className="flex items-end gap-3 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-[#0056b3] focus-within:ring-2 focus-within:ring-[#0056b3]/20 transition-all px-4 py-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Faça uma pergunta sobre ortopedia veterinária... (Enter para enviar, Shift+Enter para nova linha)"
            rows={2}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 font-mono"
          />
          <Button size="sm" onClick={() => send()} disabled={!input.trim() || sending} loading={sending} className="flex-shrink-0 !px-3 !py-2">
            <Send size={15} />
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 font-mono text-center">
          OrthoAI não substitui avaliação clínica. Use como suporte à decisão técnica.
        </p>
      </div>
    </div>
  );
}
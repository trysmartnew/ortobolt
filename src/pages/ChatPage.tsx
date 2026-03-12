// src/pages/ChatPage.tsx
// ✅ STREAM: sendChatMessageStream — resposta token a token
// ✅ TOOLBAR: copiar, exportar, salvar no caso, reenviar, resumo clínico
// ✅ AUTO-EXPAND: textarea cresce com conteúdo (máx 200px), reseta ao enviar
// ✅ STATUS BAR: modelo correto Qwen3-VL-235B (FIX BUG-05)
// ✅ Enter para enviar / Shift+Enter para nova linha

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Trash2, Bot, User,
  Copy, Check, Download, BookmarkPlus, RotateCcw, FileText,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { sendChatMessageStream } from '@/services/aiService';
import { Button, Spinner } from '@/components/ui';
import type { ChatMessage } from '@/types/index';

const SUGGESTED = [
  'Quais são as indicações para TPLO vs TTA em cães de grande porte?',
  'Protocolo de fisioterapia pós FHO em felinos',
  'Dosagem de meloxicam para equinos de 400kg',
  'Critérios de avaliação radiográfica do ângulo de plateau tibial',
];

// ── MessageBubble ─────────────────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: ChatMessage;
  onResend?: () => void;
  onSummary?: () => void;
}

function MessageBubble({ msg, onResend, onSummary }: MessageBubbleProps) {
  const { activeCase, addCaseMessage, addToast } = useApp();
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportTxt = () => {
    const blob = new Blob([msg.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orthoai-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Resposta exportada como .txt', 'success');
  };

  const saveToCase = () => {
    if (!activeCase) {
      addToast('Abra um caso clínico na Galeria para salvar a resposta.', 'warning');
      return;
    }
    addCaseMessage(
      activeCase.id,
      `📋 **OrthoAI (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}):**\n\n${msg.content}`
    );
    addToast(`Resposta salva no caso: ${activeCase.title}`, 'success');
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# '))  return <h3 key={i} className="font-bold text-base mb-1">{line.slice(2)}</h3>;
      if (line.startsWith('## ')) return <h4 key={i} className="font-bold text-sm mb-1">{line.slice(3)}</h4>;
      if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} className="ml-3 text-sm list-disc">{line.slice(2)}</li>;
      if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} className="font-semibold block">{line.slice(2, -2)}</strong>;
      if (line === '') return <br key={i} />;
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-sm leading-relaxed">
          {parts.map((p, j) => p.startsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p)}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
        ${isUser ? 'bg-[#0056b3] text-white' : 'bg-slate-100 text-slate-600'}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-[#0056b3] text-white rounded-tr-sm'
            : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-sm'}`}>
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

        {/* ── Toolbar de resposta IA ── */}
        {!isUser && !msg.isLoading && msg.content && (
          <div className="flex items-center flex-wrap gap-1 mt-0.5">
            <button onClick={copy} title="Copiar resposta"
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-[#0056b3]
                px-2 py-1 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors">
              {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button onClick={exportTxt} title="Exportar como .txt"
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-[#0056b3]
                px-2 py-1 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors">
              <Download size={10} /><span>Exportar</span>
            </button>
            <button onClick={saveToCase}
              title={activeCase ? `Salvar no caso: ${activeCase.title}` : 'Abra um caso para salvar'}
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-600
                px-2 py-1 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-colors">
              <BookmarkPlus size={10} /><span>Salvar no caso</span>
            </button>
            {onResend && (
              <button onClick={onResend} title="Reenviar a pergunta anterior"
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-600
                  px-2 py-1 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-colors">
                <RotateCcw size={10} /><span>Reenviar</span>
              </button>
            )}
            {onSummary && (
              <button onClick={onSummary} title="Gerar resumo clínico desta conversa"
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-purple-600
                  px-2 py-1 rounded-lg hover:bg-purple-50 border border-transparent hover:border-purple-100 transition-colors">
                <FileText size={10} /><span>Resumo clínico</span>
              </button>
            )}
          </div>
        )}

        <span className="text-[10px] text-slate-400 font-mono">
          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── ChatPage ──────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { chatHistory, setChatHistory, addToast } = useApp();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // ── Auto-expand textarea ─────────────────────────────────────────────────
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setSending(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: msg,
      timestamp: new Date().toISOString(),
    };
    const loadingMsg: ChatMessage = {
      id: 'loading', role: 'assistant', content: '',
      timestamp: new Date().toISOString(), isLoading: true,
    };
    setChatHistory(prev => [...prev, userMsg, loadingMsg]);
    const history = chatHistory
      .filter(m => !m.isLoading)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const aiId = `ai-${Date.now()}`;
      setChatHistory(prev => [
        ...prev.filter(m => m.id !== 'loading'),
        { id: aiId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
      ]);
      await sendChatMessageStream(msg, history, (partial) => {
        setChatHistory(prev =>
          prev.map(m => m.id === aiId ? { ...m, content: partial } : m)
        );
      });
    } catch (err) {
      setChatHistory(prev => prev.filter(m => m.id !== 'loading'));
      addToast('Erro ao conectar com a IA. Verifique sua conexão e tente novamente.', 'error');
      console.error('Chat error:', err);
    } finally {
      setSending(false);
    }
  }, [input, sending, chatHistory, setChatHistory, addToast]);

  const requestSummary = useCallback(() => {
    send('Gere um resumo clínico estruturado e conciso desta conversa, incluindo: principais achados, diagnósticos discutidos, protocolos recomendados e próximos passos.');
  }, [send]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0056b3] rounded-xl flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">OrthoAI Assistant</p>
            {/* ✅ BUG-05 FIX: modelo correto */}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 font-mono">Ativo · OpenRouter · Qwen3-VL-235B</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setChatHistory(h => h.length > 0 ? [h[0]] : h)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={13} /> Limpar conversa
        </button>
      </div>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div data-tour="tour-chat-messages"
        className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white">
        {chatHistory.map((m, idx) => {
          const prevUserContent = m.role === 'assistant'
            ? chatHistory.slice(0, idx).reverse().find(h => h.role === 'user')?.content
            : undefined;
          return (
            <MessageBubble
              key={m.id}
              msg={m}
              onResend={prevUserContent ? () => send(prevUserContent) : undefined}
              onSummary={m.role === 'assistant' && !m.isLoading ? requestSummary : undefined}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Sugestões ───────────────────────────────────────────────────── */}
      {chatHistory.length <= 1 && (
        <div data-tour="tour-chat-suggestions"
          className="px-6 pb-3 flex flex-wrap gap-2 bg-white">
          {SUGGESTED.map((s, i) => (
            <button key={i} onClick={() => send(s)}
              className="text-xs text-[#0056b3] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors text-left">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input com auto-expand ────────────────────────────────────────── */}
      <div data-tour="tour-chat-input"
        className="flex-shrink-0 px-6 py-4 border-t border-slate-100 bg-white">
        <div className="flex items-end gap-3 bg-slate-50 rounded-2xl border border-slate-200
          focus-within:border-[#0056b3] focus-within:ring-2 focus-within:ring-[#0056b3]/20 transition-all px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Faça uma pergunta sobre ortopedia veterinária... (Enter para enviar, Shift+Enter para nova linha)"
            rows={2}
            style={{ maxHeight: '200px' }}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 font-mono overflow-y-auto"
          />
          <Button
            size="sm"
            onClick={() => send()}
            disabled={!input.trim() || sending}
            loading={sending}
            className="flex-shrink-0 !px-3 !py-2"
          >
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
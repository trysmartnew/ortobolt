import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Copy, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { sendChatMessage } from '@/services/aiService';
import { Button, Spinner } from '@/components/ui';
const SUGGESTED = [
    'Quais são as indicações para TPLO vs TTA em cães de grande porte?',
    'Protocolo de fisioterapia pós FHO em felinos',
    'Dosagem de meloxicam para equinos de 400kg',
    'Critérios de avaliação radiográfica do ângulo de plateau tibial',
];
function MessageBubble({ msg }) {
    const [copied, setCopied] = useState(false);
    const isUser = msg.role === 'user';
    const copy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    // Simple markdown-like rendering
    const renderContent = (text) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('# '))
                return _jsx("h3", { className: "font-bold text-base mb-1", children: line.slice(2) }, i);
            if (line.startsWith('## '))
                return _jsx("h4", { className: "font-bold text-sm mb-1", children: line.slice(3) }, i);
            if (line.startsWith('- ') || line.startsWith('• '))
                return _jsx("li", { className: "ml-3 text-sm", children: line.slice(2) }, i);
            if (line.startsWith('**') && line.endsWith('**'))
                return _jsx("strong", { className: "font-semibold block", children: line.slice(2, -2) }, i);
            if (line === '')
                return _jsx("br", {}, i);
            // Inline bold
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return _jsx("p", { className: "text-sm", children: parts.map((p, j) => p.startsWith('**') ? _jsx("strong", { children: p.slice(2, -2) }, j) : p) }, i);
        });
    };
    return (_jsxs("div", { className: `flex gap-3 group ${isUser ? 'flex-row-reverse' : ''}`, children: [_jsx("div", { className: `w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isUser ? 'bg-[#0056b3] text-white' : 'bg-slate-100 text-slate-600'}`, children: isUser ? _jsx(User, { size: 14 }) : _jsx(Bot, { size: 14 }) }), _jsxs("div", { className: `max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`, children: [_jsx("div", { className: `rounded-2xl px-4 py-3 ${isUser ? 'bg-[#0056b3] text-white rounded-tr-sm' : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-sm'}`, children: msg.isLoading ? (_jsxs("div", { className: "flex items-center gap-2 py-0.5", children: [_jsx(Spinner, { size: "sm" }), _jsx("span", { className: "text-xs font-mono text-slate-400 animate-pulse", children: "OrthoAI est\u00E1 analisando..." })] })) : (_jsx("div", { className: `space-y-0.5 ${isUser ? 'text-white' : 'text-slate-800'}`, children: renderContent(msg.content) })) }), _jsxs("div", { className: `flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`, children: [_jsx("span", { className: "text-[10px] text-slate-400 font-mono", children: new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }), !msg.isLoading && !isUser && (_jsx("button", { onClick: copy, className: "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-slate-600", children: copied ? _jsx(Check, { size: 11, className: "text-emerald-500" }) : _jsx(Copy, { size: 11 }) }))] })] })] }));
}
export default function ChatPage() {
    const { chatHistory, setChatHistory } = useApp();
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);
    const send = async (text) => {
        const msg = (text || input).trim();
        if (!msg || sending)
            return;
        setInput('');
        setSending(true);
        const userMsg = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date().toISOString() };
        const loadingMsg = { id: 'loading', role: 'assistant', content: '', timestamp: new Date().toISOString(), isLoading: true };
        setChatHistory(prev => [...prev, userMsg, loadingMsg]);
        const history = chatHistory.filter(m => !m.isLoading).map(m => ({ role: m.role, content: m.content }));
        const reply = await sendChatMessage(msg, history);
        const aiMsg = { id: `ai-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date().toISOString() };
        setChatHistory(prev => [...prev.filter(m => m.id !== 'loading'), aiMsg]);
        setSending(false);
    };
    return (_jsxs("div", { className: "flex flex-col h-[calc(100vh-4rem)]", children: [_jsxs("div", { className: "flex-shrink-0 px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-9 h-9 bg-[#0056b3] rounded-xl flex items-center justify-center", children: _jsx(Bot, { className: "h-5 w-5 text-white" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold text-slate-900", children: "OrthoAI Assistant" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }), _jsx("span", { className: "text-xs text-emerald-600 font-mono", children: "Ativo \u00B7 Gemini 2.0 Flash" })] })] })] }), _jsxs("button", { onClick: () => setChatHistory([chatHistory[0]]), className: "flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50", children: [_jsx(Trash2, { size: 13 }), " Limpar conversa"] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white", children: [chatHistory.map(m => _jsx(MessageBubble, { msg: m }, m.id)), _jsx("div", { ref: bottomRef })] }), chatHistory.length <= 1 && (_jsx("div", { className: "px-6 pb-3 flex flex-wrap gap-2 bg-white", children: SUGGESTED.map((s, i) => (_jsx("button", { onClick: () => send(s), className: "text-xs text-[#0056b3] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors text-left", children: s }, i))) })), _jsxs("div", { className: "flex-shrink-0 px-6 py-4 border-t border-slate-100 bg-white", children: [_jsxs("div", { className: "flex items-end gap-3 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-[#0056b3] focus-within:ring-2 focus-within:ring-[#0056b3]/20 transition-all px-4 py-3", children: [_jsx("textarea", { ref: inputRef, value: input, onChange: e => setInput(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    send();
                                } }, placeholder: "Fa\u00E7a uma pergunta sobre ortopedia veterin\u00E1ria... (Enter para enviar, Shift+Enter para nova linha)", rows: 2, className: "flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 font-mono" }), _jsx(Button, { size: "sm", onClick: () => send(), disabled: !input.trim() || sending, loading: sending, className: "flex-shrink-0 !px-3 !py-2", children: _jsx(Send, { size: 15 }) })] }), _jsx("p", { className: "text-[10px] text-slate-400 mt-2 font-mono text-center", children: "OrthoAI n\u00E3o substitui avalia\u00E7\u00E3o cl\u00EDnica. Use como suporte \u00E0 decis\u00E3o t\u00E9cnica." })] })] }));
}

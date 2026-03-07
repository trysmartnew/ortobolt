import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, AlertCircle, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button, NotifBadge, SectionHeader, EmptyState } from '@/components/ui';
const NOTIF_ICONS = { alert: AlertTriangle, success: CheckCircle, info: Info, warning: AlertCircle };
const NOTIF_COLORS = { alert: 'text-red-500 bg-red-50', success: 'text-emerald-500 bg-emerald-50', info: 'text-sky-500 bg-sky-50', warning: 'text-amber-500 bg-amber-50' };
function NotifRow({ n, onRead }) {
    const Icon = NOTIF_ICONS[n.type] || Info;
    const colorCls = NOTIF_COLORS[n.type] || 'text-slate-500 bg-slate-50';
    return (_jsxs("div", { className: `flex items-start gap-4 p-4 rounded-xl border transition-all ${n.read ? 'bg-white border-slate-100' : 'bg-blue-50/30 border-blue-100'}`, children: [_jsx("div", { className: `w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`, children: _jsx(Icon, { size: 17 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-slate-900", children: n.title }), _jsx("p", { className: "text-xs text-slate-600 mt-0.5 leading-relaxed", children: n.message })] }), _jsx(NotifBadge, { type: n.type })] }), _jsxs("div", { className: "flex items-center gap-3 mt-2", children: [_jsx("span", { className: "text-[10px] text-slate-400 font-mono", children: new Date(n.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }), !n.read && _jsxs("button", { onClick: () => onRead(n.id), className: "text-[10px] text-[#0056b3] font-semibold hover:underline flex items-center gap-1", children: [_jsx(Check, { size: 9 }), "Marcar como lida"] })] })] }), !n.read && _jsx("div", { className: "w-2 h-2 rounded-full bg-[#0056b3] flex-shrink-0 mt-1.5" })] }));
}
export default function NotificationsPage() {
    const { notifications, unreadCount, markAllRead, markRead } = useApp();
    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);
    return (_jsxs("div", { className: "p-6 max-w-2xl space-y-6", children: [_jsx(SectionHeader, { title: "Notifica\u00E7\u00F5es", subtitle: `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`, action: unreadCount > 0 ? _jsxs(Button, { variant: "ghost", size: "sm", onClick: markAllRead, children: [_jsx(Check, { size: 13 }), "Marcar todas como lidas"] }) : undefined }), notifications.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Bell, { size: 48 }), title: "Sem notifica\u00E7\u00F5es", description: "Voc\u00EA est\u00E1 em dia. Novas notifica\u00E7\u00F5es aparecer\u00E3o aqui." })) : (_jsxs(_Fragment, { children: [unread.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-wider", children: "N\u00E3o lidas" }), unread.map(n => _jsx(NotifRow, { n: n, onRead: markRead }, n.id))] })), read.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-xs font-bold text-slate-500 uppercase tracking-wider mt-2", children: "Anteriores" }), read.map(n => _jsx(NotifRow, { n: n, onRead: markRead }, n.id))] }))] }))] }));
}

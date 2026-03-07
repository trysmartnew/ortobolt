import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { LayoutDashboard, MessageSquare, Camera, Images, User, FileText, Settings, Bell, LogOut, Activity } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Chat IA', icon: MessageSquare },
    { id: 'analysis', label: 'Análise Visual', icon: Camera },
    { id: 'gallery', label: 'Galeria de Casos', icon: Images },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'settings', label: 'Configurações', icon: Settings },
];
export default function Sidebar() {
    const { currentPage, setCurrentPage, user, logout, unreadCount } = useApp();
    return (_jsxs("aside", { className: "w-64 flex-shrink-0 bg-[#001a40] text-white flex flex-col h-screen sticky top-0 z-30", children: [_jsx("div", { className: "px-6 py-5 border-b border-white/10", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-[#0056b3] flex items-center justify-center flex-shrink-0", children: _jsx(Activity, { className: "h-5 w-5 text-white" }) }), _jsxs("div", { children: [_jsx("h1", { className: "font-bold text-base tracking-wide", style: { fontFamily: 'Montserrat' }, children: "OrtoBolt" }), _jsx("p", { className: "text-[10px] text-blue-300 font-mono", children: "v3.2 \u00B7 OrthoVision AI" })] })] }) }), _jsxs("nav", { className: "flex-1 py-4 space-y-0.5 px-3 overflow-y-auto", children: [NAV.map(({ id, label, icon: Icon }) => {
                        const active = currentPage === id;
                        const showBadge = id === 'notifications' && unreadCount > 0;
                        return (_jsxs("button", { onClick: () => setCurrentPage(id), className: `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-[#0056b3] text-white shadow-lg' : 'text-blue-200/80 hover:bg-white/10 hover:text-white'}`, children: [_jsx(Icon, { className: "h-4.5 w-4.5 flex-shrink-0", size: 18 }), _jsx("span", { className: "flex-1 text-left", children: label }), showBadge && _jsx("span", { className: "bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full", children: unreadCount })] }, id));
                    }), _jsx("div", { className: "pt-2 mt-2 border-t border-white/10", children: _jsxs("button", { onClick: () => setCurrentPage('notifications'), className: `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentPage === 'notifications' ? 'bg-[#0056b3] text-white' : 'text-blue-200/80 hover:bg-white/10 hover:text-white'}`, children: [_jsx(Bell, { size: 18 }), _jsx("span", { className: "flex-1 text-left", children: "Notifica\u00E7\u00F5es" }), unreadCount > 0 && _jsx("span", { className: "bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full", children: unreadCount })] }) })] }), _jsxs("div", { className: "border-t border-white/10 p-4", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-[#0056b3] flex items-center justify-center text-sm font-bold flex-shrink-0", children: user?.name?.charAt(0) || 'V' }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-xs font-semibold text-white truncate", children: user?.name?.replace('Dra. ', '') || 'Veterinário' }), _jsx("p", { className: "text-[10px] text-blue-300 font-mono truncate", children: user?.crmv || '' })] })] }), _jsxs("button", { onClick: logout, className: "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-300/80 hover:bg-red-500/20 hover:text-red-300 transition-all", children: [_jsx(LogOut, { size: 14 }), " Sair da sess\u00E3o"] })] })] }));
}

import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { MOCK_USER, MOCK_CASES, MOCK_NOTIFICATIONS } from '@/data/mockData';
const AppContext = createContext(null);
export function AppProvider({ children }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [cases, setCases] = useState(MOCK_CASES);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
    const [chatHistory, setChatHistory] = useState([
        { id: 'init', role: 'assistant', content: '# Olá! Sou o **OrthoAI** 🐾\n\nSou seu assistente especializado em ortopedia veterinária. Posso ajudar com:\n\n- **Protocolos cirúrgicos** (TPLO, FHO, TTA e mais)\n- **Análise de risco** pré-operatório\n- **Dosagens e anestesia** específicas por espécie\n- **Reabilitação** pós-cirúrgica\n- **Interpretação** de achados radiográficos\n\nComo posso ajudar hoje?', timestamp: new Date().toISOString() },
    ]);
    const login = useCallback((email, password) => {
        if (email && password.length >= 4) {
            setUser(MOCK_USER);
            setIsLoggedIn(true);
            return true;
        }
        return false;
    }, []);
    const logout = useCallback(() => { setIsLoggedIn(false); setUser(null); setCurrentPage('dashboard'); }, []);
    const addCase = useCallback((c) => setCases(prev => [c, ...prev]), []);
    const updateCase = useCallback((id, updates) => setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)), []);
    const unreadCount = notifications.filter(n => !n.read).length;
    const markAllRead = useCallback(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);
    const markRead = useCallback((id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);
    const addNotification = useCallback((n) => {
        setNotifications(prev => [{ ...n, id: `n-${Date.now()}`, timestamp: new Date().toISOString(), read: false }, ...prev]);
    }, []);
    return (_jsx(AppContext.Provider, { value: { user, isLoggedIn, login, logout, currentPage, setCurrentPage, cases, addCase, updateCase, notifications, unreadCount, markAllRead, markRead, addNotification, chatHistory, setChatHistory }, children: children }));
}
export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx)
        throw new Error('useApp must be inside AppProvider');
    return ctx;
}

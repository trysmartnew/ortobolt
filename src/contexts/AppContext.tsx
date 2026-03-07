import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, ClinicalCase, Notification, ChatMessage } from '@/types/index';
import { MOCK_USER, MOCK_CASES, MOCK_NOTIFICATIONS } from '@/data/mockData';

type Page = 'dashboard' | 'chat' | 'analysis' | 'gallery' | 'profile' | 'reports' | 'settings' | 'notifications';

interface AppContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  currentPage: Page;
  setCurrentPage: (p: Page) => void;
  cases: ClinicalCase[];
  addCase: (c: ClinicalCase) => void;
  updateCase: (id: string, updates: Partial<ClinicalCase>) => void;
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [cases, setCases] = useState<ClinicalCase[]>(MOCK_CASES);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: 'init', role: 'assistant', content: '# Olá! Sou o **OrthoAI** 🐾\n\nSou seu assistente especializado em ortopedia veterinária. Posso ajudar com:\n\n- **Protocolos cirúrgicos** (TPLO, FHO, TTA e mais)\n- **Análise de risco** pré-operatório\n- **Dosagens e anestesia** específicas por espécie\n- **Reabilitação** pós-cirúrgica\n- **Interpretação** de achados radiográficos\n\nComo posso ajudar hoje?', timestamp: new Date().toISOString() },
  ]);

  const login = useCallback((email: string, password: string): boolean => {
    if (email && password.length >= 4) {
      setUser(MOCK_USER);
      setIsLoggedIn(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => { setIsLoggedIn(false); setUser(null); setCurrentPage('dashboard'); }, []);

  const addCase = useCallback((c: ClinicalCase) => setCases(prev => [c, ...prev]), []);
  const updateCase = useCallback((id: string, updates: Partial<ClinicalCase>) =>
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)), []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = useCallback(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);
  const markRead = useCallback((id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [{ ...n, id: `n-${Date.now()}`, timestamp: new Date().toISOString(), read: false }, ...prev]);
  }, []);

  return (
    <AppContext.Provider value={{ user, isLoggedIn, login, logout, currentPage, setCurrentPage, cases, addCase, updateCase, notifications, unreadCount, markAllRead, markRead, addNotification, chatHistory, setChatHistory }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

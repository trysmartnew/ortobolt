import React, { createContext, useContext, useState, useCallback,
                 useEffect, type ReactNode } from 'react';
import type { User, ClinicalCase, Notification, ChatMessage,
              Collaborator, CaseMessage } from '@/types/index';
import { MOCK_CASES, MOCK_NOTIFICATIONS, MOCK_COLLABORATORS,
         MOCK_CASE_MESSAGES } from '@/data/mockData';
import { supabase, fetchUserProfile } from '@/services/supabase';
 
export type Page = 'dashboard'|'chat'|'analysis'|'gallery'|'case'
                 |'profile'|'reports'|'settings'|'notifications';
 
interface AppContextType {
  user: User | null;
  isLoggedIn: boolean;
  authLoading: boolean;            // ← NOVO: aguardando verificação de sessão
  login: (email: string, password: string) => Promise<boolean>; // ← agora async
  logout: () => Promise<void>;     // ← agora async
  setUserFromSession: (supaUser: { id: string }) => Promise<void>; // ← NOVO
  currentPage: Page;
  setCurrentPage: (p: Page) => void;
  cases: ClinicalCase[];
  addCase: (c: ClinicalCase) => void;
  updateCase: (id: string, updates: Partial<ClinicalCase>) => void;
  activeCase: ClinicalCase | null;
  openCase: (c: ClinicalCase) => void;
  closeCase: () => void;
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  addNotification: (n: Omit<Notification,'id'|'timestamp'|'read'>) => void;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  tourActive: boolean;
  startTour: () => void;
  closeTour: () => void;
  collaborators: Collaborator[];
  getCaseCollaborators: (caseId: string) => Collaborator[];
  inviteCollaborator: (caseId: string, data: {
    name: string; email: string; specialty: string;
    crmv: string; institution: string; role: 'consultant'|'observer';
  }) => void;
  removeCollaborator: (id: string) => void;
  caseMessages: CaseMessage[];
  getCaseMessages: (caseId: string) => CaseMessage[];
  addCaseMessage: (caseId: string, content: string, type?: CaseMessage['type']) => void;
  onlineUsers: string[];
}
 
const AppContext = createContext<AppContextType | null>(null);
 
export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [authLoading, setAuthLoading]   = useState(true); // ← começa true
  const [user, setUser]                 = useState<User | null>(null);
  const [currentPage, setCurrentPage]   = useState<Page>('dashboard');
  const [activeCase, setActiveCase]     = useState<ClinicalCase | null>(null);
  const [cases, setCases]               = useState<ClinicalCase[]>(MOCK_CASES);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [tourActive, setTourActive]     = useState(false);
  const [chatHistory, setChatHistory]   = useState<ChatMessage[]>([{
    id: 'init', role: 'assistant', timestamp: new Date().toISOString(),
    content: '# Olá! Sou o **OrthoAI** 🐾\n\nSou seu assistente...',
  }]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(MOCK_COLLABORATORS);
  const [caseMessages, setCaseMessages] = useState<CaseMessage[]>(MOCK_CASE_MESSAGES);
  const [onlineUsers] = useState<string[]>(['vet-002', 'vet-004']);
 
  // ── Buscar perfil e marcar logado ──────────────────────────────────────
  const setUserFromSession = useCallback(async (
  supaUser: { id: string }
) => {
  if (!supaUser.id) {
    // Sem sessão: apenas liberar o loading
    setAuthLoading(false);
    return;
  }

  const profile = await fetchUserProfile(supaUser.id);
  if (profile) {
    setUser(profile);
    setIsLoggedIn(true);
  }
  setAuthLoading(false);
}, []);
 
  // ── Login com Supabase Auth ─────────────────────────────────────────────
  const login = useCallback(async (
    email: string,
    password: string
  ): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
 
    if (error || !data.user) {
      console.error('Login error:', error?.message);
      return false;
    }
 
    // Buscar perfil clínico completo
    const profile = await fetchUserProfile(data.user.id);
    if (!profile) return false;
 
    setUser(profile);
    setIsLoggedIn(true);
    setTimeout(() => setTourActive(true), 600);
    return true;
  }, []);
 
  // ── Logout com Supabase Auth ────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUser(null);
    setCurrentPage('dashboard');
    setActiveCase(null);
    setTourActive(false);
  }, []);
 
  // ── Restante dos handlers (não muda) ───────────────────────────────────
  const openCase  = useCallback((c: ClinicalCase) => { setActiveCase(c); setCurrentPage('case'); }, []);
  const closeCase = useCallback(() => { setActiveCase(null); setCurrentPage('gallery'); }, []);
  const addCase   = useCallback((c: ClinicalCase) => setCases(prev => [c, ...prev]), []);
  const updateCase = useCallback((id: string, updates: Partial<ClinicalCase>) =>
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)), []);
 
  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = useCallback(() =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);
  const markRead = useCallback((id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const addNotification = useCallback(
    (n: Omit<Notification, 'id'|'timestamp'|'read'>) => {
      setNotifications(prev => [{
        ...n, id: `n-${Date.now()}`,
        timestamp: new Date().toISOString(), read: false,
      }, ...prev]);
    }, []);
 
  const startTour = useCallback(() => setTourActive(true), []);
  const closeTour = useCallback(() => setTourActive(false), []);
 
  const getCaseCollaborators = useCallback((caseId: string) =>
    collaborators.filter(c => c.caseId === caseId), [collaborators]);
 
  const inviteCollaborator = useCallback((caseId: string, data: {
    name: string; email: string; specialty: string;
    crmv: string; institution: string; role: 'consultant'|'observer';
  }) => {
    const col: Collaborator = {
      id: `col-${Date.now()}`, caseId, userId: `u-${Date.now()}`,
      ...data, status: 'pending', invitedAt: new Date().toISOString(),
    };
    setCollaborators(prev => [...prev, col]);
    setCaseMessages(prev => [...prev, {
      id: `msg-${Date.now()}`, caseId, userId: 'system',
      userName: 'Sistema', userRole: 'observer',
      content: `👋 **${data.name}** (${data.specialty}) foi convidado(a).`,
      createdAt: new Date().toISOString(), type: 'system',
    }]);
    addNotification({
      type: 'info', title: 'Convite enviado',
      message: `Convite enviado para ${data.name} — ${data.specialty}`, caseId,
    });
  }, [addNotification]);
 
  const removeCollaborator = useCallback((id: string) =>
    setCollaborators(prev => prev.filter(c => c.id !== id)), []);
 
  const getCaseMessages = useCallback((caseId: string) =>
    caseMessages.filter(m => m.caseId === caseId), [caseMessages]);
 
  const addCaseMessage = useCallback((caseId: string, content: string, type: CaseMessage['type'] = 'text') => {
    if (!user) return;
    setCaseMessages(prev => [...prev, {
      id: `msg-${Date.now()}`, caseId, userId: user.id,
      userName: user.name, userRole: 'owner',
      content, createdAt: new Date().toISOString(), type,
    }]);
  }, [user]);
 
  return (
    <AppContext.Provider value={{
      user, isLoggedIn, authLoading, login, logout, setUserFromSession,
      currentPage, setCurrentPage,
      cases, addCase, updateCase,
      activeCase, openCase, closeCase,
      notifications, unreadCount, markAllRead, markRead, addNotification,
      chatHistory, setChatHistory,
      tourActive, startTour, closeTour,
      collaborators, getCaseCollaborators, inviteCollaborator, removeCollaborator,
      caseMessages, getCaseMessages, addCaseMessage,
      onlineUsers,
    }}>
      {children}
    </AppContext.Provider>
  );
}
 
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

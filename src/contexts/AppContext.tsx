// src/contexts/AppContext.tsx
// ✅ C-02: Rate limiting — 5 tentativas → bloqueio 15 min
// ✅ A-05: useMemo para unreadCount
// ✅ U-02: Sistema de Toast global
// ✅ U-01: rememberMe com controle de storage
// ✅ D-01: MOCK_CASES substituído por fetch real do Supabase
// ✅ D-02: MOCK_COLLABORATORS substituído por fetch real
// ✅ D-05: MOCK_NOTIFICATIONS substituído por fetch real
// ✅ D-03/D-04: Realtime de mensagens e presença
// ✅ Collaboration: getCaseCollaborators, inviteCollaborator, removeCollaborator completos
// ✅ setUserFromSession com guarda de ID vazio

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

import type {
  User,
  ClinicalCase,
  Notification,
  ChatMessage,
  Collaborator,
  CaseMessage,
} from '@/types/index';

import { supabase, fetchUserProfile } from '@/services/supabase';

export type Page =
  | 'dashboard' | 'chat' | 'analysis' | 'gallery'
  | 'case' | 'profile' | 'reports' | 'settings' | 'notifications';

export type AppView = 'home' | 'login' | 'register' | 'app';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  user: User | null;
  isLoggedIn: boolean;
  authLoading: boolean;
  currentView: AppView;
  setCurrentView: (v: AppView) => void;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  setUserFromSession: (supaUser: { id: string }) => Promise<void>;

  currentPage: Page;
  setCurrentPage: (p: Page) => void;

  cases: ClinicalCase[];
  addCase: (c: ClinicalCase) => void;
  updateCase: (id: string, updates: Partial<ClinicalCase>) => void;
  deleteCase: (id: string) => void;

  activeCase: ClinicalCase | null;
  openCase: (c: ClinicalCase) => void;
  closeCase: () => void;

  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;

  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

  tourActive: boolean;
  startTour: () => void;
  closeTour: () => void;

  collaborators: Collaborator[];
  getCaseCollaborators: (caseId: string) => Collaborator[];
  inviteCollaborator: (caseId: string, data: {
    name: string; email: string; specialty: string;
    crmv: string; institution: string; role: 'consultant' | 'observer';
  }) => void;
  removeCollaborator: (id: string) => void;

  caseMessages: CaseMessage[];
  getCaseMessages: (caseId: string) => CaseMessage[];
  addCaseMessage: (caseId: string, content: string, type?: CaseMessage['type']) => void;

  onlineUsers: string[];

  toasts: Toast[];
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: number) => void;

  loginLocked: boolean;
  loginLockSecondsLeft: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {

  const [user, setUser]               = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  // ✅ D-01: iniciar vazio — dados reais do Supabase
  const [cases, setCases]           = useState<ClinicalCase[]>([]);
  const [activeCase, setActiveCase] = useState<ClinicalCase | null>(null);

  // ✅ D-05: iniciar vazio
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chatHistory, setChatHistory]     = useState<ChatMessage[]>([{
    id: 'init', role: 'assistant',
    content: '# Olá! Sou o **OrthoAI** 🐾\n\nSou seu assistente especializado em ortopedia veterinária. Como posso ajudar hoje?',
    timestamp: new Date().toISOString(),
  }]);

  // ✅ D-02: iniciar vazio
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [caseMessages, setCaseMessages] = useState<CaseMessage[]>([]);
  const [onlineUsers, setOnlineUsers]     = useState<string[]>([]);
  const [tourActive, setTourActive]       = useState(false);
  const [toasts, setToasts]               = useState<Toast[]>([]);

  // ✅ NOVO: Flag anti-loop de logout
const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ✅ C-02: Rate limiting state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil]     = useState<Date | null>(null);
  const [, setLockTick]                   = useState(0);

  const loginLocked = !!(lockedUntil && new Date() < lockedUntil);
  const loginLockSecondsLeft = loginLocked && lockedUntil
    ? Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
    : 0;

  // ✅ A-05: useMemo para unreadCount
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // ✅ U-02: Toast system
  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ✅ D-01: Fetch casos reais
  useEffect(() => {
    if (!user) return;
    supabase
      .from('clinical_cases')
      .select('*')
      .eq('veterinarian_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCases(data as ClinicalCase[]); });
  }, [user]);

  // ✅ D-05: Fetch notificações reais
  useEffect(() => {
    if (!user) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setNotifications(data as Notification[]); });
  }, [user]);

  // ✅ D-02: Fetch colaboradores reais
  useEffect(() => {
    if (!user) return;
    supabase
      .from('case_collaborators')
      .select('*')
      .then(({ data }) => { if (data) setCollaborators(data as Collaborator[]); });
  }, [user]);

  // ✅ C-02: Login com rate limiting
  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe = true
  ): Promise<boolean> => {
    if (lockedUntil && new Date() < lockedUntil) {
      const secs = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      addToast(`Conta bloqueada. Aguarde ${secs}s.`, 'error');
      return false;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= 5) {
        const unlockAt = new Date(Date.now() + 15 * 60_000);
        setLockedUntil(unlockAt);
        const interval = setInterval(() => {
          setLockTick((t) => t + 1);
          if (new Date() >= unlockAt) {
            clearInterval(interval);
            setLockedUntil(null);
            setLoginAttempts(0);
          }
        }, 1000);
        addToast('Muitas tentativas. Acesso bloqueado por 15 minutos.', 'error');
      } else {
        const remaining = 5 - newAttempts;
        addToast(`Credenciais inválidas. ${remaining} tentativa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`, 'error');
      }
      return false;
    }

    setLoginAttempts(0);
    setLockedUntil(null);

    // ✅ U-01: Se rememberMe=false, mover token para sessionStorage
    if (!rememberMe) {
      const projectRef = import.meta.env.VITE_SUPABASE_URL
        .replace('https://', '').split('.')[0];
      const key = `sb-${projectRef}-auth-token`;
      const token = localStorage.getItem(key);
      if (token) {
        sessionStorage.setItem(key, token);
        localStorage.removeItem(key);
      }
    }

    const profile = await fetchUserProfile(data.user.id);
    if (!profile) return false;

    setUser(profile);
    setIsLoggedIn(true);
    setCurrentView('app');
    setTimeout(() => setTourActive(true), 600);
    addToast(`Bem-vindo(a), ${profile.name.split(' ')[0]}!`, 'success');
    return true;
  }, [loginAttempts, lockedUntil, addToast]);

// ✅ C-02: Logout com flag anti-loop e tratamento de erro completo
const logout = useCallback(async () => {
  // Evitar chamadas múltiplas simultâneas (previne loop com listener)
  if (isLoggingOut) {
    console.log('⚠️ Logout já em andamento, ignorando chamada duplicada');
    return;
  }
  
  try {
    setIsLoggingOut(true);
    console.log('🔐 Iniciando logout...');
    
    // Executar signOut do Supabase
    await supabase.auth.signOut();
    console.log('✅ Supabase signOut completado');
    
    // Limpar todos os estados de forma segura e ordenada
    setUser(null);
    setIsLoggedIn(false);
    setCurrentView('home');
    setCurrentPage('dashboard');
    setActiveCase(null);
    setTourActive(false);
    setCases([]);
    setNotifications([]);
    setCollaborators([]);
    setChatHistory([{
      id: 'init', 
      role: 'assistant',
      content: '# Olá! Sou o OrthoAI 🐾\n\nSou seu assistente especializado em ortopedia veterinária. Como posso ajudar hoje?',
      timestamp: new Date().toISOString(),
    }]);
    setCaseMessages([]);
    setOnlineUsers([]);
    
    console.log('🧹 Estados limpos, logout completado');
    addToast('Sessão encerrada com sucesso!', 'info');
    
  } catch (error) {
    console.error('❌ Erro ao fazer logout:', error);
    
    // Mesmo com erro, limpar estados locais críticos para não travar a UI
    setUser(null);
    setIsLoggedIn(false);
    setCurrentView('home');
    addToast('Erro ao encerrar sessão. Tente novamente.', 'error');
    
  } finally {
    // Liberar flag após pequeno delay para evitar race condition
    setTimeout(() => setIsLoggingOut(false), 500);
  }
}, [isLoggingOut, addToast]); // ✅ Dependências corretas

  // ✅ setUserFromSession com guarda de ID vazio
  const setUserFromSession = useCallback(async (supaUser: { id: string }) => {
    if (!supaUser.id) {
      setAuthLoading(false);
      return;
    }
    const profile = await fetchUserProfile(supaUser.id);
    if (profile) {
      setUser(profile);
      setIsLoggedIn(true);
      setCurrentView('app');
    }
    setAuthLoading(false);
  }, []);

  // ── Cases ────────────────────────────────────────────────────────────────
  const openCase = useCallback((c: ClinicalCase) => {
    setActiveCase(c);
    setCurrentPage('case');
  }, []);

  const closeCase = useCallback(() => {
    setActiveCase(null);
    setCurrentPage('gallery');
  }, []);

  const addCase = useCallback((c: ClinicalCase) => {
    setCases((prev) => [c, ...prev]);
  }, []);

  const updateCase = useCallback((id: string, updates: Partial<ClinicalCase>) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCase = useCallback((id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    // Se o caso aberto foi deletado, voltar à galeria
    setActiveCase((prev) => (prev?.id === id ? null : prev));
    setCurrentPage((prev) => (prev === 'case' ? 'gallery' : prev));
  }, []);

  // ── Notifications ────────────────────────────────────────────────────────
  const markAllRead = useCallback(() =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);

  const markRead = useCallback((id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    ), []);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) =>
    setNotifications((prev) => [
      { ...n, id: 'n-' + Date.now(), timestamp: new Date().toISOString(), read: false },
      ...prev,
    ]), []);

  // ── Tour ─────────────────────────────────────────────────────────────────
  const startTour = useCallback(() => setTourActive(true), []);
  const closeTour = useCallback(() => setTourActive(false), []);

  // ── Collaboration ────────────────────────────────────────────────────────
  const getCaseCollaborators = useCallback(
    (caseId: string) => collaborators.filter((c) => c.caseId === caseId),
    [collaborators]
  );

  const inviteCollaborator = useCallback((
    caseId: string,
    data: { name: string; email: string; specialty: string; crmv: string; institution: string; role: 'consultant' | 'observer' }
  ) => {
    const col: Collaborator = {
      id: `col-${Date.now()}`,
      caseId,
      userId: `u-${Date.now()}`,
      ...data,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };
    setCollaborators((prev) => [...prev, col]);
    setCaseMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      caseId,
      userId: 'system',
      userName: 'Sistema',
      userRole: 'observer' as const,
      content: `👋 **${data.name}** (${data.specialty}) foi convidado(a) como ${data.role === 'consultant' ? 'Consultor' : 'Observador'}.`,
      createdAt: new Date().toISOString(),
      type: 'system' as const,
    }]);
    addNotification({
      type: 'info',
      title: 'Convite enviado',
      message: `Convite enviado para ${data.name} — ${data.specialty}`,
      caseId,
    });
  }, [addNotification]);

  const removeCollaborator = useCallback((id: string) => {
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Case Messages ────────────────────────────────────────────────────────
  const getCaseMessages = useCallback(
    (caseId: string) => caseMessages.filter((m) => m.caseId === caseId),
    [caseMessages]
  );

  const addCaseMessage = useCallback((
    caseId: string,
    content: string,
    type: CaseMessage['type'] = 'text'
  ) => {
    if (!user) return;
    setCaseMessages((prev) => [...prev, {
      id: 'msg-' + Date.now(),
      caseId,
      userId: user.id,
      userName: user.name,
      userRole: 'owner',
      content,
      createdAt: new Date().toISOString(),
      type,
    }]);
  }, [user]);

  // ✅ D-03/D-04: Realtime
  useEffect(() => {
  if (!activeCase || !user) return;
  
  // Buscar mensagens iniciais do histórico
  const loadInitialMessages = async () => {
    const { data, error } = await supabase
      .from('case_messages')
      .select('*')
      .eq('case_id', activeCase.id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar mensagens:', error);
      return;
    }
    
    if (data && data.length > 0) {
      setCaseMessages(data as CaseMessage[]);
    }
  };

  loadInitialMessages();
  
  // ... subscription realtime existente continua aqui ...
}, [activeCase, user]);
  useEffect(() => {
    if (!activeCase || !user) return;

    const channel = supabase
      .channel(`case-${activeCase.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'case_messages',
        filter: `case_id=eq.${activeCase.id}`,
      }, (payload) => {
        setCaseMessages((prev) => [...prev, payload.new as CaseMessage]);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId: string }>();
        setOnlineUsers(
          Object.values(state).map((p: any) => p[0]?.userId).filter(Boolean)
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [activeCase, user]);

  return (
    <AppContext.Provider value={{
      user, isLoggedIn, authLoading, currentView, setCurrentView,
      login, logout, setUserFromSession,
      currentPage, setCurrentPage,
      cases, addCase, updateCase, deleteCase,
      activeCase, openCase, closeCase,
      notifications, unreadCount, markAllRead, markRead, addNotification,
      chatHistory, setChatHistory,
      tourActive, startTour, closeTour,
      collaborators, getCaseCollaborators, inviteCollaborator, removeCollaborator,
      caseMessages, getCaseMessages, addCaseMessage,
      onlineUsers,
      toasts, addToast, removeToast,
      loginLocked, loginLockSecondsLeft,
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
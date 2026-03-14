// src/contexts/AppContext.tsx
// ✅ C-02: Rate limiting — 5 tentativas → bloqueio 15 min
// ✅ A-05: useMemo para unreadCount
// ✅ U-02: Sistema de Toast global
// ✅ U-01: rememberMe com controle de storage
// ✅ D-01: MOCK_CASES substituído por fetch real do Supabase + mapCaseFromDB
// ✅ D-02: MOCK_COLLABORATORS substituído por fetch real + mapCollaboratorFromDB
// ✅ D-05: MOCK_NOTIFICATIONS substituído por fetch real + mapNotificationFromDB + persistência
// ✅ D-03/D-04: Realtime de mensagens e presença + persistência
// ✅ P1: addCase/deleteCase/updateCase com persistência Supabase
// ✅ P1: addCaseMessage com persistência + mapper snake_case → camelCase
// ✅ P2: markAllRead/markRead com persistência Supabase
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
  AnimalSpecies,
  ProcedureType,
  CaseStatus,
  CollaboratorRole,
  CollaboratorStatus,
  NotificationType,
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

// ✅ TIPO SEPARADO PARA EVITAR ERROS DE SINTAXE
export interface CollaboratorInviteData {
  name: string;
  email: string;
  specialty: string;
  crmv: string;
  institution: string;
  role: 'consultant' | 'observer';
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
  inviteCollaborator: (caseId: string, data: CollaboratorInviteData) => void;
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

// ── ✅ Mapeamento seguro: snake_case (Supabase) → camelCase (ClinicalCase) ────────
function mapCaseFromDB(row: Record<string, unknown>): ClinicalCase {
  return {
    id:             String(row.id             ?? ''),
    title:          String(row.title           ?? ''),
    patientName:    String(row.patient_name    ?? row.patientName    ?? ''),
    species:        (row.species               ?? 'canine')  as AnimalSpecies,
    breed:          String(row.breed           ?? ''),
    ageYears:       Number(row.age_years       ?? row.ageYears       ?? 0),
    weightKg:       Number(row.weight_kg       ?? row.weightKg       ?? 0),
    procedure:      (row.procedure             ?? 'other')   as ProcedureType,
    status:         (row.status                ?? 'pending') as CaseStatus,
    precisionScore: row.precision_score != null ? Number(row.precision_score) : undefined,
    riskLevel:      (row.risk_level            ?? row.riskLevel ?? 'low') as 'low'|'medium'|'high',
    createdAt:      String(row.created_at      ?? row.createdAt      ?? new Date().toISOString()),
    updatedAt:      String(row.updated_at      ?? row.updatedAt      ?? new Date().toISOString()),
    tags:           Array.isArray(row.tags) ? row.tags as string[] : [],
    imageUrl:       row.image_url != null ? String(row.image_url) : undefined,
    notes:          row.notes != null ? String(row.notes) : undefined,
    veterinarianId: String(row.veterinarian_id ?? row.veterinarianId ?? ''),
    aiAnalysis:     undefined,
  };
}

// ── ✅ NOVO: Mapeamento seguro para CaseMessage (snake_case → camelCase) ────────
function mapMsgFromDB(row: Record<string, unknown>): CaseMessage {
  return {
    id:        String(row.id        ?? `msg-${Date.now()}`),
    caseId:    String(row.case_id   ?? row.caseId    ?? ''),
    userId:    String(row.user_id   ?? row.userId    ?? ''),
    userName:  String(row.user_name ?? row.userName  ?? ''),
    userRole:  (row.user_role ?? row.userRole ?? 'observer') as CollaboratorRole,
    content:   String(row.content   ?? ''),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    type:      (row.type ?? 'text') as CaseMessage['type'],
  };
}

// ── ✅ NOVO: Mapeamento seguro para Notification (snake_case → camelCase) ────────
function mapNotificationFromDB(row: Record<string, unknown>): Notification {
  return {
    id:        String(row.id       ?? ''),
    type:      (row.type ?? 'info') as NotificationType,
    title:     String(row.title    ?? ''),
    message:   String(row.message  ?? ''),
    timestamp: String(row.created_at ?? row.timestamp ?? new Date().toISOString()),
    read:      Boolean(row.read    ?? false),
    caseId:    row.case_id != null ? String(row.case_id) : undefined,
  };
}

// ── ✅ NOVO: Mapeamento seguro para Collaborator (snake_case → camelCase) ────────
function mapCollaboratorFromDB(row: Record<string, unknown>): Collaborator {
  return {
    id:          String(row.id           ?? ''),
    caseId:      String(row.case_id      ?? row.caseId      ?? ''),
    userId:      String(row.user_id      ?? row.userId      ?? ''),
    name:        String(row.name         ?? ''),
    email:       String(row.email        ?? ''),
    specialty:   String(row.specialty    ?? ''),
    crmv:        String(row.crmv         ?? ''),
    institution: String(row.institution  ?? ''),
    role:        (row.role   ?? 'observer') as CollaboratorRole,
    status:      (row.status ?? 'pending') as CollaboratorStatus,
    invitedAt:   String(row.invited_at   ?? row.invitedAt   ?? ''),
    acceptedAt:  row.accepted_at != null ? String(row.accepted_at) : undefined,
    online:      false,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  
  const [cases, setCases]           = useState<ClinicalCase[]>([]);
  const [activeCase, setActiveCase] = useState<ClinicalCase | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chatHistory, setChatHistory]     = useState<ChatMessage[]>([{
    id: 'init', role: 'assistant',
    content: '# Olá! Sou o OrthoAI 🐾\n\nSou seu assistente especializado em ortopedia veterinária. Como posso ajudar hoje?',
    timestamp: new Date().toISOString(),
  }]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [caseMessages, setCaseMessages] = useState<CaseMessage[]>([]);
  const [onlineUsers, setOnlineUsers]     = useState<string[]>([]);
  const [tourActive, setTourActive]       = useState(false);
  const [toasts, setToasts]               = useState<Toast[]>([]);
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil]     = useState<Date | null>(null);
  const [, setLockTick]                   = useState(0);
  
  const loginLocked = !!(lockedUntil && new Date() < lockedUntil);
  const loginLockSecondsLeft = loginLocked && lockedUntil
    ? Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
    : 0;

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ✅ D-01: Fetch casos reais COM mapeamento seguro
  useEffect(() => {
    if (!user) return;
    supabase
      .from('clinical_cases')
      .select('*')
      .eq('veterinarian_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('clinical_cases fetch:', error.message);
          return;
        }
        if (data) {
          setCases(data.map(row => mapCaseFromDB(row as Record<string, unknown>)));
        }
      });
  }, [user]);

  // ✅ D-05: Fetch notificações reais COM mapper
  useEffect(() => {
    if (!user) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setNotifications(data.map(r => mapNotificationFromDB(r as Record<string, unknown>)));
        }
      });
  }, [user]);

  // ✅ D-02: Fetch colaboradores reais COM mapper
  useEffect(() => {
    if (!user) return;
    supabase
      .from('case_collaborators')
      .select('*')
      .then(({ data }) => {
        if (data) {
          setCollaborators(data.map(r => mapCollaboratorFromDB(r as Record<string, unknown>)));
        }
      });
  }, [user]);

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

  const logout = useCallback(async () => {
    if (isLoggingOut) {
      console.log('⚠️ Logout já em andamento, ignorando chamada duplicada');
      return;
    }
    
    try {
      setIsLoggingOut(true);
      console.log('🔐 Iniciando logout...');
      
      await supabase.auth.signOut();
      console.log('✅ Supabase signOut completado');

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
      setUser(null);
      setIsLoggedIn(false);
      setCurrentView('home');
      addToast('Erro ao encerrar sessão. Tente novamente.', 'error');
    } finally {
      setTimeout(() => setIsLoggingOut(false), 500);
    }
  }, [isLoggingOut, addToast]);

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
    supabase.from('clinical_cases').insert({
      id:              c.id,
      title:           c.title,
      patient_name:    c.patientName,
      species:         c.species,
      breed:           c.breed,
      age_years:       c.ageYears,
      weight_kg:       c.weightKg,
      procedure:       c.procedure,
      status:          c.status,
      risk_level:      c.riskLevel,
      tags:            c.tags,
      notes:           c.notes ?? null,
      veterinarian_id: c.veterinarianId,
      created_at:      c.createdAt,
      updated_at:      c.updatedAt,
    }).then(({ error }) => {
      if (error) {
        console.error('addCase Supabase error:', error.message);
        setCases((prev) => prev.filter((cas) => cas.id !== c.id));
      }
    });
  }, []);

  const updateCase = useCallback((id: string, updates: Partial<ClinicalCase>) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status        !== undefined) dbUpdates.status          = updates.status;
    if (updates.riskLevel     !== undefined) dbUpdates.risk_level      = updates.riskLevel;
    if (updates.precisionScore !== undefined) dbUpdates.precision_score = updates.precisionScore;
    if (updates.notes         !== undefined) dbUpdates.notes           = updates.notes;
    if (updates.title         !== undefined) dbUpdates.title           = updates.title;
    dbUpdates.updated_at = new Date().toISOString();

    supabase.from('clinical_cases').update(dbUpdates).eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('updateCase Supabase error:', error.message);
        }
      });
  }, []);

  const deleteCase = useCallback((id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    setActiveCase((prev) => (prev?.id === id ? null : prev));
    setCurrentPage((prev) => (prev === 'case' ? 'gallery' : prev));
    supabase.from('clinical_cases').delete().eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('deleteCase Supabase error:', error.message);
        }
      });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user?.id) {
      supabase.from('notifications').update({ read: true })
        .eq('user_id', user.id).eq('read', false)
        .then(({ error }) => {
          if (error) console.error('markAllRead:', error.message);
        });
    }
  }, [user]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    supabase.from('notifications').update({ read: true }).eq('id', id)
      .then(({ error }) => {
        if (error) console.error('markRead:', error.message);
      });
  }, []);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) =>
    setNotifications((prev) => [
      { ...n, id: 'n-' + Date.now(), timestamp: new Date().toISOString(), read: false },
      ...prev,
    ]), []);

  const startTour = useCallback(() => setTourActive(true), []);
  
  const closeTour = useCallback(() => {
    setTourActive(false);
    if (user?.id) {
      localStorage.setItem(`ortobolt_tour_v1_${user.id}`, '1');
    }
  }, [user]);

  const getCaseCollaborators = useCallback(
    (caseId: string) => collaborators.filter((c) => c.caseId === caseId),
    [collaborators]
  );

  const inviteCollaborator = useCallback((
    caseId: string,
    data: CollaboratorInviteData
  ) => {
    const col: Collaborator = {
      id: `col-${Date.now()}`,
      caseId,
      userId: `u-${Date.now()}`,
      name: data.name,
      email: data.email,
      specialty: data.specialty,
      crmv: data.crmv,
      institution: data.institution,
      role: data.role,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };
    setCollaborators((prev) => [...prev, col]);
    setCaseMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      caseId,
      userId: 'system',
      userName: 'Sistema',
      userRole: 'observer',
      content: `👋 **${data.name}** (${data.specialty}) foi convidado(a) como ${data.role === 'consultant' ? 'Consultor' : 'Observador'}.`,
      createdAt: new Date().toISOString(),
      type: 'system',
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
    const msg: CaseMessage = {
      id: 'msg-' + Date.now(),
      caseId,
      userId: user.id,
      userName: user.name,
      userRole: 'owner',
      content,
      createdAt: new Date().toISOString(),
      type,
    };

    setCaseMessages((prev) => [...prev, msg]);

    supabase.from('case_messages').insert({
      id:         msg.id,
      case_id:    caseId,
      user_id:    user.id,
      user_name:  user.name,
      user_role:  'owner',
      content,
      type,
      created_at: msg.createdAt,
    }).then(({ error }) => {
      if (error) {
        console.error('addCaseMessage Supabase error:', error.message);
        setCaseMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    });
  }, [user]);

  useEffect(() => {
    if (!activeCase || !user) return;
    
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
        setCaseMessages(data.map(row => mapMsgFromDB(row as Record<string, unknown>)));
      }
    };
    
    loadInitialMessages();

    const channel = supabase
      .channel(`case-${activeCase.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'case_messages',
        filter: `case_id=eq.${activeCase.id}`,
      }, (payload) => {
        const newMsg = mapMsgFromDB(payload.new as Record<string, unknown>);
        setCaseMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
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
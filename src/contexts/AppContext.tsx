// src/contexts/AppContext.tsx
// ✅ C-02: Rate limiting — 5 tentativas → bloqueio 15 min
// ✅ A-05: useMemo para unreadCount
// ✅ U-02: Sistema de Toast global
// ✅ U-01: rememberMe com controle de storage
// ✅ D-01: MOCK_CASES substituído por fetch real do Supabase + mapCaseFromDB
// ✅ D-05: MOCK_NOTIFICATIONS substituído por fetch real + mapNotificationFromDB + persistência
// ✅ P1: addCase/deleteCase/updateCase com persistência Supabase
// ✅ P2: markAllRead/markRead com persistência Supabase
// ✅ setUserFromSession com guarda de ID vazio
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,

  type ReactNode,
} from 'react';
import type {
  User,
  ClinicalCase,
  Notification,
  ChatMessage,
  AnimalSpecies,
  ProcedureType,
  CaseStatus,
  NotificationType,
} from '@/types/index';
import { supabase, fetchUserProfile, upsertUserProfile } from '@/services/supabase';
import { isAuthRetryableFetchError } from '@supabase/auth-js';
import type { ApproveCompleteCaseInput } from '@/types/casePipeline';
import {
  buildIntegratedClinicalCase,
  enrichCaseWithPersistedAi,
  loadPersistedAiAnalysis,
  persistCaseAiAnalysis,
  setLastIntegratedCaseId,
} from '@/services/clinicalCaseIntegrationService';

export type Page =
  | 'dashboard' | 'chat' | 'analysis' | 'gallery'
  | 'case' | 'profile' | 'reports' | 'settings' | 'notifications';

export type AppView = 'home' | 'login' | 'register' | 'app' | 'reset';

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
  approveAndIntegrateCase: (input: ApproveCompleteCaseInput) => ClinicalCase;
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
  tourForceShow: boolean;
  startTour: () => void;
  closeTour: () => void;
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
    avatarUrl:     row.avatar_url != null ? String(row.avatar_url) : undefined,
    notes:          row.notes != null ? String(row.notes) : undefined,
    veterinarianId: String(row.veterinarian_id ?? row.veterinarianId ?? ''),
    aiAnalysis:     loadAiAnalysisFromRow(row),
  };
}

function loadAiAnalysisFromRow(row: Record<string, unknown>) {
  const id = String(row.id ?? '');
  if (row.ai_analysis != null && typeof row.ai_analysis === 'object') {
    return row.ai_analysis as ClinicalCase['aiAnalysis'];
  }
  if (typeof row.ai_analysis === 'string') {
    try {
      return JSON.parse(row.ai_analysis) as ClinicalCase['aiAnalysis'];
    } catch {
      /* fallback local */
    }
  }
  return loadPersistedAiAnalysis(id);
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
  const [tourActive, setTourActive]       = useState(false);
  const [tourForceShow, setTourForceShow] = useState(false);
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
          setCases(
            data
              .map((row) => mapCaseFromDB(row as Record<string, unknown>))
              .map(enrichCaseWithPersistedAi)
          );
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

    if (error) {
      if (isAuthRetryableFetchError(error) || error?.name === 'AuthUnknownError') {
        addToast('Serviço temporariamente indisponível. Verifique sua conexão e tente novamente.', 'error');
        return false;
      }
    }

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

    sessionStorage.setItem('ortobolt_remember_me', rememberMe ? '1' : '0');

    await upsertUserProfile(data.user);
    const profile = await fetchUserProfile(data.user.id);
    if (!profile) return false;

    setUser(profile);
    setIsLoggedIn(true);
    setCurrentView((prev) => prev === 'reset' ? 'reset' : 'app');
    const hasSeenTour = localStorage.getItem(`ortobolt_tour_v1_${profile.id}`);
    if (!hasSeenTour) {
      setTimeout(() => setTourActive(true), 600);
    }
    addToast(`Bem-vindo(a), ${profile.name.split(' ')[0]}!`, 'success');
    return true;
  }, [loginAttempts, lockedUntil, addToast]);

  const logout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }
    
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      setUser(null);
      setIsLoggedIn(false);
      setCurrentView('home');
      setCurrentPage('dashboard');
      setActiveCase(null);
      setTourActive(false);
      setCases([]);
      setNotifications([]);
      setChatHistory([{
        id: 'init', 
        role: 'assistant',
        content: '# Olá! Sou o OrthoAI 🐾\n\nSou seu assistente especializado em ortopedia veterinária. Como posso ajudar hoje?',
        timestamp: new Date().toISOString(),
      }]);

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

  const setUserFromSession = useCallback(async (supaUser: { id: string; email?: string | null; user_metadata?: Record<string, string> }) => {
    if (!supaUser.id) {
      setAuthLoading(false);
      return;
    }
    await upsertUserProfile(supaUser);
    const profile = await fetchUserProfile(supaUser.id);
    if (profile) {
      setUser(profile);
      setIsLoggedIn(true);
      setCurrentView((prev) => prev === 'reset' ? 'reset' : 'app');
      const hasSeenTourSession = localStorage.getItem(`ortobolt_tour_v1_${profile.id}`);
      if (!hasSeenTourSession) {
        setTimeout(() => setTourActive(true), 600);
      }
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
    const enriched = enrichCaseWithPersistedAi(c);
    setCases((prev) => [enriched, ...prev]);
    if (enriched.aiAnalysis) {
      persistCaseAiAnalysis(enriched.id, enriched.aiAnalysis);
    }
    supabase.from('clinical_cases').insert({
      id:              enriched.id,
      title:           enriched.title,
      patient_name:    enriched.patientName,
      species:         enriched.species,
      breed:           enriched.breed,
      age_years:       enriched.ageYears,
      weight_kg:       enriched.weightKg,
      procedure:       enriched.procedure,
      status:          enriched.status,
      risk_level:      enriched.riskLevel,
      precision_score: enriched.precisionScore ?? null,
      tags:            enriched.tags,
      notes:           enriched.notes ?? null,
      image_url:       enriched.imageUrl ?? null,
      ai_analysis:     enriched.aiAnalysis ?? null,
      veterinarian_id: enriched.veterinarianId,
      created_at:      enriched.createdAt,
      updated_at:      enriched.updatedAt,
    }).then(({ error }) => {
      if (error) {
        console.error('addCase Supabase error:', error.message);
        setCases((prev) => prev.filter((cas) => cas.id !== enriched.id));
      }
    });
  }, []);

  const approveAndIntegrateCase = useCallback(
    (input: ApproveCompleteCaseInput): ClinicalCase => {
      const clinicalCase = buildIntegratedClinicalCase(input);
      persistCaseAiAnalysis(clinicalCase.id, clinicalCase.aiAnalysis);
      setLastIntegratedCaseId(clinicalCase.id);
      addCase(clinicalCase);
      setNotifications((prev) => [
        {
          id: `n-pipeline-${Date.now()}`,
          type: 'success',
          title: 'Caso completo integrado',
          message: `${clinicalCase.patientName} foi registrado na galeria, dashboard e relatórios.`,
          timestamp: new Date().toISOString(),
          read: false,
          caseId: clinicalCase.id,
        },
        ...prev,
      ]);
      return clinicalCase;
    },
    [addCase]
  );

  const updateCase = useCallback((id: string, updates: Partial<ClinicalCase>) => {
    const merge = (c: ClinicalCase) =>
      enrichCaseWithPersistedAi({ ...c, ...updates, updatedAt: new Date().toISOString() });

    setCases((prev) => prev.map((c) => (c.id === id ? merge(c) : c)));
    setActiveCase((prev) => (prev?.id === id && prev ? merge(prev) : prev));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status        !== undefined) dbUpdates.status          = updates.status;
    if (updates.riskLevel     !== undefined) dbUpdates.risk_level      = updates.riskLevel;
    if (updates.precisionScore !== undefined) dbUpdates.precision_score = updates.precisionScore;
    if (updates.notes         !== undefined) dbUpdates.notes           = updates.notes;
    if (updates.title         !== undefined) dbUpdates.title           = updates.title;
    if (updates.imageUrl      !== undefined) dbUpdates.image_url      = updates.imageUrl;
    if (updates.avatarUrl      !== undefined) dbUpdates.avatar_url      = updates.avatarUrl;
    if (updates.aiAnalysis !== undefined) {
      dbUpdates.ai_analysis = updates.aiAnalysis;
      persistCaseAiAnalysis(id, updates.aiAnalysis);
    }
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

  const startTour = useCallback(() => {
    setTourForceShow(true);
    setTourActive(true);
  }, []);
  
  const closeTour = useCallback(() => {
    setTourActive(false);
    setTourForceShow(false);
    if (user?.id) {
      localStorage.setItem(`ortobolt_tour_v1_${user.id}`, '1');
    }
  }, [user]);







  return (
    <AppContext.Provider value={{
      user, isLoggedIn, authLoading, currentView, setCurrentView,
      login, logout, setUserFromSession,
      currentPage, setCurrentPage,
      cases, addCase, approveAndIntegrateCase, updateCase, deleteCase,
      activeCase, openCase, closeCase,
      notifications, unreadCount, markAllRead, markRead, addNotification,
      chatHistory, setChatHistory,
      tourActive, tourForceShow, startTour, closeTour,
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








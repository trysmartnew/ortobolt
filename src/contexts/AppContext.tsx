// src/contexts/AppContext.tsx
// ✅ D-01: MOCK_CASES substituído por fetch real do Supabase
// ✅ C-02: Rate limiting de login
// ✅ A-05: useMemo para unreadCount
// ✅ U-02: Sistema de Toast global
// ✅ Collaboration: inviteCollaborator, removeCollaborator e getCaseCollaborators restaurados
// ✅ setUserFromSession com guarda de ID vazio

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode
} from "react";

import type {
  User,
  ClinicalCase,
  Notification,
  ChatMessage,
  Collaborator,
  CaseMessage
} from "@/types/index";

import {
  MOCK_NOTIFICATIONS,
  MOCK_COLLABORATORS,
  MOCK_CASE_MESSAGES
} from "@/data/mockData";

import { supabase, fetchUserProfile } from "@/services/supabase";

export type Page =
  | "dashboard"
  | "chat"
  | "analysis"
  | "gallery"
  | "case"
  | "profile"
  | "reports"
  | "settings"
  | "notifications";

export type AppView = "home" | "login" | "register" | "app";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
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

  activeCase: ClinicalCase | null;
  openCase: (c: ClinicalCase) => void;
  closeCase: () => void;

  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;

  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

  tourActive: boolean;
  startTour: () => void;
  closeTour: () => void;

  collaborators: Collaborator[];
  getCaseCollaborators: (caseId: string) => Collaborator[];
  inviteCollaborator: (caseId: string, data: { name: string; email: string; specialty: string; crmv: string; institution: string; role: "consultant" | "observer" }) => void;
  removeCollaborator: (id: string) => void;

  caseMessages: CaseMessage[];
  getCaseMessages: (caseId: string) => CaseMessage[];
  addCaseMessage: (caseId: string, content: string, type?: CaseMessage["type"]) => void;

  onlineUsers: string[];

  toasts: Toast[];
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: number) => void;

  loginLocked: boolean;
  loginLockSecondsLeft: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {

  const [user, setUser]               = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>("home");
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  const [cases, setCases]           = useState<ClinicalCase[]>([]);
  const [activeCase, setActiveCase] = useState<ClinicalCase | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [chatHistory, setChatHistory]     = useState<ChatMessage[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(MOCK_COLLABORATORS);
  const [caseMessages, setCaseMessages]   = useState<CaseMessage[]>(MOCK_CASE_MESSAGES);
  const [onlineUsers, setOnlineUsers]     = useState<string[]>([]);
  const [tourActive, setTourActive]       = useState(false);
  const [toasts, setToasts]               = useState<Toast[]>([]);

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

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // D-01: Buscar casos reais do Supabase
  useEffect(() => {
    if (!user) return;
    supabase
      .from("clinical_cases")
      .select("*")
      .eq("veterinarian_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCases(data as ClinicalCase[]);
      });
  }, [user]);

  const login = useCallback(async (email: string, password: string, rememberMe = true): Promise<boolean> => {
    if (lockedUntil && new Date() < lockedUntil) {
      const secs = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      addToast(`Conta bloqueada. Aguarde ${secs}s.`, "error");
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
        addToast("Muitas tentativas incorretas. Acesso bloqueado por 15 minutos.", "error");
      } else {
        const remaining = 5 - newAttempts;
        addToast(`Credenciais inválidas. ${remaining} tentativa${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`, "error");
      }
      return false;
    }

    setLoginAttempts(0);
    setLockedUntil(null);

    // U-01: mover token para sessionStorage se rememberMe=false
    if (!rememberMe) {
      const projectRef = import.meta.env.VITE_SUPABASE_URL
        .replace('https://', '')
        .split('.')[0];
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
    setCurrentView("app");
    setTimeout(() => setTourActive(true), 600);
    addToast(`Bem-vindo(a), ${profile.name.split(" ")[0]}!`, "success");
    return true;
  }, [loginAttempts, lockedUntil, addToast]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsLoggedIn(false);
    setCurrentView("home");
    setCurrentPage("dashboard");
    setActiveCase(null);
    setTourActive(false);
    setCases([]);
  }, []);

  const setUserFromSession = useCallback(async (supaUser: { id: string }) => {
    if (!supaUser.id) {
      setAuthLoading(false);
      return;
    }
    const profile = await fetchUserProfile(supaUser.id);
    if (profile) {
      setUser(profile);
      setIsLoggedIn(true);
      setCurrentView("app");
    }
    setAuthLoading(false);
  }, []);

  const openCase = useCallback((c: ClinicalCase) => {
    setActiveCase(c);
    setCurrentPage("case");
  }, []);

  const closeCase = useCallback(() => {
    setActiveCase(null);
    setCurrentPage("gallery");
  }, []);

  const addCase = useCallback((c: ClinicalCase) => {
    setCases((prev) => [c, ...prev]);
  }, []);

  const updateCase = useCallback((id: string, updates: Partial<ClinicalCase>) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const markAllRead = useCallback(() =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);

  const markRead = useCallback((id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    ), []);

  const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) =>
    setNotifications((prev) => [
      { ...n, id: "n-" + Date.now(), timestamp: new Date().toISOString(), read: false },
      ...prev,
    ]), []);

  const startTour = useCallback(() => setTourActive(true), []);
  const closeTour = useCallback(() => setTourActive(false), []);

  const getCaseCollaborators = useCallback(
    (caseId: string) => collaborators.filter((c) => c.caseId === caseId),
    [collaborators]
  );

  const inviteCollaborator = useCallback((
    caseId: string,
    data: { name: string; email: string; specialty: string; crmv: string; institution: string; role: "consultant" | "observer" }
  ) => {
    const col: Collaborator = {
      id: `col-${Date.now()}`,
      caseId,
      userId: `u-${Date.now()}`,
      ...data,
      status: "pending",
      invitedAt: new Date().toISOString(),
    };
    setCollaborators((prev) => [...prev, col]);
    setCaseMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        caseId,
        userId: "system",
        userName: "Sistema",
        userRole: "observer",
        content: `👋 **${data.name}** (${data.specialty}) foi convidado(a) como ${data.role === "consultant" ? "Consultor" : "Observador"}.`,
        createdAt: new Date().toISOString(),
        type: "system",
      },
    ]);
    addNotification({
      type: "info",
      title: "Convite enviado",
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

  const addCaseMessage = useCallback(
    (caseId: string, content: string, type: CaseMessage["type"] = "text") => {
      if (!user) return;
      const message: CaseMessage = {
        id: "msg-" + Date.now(),
        caseId,
        userId: user.id,
        userName: user.name,
        userRole: "owner",
        content,
        createdAt: new Date().toISOString(),
        type,
      };
      setCaseMessages((prev) => [...prev, message]);
    },
    [user]
  );

  // Realtime D-03/D-04
  useEffect(() => {
    if (!activeCase || !user) return;

    const channel = supabase
      .channel(`case-${activeCase.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "case_messages",
          filter: `case_id=eq.${activeCase.id}`,
        },
        (payload) => {
          setCaseMessages((prev) => [...prev, payload.new as CaseMessage]);
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ userId: string }>();
        setOnlineUsers(
          Object.values(state)
            .map((p: any) => p[0]?.userId)
            .filter(Boolean)
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCase, user]);

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn,
        authLoading,
        currentView,
        setCurrentView,
        login,
        logout,
        setUserFromSession,

        currentPage,
        setCurrentPage,

        cases,
        addCase,
        updateCase,

        activeCase,
        openCase,
        closeCase,

        notifications,
        unreadCount,
        markAllRead,
        markRead,
        addNotification,

        chatHistory,
        setChatHistory,

        tourActive,
        startTour,
        closeTour,

        collaborators,
        getCaseCollaborators,
        inviteCollaborator,
        removeCollaborator,

        caseMessages,
        getCaseMessages,
        addCaseMessage,

        onlineUsers,

        toasts,
        addToast,
        removeToast,

        loginLocked,
        loginLockSecondsLeft,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

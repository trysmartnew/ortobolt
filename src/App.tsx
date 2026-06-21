import { useEffect, useRef } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';
import HomePage          from '@/pages/HomePage';
import LoginPage         from '@/pages/LoginPage';
import RegisterPage      from '@/pages/RegisterPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage     from '@/pages/DashboardPage';
import ChatPage          from '@/pages/ChatPage';
import AnalysisPage      from '@/pages/AnalysisPage';
import GalleryPage       from '@/pages/GalleryPage';
import CasePage          from '@/pages/CasePage';
import ProfilePage       from '@/pages/ProfilePage';
import ReportsPage       from '@/pages/ReportsPage';
import SettingsPage      from '@/pages/SettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import Sidebar           from '@/components/Sidebar';
import TopBar            from '@/components/TopBar';
import ProductTour       from '@/components/ProductTour';
import ToastContainer    from '@/components/ToastContainer';
import AIAssistant       from '@/components/AIAssistant';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AnalysisProvider } from '@/contexts/AnalysisContext';
import AcademicDisclaimer from '@/components/AcademicDisclaimer';

const PAGE_MAP = {
  dashboard:     DashboardPage,
  chat:          ChatPage,
  analysis:      AnalysisPage,
  gallery:       GalleryPage,
  case:          CasePage,
  profile:       ProfilePage,
  reports:       ReportsPage,
  settings:      SettingsPage,
  notifications: NotificationsPage,
} as const;

function AppInner() {
  // Inicializar view reset se token de recovery foi detectado no main.tsx
  useEffect(() => {
    const raw = sessionStorage.getItem('ortobolt_recovery_token');
    if (raw) setCurrentView('reset');
  }, []);
  const {
    currentView, authLoading,
    currentPage, tourActive, tourForceShow, closeTour,
    analysisMode, setAnalysisMode,
    logout, setUserFromSession, setCurrentView,
    toasts, removeToast,
  } = useApp();

  const logoutRef     = useRef(logout);
  const setSessionRef = useRef(setUserFromSession);

  useEffect(() => { logoutRef.current = logout; }, [logout]);
  useEffect(() => { setSessionRef.current = setUserFromSession; }, [setUserFromSession]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // PASSWORD_RECOVERY deve ser tratado PRIMEIRO antes de qualquer outra lógica
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('reset');
        return;
      }

      if (event === 'SIGNED_OUT') {
        logoutRef.current();
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        setSessionRef.current(session.user);
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const remember = sessionStorage.getItem('ortobolt_remember_me');
        if (remember === '0') {
          const projectRef = import.meta.env.VITE_SUPABASE_URL
            .replace('https://', '').split('.')[0];
          const key = `sb-${projectRef}-auth-token`;
          const token = localStorage.getItem(key);
          if (token) {
            sessionStorage.setItem(key, token);
            localStorage.removeItem(key);
          }
          sessionStorage.removeItem('ortobolt_remember_me');
        }
        setSessionRef.current(session.user);
        return;
      }

      if (session?.user) {
        setSessionRef.current(session.user);
      } else {
        setSessionRef.current({ id: '' });
      }
    });

    // getSession apenas para restaurar sessão existente — não interfere com PASSWORD_RECOVERY
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionRef.current(session.user);
      } else {
        setSessionRef.current({ id: '' });
      }
    });

    return () => subscription.unsubscribe();
      <AcademicDisclaimer />
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-navy">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm font-mono">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'home')     return <><HomePage /><ToastContainer toasts={toasts} onRemove={removeToast} /></>;
  if (currentView === 'login')    return <><LoginPage /><ToastContainer toasts={toasts} onRemove={removeToast} /></>;
  if (currentView === 'register') return <><RegisterPage /><ToastContainer toasts={toasts} onRemove={removeToast} /></>;
  if (currentView === 'reset')    return <><ResetPasswordPage /><ToastContainer toasts={toasts} onRemove={removeToast} /></>;

  const PageComponent = PAGE_MAP[currentPage as keyof typeof PAGE_MAP] || DashboardPage;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <PageComponent />
        </main>
      </div>
      <ProductTour
        page={currentPage}
        active={tourActive}
        onClose={closeTour}
        forceShow={tourForceShow}
        onStepChange={(_, step) => {
          if (step.target.startsWith('tour-compare-')) setAnalysisMode('compare');
          else if (step.target !== '__welcome__') setAnalysisMode('analysis');
        }}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {currentPage !== 'chat' && <AIAssistant />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AnalysisProvider>
                    <ErrorBoundary>
        <AppInner />
      </ErrorBoundary>
                </AnalysisProvider>
    </AppProvider>
  );
}



// src/App.tsx
// ✅ C-05: useEffect com stale closure corrigido — useRef para handlers estáveis
// ✅ U-02: ToastContainer renderizado no topo do layout

import { useEffect, useRef } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';
import HomePage      from '@/pages/HomePage';
import LoginPage     from '@/pages/LoginPage';
import RegisterPage  from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ChatPage      from '@/pages/ChatPage';
import AnalysisPage  from '@/pages/AnalysisPage';
import GalleryPage   from '@/pages/GalleryPage';
import CasePage      from '@/pages/CasePage';
import ProfilePage   from '@/pages/ProfilePage';
import ReportsPage   from '@/pages/ReportsPage';
import SettingsPage  from '@/pages/SettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import Sidebar       from '@/components/Sidebar';
import TopBar        from '@/components/TopBar';
import ProductTour   from '@/components/ProductTour';
import ToastContainer from '@/components/ToastContainer';
import AIAssistant    from '@/components/AIAssistant';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

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
  const {
    currentView, authLoading,
    currentPage, tourActive, closeTour,
    logout, setUserFromSession, setCurrentView,
    toasts, removeToast,
  } = useApp();

  // ✅ C-05: Refs estáveis — evitam stale closure no listener onAuthStateChange
  const logoutRef         = useRef(logout);
  const setSessionRef     = useRef(setUserFromSession);

  // Manter refs sempre atualizadas sem re-montar o effect
  useEffect(() => { logoutRef.current = logout; }, [logout]);
  useEffect(() => { setSessionRef.current = setUserFromSession; }, [setUserFromSession]);

  useEffect(() => {
    // Verificar sessão existente ao montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionRef.current(session.user);
      } else {
        setSessionRef.current({ id: '' });
      }
    });

    // Listener de mudanças de auth — usa refs, nunca stale
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSessionRef.current(session.user);
      }
      // CONTROLE DE rememberMe — token já gravado aqui, timing correto
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
      }
      // TRATAMENTO DE LOGOUT
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView('reset');
        return;
      }
      if (event === 'SIGNED_OUT') {
        logoutRef.current();
      }
      // ATUALIZAÇÃO DE TOKEN
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        setSessionRef.current(session.user);
      }
    }
);

    return () => subscription.unsubscribe();
  }, []); // ✅ Array vazio é seguro agora graças às refs

    const isResetRoute = window.location.hash.includes('access_token');
  if (isResetRoute) {
    return <ResetPasswordPage />;
  }

  // Loading enquanto verifica sessão
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#001a40]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm font-mono">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // Roteamento por view
  if (currentView === 'home')     return <><HomePage /><ToastContainer toasts={toasts} onRemove={removeToast} /></>;
  if (currentView === 'login')    return <><LoginPage /><ToastContainer toasts={toasts} onRemove={removeToast} /></>;
  if (currentView === 'register') return <><RegisterPage /><ToastContainer toasts={toasts} onRemove={removeToast} /></>;
  if (currentView === 'reset')    return <><ResetPasswordPage /><ToastContainer toasts={toasts} onRemove={removeToast} /></>;

  // App principal (currentView === 'app')
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
      <ProductTour page={currentPage} active={tourActive} onClose={closeTour} />
      {/* ✅ U-02: Toast container — aparece sobre tudo */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {currentPage !== 'chat' && <AIAssistant />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <AppInner />
      </ErrorBoundary>
    </AppProvider>
  );
}









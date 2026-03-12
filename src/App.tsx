// src/App.tsx
// ✅ C-05: useEffect com stale closure corrigido — useRef para handlers estáveis
// ✅ U-02: ToastContainer renderizado no topo do layout

import React, { useEffect, useRef } from 'react';
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
    logout, setUserFromSession,
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
    // ADICIONE ESTA LINHAnpm run lint: Garante que se estiver logado, ele saia da tela de login
    if (currentView !== 'app') {
       // Se o seu useApp tiver uma função para mudar view, use-a aqui
       // window.location.reload(); // Solução extrema: recarregar resolve o cache de auth
    }
  }

    // TRATAMENTO DE LOGOUT
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
    </div>
  );
}

export default function App() {
  return <AppProvider><AppInner /></AppProvider>;
}

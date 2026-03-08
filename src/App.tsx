import React, { useEffect } from 'react';
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
  } = useApp();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserFromSession(session.user);
      } else {
        setUserFromSession({ id: '' });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: { user?: { id: string } } | null) => {
        if (event === 'SIGNED_OUT') logout();
        if (event === 'TOKEN_REFRESHED' && session?.user) setUserFromSession(session.user);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

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
  if (currentView === 'home')     return <HomePage />;
  if (currentView === 'login')    return <LoginPage />;
  if (currentView === 'register') return <RegisterPage />;

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
    </div>
  );
}

export default function App() {
  return <AppProvider><AppInner /></AppProvider>;
}


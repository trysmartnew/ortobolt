import React from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ChatPage from '@/pages/ChatPage';
import AnalysisPage from '@/pages/AnalysisPage';
import GalleryPage from '@/pages/GalleryPage';
import ProfilePage from '@/pages/ProfilePage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import ProductTour, { TourButton, TOUR_STEPS } from '@/components/ProductTour';

const PAGE_MAP = {
  dashboard:     DashboardPage,
  chat:          ChatPage,
  analysis:      AnalysisPage,
  gallery:       GalleryPage,
  profile:       ProfilePage,
  reports:       ReportsPage,
  settings:      SettingsPage,
  notifications: NotificationsPage,
} as const;

function AppInner() {
  const { isLoggedIn, currentPage, tourActive, startTour, closeTour } = useApp();

  if (!isLoggedIn) return <LoginPage />;

  const PageComponent = PAGE_MAP[currentPage as keyof typeof PAGE_MAP] || DashboardPage;
  const hasTour = (TOUR_STEPS[currentPage]?.length ?? 0) > 0;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <PageComponent />
        </main>
      </div>

      {/* Product Tour overlay */}
      <ProductTour
        page={currentPage}
        active={tourActive}
        onClose={closeTour}
      />

      {/* Floating tour button — visible on every page that has steps */}
      {hasTour && !tourActive && (
        <TourButton onClick={startTour} />
      )}
    </div>
  );
}

export default function App() {
  return <AppProvider><AppInner /></AppProvider>;
}

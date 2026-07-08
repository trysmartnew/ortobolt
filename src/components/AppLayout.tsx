import React, { memo } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = memo(({ children }: AppLayoutProps) => (
  <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0a0c0d] to-[#121517]">
    <Sidebar />
    <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  </div>
));

AppLayout.displayName = 'AppLayout';

export default AppLayout;

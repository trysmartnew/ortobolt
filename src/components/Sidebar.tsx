import { OrtoBoltLogo } from './brand/OrtoBoltLogo';
﻿import { useMemo } from 'react';
import { 
  ClipboardList, Scan, Activity, BarChart3,
  Bot, Bell, User, Settings, LogOut 
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { Page } from '@/contexts/AppContext';

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  page: Page;
  badge?: number;
  dynamicBadge?: 'activeCases';
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'CLÍNICO',
    items: [
      { label: 'Casos', icon: ClipboardList, page: 'gallery', dynamicBadge: 'activeCases' },
      { label: 'Análise de Imagens', icon: Scan, page: 'analysis' },
      { label: 'Painel Clínico', icon: Activity, page: 'dashboard' },
      { label: 'Relatórios', icon: BarChart3, page: 'reports' },
    ]
  },
  {
    title: 'FERRAMENTAS',
    items: [
      { label: 'OrthoAI', icon: Bot, page: 'chat' },
    ]
  },
  {
    title: 'SISTEMA',
    items: [
      { label: 'Notificações', icon: Bell, page: 'notifications', badge: 3 },
      { label: 'Perfil', icon: User, page: 'profile' },
      { label: 'Configurações', icon: Settings, page: 'settings' },
    ]
  }
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, user, logout, cases, unreadCount } = useApp();

  const activeCasesCount = useMemo(() => {
    return cases.filter(c => 
      c.status === 'pending' || 
      c.status === 'in_analysis' || 
      c.status === 'critical'
    ).length;
  }, [cases]);

  const getBadge = (item: MenuItem): number | null => {
    if (item.dynamicBadge === 'activeCases') {
      return activeCasesCount > 0 ? activeCasesCount : null;
    }
    if (item.label === 'Notificações') {
      return unreadCount > 0 ? unreadCount : null;
    }
    return item.badge ?? null;
  };

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <OrtoBoltLogo variant="horizontal" size="small" showSubtitle={false} />
        <p className="text-xs text-white/60">Ortopedia Veterinária</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {MENU_SECTIONS.map((section, sectionIdx) => (
          <div key={section.title}>
            {/* Section Title */}
            <div className={`px-3 ${section.title === 'SISTEMA' ? 'mt-4' : 'mb-2'}`}>
              <span className="text-xs text-white/40 uppercase tracking-wider">
                {section.title}
              </span>
            </div>

            {/* Menu Items */}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              const badgeValue = getBadge(item);
              
              return (
                <button
                  key={item.page}
                  onClick={() => setCurrentPage(item.page)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white border-l-4 border-blue-400' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {badgeValue !== null && badgeValue > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {badgeValue}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Divider: após CLÍNICO e após SISTEMA */}
            {(section.title === 'CLÍNICO' || section.title === 'SISTEMA') && (
              <div className="border-t border-white/10 my-3" />
            )}
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-white/10 p-4">
        {user && (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-white/60 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair da sessão</span>
        </button>
      </div>
    </aside>
  );
}
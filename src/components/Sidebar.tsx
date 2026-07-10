import { useMemo, useState, useCallback } from 'react';
import {
  ClipboardList, Scan, Activity, BarChart3,
  Bot, Bell, User, Settings, LogOut,
  Users, TrendingUp, Ruler, HelpCircle, Sparkles
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { Page } from '@/contexts/AppContext';
import { AnalysisQuickSelectModal } from './AnalysisQuickSelectModal';

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
      { label: 'Painel Clínico', icon: Activity, page: 'dashboard' },
      { label: 'Pacientes', icon: Users, page: 'patients' },
    ]
  },
  {
    title: 'FERRAMENTAS',
    items: [
      { label: 'OrthoAI', icon: Bot, page: 'chat' },
      { label: 'Relatórios', icon: BarChart3, page: 'reports' },
    ]
  },
  {
    title: 'SISTEMA',
    items: [
      { label: 'Notificações', icon: Bell, page: 'notifications' },
      { label: 'Perfil', icon: User, page: 'profile' },
      { label: 'Configurações', icon: Settings, page: 'settings' },
      { label: 'Ajuda', icon: HelpCircle, page: 'help' },
    ]
  }
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, user, logout, cases, unreadCount } = useApp();
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  const activeCasesCount = useMemo(() => {
    return cases.filter(c =>
      c.status === 'pending' ||
      c.status === 'in_analysis' ||
      c.status === 'critical'
    ).length;
  }, [cases]);

  // Handlers memoizados para proteger o ciclo de re-render
  const openAnalysisModal = useCallback(() => {
    setIsAnalysisModalOpen(true);
  }, []);

  const closeAnalysisModal = useCallback(() => {
    setIsAnalysisModalOpen(false);
  }, []);

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
    <aside className="w-[250px] bg-[#0e1011] text-white h-screen flex flex-col border-r border-[#22262a]">
      {/* Header */}
      <header className="h-[84px] w-full shrink-0 flex flex-col justify-center px-4 border-b border-white/5 bg-[#0e1011]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#29a399]/20 to-transparent border border-[#29a399]/20 flex items-center justify-center">
            <span className="text-[#29a399] font-bold text-sm">V</span>
          </div>
          <h1 className="text-[13px] font-semibold text-white tracking-tight leading-none">
            Vanguard <span className="text-[#29a399]">Veterinary</span>
          </h1>
        </div>
        <p className="mt-1 ml-[40px] font-mono text-[10px] tracking-widest text-white/40 uppercase">
          Ortopedia de Precisão
        </p>
      </header>

      {/* Bloco de Ações Flash (Verde Jade) */}
      <div className="px-4 py-4 border-b border-[#00A36C]/20">
        <button
          onClick={openAnalysisModal}
          className="
            w-full h-[42px] rounded-[8px]
            flex items-center justify-center gap-2
            border border-[rgba(41,163,153,0.3)] bg-gradient-to-r from-[#29a399]/15 to-[#29a399]/05 text-white
            shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]
            transition-all duration-300
            hover:shadow-[0_0_15px_rgba(41,163,153,0.25)]
          "
          aria-label="Abrir seletor de análise de imagem"
        >
          <Sparkles className="w-4 h-4 text-[#29a399]" />
          <span className="text-sm">Analisar Imagem</span>
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(41,163,153,0.2) transparent' }}>
        {MENU_SECTIONS.map((section, sectionIdx) => (
          <div key={section.title}>
            {/* Section Title */}
            <div className={`px-4 mt-6 mb-2`}>
              <span className="text-xs text-white/40 uppercase tracking-wider">
                {section.title}
              </span>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.page;
                const badgeValue = getBadge(item);

                return (
                  <button
                    key={item.page}
                    onClick={() => setCurrentPage(item.page)}
                    style={isActive ? { background: 'linear-gradient(90deg, rgba(41,163,153,0.15) 0%, rgba(41,163,153,0) 100%)' } : {}}
                    className={`w-full flex items-center gap-3 px-4 h-[44px] text-sm transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isActive
                        ? 'text-white font-medium'
                        : 'text-white/50 hover:bg-white/[0.03] hover:translate-x-1 hover:text-white'
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#29a399]' : ''}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {badgeValue !== null && badgeValue > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        {badgeValue}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="mt-auto">
        {user && (
          <div className="mx-4 mb-3 p-3 rounded-lg bg-[#161a1c] border border-white/5 flex items-center gap-3 h-[56px]">
            <div className="w-8 h-8 bg-[#29a399] ring-1 ring-[#29a399]/30 rounded-full flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-white/60 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-4 text-sm text-white/50 hover:text-white transition-colors border-t border-white/5"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair da sessão</span>
        </button>
      </div>

      {/* Modal Acoplado */}
      <AnalysisQuickSelectModal
        isOpen={isAnalysisModalOpen}
        onClose={closeAnalysisModal}
      />
    </aside>
  );
}


import { OrtoBoltLogo } from './brand/OrtoBoltLogo';
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
    <aside className="w-64 bg-[#0e1011] text-white h-screen flex flex-col border-r border-[#22262a]">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <OrtoBoltLogo variant="horizontal" size="small" showSubtitle={false} />
        <p className="text-xs text-white/60">Ortopedia Veterinária</p>
      </div>

      {/* Bloco de Ações Flash (Verde Jade) */}
      <div className="px-3 py-4 border-b border-[#00A36C]/20">
        <button
          onClick={openAnalysisModal}
          className="
            w-full flex items-center justify-center gap-2
            bg-gradient-to-br from-[#3caea3]/20 to-[#3caea3]/05 border border-[#3caea3] text-white
            shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]
            transition-all duration-300
            hover:border-[#3caea3] hover:from-[#3caea3]/25 hover:to-[#3caea3]/05 hover:shadow-[0_0_12px_rgba(60,174,163,0.2)]
          "
          aria-label="Abrir seletor de análise de imagem"
        >
          <Sparkles className="w-5 h-5 text-[#3caea3]" />
          <span>Analisar Imagem</span>
        </button>
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
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${isActive
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

      {/* Modal Acoplado */}
      <AnalysisQuickSelectModal
        isOpen={isAnalysisModalOpen}
        onClose={closeAnalysisModal}
      />
    </aside>
  );
}

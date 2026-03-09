import React from 'react';
import { LayoutDashboard, MessageSquare, Camera, Images, User, FileText, Settings, Bell, LogOut } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const NAV = [
  { id: 'dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'chat',          label: 'Chat IA',          icon: MessageSquare  },
  { id: 'analysis',      label: 'Análise Visual',   icon: Camera         },
  { id: 'gallery',       label: 'Galeria de Casos', icon: Images         },
  { id: 'reports',       label: 'Relatórios',       icon: FileText       },
  { id: 'profile',       label: 'Perfil',           icon: User           },
  { id: 'settings',      label: 'Configurações',    icon: Settings       },
] as const;

export default React.memo(function Sidebar() {
// (fechar com });  no final — adicionar o ) antes do ;)

  const { currentPage, setCurrentPage, user, logout, unreadCount } = useApp();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#001a40] text-white flex flex-col h-screen sticky top-0 z-30">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-center">
        <img
          src="/logo.png"
          alt="OrtoBolt — Veterinary Orthopedics"
          className="w-full max-w-[180px] h-auto object-contain"
          style={{ filter: 'brightness(1.1) drop-shadow(0 0 8px rgba(0,149,255,0.25))' }}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-3 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id || (id === 'gallery' && currentPage === 'case');
          return (
            <button
              key={id}
              onClick={() => setCurrentPage(id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? 'bg-[#0056b3] text-white shadow-lg' : 'text-blue-200/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="flex-shrink-0" size={18} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          );
        })}

        <div className="pt-2 mt-2 border-t border-white/10">
          <button
            onClick={() => setCurrentPage('notifications')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentPage === 'notifications' ? 'bg-[#0056b3] text-white' : 'text-blue-200/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Bell size={18} />
            <span className="flex-1 text-left">Notificações</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#0056b3] flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0) || 'V'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user?.name?.replace('Dra. ', '') || 'Veterinário'}</p>
            <p className="text-[10px] text-blue-300 font-mono truncate">{user?.crmv || ''}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-300/80 hover:bg-red-500/20 hover:text-red-300 transition-all">
          <LogOut size={14} /> Sair da sessão
        </button>
      </div>
    </aside>
  );
}
)
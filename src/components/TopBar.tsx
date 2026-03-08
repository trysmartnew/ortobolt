import React from 'react';
import { Bell, Wifi, WifiOff, MapPin } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { TOUR_STEPS } from '@/components/ProductTour';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard:     { title: 'Dashboard',          subtitle: 'Visão geral em tempo real' },
  chat:          { title: 'Consultor IA',        subtitle: 'OrthoAI · OpenRouter · Mistral-7B' },
  analysis:      { title: 'Análise Visual',      subtitle: 'OrthoVision v3.2 · IA Computacional' },
  gallery:       { title: 'Galeria de Casos',    subtitle: 'Casos clínicos e histórico' },
  reports:       { title: 'Relatórios',          subtitle: 'Exportação e análise de dados' },
  profile:       { title: 'Perfil Profissional', subtitle: 'Dados e certificações' },
  settings:      { title: 'Configurações',       subtitle: 'Preferências do sistema' },
  case:          { title: 'Colaboração Clínica', subtitle: 'Discussão e visualização conjunta de casos' },
  notifications: { title: 'Notificações',        subtitle: 'Alertas e atualizações' },
};

export default function TopBar() {
  const { currentPage, setCurrentPage, unreadCount, tourActive, startTour } = useApp();
  const { title, subtitle } = PAGE_TITLES[currentPage] || PAGE_TITLES.dashboard;
  const [online] = React.useState(true);
  const hasTour = (TOUR_STEPS[currentPage]?.length ?? 0) > 0;

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-20 flex-shrink-0">
      <div>
        <h1 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Montserrat' }}>{title}</h1>
        <p className="text-xs text-slate-400 font-mono">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Tour button — fixed in header, never overlaps content */}
        {hasTour && !tourActive && (
          <button
            onClick={startTour}
            title="Tour desta página"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0056b3]/10 text-[#0056b3] text-xs font-semibold hover:bg-[#0056b3]/20 transition-colors group"
            style={{ fontFamily: 'Montserrat' }}
          >
            <MapPin size={12} className="group-hover:animate-bounce" />
            Tour
          </button>
        )}

        {/* Online indicator */}
        <div className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md ${online ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
          {online ? <Wifi size={11} /> : <WifiOff size={11} />}
          {online ? 'Online' : 'Offline'}
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <button onClick={() => setCurrentPage('notifications')} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="h-4.5 w-4.5 text-slate-600" size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}

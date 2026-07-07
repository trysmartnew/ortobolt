// src/components/TopBar.tsx
// ✅ Modelo atualizado para OrthoVision v3.2 (Gemma 4 31B)
import React from 'react';
import { Bell, Wifi, WifiOff, MapPin } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { TOUR_STEPS } from '@/components/ProductTour';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard:     { title: 'Painel Clínico',          subtitle: 'Visão geral em tempo real' },
  chat:          { title: 'Consultor IA',       subtitle: 'OrthoAI · Gemini 2.5 Flash' },
  analysis:      { title: 'Análise Visual',     subtitle: 'Análise Avançada · Sistema de Suporte' },
  gallery:       { title: 'Galeria de Casos',   subtitle: 'Casos clínicos e histórico' },
  reports:       { title: 'Relatórios',         subtitle: 'Exportação e análise de dados' },
  profile:       { title: 'Perfil Profissional', subtitle: 'Dados e certificações' },
  settings:      { title: 'Configurações',      subtitle: 'Preferências do sistema' },
  case:          { title: 'Colaboração Clínica', subtitle: 'Discussão e visualização conjunta de casos' },
  notifications: { title: 'Notificações',       subtitle: 'Alertas e atualizações' },
};

export default React.memo(function TopBar() {
  const { currentPage, setCurrentPage, unreadCount, tourActive, startTour, user } = useApp();
  const { title, subtitle } = PAGE_TITLES[currentPage] || PAGE_TITLES.dashboard;
  const isAnalysisPage = currentPage === 'analysis' || currentPage === 'evolutionaryAnalysis' || currentPage === 'alignmentAnalysis';
  const [online, setOnline] = React.useState(navigator.onLine);
  const hasTour = (TOUR_STEPS[currentPage]?.length ?? 0) > 0;
  const [timeString, setTimeString] = React.useState(() => `${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);

  React.useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeString(`${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className={`h-16 flex items-center justify-between px-6 sticky top-0 z-20 shrink-0 ${isAnalysisPage ? 'bg-[#0e1011] border-b border-[#22262a]' : 'bg-white border-b border-slate-100'}`}>
      <div>
        <h1 className={`text-[26px] font-semibold ${isAnalysisPage ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Montserrat' }}>{title}</h1>
        <p className="text-[13px] text-[#7a828a] font-normal">{subtitle}</p>
        {user && (
          <div className="mt-1">
            {user.crmv ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                CRMV Ativo
              </span>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {hasTour && !tourActive && (
          <button
            onClick={startTour}
            title="Tour desta página"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors group"
            style={{ fontFamily: 'Montserrat' }}
          >
            <MapPin size={12} className="group-hover:animate-bounce" />
            Tour
          </button>
        )}
        <div className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md ${online ? 'text-success bg-success-bg' : 'text-error bg-error-bg'}`}>
          {online ? <Wifi size={11} /> : <WifiOff size={11} />}
          {online ? 'Online' : 'Offline'}
        </div>
        <div className={`text-xs font-mono px-2 py-1 rounded-md ${isAnalysisPage ? 'bg-[#1a1d1f] text-[#9a9fa5]' : 'text-slate-400 bg-slate-50'}`}>
          {timeString}
        </div>
        <button onClick={() => setCurrentPage('notifications')} className={`relative p-2 rounded-lg transition-colors ${isAnalysisPage ? 'hover:bg-white/5 text-[#9a9fa5]' : 'hover:bg-slate-100'}`}>
          <Bell className={`h-4.5 w-4.5 ${isAnalysisPage ? 'text-[#9a9fa5]' : 'text-slate-600'}`} size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
});

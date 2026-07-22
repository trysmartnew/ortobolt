import React, { useState, useMemo } from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, AlertCircle, Check, X, Download, Eye } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';
import { Button, NotifBadge, SectionHeader, EmptyState } from '@/components/ui';
import type { Notification } from '@/types/index';

const NOTIF_ICONS: Record<string, React.ElementType> = { alert: AlertTriangle, success: CheckCircle, info: Info, warning: AlertCircle };
const NOTIF_COLORS: Record<string, string> = { alert: 'text-error bg-red-50', success: 'text-success bg-emerald-50', info: 'text-sky-500 bg-sky-50', warning: 'text-warning bg-amber-50' };

type FilterValue = 'all' | 'unread' | 'alerts' | 'updates' | 'reports' | 'cases' | 'reminders';

const FILTERS: { key: FilterValue; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'unread', label: 'Não lidas' },
  { key: 'alerts', label: 'Alertas de IA' },
  { key: 'updates', label: 'Atualizações do sistema' },
  { key: 'reports', label: 'Laudos prontos' },
  { key: 'cases', label: 'Novos casos' },
  { key: 'reminders', label: 'Lembretes' },
];

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays === 1) {
    const timeStr = notificationDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `Ontem às ${timeStr}`;
  }
  return `há ${diffDays} dias`;
}

function NotifRow({ n, onRead, cases, onViewCase, onIgnore, onViewReport, onDownloadPDF, onAcceptCase, onConfirmReminder }: {
  n: Notification;
  onRead: (id: string) => void;
  cases: any[];
  onViewCase: (caseId: string) => void;
  onIgnore: (id: string) => void;
  onViewReport: () => void;
  onDownloadPDF: () => void;
  onAcceptCase: (caseId: string) => void;
  onConfirmReminder: (id: string) => void;
}) {
  const Icon = NOTIF_ICONS[n.type] || Info;
  const colorCls = NOTIF_COLORS[n.type] || 'text-slate-500 bg-slate-50';

  const actions: React.ReactNode[] = [];

  if (n.type === 'alert' && n.caseId) {
    actions.push(
      <button key="view" onClick={() => onViewCase(n.caseId!)} className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1">
        <Eye size={9} /> Ver Caso
      </button>
    );
    actions.push(
      <button key="ignore" onClick={() => onIgnore(n.id)} className="text-[10px] text-white/70 font-semibold hover:underline flex items-center gap-1">
        <X size={9} /> Ignorar
      </button>
    );
  } else if (n.type === 'success') {
    actions.push(
      <button key="view" onClick={onViewReport} className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1">
        <Eye size={9} /> Ver Laudo
      </button>
    );
    actions.push(
      <button key="download" onClick={onDownloadPDF} className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1">
        <Download size={9} /> Download PDF
      </button>
    );
  } else if (n.type === 'info' && n.caseId) {
    actions.push(
      <button key="view" onClick={() => onViewCase(n.caseId!)} className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1">
        <Eye size={9} /> Ver Caso
      </button>
    );
    actions.push(
      <button key="accept" onClick={() => onAcceptCase(n.caseId!)} className="text-[10px] text-success font-semibold hover:underline flex items-center gap-1">
        <Check size={9} /> Aceitar
      </button>
    );
  } else if (n.type === 'warning') {
    actions.push(
      <button key="confirm" onClick={() => onConfirmReminder(n.id)} className="text-[10px] text-success font-semibold hover:underline flex items-center gap-1">
        <Check size={9} /> Confirmar
      </button>
    );
  }

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${n.read ? 'bg-white border-slate-100 opacity-75' : 'bg-blue-50/30 border-blue-100 border-l-4 border-l-[var(--color-accent)]'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{n.title}</p>
            <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">{n.message}</p>
          </div>
          <NotifBadge type={n.type} />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-slate-600 font-mono">{formatRelativeTime(n.timestamp)}</span>
          <div className="flex items-center gap-3">
            {actions}
            {!n.read && <button onClick={() => onRead(n.id)} className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1"><Check size={9} />Marcar como lida</button>}
          </div>
        </div>
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] flex-shrink-0 mt-1.5" />}
    </div>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllRead, markRead, cases, openCase, setCurrentPage, addToast } = useApp();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    if (filter === 'alerts') return notifications.filter(n => n.type === 'alert');
    if (filter === 'updates') return notifications.filter(n => n.type === 'info');
    if (filter === 'reports') return notifications.filter(n => n.type === 'success');
    if (filter === 'cases') return notifications.filter(n => !!n.caseId);
    if (filter === 'reminders') return notifications.filter(n => n.type === 'warning');
    return notifications;
  }, [notifications, filter]);

  const unread = filteredNotifications.filter(n => !n.read);
  const read = filteredNotifications.filter(n => n.read);

  const handleViewCase = (caseId: string) => {
    const caseObj = cases.find(c => c.id === caseId);
    if (caseObj) {
      openCase(caseObj);
    } else {
      setCurrentPage('case');
    }
  };

  const handleIgnore = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      markRead(notificationId);
    } catch (error) {
      console.error('Erro ao ignorar notificação:', error);
      addToast('Erro ao ignorar notificação.', 'error');
    }
  };

  const handleViewReport = () => {
    setCurrentPage('reports');
  };

  const handleDownloadPDF = () => {
    addToast('Download iniciado.', 'success');
  };

  const handleAcceptCase = (caseId: string) => {
    addToast('Caso aceito com sucesso.', 'success');
  };

  const handleConfirmReminder = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      markRead(notificationId);
      addToast('Lembrete confirmado.', 'success');
    } catch (error) {
      console.error('Erro ao confirmar lembrete:', error);
      addToast('Erro ao confirmar lembrete.', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;

      markAllRead();
      addToast('Todas as notificações foram marcadas como lidas.', 'success');
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      addToast('Erro ao marcar notificações.', 'error');
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <SectionHeader
        title="Notificações"
        subtitle={`${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                Filtros
              </Button>
              {isFilterOpen && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-10">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => { setFilter(f.key); setIsFilterOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)] ${filter === f.key ? 'bg-[var(--color-surface-muted)] font-semibold' : ''}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                <Check size={13} /> Marcar todas como lidas
              </Button>
            )}
          </div>
        }
      />

      {filteredNotifications.length === 0 ? (
        <EmptyState icon={<Bell size={48} />} title="Sem notificações" description="Você está em dia. Novas notificações aparecerão aqui." />
      ) : (
        <>
          {unread.length > 0 && (
            <div data-tour="tour-unread-notifications" className="space-y-3">
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Não lidas</p>
              {unread.map(n => (
                <NotifRow
                  key={n.id}
                  n={n}
                  onRead={markRead}
                  cases={cases}
                  onViewCase={handleViewCase}
                  onIgnore={handleIgnore}
                  onViewReport={handleViewReport}
                  onDownloadPDF={handleDownloadPDF}
                  onAcceptCase={handleAcceptCase}
                  onConfirmReminder={handleConfirmReminder}
                />
              ))}
            </div>
          )}
          {read.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-white/70 uppercase tracking-wider mt-2">Anteriores</p>
              {read.map(n => (
                <NotifRow
                  key={n.id}
                  n={n}
                  onRead={markRead}
                  cases={cases}
                  onViewCase={handleViewCase}
                  onIgnore={handleIgnore}
                  onViewReport={handleViewReport}
                  onDownloadPDF={handleDownloadPDF}
                  onAcceptCase={handleAcceptCase}
                  onConfirmReminder={handleConfirmReminder}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

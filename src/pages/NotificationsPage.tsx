import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, AlertCircle, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button, NotifBadge, SectionHeader, EmptyState } from '@/components/ui';
import type { Notification } from '@/types/index';

const NOTIF_ICONS: Record<string, React.ElementType> = { alert: AlertTriangle, success: CheckCircle, info: Info, warning: AlertCircle };
const NOTIF_COLORS: Record<string, string> = { alert: 'text-red-500 bg-red-50', success: 'text-emerald-500 bg-emerald-50', info: 'text-sky-500 bg-sky-50', warning: 'text-amber-500 bg-amber-50' };

function NotifRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const Icon = NOTIF_ICONS[n.type] || Info;
  const colorCls = NOTIF_COLORS[n.type] || 'text-slate-500 bg-slate-50';
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${n.read ? 'bg-white border-slate-100' : 'bg-blue-50/30 border-blue-100'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{n.title}</p>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
          </div>
          <NotifBadge type={n.type} />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-slate-400 font-mono">{new Date(n.timestamp).toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
          {!n.read && <button onClick={() => onRead(n.id)} className="text-[10px] text-[#0056b3] font-semibold hover:underline flex items-center gap-1"><Check size={9} />Marcar como lida</button>}
        </div>
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-[#0056b3] flex-shrink-0 mt-1.5" />}
    </div>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllRead, markRead } = useApp();
  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <SectionHeader title="Notificações" subtitle={`${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`}
        action={unreadCount > 0 ? <Button variant="ghost" size="sm" onClick={markAllRead}><Check size={13} />Marcar todas como lidas</Button> : undefined} />

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={48} />} title="Sem notificações" description="Você está em dia. Novas notificações aparecerão aqui." />
      ) : (
        <>
          {unread.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Não lidas</p>
              {unread.map(n => <NotifRow key={n.id} n={n} onRead={markRead} />)}
            </div>
          )}
          {read.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2">Anteriores</p>
              {read.map(n => <NotifRow key={n.id} n={n} onRead={markRead} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

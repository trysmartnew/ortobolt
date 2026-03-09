import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CaseStatus, NotificationType } from '@/types/index';

// ── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: 'default'|'success'|'warning'|'danger'|'info'|'blue'; className?: string }) {
  const styles: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700', success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200', danger: 'bg-red-50 text-red-700 border border-red-200 animate-pulse',
    info: 'bg-sky-50 text-sky-700 border border-sky-200', blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-mono ${styles[variant]} ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  const map: Record<CaseStatus, { label: string; variant: 'success'|'warning'|'danger'|'info' }> = {
    completed: { label: 'Concluído', variant: 'success' },
    in_analysis: { label: 'Em Análise', variant: 'info' },
    pending: { label: 'Pendente', variant: 'warning' },
    critical: { label: 'CRÍTICO', variant: 'danger' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function NotifBadge({ type }: { type: NotificationType }) {
  const map: Record<NotificationType, { label: string; variant: 'danger'|'info'|'success'|'warning' }> = {
    alert: { label: 'Alerta', variant: 'danger' }, info: { label: 'Info', variant: 'info' },
    success: { label: 'Sucesso', variant: 'success' }, warning: { label: 'Atenção', variant: 'warning' },
  };
  const { label, variant } = map[type];
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Button ───────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary'|'secondary'|'ghost'|'danger'; size?: 'sm'|'md'|'lg'; loading?: boolean; }
export function Button({ children, variant='primary', size='md', loading, className='', disabled, ...props }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string,string> = {
    primary: 'bg-[#0056b3] text-white hover:bg-[#004494] focus:ring-[#0056b3] shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
  };
  const sizes: Record<string,string> = { sm:'px-3 py-1.5 text-xs', md:'px-4 py-2 text-sm', lg:'px-6 py-3 text-base' };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
    {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
    {children}
  </button>;
}

// ── Card — BUG-01 FIX: forward all HTML div attrs so data-tour reaches DOM ───
export function Card({ children, className='', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

// ── KPI Widget ───────────────────────────────────────────────────────────────
export const KPIWidget = React.memo(function KPIWidget({ label, value, unit, trend, trendDirection, color }: { label: string; value: number|string; unit?: string; trend: number; trendDirection: 'up'|'down'|'stable'; color: string }) {
  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
  const trendColor = trendDirection === 'up' ? 'text-emerald-600' : trendDirection === 'down' ? 'text-red-500' : 'text-slate-500';
  return (
    <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: color }} />
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 pl-2">{label}</p>
      <div className="flex items-end justify-between pl-2">
        <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight">{value}<span className="text-base font-medium text-slate-500 ml-0.5">{unit}</span></span>
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
          <TrendIcon className="h-3.5 w-3.5" /> {Math.abs(trend)}%
        </div>
      </div>
<p className="text-[10px] text-slate-400 mt-1.5 pl-2">vs. mês anterior</p>
    </Card>
  );
});  

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm'|'md'|'lg' }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-2', lg: 'w-10 h-10 border-3' }[size];
  return <span className={`${s} border-[#0056b3] border-t-transparent rounded-full animate-spin inline-block`} />;
}

// ── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>;
}

// ── Precision Gauge ──────────────────────────────────────────────────────────
export function PrecisionGauge({ value, size = 80 }: { value: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ * 0.75;
  const offset = circ * 0.25;
  const color = value >= 95 ? '#059669' : value >= 85 ? '#0056b3' : value >= 70 ? '#d97706' : '#dc2626';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(135deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={-offset} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={-offset} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold font-mono" style={{ color }}>{value.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ── Risk Tag ─────────────────────────────────────────────────────────────────
export function RiskTag({ level }: { level: 'low'|'medium'|'high' }) {
  const map = { low: { label:'Baixo', cls:'bg-emerald-50 text-emerald-700' }, medium: { label:'Médio', cls:'bg-amber-50 text-amber-700' }, high: { label:'Alto', cls:'bg-red-50 text-red-700' } };
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${map[level].cls}`}>{map[level].label}</span>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Montserrat' }}>{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    <div className="text-slate-200">{icon}</div>
    <p className="font-semibold text-slate-500">{title}</p>
    <p className="text-sm text-slate-400 max-w-xs">{description}</p>
  </div>;
}

// ── Toast (inline) ────────────────────────────────────────────────────────────
export function InlineToast({ message, type = 'success' }: { message: string; type?: 'success'|'error'|'info' }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error:   'bg-red-50 border-red-200 text-red-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${styles[type]}`}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
      {message}
    </div>
  );
}

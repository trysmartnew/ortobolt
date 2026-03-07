import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { AlertTriangle, Clock, CheckCircle2, Clipboard } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { KPIWidget, Card, StatusBadge, PrecisionGauge, SectionHeader, RiskTag } from '@/components/ui';
import { KPI_METRICS, CHART_DATA } from '@/data/mockData';

const ICON_MAP: Record<string, React.ElementType> = { Target: CheckCircle2, Clipboard, CheckCircle: CheckCircle2, Zap: Clock };

export default function DashboardPage() {
  const { cases, setCurrentPage } = useApp();
  const recent = cases.slice(0, 5);
  const critical = cases.filter(c => c.status === 'critical');

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Critical alert */}
      {critical.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">{critical.length} caso{critical.length > 1 ? 's' : ''} crítico{critical.length > 1 ? 's' : ''} requer{critical.length === 1 ? '' : 'em'} atenção imediata</p>
            <p className="text-xs text-red-500 font-mono">{critical.map(c => c.patientName).join(', ')}</p>
          </div>
          <button onClick={() => setCurrentPage('gallery')} className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">Ver casos</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_METRICS.map(m => <KPIWidget key={m.id} {...m} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Precision trend */}
        <Card className="p-5 xl:col-span-2">
          <SectionHeader title="Evolução da Precisão IA" subtitle="Últimos 7 meses · OrthoVision v3.2" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={CHART_DATA} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="precGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0056b3" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0056b3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Roboto Mono' }} axisLine={false} tickLine={false} />
              <YAxis domain={[88, 98]} tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Roboto Mono' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'Roboto Mono' }} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Precisão']} />
              <Area type="monotone" dataKey="precision" stroke="#0056b3" strokeWidth={2.5} fill="url(#precGrad)" dot={{ r: 4, fill: '#0056b3', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Cases bar */}
        <Card className="p-5">
          <SectionHeader title="Casos Mensais" subtitle="Volume e sucesso" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHART_DATA} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'Roboto Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'Roboto Mono' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'Roboto Mono' }} />
              <Bar dataKey="cases" name="Casos" fill="#bfdbfe" radius={[4,4,0,0]} />
              <Bar dataKey="success" name="Sucesso" fill="#0056b3" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent cases */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-50">
          <SectionHeader title="Casos Recentes" subtitle={`${cases.length} casos no sistema`}
            action={<button onClick={() => setCurrentPage('gallery')} className="text-xs font-semibold text-[#0056b3] hover:underline">Ver todos →</button>} />
        </div>
        <div className="divide-y divide-slate-50">
          {recent.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors">
              <img src={c.imageUrl} alt={c.patientName} className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-slate-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                  {c.status === 'critical' && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">{c.patientName} · {c.breed} · {c.weightKg}kg</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <RiskTag level={c.riskLevel} />
                <StatusBadge status={c.status} />
                {c.precisionScore !== undefined && <PrecisionGauge value={c.precisionScore} size={42} />}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

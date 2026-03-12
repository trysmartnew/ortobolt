import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { AlertTriangle, Clock, CheckCircle2, Clipboard, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { KPIWidget, Card, StatusBadge, PrecisionGauge, SectionHeader, RiskTag, Spinner } from '@/components/ui';
import type { KPIMetric, ChartDataPoint } from '@/types/index';
import { supabase } from '@/services/supabase';

export default function DashboardPage() {
  const { cases, setCurrentPage, openCase, user } = useApp();
  const recent = cases.slice(0, 5);
  const critical = cases.filter(c => c.status === 'critical');
  
  // ✅ Estados para dados reais
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // ✅ useEffect para buscar dados reais do Supabase
  useEffect(() => {
    if (!user) {
      setLoadingDashboard(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        // Buscar KPIs reais
        const { data: kpisData, error: kpisError } = await supabase
          .from('kpi_metrics')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4);

        if (kpisData) setKpiMetrics(kpisData as KPIMetric[]);

        // Buscar dados do gráfico (últimas 7 semanas)
        const { data: chartData, error: chartError } = await supabase
          .from('weekly_stats')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start', { ascending: true })
          .limit(7);

        if (chartData) setChartData(chartData as ChartDataPoint[]);
      } catch (err) {
        console.error('Erro ao buscar dados do dashboard:', err);
      } finally {
        setLoadingDashboard(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // ✅ UI de Loading
  if (loadingDashboard) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spinner />
        <p className="ml-3 text-sm text-slate-500">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Critical alert */}
      {critical.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">
              {critical.length} caso{critical.length > 1 ? 's' : ''} crítico{critical.length > 1 ? 's' : ''} requer{critical.length === 1 ? '' : 'em'} atenção imediata
            </p>
            <p className="text-xs text-red-500 font-mono">{critical.map(c => c.patientName).join(', ')}</p>
          </div>
          <button onClick={() => setCurrentPage('gallery')} className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">Ver casos</button>
        </div>
      )}

      {/* KPIs — usa dados reais */}
      <div data-tour="tour-kpis" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiMetrics.map(m => <KPIWidget key={m.id} {...m} />)}
      </div>

      {/* Charts row — usa dados reais */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card data-tour="tour-precision-chart" className="p-5 xl:col-span-2">
          <SectionHeader title="Evolução da Precisão IA" subtitle="Últimas 7 semanas · OrthoVision v3.2" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
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

        <Card data-tour="tour-cases-chart" className="p-5">
          <SectionHeader title="Casos Semanais" subtitle="Volume e sucesso" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
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
      <Card data-tour="tour-recent-cases" className="overflow-hidden">
        <div className="p-5 border-b border-slate-50">
          <SectionHeader title="Casos Recentes" subtitle={`${cases.length} casos no sistema`}
            action={<button onClick={() => setCurrentPage('gallery')} className="text-xs font-semibold text-[#0056b3] hover:underline">Ver todos →</button>} />
        </div>
        <div className="divide-y divide-slate-50">
          {recent.map(c => (
            <button
              key={c.id}
              onClick={() => openCase(c)}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-blue-50/40 transition-colors text-left group"
              title="Abrir colaboração do caso"
            >
              <img src={c.imageUrl} alt={c.patientName} className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-slate-100 group-hover:border-blue-200 transition-colors" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                <ChevronRight size={14} className="text-slate-300 group-hover:text-[#0056b3] transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
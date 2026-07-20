// src/pages/DashboardPage.tsx
// 🏥 Centro de Comando Cirúrgico — Foco em ações operacionais de HOJE
import { useMemo, memo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, StatusBadge, RiskTag, Spinner, EmptyState } from '@/components/ui';
import { AlertTriangle, Clock, CheckCircle2, Calendar, PawPrint, Stethoscope, Pill, Activity } from 'lucide-react';
import type { CaseStatus, ClinicalCase } from '@/types/index';

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  catch { return iso; }
}

function getClinicalPriority(status: CaseStatus): number {
  if (status === 'critical') return 0;
  if (status === 'in_analysis') return 1;
  if (status === 'pending') return 2;
  return 3;
}

const SurgeryCard = memo(({ c, onOpen }: { c: ClinicalCase; onOpen: () => void }) => {
  const isDone = c.status === 'completed';
  const isNext = !isDone && c.procedure?.match(/tplo|fho|tta|lcp|fracture/i);
  const isDefaultDark = !isDone && !isNext;

  return (
    <button onClick={onOpen} className={`w-full text-left p-4 rounded-xl transition-all ${isDone ? 'border bg-emerald-50 border-emerald-200' : isNext ? 'border bg-blue-50 border-blue-200 hover:border-blue-400' : 'glass-panel-premium'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono font-bold ${isDefaultDark ? 'text-slate-400' : 'text-slate-700'}`}>{formatDate(c.createdAt)}</span>
            {isDone && <CheckCircle2 size={14} className="text-success" />}
            {isNext && !isDone && <Clock size={14} className="text-primary animate-pulse" />}
          </div>
          <p className={`text-sm font-semibold truncate ${isDefaultDark ? 'text-white' : 'text-slate-900'}`}>{c.patientName}</p>
          <p className={`text-xs capitalize ${isDefaultDark ? 'text-slate-300' : 'text-slate-800'}`}>{c.species} · {c.breed} · {c.weightKg}kg</p>
          <p className="text-xs font-mono text-primary mt-1 uppercase">{c.procedure}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <StatusBadge status={c.status} />
          <RiskTag level={c.riskLevel} />
        </div>
      </div>
    </button>
  );
});
SurgeryCard.displayName = 'SurgeryCard';

function TriageCard({ c, onOpen }: { c: ClinicalCase; onOpen: () => void }) {
  const urgencyIcon = c.status === 'critical' ? '🔴' : c.status === 'in_analysis' ? '🟡' : '🟢';
  return (
    <button onClick={onOpen} className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-blue-50/30 transition-all">
      <div className="flex items-start gap-3">
        <span className="text-lg">{urgencyIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{c.patientName}</p>
          <p className="text-xs text-slate-300 capitalize">{c.species} · {c.procedure}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Risco: {c.riskLevel}</p>
        </div>
        <span className="text-xs font-semibold text-primary">Ver →</span>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const { cases, openCase, user, authLoading } = useApp();

  const { surgeriesToday, triageList, metricsToday, metricsYesterday } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const yesterdayStart = new Date(now.setDate(now.getDate() - 1));

    const today = cases.filter(c => new Date(c.createdAt) >= todayStart);
    const yesterday = cases.filter(c => new Date(c.createdAt) >= yesterdayStart && new Date(c.createdAt) < todayStart);

    const surgicalProcedures = ['TPLO', 'FHO', 'TTA', 'LCP_repair', 'fracture_fixation', 'joint_replacement', 'spinal_surgery', 'tplo', 'fho', 'tta'];
    const surgeries = today.filter((c) =>
      surgicalProcedures.some(
        (p) => p.toLowerCase() === (c.procedure ?? '').toLowerCase()
      )
    );

    const triage = [...cases].sort((a, b) => getClinicalPriority(a.status) - getClinicalPriority(b.status)).slice(0, 4);

    const countByStatus = (list: typeof cases, status: CaseStatus) => list.filter(c => c.status === status).length;

    return {
      surgeriesToday: surgeries,
      triageList: triage,
      metricsToday: {
        new: today.length,
        analyzed: countByStatus(today, 'in_analysis'),
        reports: countByStatus(today, 'completed'),
        avgTime: 47,
      },
      metricsYesterday: {
        new: yesterday.length,
        analyzed: countByStatus(yesterday, 'in_analysis'),
        reports: countByStatus(yesterday, 'completed'),
      }
    };
  }, [cases]);

  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spinner />
        <p className="ml-3 text-sm text-slate-500">Carregando Painel Clínico...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-4">
            <div data-tour="tour-dashboard-surgeries" className="flex items-center justify-between mb-4 min-h-[48px]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="flex items-center gap-2"><Stethoscope size={16} /> Cirurgias de Hoje</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">{surgeriesToday.length} procedimentos</span>
            </div>
            <div className="space-y-3">
              {surgeriesToday.length === 0 ? (
                <EmptyState icon={<Calendar size={32} />} title="Sem Cirurgias" description="Nenhuma cirurgia registrada hoje." />
              ) : (
                surgeriesToday.map(c => (
                  <SurgeryCard key={c.id} c={c} onOpen={() => openCase(c)} />
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 data-tour="tour-dashboard-metrics" className="text-base font-bold text-white mb-4 flex items-center gap-2 min-h-[24px]">
              <span className="flex items-center gap-2"><Activity size={16} /> Métricas Operacionais</span> (hoje vs ontem)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Casos novos', today: metricsToday.new, yesterday: metricsYesterday.new, icon: PawPrint },
                { label: 'Em análise', today: metricsToday.analyzed, yesterday: metricsYesterday.analyzed, icon: CheckCircle2 },
                { label: 'Concluídos', today: metricsToday.reports, yesterday: metricsYesterday.reports, icon: Calendar },
                { label: 'Tempo médio', today: `${metricsToday.avgTime}s`, yesterday: '—', icon: Clock },
              ].map((m, i) => {
                const diff = typeof m.today === 'number' && typeof m.yesterday === 'number' ? m.today - m.yesterday : 0;
                const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
                return (
                  <div key={i} className="glass-panel-premium rounded-xl p-4 text-center">
                    <m.icon size={18} className="mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold text-white">{m.today}</p>
                    <p className="text-xs text-slate-300">{m.label}</p>
                    {typeof m.yesterday === 'number' && (
                      <p className="text-xs text-emerald-600 font-semibold mt-1">
                        {arrow} {Math.abs(diff)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4">
            <div data-tour="tour-dashboard-triage" className="flex items-center justify-between mb-4 min-h-[48px]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="flex items-center gap-2"><AlertTriangle size={16} /> Triage Inteligente</span>
              </h2>
              <span className="text-xs text-slate-400">Prioridade clínica</span>
            </div>
            <div className="space-y-2">
              {triageList.map(c => (
                <TriageCard key={c.id} c={c} onOpen={() => openCase(c)} />
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-base font-bold text-white mb-3">Próximas Ações</h2>
            <div className="space-y-2 text-sm">
              {[
                { text: `${cases.filter(c => c.status === 'pending').length} casos pendentes`, icon: '⏳' },
                { text: `${cases.filter(c => c.status === 'in_analysis').length} em análise`, icon: '📄' },
                { text: `${cases.filter(c => c.status === 'critical').length} críticos`, icon: '🚨' },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-panel-premium">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-slate-300">{a.text}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Pill size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Sugestão do Assistente IA</p>
                <p className="text-xs text-slate-400 mt-1">
                  {triageList[0]?.status === 'critical'
                    ? `Caso crítico: ${triageList[0]?.patientName}. Recomendo revisão imediata do protocolo.`
                    : 'Nenhum caso crítico no momento. Revise os casos em análise para otimizar o fluxo.'}
                </p>
                <button onClick={() => openCase(triageList[0])} className="text-xs font-semibold text-primary hover:underline mt-2">Ver detalhes →</button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

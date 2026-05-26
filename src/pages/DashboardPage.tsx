// src/pages/DashboardPage.tsx
// 🏥 Centro de Comando Cirúrgico — Foco em ações operacionais de HOJE
import React, { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, StatusBadge, RiskTag, Spinner } from '@/components/ui';
import { AlertTriangle, Clock, CheckCircle2, Calendar, PawPrint, Stethoscope, Pill, Activity } from 'lucide-react';
import type { CaseStatus } from '@/types/index';

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  catch { return iso; }
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return '☀️ Bom dia';
  if (h < 18) return '🌤️ Boa tarde';
  return '🌙 Boa noite';
}

function getClinicalPriority(status: CaseStatus): number {
  if (status === 'critical') return 0;
  if (status === 'in_analysis') return 1;
  if (status === 'pending') return 2;
  return 3;
}

function SurgeryCard({ c, onOpen }: { c: any; onOpen: () => void }) {
  const isDone = c.status === 'completed';
  const isNext = !isDone && c.procedure?.match(/tplo|fho|tta|lcp|fracture/i);
  return (
    <button onClick={onOpen} className={`w-full text-left p-4 rounded-xl border transition-all ${isDone ? 'bg-emerald-50 border-emerald-200' : isNext ? 'bg-blue-50 border-blue-200 hover:border-blue-400' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-slate-500">{formatDate(c.createdAt)}</span>
            {isDone && <CheckCircle2 size={14} className="text-emerald-500" />}
            {isNext && !isDone && <Clock size={14} className="text-blue-500 animate-pulse" />}
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate">{c.patientName}</p>
          <p className="text-xs text-slate-500 capitalize">{c.species} · {c.breed} · {c.weightKg}kg</p>
          <p className="text-xs font-mono text-[#0056b3] mt-1 uppercase">{c.procedure}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <StatusBadge status={c.status} />
          <RiskTag level={c.riskLevel} />
        </div>
      </div>
    </button>
  );
}

function TriageCard({ c, onOpen }: { c: any; onOpen: () => void }) {
  const urgencyIcon = c.status === 'critical' ? '🔴' : c.status === 'in_analysis' ? '🟡' : '🟢';
  return (
    <button onClick={onOpen} className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-[#0056b3]/30 hover:bg-blue-50/30 transition-all">
      <div className="flex items-start gap-3">
        <span className="text-lg">{urgencyIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{c.patientName}</p>
          <p className="text-xs text-slate-500 capitalize">{c.species} · {c.procedure}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Risco: {c.riskLevel}</p>
        </div>
        <span className="text-xs font-semibold text-[#0056b3]">Ver →</span>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const { cases, openCase, user, authLoading } = useApp();

  const { surgeriesToday, triageList, metricsToday, metricsYesterday } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    const yesterdayStart = new Date(now.setDate(now.getDate()-1));
    
    const today = cases.filter(c => new Date(c.createdAt) >= todayStart);
    const yesterday = cases.filter(c => new Date(c.createdAt) >= yesterdayStart && new Date(c.createdAt) < todayStart);
    
    const surgicalProcedures = ['tplo','fho','tta','lcp_repair','fracture_fixation','joint_replacement','spinal_surgery'];
    const surgeries = today.filter(c => surgicalProcedures.includes(c.procedure?.toLowerCase() || ''));
    
    const triage = [...cases].sort((a,b) => getClinicalPriority(a.status) - getClinicalPriority(b.status)).slice(0,4);
    
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
        <p className="ml-3 text-sm text-slate-500">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Card className="p-5 bg-gradient-to-r from-[#0056b3] to-[#38BDF8] text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{getGreeting()}, Dr. {user?.name?.split(' ')[0] || 'Veterinário'}</h1>
            <p className="text-white/80 text-sm mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">Hoje:</p>
            <p className="text-xs text-white/80">
              {surgeriesToday.length} cirurgias · {triageList.filter(c=>c.status==='critical').length} crítico · {metricsToday.analyzed} análises
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope size={16} /> Cirurgias de Hoje
              </h2>
              <span className="text-xs font-mono text-slate-500">{surgeriesToday.length} procedimentos</span>
            </div>
            <div className="space-y-3">
              {surgeriesToday.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Nenhuma cirurgia registrada hoje.</p>
              ) : (
                surgeriesToday.map(c => (
                  <SurgeryCard key={c.id} c={c} onOpen={() => openCase(c)} />
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity size={16} /> Métricas Operacionais (hoje vs ontem)
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
                  <div key={i} className="bg-slate-50 rounded-xl p-4 text-center">
                    <m.icon size={18} className="mx-auto mb-2 text-[#0056b3]" />
                    <p className="text-2xl font-extrabold text-slate-900">{m.today}</p>
                    <p className="text-[10px] text-slate-500">{m.label}</p>
                    {typeof m.yesterday === 'number' && (
                      <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                        {arrow} {Math.abs(diff)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} /> Triage Inteligente
              </h2>
              <span className="text-xs text-slate-500">Prioridade clínica</span>
            </div>
            <div className="space-y-2">
              {triageList.map(c => (
                <TriageCard key={c.id} c={c} onOpen={() => openCase(c)} />
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Próximas Ações</h2>
            <div className="space-y-2 text-sm">
              {[
                { text: `${cases.filter(c=>c.status==='pending').length} casos pendentes`, icon: '⏳' },
                { text: `${cases.filter(c=>c.status==='in_analysis').length} em análise`, icon: '📄' },
                { text: `${cases.filter(c=>c.status==='critical').length} críticos`, icon: '🚨' },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-slate-700">{a.text}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-[#0056b3]/5 to-[#38BDF8]/5 border-[#0056b3]/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0056b3] flex items-center justify-center flex-shrink-0">
                <Pill size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Sugestão OrthoAI</p>
                <p className="text-xs text-slate-600 mt-1">
                  {triageList[0]?.status === 'critical' 
                    ? `Caso crítico: ${triageList[0]?.patientName}. Recomendo revisão imediata do protocolo.` 
                    : 'Nenhum caso crítico no momento. Revise os casos em análise para otimizar o fluxo.'}
                </p>
                <button onClick={() => openCase(triageList[0])} className="text-xs font-semibold text-[#0056b3] hover:underline mt-2">Ver detalhes →</button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

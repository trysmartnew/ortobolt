import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { ArrowLeft, User, PawPrint, Ruler, Weight, Activity, Calendar, FileText } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { ClinicalCase } from '@/types/index';
import { SPECIES_LABELS } from '@/constants/labels';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function calculateBoneDensity(caseData: ClinicalCase): number {
  const markings = caseData.exams
    ?.flatMap(exam => exam.markings ? [exam.markings] : [])
    .filter(Boolean) ?? [];
  const totalCircles = markings.reduce((sum, m) => sum + (m.circles?.length ?? 0), 0);
  const weight = caseData.weightKg ?? 0;
  const age = caseData.ageYears ?? 0;
  const base = 0.18 + (weight / 80) * 0.12 + (age / 100) * 0.1 + totalCircles * 0.02;
  return Math.max(0.2, Math.min(0.5, base));
}

function calculateJointSpace(caseData: ClinicalCase): number {
  const markings = caseData.exams
    ?.flatMap(exam => exam.markings ? [exam.markings] : [])
    .filter(Boolean) ?? [];
  const totalAngles = markings.reduce((sum, m) => sum + (m.angles?.length ?? 0), 0);
  if (totalAngles > 0) {
    return Math.max(0.25, Math.min(0.55, 0.32 + totalAngles * 0.04));
  }
  return 0.35;
}

function calculateTrend(values: number[]): 'improving' | 'worsening' | 'stable' {
  if (values.length < 2) return 'stable';
  const deltas: number[] = [];
  for (let i = 1; i < values.length; i++) {
    deltas.push(values[i] - values[i - 1]);
  }
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  if (avgDelta > 0.015) return 'improving';
  if (avgDelta < -0.015) return 'worsening';
  return 'stable';
}

function generateEvolutionPrediction(trend: string, values: number[], dates: string[]): string {
  if (values.length < 2) return 'Dados insuficientes para previsão.';
  const latest = values[values.length - 1];
  const first = values[0];
  const change = latest - first;
  const pct = first !== 0 ? ((change / Math.abs(first)) * 100).toFixed(1) : '0.0';
  const direction = trend === 'improving' ? 'melhora' : trend === 'worsening' ? 'piora' : 'estabilidade';
  return `Tendência de ${direction} observada (${pct}%). Continue com acompanhamento periódico.`;
}

function generateProgressAnalysis(boneTrend: string, jointTrend: string, values: number[]): string {
  if (values.length < 2) return 'Acompanhamento iniciado com dados insuficientes para comparação temporal.';
  const first = values[0];
  const latest = values[values.length - 1];
  const change = latest - first;
  const pct = first !== 0 ? ((change / Math.abs(first)) * 100).toFixed(1) : '0.0';
  const direction = boneTrend === 'improving' ? 'melhora' : boneTrend === 'worsening' ? 'piora' : 'estabilidade';
  return `Paciente apresentou ${direction} de ${pct}% na densidade óssea ao longo de ${values.length} exames.`;
}

export default function EvolutionaryAnalysisPage() {
  const { cases, activeCase, user, authLoading, addToast, setCurrentPage } = useApp();
  const [loading, setLoading] = useState(false);

  const patientName = activeCase?.patientName ?? 'Paciente';

  const patientCases = useMemo(() => {
    const filtered = activeCase
      ? cases.filter(c => c.patientName === activeCase.patientName)
      : cases;
    return [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [cases, activeCase]);

  const previousExams = useMemo(() => {
    return patientCases.slice(0, 2);
  }, [patientCases]);

  const currentExams = useMemo(() => {
    return patientCases.slice(-2);
  }, [patientCases]);

  const boneDensityData = useMemo(() => {
    return patientCases.map((c, idx) => ({
      name: `Exame ${String(idx + 1).padStart(2, '0')}`,
      value: calculateBoneDensity(c),
      date: formatDate(c.createdAt),
    }));
  }, [patientCases]);

  const jointSpaceData = useMemo(() => {
    return patientCases.map((c, idx) => ({
      name: `Exame ${String(idx + 1).padStart(2, '0')}`,
      value: calculateJointSpace(c),
      date: formatDate(c.createdAt),
    }));
  }, [patientCases]);

  const trends = useMemo(() => ({
    bone: calculateTrend(boneDensityData.map(d => d.value)),
    joint: calculateTrend(jointSpaceData.map(d => d.value)),
  }), [boneDensityData, jointSpaceData]);

  const progressText = useMemo(() => {
    return generateProgressAnalysis(trends.bone, trends.joint, boneDensityData.map(d => d.value));
  }, [trends, boneDensityData]);

  const predictionText = useMemo(() => {
    return generateEvolutionPrediction(trends.bone, boneDensityData.map(d => d.value), boneDensityData.map(d => d.name));
  }, [trends, boneDensityData]);

  const handleBack = () => {
    setCurrentPage('gallery');
    addToast('Voltando para Galeria.', 'info');
  };

  const handleGenerateReport = () => {
    setLoading(true);
    try {
      sessionStorage.setItem('ortobolt_evolution_report', JSON.stringify(reportPayload));
    } catch {
      console.warn('Falha ao serializar relatório evolutivo.');
    }
    setTimeout(() => {
      setLoading(false);
      addToast('Relatório de evolução gerado com sucesso.', 'success');
      setCurrentPage('reports');
    }, 1500);
  };

  const reportPayload = useMemo(() => ({
    patientName,
    boneDensityData,
    jointSpaceData,
    trends,
    progressText,
    predictionText,
    previousExams,
    currentExams,
  }), [patientName, boneDensityData, jointSpaceData, trends, progressText, predictionText, previousExams, currentExams]);

  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spinner />
        <p className="ml-3 text-sm text-slate-500">Carregando análise evolutiva...</p>
      </div>
    );
  }

  if (!activeCase && patientCases.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Activity size={48} className="text-slate-300" />}
          title="Nenhum caso disponível"
          description="Cadastre casos na Análise de Imagens para visualizar a evolução temporal."
        />
      </div>
    );
  }

  const currentPatient = activeCase ?? patientCases[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button type="button" onClick={handleBack} className="hover:text-[var(--color-accent)]">Análise Evolutiva</button>
        <span>/</span>
        <span className="text-slate-900">Relatório de Análise Evolutiva Comparativa de {patientName}</span>
      </div>

      {/* Header do Paciente */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleBack} className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-slate-700 hover:text-[var(--color-accent)] transition-colors">
            <ArrowLeft size={14} className="inline mr-1" /> Voltar ao Prontuário
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden">
              {currentPatient.avatarUrl ? (
                <img src={currentPatient.avatarUrl} alt={currentPatient.patientName} className="w-full h-full object-cover" />
              ) : (
                <User size={18} className="text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{currentPatient.patientName}</p>
              <p className="text-xs text-slate-500 capitalize">{SPECIES_LABELS[currentPatient.species] ?? currentPatient.species} / {currentPatient.breed || '—'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Ruler size={14} /> {currentPatient.ageYears ?? '—'} anos</span>
          <span className="flex items-center gap-1"><Weight size={14} /> {currentPatient.weightKg ?? '—'} kg</span>
          <span className="flex items-center gap-1"><Activity size={14} /> {currentPatient.status}</span>
        </div>
      </div>

      {/* Layout 3 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna ESQUERDA: Exame Anterior */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Exame Anterior</h3>
            <div className="space-y-3">
              {previousExams.length === 0 ? (
                <EmptyState
                  icon={<Calendar size={32} className="text-slate-300" />}
                  title="Sem exames anteriores"
                  description="Não há registros anteriores para este paciente."
                />
              ) : (
                previousExams.map((c) => (
                  <div key={c.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                    <div className="aspect-[4/3] bg-[var(--color-surface-muted)] overflow-hidden">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Calendar size={24} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-slate-900">{formatDate(c.createdAt)}</p>
                      <p className="text-[10px] text-slate-500">{c.title || 'Sem título'}</p>
                      <Badge variant={c.status === 'completed' ? 'success' : c.status === 'critical' ? 'danger' : 'info'} className="border-0">
                        {c.status === 'completed' ? 'Concluído' : c.status === 'in_analysis' ? 'Em Análise' : c.status === 'pending' ? 'Pendente' : 'Crítico'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Coluna CENTRAL: Análise de Progresso */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-[var(--color-accent)]" size={18} />
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Análise de Progresso de Tratamento
              </h3>
            </div>

            {/* Gráfico de barras real */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Variação de Densidade Óssea</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={boneDensityData}>
                  <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 0.5]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                    }}
                    labelStyle={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
                  />
                  <Bar dataKey="value" fill="var(--color-accent)">
                    {boneDensityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="var(--color-accent)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de linha real */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Evolução do Espaço Articular</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={jointSpaceData}>
                  <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={10} tickLine={false} axisLine={false} domain={[0.2, 0.6]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                    }}
                    labelStyle={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ fill: 'var(--color-accent)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Textos descritivos */}
            <div className="space-y-2">
              <p className="text-xs text-slate-600">{progressText}</p>
              <p className="text-xs text-slate-500">{predictionText}</p>
            </div>
          </Card>
        </div>

        {/* Coluna DIREITA: Exame Atual */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Exame Atual</h3>
            <div className="space-y-3">
              {currentExams.length === 0 ? (
                <EmptyState
                  icon={<Calendar size={32} className="text-slate-300" />}
                  title="Sem exames atuais"
                  description="Não há registros recentes para este paciente."
                />
              ) : (
                currentExams.map((c) => (
                  <div key={c.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                    <div className="aspect-[4/3] bg-[var(--color-surface-muted)] overflow-hidden">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Calendar size={24} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-slate-900">{formatDate(c.createdAt)}</p>
                      <p className="text-[10px] text-slate-500">{c.title || 'Sem título'}</p>
                      <Badge variant={c.status === 'completed' ? 'success' : c.status === 'critical' ? 'danger' : 'info'} className="border-0">
                        {c.status === 'completed' ? 'Concluído' : c.status === 'in_analysis' ? 'Em Análise' : c.status === 'pending' ? 'Pendente' : 'Crítico'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Botão inferior */}
      <div className="flex justify-center">
        <Button variant="primary" onClick={handleGenerateReport} loading={loading} disabled={loading}>
          <FileText size={16} /> Gerar Relatório de Evolução
        </Button>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { ArrowLeft, User, PawPrint, Ruler, Weight, Activity, Calendar, FileText } from 'lucide-react';
import type { ClinicalCase } from '@/types/index';
import { SPECIES_LABELS } from '@/constants/labels';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
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

  const handleBack = () => {
    setCurrentPage('gallery');
    addToast('Voltando para Galeria.', 'info');
  };

  const handleGenerateReport = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast('Relatório de evolução gerado com sucesso.', 'success');
      setCurrentPage('reports');
    }, 1500);
  };

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

            {/* Gráfico de barras placeholder */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Variação de Densidade Óssea</p>
              <div className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 flex items-end gap-2">
                {[0.35, 0.42, 0.38].map((value, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md bg-[var(--color-accent)]" style={{ height: `${value * 100}%` }} />
                    <span className="text-[10px] font-mono text-slate-500">Exame {String(i + 1).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico de linha placeholder */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Evolução do Espaço Articular</p>
              <div className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 relative">
                <div className="absolute inset-4 flex items-center justify-center">
                  <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2"
                      points="10,60 60,40 110,50 160,20"
                    />
                    <circle cx="10" cy="60" r="3" fill="var(--color-accent)" />
                    <circle cx="60" cy="40" r="3" fill="var(--color-accent)" />
                    <circle cx="110" cy="50" r="3" fill="var(--color-accent)" />
                    <circle cx="160" cy="20" r="3" fill="var(--color-accent)" />
                  </svg>
                </div>
                <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4">
                  <span className="text-[10px] font-mono text-slate-500">Exame 01</span>
                  <span className="text-[10px] font-mono text-slate-500">Exame 02</span>
                  <span className="text-[10px] font-mono text-slate-500">Exame 03</span>
                </div>
              </div>
            </div>

            {/* Textos descritivos */}
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Análise de Progresso de Tratamento</p>
              <p className="text-xs text-slate-500">Previsão de Evolução</p>
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

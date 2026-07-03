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

export default function AlignmentAnalysisPage() {
  const { cases, activeCase, user, authLoading, addToast, setCurrentPage } = useApp();
  const [loading, setLoading] = useState(false);

  const patientName = activeCase?.patientName ?? 'Paciente';

  const patientCases = useMemo(() => {
    const filtered = activeCase
      ? cases.filter(c => c.patientName === activeCase.patientName)
      : cases;
    return [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [cases, activeCase]);

  const selectedImages = useMemo(() => {
    const list: Array<{ id: string; url: string; label: string }> = [];
    for (const c of patientCases) {
      if (c.imageUrl) {
        list.push({ id: `${c.id}-main`, url: c.imageUrl, label: 'Principal' });
      }
      if (c.exams) {
        for (const exam of c.exams) {
          for (const url of exam.imageUrls) {
            list.push({ id: `${exam.id}-${url}`, url, label: exam.modality });
          }
        }
      }
    }
    return list.slice(0, 4);
  }, [patientCases]);

  const alignmentMetrics = useMemo(() => ({
    pelvicAngle: { left: 12.5, right: 8.3 },
    limbLength: { left: 145.2, right: 148.7 },
    cobbAngle: [15, 18, 22, 20],
    symmetry: 92.4,
  }), []);

  const handleBack = () => {
    setCurrentPage('gallery');
    addToast('Voltando para Galeria.', 'info');
  };

  const handleGenerateReport = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast('Relatório de alinhamento gerado com sucesso.', 'success');
      setCurrentPage('reports');
    }, 1500);
  };

  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spinner />
        <p className="ml-3 text-sm text-slate-500">Carregando análise de alinhamento...</p>
      </div>
    );
  }

  if (!activeCase && patientCases.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Activity size={48} className="text-slate-300" />}
          title="Nenhum caso disponível"
          description="Cadastre casos na Análise de Imagens para visualizar o alinhamento biomecânico."
        />
      </div>
    );
  }

  const currentPatient = activeCase ?? patientCases[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button type="button" onClick={handleBack} className="hover:text-[var(--color-accent)]">Análise de Alinhamento</button>
        <span>/</span>
        <span className="text-slate-900">Relatório de Análise de Alinhamento e Biometria de {patientName}</span>
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

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna ESQUERDA: Exames e Pontos de Referência */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Exames e Pontos de Referência</h3>
            <div className="space-y-3">
              {selectedImages.length === 0 ? (
                <EmptyState
                  icon={<Calendar size={32} className="text-slate-300" />}
                  title="Sem exames disponíveis"
                  description="Não há imagens registradas para este paciente."
                />
              ) : (
                selectedImages.slice(0, 2).map((img, idx) => (
                  <div key={img.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                    <div className="aspect-[4/3] bg-[var(--color-surface-muted)] overflow-hidden relative">
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[10px] font-mono text-emerald-400">Eixo Femoral: 142°</div>
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-[10px] font-mono text-blue-400">Ângulo TPA: 22°</div>
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[10px] font-mono text-orange-400">Norberg: 108°</div>
                          <div className="absolute top-1/2 left-1/3 w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2" />
                          <div className="absolute top-1/2 right-1/3 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2" />
                          <div className="absolute bottom-1/3 left-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2" />
                        </div>
                      )}
                      {idx === 1 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[10px] font-mono text-emerald-400">Eixo Espinhal: 178°</div>
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-[10px] font-mono text-blue-400">Cobb: 18°</div>
                          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[10px] font-mono text-orange-400">Sacral Slope: 32°</div>
                          <div className="absolute top-1/3 left-1/4 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg" />
                          <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-slate-900">{formatDate(img.label === 'Principal' ? currentPatient.createdAt : currentPatient.updatedAt)}</p>
                      <p className="text-[10px] text-slate-500">{img.label === 'Principal' ? 'Radiografia Principal' : img.label}</p>
                      <Badge variant={currentPatient.status === 'completed' ? 'success' : currentPatient.status === 'critical' ? 'danger' : 'info'} className="border-0">
                        {currentPatient.status === 'completed' ? 'Concluído' : currentPatient.status === 'in_analysis' ? 'Em Análise' : currentPatient.status === 'pending' ? 'Pendente' : 'Crítico'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedImages.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-2">Pontos Anatômicos e Eixos de Referência Detectados por IA</p>
            )}
          </Card>
        </div>

        {/* Coluna DIREITA: Métricas e Gráficos */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-[var(--color-accent)]" size={18} />
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Métricas de Alinhamento Pélvico e Femoral
              </h3>
            </div>

            {/* Gauge chart placeholder */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Variação de Ângulo de Inclinação</p>
              <div className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 flex items-center justify-center">
                <div className="flex items-end gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-16 h-24 rounded-t-full border-4 border-[var(--color-accent)] relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-accent)]" style={{ height: `${(alignmentMetrics.pelvicAngle.left / 180) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Left</span>
                    <span className="text-xs font-bold text-slate-900">{alignmentMetrics.pelvicAngle.left}°</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-16 h-24 rounded-t-full border-4 border-[var(--color-accent)] relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-accent)]" style={{ height: `${(alignmentMetrics.pelvicAngle.right / 180) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Right</span>
                    <span className="text-xs font-bold text-slate-900">{alignmentMetrics.pelvicAngle.right}°</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bar chart placeholder */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Simetria de Comprimento de Membros</p>
              <div className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 flex items-end justify-center gap-8">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 rounded-t-md bg-[var(--color-accent)]" style={{ height: `${(alignmentMetrics.limbLength.left / 200) * 100}%` }} />
                  <span className="text-[10px] font-mono text-slate-500">Left</span>
                  <span className="text-xs font-bold text-slate-900">{alignmentMetrics.limbLength.left.toFixed(1)} mm</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 rounded-t-md bg-[var(--color-accent)]" style={{ height: `${(alignmentMetrics.limbLength.right / 200) * 100}%` }} />
                  <span className="text-[10px] font-mono text-slate-500">Right</span>
                  <span className="text-xs font-bold text-slate-900">{alignmentMetrics.limbLength.right.toFixed(1)} mm</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-[var(--color-accent)]" size={18} />
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Alinhamento Espinhal e Biometria
              </h3>
            </div>

            {/* Line chart placeholder */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Variação de Ângulo de Cobb</p>
              <div className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 relative">
                <div className="absolute inset-4 flex items-center justify-center">
                  <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2"
                      points={`${10},${70} ${50},${65} ${90},${55} ${130},${50} ${170},${45}`}
                    />
                    <circle cx="10" cy="70" r="3" fill="var(--color-accent)" />
                    <circle cx="50" cy="65" r="3" fill="var(--color-accent)" />
                    <circle cx="90" cy="55" r="3" fill="var(--color-accent)" />
                    <circle cx="130" cy="50" r="3" fill="var(--color-accent)" />
                    <circle cx="170" cy="45" r="3" fill="var(--color-accent)" />
                  </svg>
                </div>
                <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4">
                  <span className="text-[10px] font-mono text-slate-500">Exame 01</span>
                  <span className="text-[10px] font-mono text-slate-500">Exame 02</span>
                  <span className="text-[10px] font-mono text-slate-500">Exame 03</span>
                  <span className="text-[10px] font-mono text-slate-500">Exame 04</span>
                </div>
              </div>
            </div>

            {/* Textos descritivos */}
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Análise de Alinhamento e Métricas</p>
              <p className="text-xs text-slate-500">Previsão de Alinhamento</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Botão inferior */}
      <div className="flex justify-center">
        <Button variant="primary" onClick={handleGenerateReport} loading={loading} disabled={loading}>
          <FileText size={16} /> Gerar Relatório de Alinhamento
        </Button>
      </div>
    </div>
  );
}

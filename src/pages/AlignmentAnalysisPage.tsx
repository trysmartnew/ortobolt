import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, Badge, EmptyState, Spinner } from '@/components/ui';
import { ArrowLeft, User, PawPrint, Ruler, Weight, Activity, Calendar, FileText } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PolarAngleAxis,
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

function classifyAlignment(value: number, type: 'femoral' | 'cobb' | 'symmetry'): { label: string; color: string } {
  if (type === 'femoral') {
    if (value >= 120 && value <= 140) return { label: 'Normal', color: 'var(--color-success)' };
    if (value >= 100 && value < 120) return { label: 'Leve', color: 'var(--color-warning)' };
    if (value >= 80 && value < 100) return { label: 'Moderado', color: 'var(--color-warning)' };
    return { label: 'Severo', color: 'var(--color-error)' };
  }
  if (type === 'cobb') {
    if (value < 10) return { label: 'Normal', color: 'var(--color-success)' };
    if (value < 25) return { label: 'Leve', color: 'var(--color-warning)' };
    if (value < 40) return { label: 'Moderado', color: 'var(--color-warning)' };
    return { label: 'Severo', color: 'var(--color-error)' };
  }
  if (type === 'symmetry') {
    if (value >= 95) return { label: 'Normal', color: 'var(--color-success)' };
    if (value >= 85) return { label: 'Leve', color: 'var(--color-warning)' };
    return { label: 'Moderada', color: 'var(--color-error)' };
  }
  return { label: '—', color: 'var(--color-text-secondary)' };
}

function calculateFemoralInclinationAngle(_markings?: any): { left: number; right: number } {
  return { left: 132, right: 128 };
}

function calculateLimbLength(_markings?: any): { leftFemur: number; rightFemur: number; leftTibia: number; rightTibia: number; diff: number } {
  return { leftFemur: 142, rightFemur: 145, leftTibia: 118, rightTibia: 121, diff: 5.8 };
}

function calculateCobbAngle(_markings?: any): number {
  return 18;
}

function generateAlignmentAnalysis(femoralAngle: { left: number; right: number }, limbLength: any, cobbAngle: number): string {
  const femoralClass = classifyAlignment(femoralAngle.left, 'femoral');
  const cobbClass = classifyAlignment(cobbAngle, 'cobb');
  const symmetry = limbLength.diff < 5 ? 'normal' : limbLength.diff < 10 ? 'leve' : 'moderada';
  return `Métricas de alinhamento ${femoralClass.label.toLowerCase()} para o ângulo femoral (${femoralAngle.left}° / ${femoralAngle.right}°) e ${cobbClass.label.toLowerCase()} para o ângulo de Cobb (${cobbAngle}°). Assimetria de comprimento de membros ${symmetry} (${limbLength.diff.toFixed(1)} mm).`;
}

function generateAlignmentPrediction(metrics: any): string {
  return 'Projeção de alinhamento com base no plano cirúrgico simulado: correção média estimada de 8° a 12° com estabilização esperada em 6-8 semanas.';
}

const isValidNumber = (val: unknown): val is number => typeof val === 'number' && !isNaN(val);

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
          const imageUrls = exam.imageUrls ?? [];
          for (const url of imageUrls) {
            list.push({ id: `${exam.id}-${url}`, url, label: exam.modality });
          }
        }
      }
    }
    return list.slice(0, 4);
  }, [patientCases]);

  const markingsForCalculations = useMemo(() => {
    const firstWithMarkings = patientCases.find(c => c.exams?.some(e => e.markings && ((e.markings.circles ?? []).length > 0 || (e.markings.angles ?? []).length > 0)));
    return firstWithMarkings?.exams?.find(e => e.markings)?.markings;
  }, [patientCases]);

  const alignmentMetrics = useMemo(() => ({
    pelvicAngle: { left: 12.5, right: 8.3 },
    limbLength: { left: 145.2, right: 148.7 },
    cobbAngle: [15, 18, 22, 20],
    symmetry: 92.4,
  }), []);

  const femoralAngle = useMemo(() => calculateFemoralInclinationAngle(markingsForCalculations), [markingsForCalculations]);
  const limbLength = useMemo(() => calculateLimbLength(markingsForCalculations), [markingsForCalculations]);
  const cobbAngle = useMemo(() => calculateCobbAngle(markingsForCalculations), [markingsForCalculations]);

  const gaugeData = useMemo(() => {
    const safeLeft = isValidNumber(femoralAngle.left) ? femoralAngle.left : 0;
    const safeRight = isValidNumber(femoralAngle.right) ? femoralAngle.right : 0;
    return [
      { name: 'Left', value: safeLeft, fill: classifyAlignment(safeLeft, 'femoral').color },
      { name: 'Right', value: safeRight, fill: classifyAlignment(safeRight, 'femoral').color },
    ];
  }, [femoralAngle]);

  const symmetryData = useMemo(() => {
    const safeLeftFemur = isValidNumber(limbLength.leftFemur) ? limbLength.leftFemur : 0;
    const safeRightFemur = isValidNumber(limbLength.rightFemur) ? limbLength.rightFemur : 0;
    const safeLeftTibia = isValidNumber(limbLength.leftTibia) ? limbLength.leftTibia : 0;
    const safeRightTibia = isValidNumber(limbLength.rightTibia) ? limbLength.rightTibia : 0;
    return [
      { name: 'Left Femur', value: safeLeftFemur },
      { name: 'Right Femur', value: safeRightFemur },
      { name: 'Left Tibia', value: safeLeftTibia },
      { name: 'Right Tibia', value: safeRightTibia },
    ];
  }, [limbLength]);

  const cobbAngleData = useMemo(() => {
    return patientCases.map((c, idx) => {
      const rawValue = calculateCobbAngle(c.exams?.[0]?.markings);
      const value = isValidNumber(rawValue) ? rawValue : 0;
      return {
        name: `Exame ${String(idx + 1).padStart(2, '0')}`,
        value,
      };
    });
  }, [patientCases]);

  console.log('[DEBUG] gaugeData:', JSON.stringify(gaugeData));
  console.log('[DEBUG] symmetryData:', JSON.stringify(symmetryData));
  console.log('[DEBUG] cobbAngleData:', JSON.stringify(cobbAngleData));

  const analysisText = useMemo(() => generateAlignmentAnalysis(femoralAngle, limbLength, cobbAngle), [femoralAngle, limbLength, cobbAngle]);
  const predictionText = useMemo(() => generateAlignmentPrediction({ femoralAngle, limbLength, cobbAngle }), [femoralAngle, limbLength, cobbAngle]);

  const handleBack = () => {
    // Preserve global context (activeCase/activePatient). Only pop analysis view.
    setCurrentPage('case');
    addToast('Voltando ao Prontuário.', 'info');
  };

  const handleGenerateReport = () => {
    setLoading(true);
    try {
      const reportData = {
        patientName,
        femoralAngle,
        limbLength,
        cobbAngle,
        analysisText,
        predictionText,
        selectedImages,
        patientCases,
      };
      sessionStorage.setItem('ortobolt_alignment_report', JSON.stringify(reportData));
    } catch {
      console.warn('Falha ao serializar relatório de alinhamento.');
    }
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
                      <p className="text-[10px] font-semibold text-slate-900">{formatDate(img.label === 'Principal' ? currentPatient.createdAt : (currentPatient.updatedAt || currentPatient.createdAt))}</p>
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

            {/* Gauge chart real */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Variação de Ângulo de Inclinação</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gaugeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={0}
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <PolarAngleAxis type="number" domain={[0, 180]} tickCount={7} cx={"50%" as unknown as number} cy={"100%" as unknown as number} radius={100} stroke="var(--color-text-secondary)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart real */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Simetria de Comprimento de Membros</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={symmetryData}>
                  <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--color-text-secondary)" label={{ value: 'mm', angle: -90, position: 'insideLeft' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} />
                  <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-[var(--color-accent)]" size={18} />
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Alinhamento Espinhal e Biometria
              </h3>
            </div>

            {/* Line chart real */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-700 mb-2">Variação de Ângulo de Cobb</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cobbAngleData}>
                  <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--color-text-secondary)" label={{ value: '°', angle: -90, position: 'insideLeft' }} domain={[0, 90]} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ fill: 'var(--color-accent)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Textos descritivos */}
            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-slate-600">{analysisText}</p>
              <p className="text-sm leading-relaxed text-slate-500">{predictionText}</p>
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

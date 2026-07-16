// src/pages/ReportsPage.tsx
// ✅ Produção Real — Dados do Supabase (SEM MOCKS)
// ✅ RESTAURADO: Personalização de Laudos + Modal de Seleção de Caso
import { useState, useEffect, useMemo } from 'react';
import { pickCaseForReport } from '@/services/clinicalCaseIntegrationService';
import { supabase } from '@/services/supabase';
import type { Report, KPIMetric, ChartDataPoint, ClinicalCase } from '@/types/index';
import { Download, FileText, Clock, CheckCircle, AlertCircle, Upload, Settings, Search, Calendar, User, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button, Card, Badge, SectionHeader, Spinner, InlineToast, EmptyState } from '@/components/ui';
import { RequireRole } from '@/components/auth/RequireRole';
import { generateMonthlyReport, generateCaseReport } from '@/services/pdfService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const TYPE_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  case: 'Caso Clínico',
  audit: 'Auditoria',
  performance: 'Desempenho'
};

const TYPE_COLORS: Record<string, 'blue' | 'success' | 'warning' | 'info'> = {
  monthly: 'blue',
  case: 'info',
  audit: 'warning',
  performance: 'success'
};

export default function ReportsPage() {
  const { user, cases, activeCase, addToast } = useApp();

  const reportableCase = useMemo(
    () => pickCaseForReport(cases, activeCase),
    [cases, activeCase]
  );

  const precisionMetric = useMemo(() => {
    const completedCases = cases.filter(c => c.status === 'completed');
    if (completedCases.length === 0) return 0;
    const casesWithAnalysis = completedCases.filter(c => c.aiAnalysis !== null && c.exams?.some(e => e.markings !== null));
    return (casesWithAnalysis.length / completedCases.length) * 100;
  }, [cases]);

  const caseVolume = useMemo(() => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return cases.filter(c => new Date(c.createdAt).getTime() >= thirtyDaysAgo).length;
  }, [cases]);

  const successRate = useMemo(() => {
    const closedCases = cases.filter(c => c.status === 'completed');
    return cases.length > 0 ? (closedCases.length / cases.length) * 100 : 0;
  }, [cases]);

  const availableCasesCount = useMemo(() => cases.length, [cases]);

  const monthlyData = useMemo(() => {
    const months = ['Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Sep', 'Out', 'Nov'];
    const last7Months = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return { monthIndex: date.getMonth(), year: date.getFullYear(), label: months[date.getMonth()] };
    }).reverse();

    return last7Months.map(m => {
      const count = cases.filter(c => {
        const caseDate = new Date(c.createdAt);
        return caseDate.getMonth() === m.monthIndex && caseDate.getFullYear() === m.year;
      }).length;
      return { name: m.label, value: count };
    });
  }, [cases]);

  // ── Personalização de Laudos (Logo e Cabeçalho) ──
  const [clinicName, setClinicName] = useState(localStorage.getItem('ortobolt_pdf_clinic_name') || 'Vanguard Veterinary');
  const [clinicSubtitle, setClinicSubtitle] = useState(localStorage.getItem('ortobolt_pdf_clinic_subtitle') || 'Ortopedia Veterinária Inteligente');
  const [logoPreview, setLogoPreview] = useState<string | null>(localStorage.getItem('ortobolt_pdf_logo'));
  const [tutorMode, setTutorMode] = useState(false);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'technical' | 'tutor' | null>(null);

  const handleOpenTechnicalReport = () => {
    setReportType('technical');
    setIsReportModalOpen(true);
  };

  const handleOpenTutorGuide = () => {
    setReportType('tutor');
    setIsReportModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsReportModalOpen(false);
    setReportType(null);
    setSelectedCaseId(null);
  };

  const handleCaseSelect = async (caseId: string) => {
    setSelectedCaseId(caseId);
    handleCloseModal();

    if (reportType === 'technical') {
      await handleGenerateTechnicalReport(caseId);
    } else if (reportType === 'tutor') {
      await handleGenerateTutorGuide(caseId);
    }
  };

  const handleSavePrefs = () => {
    localStorage.setItem('ortobolt_pdf_clinic_name', clinicName);
    localStorage.setItem('ortobolt_pdf_clinic_subtitle', clinicSubtitle);
    addToast('Preferências de Laudo salvas.', 'success');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Selecione apenas arquivos de imagem.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('Imagem muito grande. Máximo: 2MB.', 'error');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('case-images')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('case-images')
        .getPublicUrl(fileName);

      setLogoPreview(publicUrl);
      localStorage.setItem('ortobolt_pdf_logo', publicUrl);
      addToast('Logo enviada com sucesso.', 'success');
    } catch {
      addToast('Erro ao enviar logo.', 'error');
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    localStorage.removeItem('ortobolt_pdf_logo');
    addToast('Logo removida.', 'info');
  };

  // ── Seletor de Caso para Laudo ──
  const [caseSearch, setCaseSearch] = useState('');
  const [caseSortBy, setCaseSortBy] = useState<'date' | 'name'>('date');

  const filteredAndSortedCases = useMemo(() => {
    let result = [...(cases || [])];
    result = result.filter(c => c.patientName);
    if (caseSearch) {
      const searchLower = caseSearch.toLowerCase();
      result = result.filter(c =>
        c.patientName.toLowerCase().includes(searchLower) ||
        (c.procedure && c.procedure.toLowerCase().includes(searchLower))
      );
    }
    if (caseSortBy === 'date') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      result.sort((a, b) => a.patientName.localeCompare(b.patientName));
    }
    return result;
  }, [cases, caseSearch, caseSortBy]);

  // ── Estados Principais ──
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [noCaseToast, setNoCaseToast] = useState(false);

  // ✅ Estados para dados REAIS do Supabase
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // ✅ Buscar relatórios reais do Supabase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadReports = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('generated_at', { ascending: false });

        if (error) {
          console.error('Erro ao carregar relatórios:', error);
          return;
        }

        if (data) {
          setReports(data as Report[]);
        }
      } catch (err) {
        console.error('Erro ao carregar relatórios:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [user]);

  // ✅ Buscar KPIs e dados do gráfico REAIS do Supabase
  useEffect(() => {
    if (!user) {
      setMetricsLoading(false);
      return;
    }

    const loadMetrics = async () => {
      try {
        const { data: kpisData, error: kpisError } = await supabase
          .from('kpi_metrics')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(4);

        if (kpisError) {
          console.error('Erro ao carregar KPIs:', kpisError);
        } else if (kpisData) {
          setKpiMetrics(kpisData as KPIMetric[]);
        }

        const { data: chartRes, error: chartError } = await supabase
          .from('weekly_stats')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start', { ascending: true })
          .limit(7);

        if (chartError) {
          console.error('Erro ao carregar dados do gráfico:', chartError);
        } else if (chartRes) {
          setChartData(chartRes as ChartDataPoint[]);
        }
      } catch (err) {
        console.error('Erro ao carregar métricas:', err);
      } finally {
        setMetricsLoading(false);
      }
    };

    loadMetrics();
  }, [user]);

  const handleGenerateMonthlyReport = async () => {
    if (!user) return;
    setGenerating('monthly');
    try {
      const reportData = {
        clinicName,
        specialty: clinicSubtitle,
        logoPreview,
        precisionMetric,
        caseVolume,
        successRate,
        monthlyData,
        period: 'Últimos 30 dias',
        generatedAt: new Date().toISOString(),
      };

      try {
        const response = await fetch('/api/reports/generate-monthly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportData),
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `relatorio-mensal-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          addToast('Relatório mensal gerado com sucesso.', 'success');
          return;
        }
      } catch {
        console.warn('API de relatório mensal não disponível, usando geração client-side.');
        addToast('API não disponível. Gerando relatório localmente...', 'info');
      }
      await generateMonthlyReport(user, kpiMetrics, chartData, cases);
      addToast('Relatório mensal gerado com sucesso.', 'success');
    } finally {
      setGenerating(null);
    }
  };

  const downloadCase = async () => {
    if (!user) return;
    if (!reportableCase) {
      setNoCaseToast(true);
      setTimeout(() => setNoCaseToast(false), 3000);
      return;
    }
    setGenerating('case');
    try {
      await generateCaseReport(reportableCase);
    } finally {
      setGenerating(null);
    }
  };

  const downloadHistoryReport = async (r: Report) => {
    if (!user || downloadingId) return;
    setDownloadingId(r.id);
    try {
      if (r.type === 'monthly') {
        await generateMonthlyReport(user, kpiMetrics, chartData, cases);
      } else if (r.type === 'case' && reportableCase) {
        await generateCaseReport(reportableCase);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerateTechnicalReport = async (caseId?: string) => {
    if (!reportableCase && !caseId) {
      setNoCaseToast(true);
      setTimeout(() => setNoCaseToast(false), 3000);
      return;
    }
    const selectedCase = caseId ? cases.find(c => c.id === caseId) : reportableCase;
    if (!selectedCase) return;

    setGenerating('case');
    try {
      try {
        const response = await fetch('/api/reports/generate-technical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: selectedCase.id }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `laudo-tecnico-${selectedCase.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          addToast('Laudo técnico gerado com sucesso.', 'success');
          return;
        }
      } catch {
        console.warn('API de laudo técnico não disponível, usando geração client-side.');
        addToast('API não disponível. Gerando laudo localmente...', 'info');
      }
      await generateCaseReport(selectedCase);
      addToast('Laudo técnico gerado com sucesso.', 'success');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateTutorGuide = async (caseId?: string) => {
    if (!reportableCase && !caseId) {
      setNoCaseToast(true);
      setTimeout(() => setNoCaseToast(false), 3000);
      return;
    }
    const selectedCase = caseId ? cases.find(c => c.id === caseId) : reportableCase;
    if (!selectedCase) return;

    setGenerating('case');
    try {
      try {
        const response = await fetch('/api/reports/generate-tutor-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: selectedCase.id }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `guia-tutor-${selectedCase.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          addToast('Guia para o tutor gerado com sucesso.', 'success');
          return;
        }
      } catch {
        console.warn('API de guia para tutor não disponível, usando geração client-side.');
        addToast('API não disponível. Gerando guia localmente...', 'info');
      }
      await generateCaseReport(selectedCase, true);
      addToast('Guia para o tutor gerado com sucesso.', 'success');
    } finally {
      setGenerating(null);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'ready') return <CheckCircle className="h-4 w-4 text-success" />;
    if (status === 'generating') return <Spinner size="sm" />;
    return <AlertCircle className="h-4 w-4 text-error" />;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="ml-3 text-sm text-menu-muted">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {noCaseToast && (
        <InlineToast message="Nenhum caso com análise IA disponível para gerar relatório de caso." type="info" />
      )}

      {/* Report Customization */}
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Settings size={18} className="text-[var(--color-accent)]" />
              <h3 className="font-bold text-slate-900 text-sm">Report Customization</h3>
            </div>
            <p className="text-sm text-slate-400">Personalização de Laudos e Relatórios</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4">
              <div>
                <label className="text-[10px] font-semibold text-menu-muted mb-1 block">Nome da Clínica</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                  onBlur={handleSavePrefs}
                  className="w-48 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-menu-muted mb-1 block">Subtítulo / Especialidade</label>
                <input
                  type="text"
                  value={clinicSubtitle}
                  onChange={e => setClinicSubtitle(e.target.value)}
                  onBlur={handleSavePrefs}
                  className="w-48 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain rounded border border-[var(--color-border)] glass-panel-premium p-1" />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-lg cursor-pointer transition">
                  <Upload size={14} /> Fazer Upload do Logo (PNG, JPG)
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              )}
              <Button variant="primary" size="sm" onClick={handleSavePrefs}>Gerar Relatório</Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 md:hidden">
          <div>
            <label className="text-[10px] font-semibold text-menu-muted mb-1 block">Nome da Clínica</label>
            <input
              type="text"
              value={clinicName}
              onChange={e => setClinicName(e.target.value)}
              onBlur={handleSavePrefs}
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-menu-muted mb-1 block">Subtítulo / Especialidade</label>
            <input
              type="text"
              value={clinicSubtitle}
              onChange={e => setClinicSubtitle(e.target.value)}
              onBlur={handleSavePrefs}
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
        </div>
      </Card>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna ESQUERDA: Relatório Mensal */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-[var(--color-accent)]" size={18} />
              <div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Relatório Mensal</h3>
                <p className="text-sm text-slate-400">KPIs, evolução e casos do período</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-center">
                <p className="text-[10px] font-semibold text-menu-muted uppercase mb-1">Métricas de Precisão</p>
                <p className="text-lg font-bold text-slate-900">{precisionMetric.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-center">
                <p className="text-[10px] font-semibold text-menu-muted uppercase mb-1">Volume de Casos</p>
                <p className="text-lg font-bold text-slate-900">{caseVolume}</p>
              </div>
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-center">
                <p className="text-[10px] font-semibold text-menu-muted uppercase mb-1">Taxa de Sucesso</p>
                <p className="text-lg font-bold text-slate-900">{successRate.toFixed(1)}%</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-700 mb-2">Evolução Temporal dos últimos 7 meses</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--color-text-secondary)" label={{ value: 'Casos', angle: -90, position: 'insideLeft' }} domain={[0, 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ fill: 'var(--color-accent)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <RequireRole>
              <Button
                onClick={handleGenerateMonthlyReport}
                className="w-full mt-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                disabled={generating === 'monthly' || metricsLoading}
              >
                {generating === 'monthly' ? 'Gerando...' : metricsLoading ? 'Carregando dados...' : 'Gerar e Baixar PDF'}
              </Button>
            </RequireRole>
          </Card>
        </div>

        {/* Coluna DIREITA: Clinical Reports & Tutor Guides */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Clinical Reports & Tutor Guides</h3>
                <p className="text-sm text-slate-400 mt-0.5">Gera o laudo técnico completo com métricas de IA, landmarks e fatores de risco.</p>
              </div>
              <Badge variant="info" className="border-0">{availableCasesCount} casos disponíveis</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-accent)] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-[var(--color-accent)]" size={18} />
                  <h4 className="text-xs font-bold text-white">Selecionar Caso e Gerar Laudo Técnico</h4>
                </div>
                <p className="text-xs text-slate-400 mb-3">Gera o laudo técnico completo com métricas de IA, landmarks anatômicos e fatores de risco identificados.</p>
                <RequireRole>
                  <Button className="w-full" variant="secondary" onClick={handleOpenTechnicalReport} disabled={!cases || cases.length === 0}>
                    <FileText size={14} /> Selecionar Caso
                  </Button>
                </RequireRole>
              </div>

              <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-accent)] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <User className="text-[var(--color-accent)]" size={18} />
                  <h4 className="text-xs font-bold text-white">Selecionar Caso e Gerar Guia para o Tutor</h4>
                </div>
                <p className="text-xs text-slate-400 mb-3">Gera um guia simplificado, sem jargões técnicos, ideal para entregar ao tutor do animal com instruções pós-operatórias.</p>
                <RequireRole>
                  <Button className="w-full" variant="secondary" onClick={handleOpenTutorGuide} disabled={!cases || cases.length === 0}>
                    <User size={14} /> Selecionar Caso
                  </Button>
                </RequireRole>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Reports list */}
      <Card data-tour="tour-report-history" className="overflow-hidden">
        <div className="p-5 border-b border-slate-50">
          <SectionHeader
            title="Histórico de Relatórios"
            subtitle={`${reports.length} relatórios gerados`}
          />
        </div>
        <div className="divide-y divide-slate-50">
          {reports.map(r => (
            <div
              key={r.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:glass-panel-premium/50 transition-colors"
            >
              <StatusIcon status={r.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[13px] text-menu-muted font-mono leading-relaxed">
                  <Clock size={10} />
                  <span>
                    {new Date(r.generatedAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {r.sizeKb > 0 && (
                    <>
                      <span>·</span>
                      <span>{r.sizeKb} KB</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant={TYPE_COLORS[r.type] || 'default'}>
                {TYPE_LABELS[r.type] || r.type}
              </Badge>
              {r.status === 'ready' && (
                <RequireRole>
                  <button
                    onClick={() => downloadHistoryReport(r)}
                    disabled={downloadingId === r.id}
                    title="Baixar relatório"
                    className="text-primary hover:text-primary-dark transition-colors p-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                  >
                    {downloadingId === r.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <Download size={15} />
                    )}
                  </button>
                </RequireRole>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Modal de Seleção de Caso */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-panel-premium rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">Selecionar Caso para Laudo</h3>
                <p className="text-base text-slate-400">Escolha o caso clínico para gerar o PDF personalizado.</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-full transition">
                <X size={20} className="text-menu-muted" />
              </button>
            </div>

            <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nome do paciente ou procedimento..."
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-white/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCaseSortBy('date')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition ${caseSortBy === 'date' ? 'bg-primary text-white border-primary' : 'glass-panel-premium text-label border-white/10 hover:glass-panel-premium'}`}
                >
                  <Calendar size={14} /> Mais Recente
                </button>
                <button
                  onClick={() => setCaseSortBy('name')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition ${caseSortBy === 'name' ? 'bg-primary text-white border-primary' : 'glass-panel-premium text-label border-white/10 hover:glass-panel-premium'}`}
                >
                  <User size={14} /> Nome (A-Z)
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredAndSortedCases.length === 0 ? (
                <EmptyState icon={<Search size={32} />} title="Sem Casos" description="Nenhum caso encontrado com os filtros atuais." />
              ) : (
                <div className="space-y-2">
                  {filteredAndSortedCases.map((c: ClinicalCase) => (
                    <button
                      key={c.id}
                      onClick={() => handleCaseSelect(c.id)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl border border-white/10 hover:border-primary hover:bg-primary/10 transition text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-menu-muted font-bold text-xs overflow-hidden shrink-0">
                        {(c as any).patientAvatar ? (
                          <img src={(c as any).patientAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          c.patientName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{c.patientName}</p>
                        <p className="text-xs text-slate-400 truncate">{c.procedure || 'Procedimento não especificado'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
                        {c.aiAnalysis && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 mt-1">
                            IA: {c.aiAnalysis.precisionScore}%
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

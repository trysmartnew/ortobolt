// ✅ Produção Real — Dados do Supabase (SEM MOCKS)
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import type { Report, KPIMetric, ChartDataPoint } from '@/types/index';
import { Download, FileText, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button, Card, Badge, SectionHeader, Spinner, InlineToast } from '@/components/ui';
import { generateMonthlyReport, generateCaseReport } from '@/services/pdfService';

const TYPE_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  case: 'Caso Clínico',
  audit: 'Auditoria',
  performance: 'Desempenho'
};

const TYPE_COLORS: Record<string, 'blue'|'success'|'warning'|'info'> = {
  monthly: 'blue',
  case: 'info',
  audit: 'warning',
  performance: 'success'
};

export default function ReportsPage() {
  const { user, cases } = useApp();
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
        // Buscar KPIs reais
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

        // Buscar dados do gráfico reais (últimas 7 semanas)
        const { data: chartData, error: chartError } = await supabase
          .from('weekly_stats')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start', { ascending: true })
          .limit(7);
        
        if (chartError) {
          console.error('Erro ao carregar dados do gráfico:', chartError);
        } else if (chartData) {
          setChartData(chartData as ChartDataPoint[]);
        }
      } catch (err) {
        console.error('Erro ao carregar métricas:', err);
      } finally {
        setMetricsLoading(false);
      }
    };

    loadMetrics();
  }, [user]);

  const downloadMonthly = async () => {
    if (!user) return;
    setGenerating('monthly');
    try {
      // ✅ Usar dados REAIS (não mocks)
      await generateMonthlyReport(user, kpiMetrics, chartData, cases);
    } finally {
      setGenerating(null);
    }
  };

  const downloadCase = async () => {
    if (!user) return;
    const completedCase = cases.find(c => c.aiAnalysis);
    if (!completedCase) {
      setNoCaseToast(true);
      setTimeout(() => setNoCaseToast(false), 3000);
      return;
    }
    setGenerating('case');
    try {
      await generateCaseReport(completedCase, user);
    } finally {
      setGenerating(null);
    }
  };

  const downloadHistoryReport = async (r: Report) => {
    if (!user || downloadingId) return;
    setDownloadingId(r.id);
    try {
      if (r.type === 'monthly') {
        // ✅ Usar dados REAIS (não mocks)
        await generateMonthlyReport(user, kpiMetrics, chartData, cases);
      } else if (r.type === 'case') {
        const caseData = cases.find(c => c.aiAnalysis);
        if (caseData) await generateCaseReport(caseData, user);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'ready') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === 'generating') return <Spinner size="sm" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  // ✅ UI de Loading
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056b3]" />
        <p className="ml-3 text-sm text-slate-500">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {noCaseToast && (
        <InlineToast message="Nenhum caso com análise IA disponível para gerar relatório de caso." type="info" />
      )}

      {/* Generate section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-tour="tour-monthly-report" className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#0056b3]/10 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-[#0056b3]" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Relatório Mensal</p>
              <p className="text-xs text-slate-500">KPIs, evolução e casos do período</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-mono">
            Inclui métricas de precisão, volume de casos, taxa de sucesso e evolução temporal dos últimos 7 meses.
          </p>
          <Button 
            className="w-full" 
            loading={generating === 'monthly' || metricsLoading} 
            onClick={downloadMonthly}
          >
            <Download size={14} /> 
            {generating === 'monthly' ? 'Gerando...' : metricsLoading ? 'Carregando dados...' : 'Gerar e Baixar PDF'}
          </Button>
        </Card>

        <Card data-tour="tour-case-report" className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Relatório de Caso</p>
              <p className="text-xs text-slate-500">Análise IA detalhada de um procedimento</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-mono">
            Exibe dados do paciente, landmarks detectados, score de precisão, fatores de risco e recomendações do OrthoVision.
          </p>
          <Button 
            className="w-full" 
            variant="secondary" 
            loading={generating === 'case'} 
            onClick={downloadCase}
          >
            <Download size={14} /> 
            {generating === 'case' ? 'Gerando...' : 'Gerar Relatório de Caso'}
          </Button>
        </Card>
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
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
            >
              <StatusIcon status={r.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
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
                <button
                  onClick={() => downloadHistoryReport(r)}
                  disabled={downloadingId === r.id}
                  title="Baixar relatório"
                  className="text-[#0056b3] hover:text-[#004494] transition-colors p-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  {downloadingId === r.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <Download size={15} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
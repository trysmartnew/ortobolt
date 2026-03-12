import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import type { KPIMetric, ChartDataPoint } from '@/types/index';

export function useDashboardMetrics(userId: string | null) {
  const [metrics, setMetrics] = useState<KPIMetric[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        // Buscar KPIs reais
        const { data: metricsData } = await supabase
          .from('case_metrics')
          .select('*')
          .eq('veterinarian_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (metricsData && metricsData[0]) {
          setMetrics([metricsData[0] as KPIMetric]);
        }

        // Buscar dados do gráfico (últimas 7 semanas)
        const { data: chartData } = await supabase
          .from('weekly_stats')
          .select('*')
          .eq('veterinarian_id', userId)
          .order('week_start', { ascending: true })
          .limit(7);
        
        if (chartData) {
          setChartData(chartData as ChartDataPoint[]);
        }
      } catch (error) {
        console.error('Erro ao carregar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);
  
  return { metrics, chartData, loading };
}
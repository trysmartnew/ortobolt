import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Brain, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { sendChatMessage } from '@/services/aiService';
import { InlineToast } from '@/components/ui';

interface PreReportAIProps {
  initialAnalysis: string;
  caseId?: string;
}

interface Finding {
  category: 'FRATURA' | 'LUXAÇÃO' | 'OSTEOARTRITE' | 'DESALINHAMENTO' | 'SEM_ACHADOS';
  description: string;
  severity: 'CRÍTICO' | 'MODERADO' | 'LEVE' | 'NORMAL';
}

export default function PreReportAI({ initialAnalysis, caseId }: PreReportAIProps) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToast } = useApp();

  useEffect(() => {
    detectFindings();
  }, [initialAnalysis]);

  const detectFindings = async () => {
    try {
      const prompt = `Com base nesta análise ortopédica já realizada:
${initialAnalysis}

Liste APENAS achados patológicos encontrados. Para cada um, responda NESTE FORMATO EXATO:
CATEGORIA: [FRATURA|LUXAÇÃO|OSTEOARTRITE|DESALINHAMENTO]
DESCRIÇÃO: [descrição clínica objetiva]
SEVERIDADE: [CRÍTICO|MODERADO|LEVE]
---
Se não houver achados patológicos visíveis, responda apenas: SEM_ACHADOS`;

      const response = await sendChatMessage(prompt, []);
      parseFindings(response);
    } catch (err) {
      setError('Erro ao detectar achados. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parseFindings = (text: string) => {
    if (text.includes('SEM_ACHADOS') || text.includes('Sem achados')) {
      setFindings([{
        category: 'SEM_ACHADOS',
        description: 'Nenhum achado patológico visível.',
        severity: 'NORMAL'
      }]);
      return;
    }

    const blocks = text.split('---').filter(b => b.trim());
    const parsed: Finding[] = [];

    blocks.forEach(block => {
      const categoryMatch = block.match(/CATEGORIA:\s*(.+)/i);
      const descMatch = block.match(/DESCRIÇÃO:\s*(.+)/i);
      const sevMatch = block.match(/SEVERIDADE:\s*(.+)/i);

      if (categoryMatch && descMatch && sevMatch) {
        parsed.push({
          category: categoryMatch[1].trim().toUpperCase() as Finding['category'],
          description: descMatch[1].trim(),
          severity: sevMatch[1].trim().toUpperCase() as Finding['severity'],
        });
      }
    });

    setFindings(parsed.length > 0 ? parsed : [{
      category: 'SEM_ACHADOS',
      description: 'Nenhum achado patológico visível.',
      severity: 'NORMAL'
    }]);
  };

  const getSeverityStyles = (severity: Finding['severity']) => {
    switch (severity) {
      case 'CRÍTICO':
        return { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, iconColor: 'text-red-600', title: 'text-red-800' };
      case 'MODERADO':
        return { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertCircle, iconColor: 'text-amber-600', title: 'text-amber-800' };
      case 'LEVE':
        return { bg: 'bg-blue-50', border: 'border-blue-100', icon: AlertCircle, iconColor: 'text-blue-500', title: 'text-blue-700' };
      case 'NORMAL':
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle, iconColor: 'text-emerald-600', title: 'text-emerald-700' };
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="text-violet-600" size={18} />
        <h3 className="text-sm font-bold text-slate-800">Pré-laudo Automático</h3>
        <span className="bg-violet-100 text-violet-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
          Segunda Opinião IA
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="animate-spin text-[#0056b3]" size={16} />
          Detectando achados patológicos...
        </div>
      )}

      {error && <InlineToast message={error} type="error" />}

      {!loading && !error && (
        <div className="space-y-2">
          {findings.map((finding, i) => {
            const styles = getSeverityStyles(finding.severity);
            const Icon = styles.icon;

            return (
              <div
                key={i}
                className={`${styles.bg} ${styles.border} border rounded-xl p-3 flex gap-3`}
              >
                <Icon className={`${styles.iconColor} flex-shrink-0`} size={20} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/50">
                      {finding.category}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      finding.severity === 'CRÍTICO' ? 'bg-red-200 text-red-800' :
                      finding.severity === 'MODERADO' ? 'bg-amber-200 text-amber-800' :
                      finding.severity === 'LEVE' ? 'bg-blue-200 text-blue-800' :
                      'bg-emerald-200 text-emerald-800'
                    }`}>
                      {finding.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">{finding.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
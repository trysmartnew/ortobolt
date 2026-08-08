// src/pages/ComparativeAnalysisPage.tsx
import React, { Suspense, lazy, useEffect } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { reportWorkflowStep } from '@/hooks/useWorkflowStep';
import { SectionHeader, Card } from '@/components/ui';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useApp } from '@/contexts/AppContext';
import { PRIMARY_MODEL } from '@/services/aiService';
import { buildCaseTitle } from '@/services/clinicalCaseIntegrationService';
import { uploadRadiografia } from '@/services/supabase';
import type { ClinicalCase, CaseExam } from '@/types';

const PrePostComparison = lazy(() => import('@/components/analysis/PrePostComparison'));
import { User, ArrowLeft } from 'lucide-react';

export default function ComparativeAnalysisPage() {
  const { user, approveAndIntegrateCase, addToast, activeCase, setCurrentPage } = useApp();
  const { addAnalysisToHistory } = useAnalysis();

  useEffect(() => {
    if (!activeCase) {
      reportWorkflowStep('comparative', 0);
    }
    return () => {
      reportWorkflowStep(null, -1);
    };
  }, [activeCase]);

  if (!activeCase) {
    return (
      <div className="p-4 w-full space-y-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#16191b] to-[#0e1011] text-white min-h-full">
        {/* Texto de valor clínico */}
        <div className="max-w-3xl mx-auto text-center space-y-2 pt-4">
          <h2 className="text-lg font-semibold text-white tracking-wide uppercase">
            Análise Comparativa
          </h2>
          <p className="text-sm text-white/60 italic">
            Evolução ortopédica baseada em imagem
          </p>
          <p className="text-sm text-white/80 mt-4 leading-relaxed">
            Compare o estado pré e pós-operatório do paciente para acompanhar alterações radiográficas ao longo do tempo.
          </p>
        </div>

        {/* Empty State com ação */}
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <User size={32} className="text-white/40" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-semibold text-white">Selecione um paciente</h3>
            <p className="text-sm text-white/60">Inicie uma análise comparativa pré e pós-operatória.</p>
          </div>
          <button
            onClick={() => setCurrentPage('gallery')}
            className="px-6 py-2.5 rounded-xl bg-[#29a399] hover:bg-[#1c6b62] text-white text-sm font-semibold transition-all shadow-premium-glow"
          >
            Selecionar paciente
          </button>
        </div>

        {/* Conteúdo contextual: Comparação Orientada */}
        <div className="max-w-4xl mx-auto pt-6 pb-4">
          <div className="border-t border-white/10 pt-6">
            <h4 className="text-xs font-semibold text-white/80 tracking-wider uppercase mb-4 text-center">
              Comparação Orientada
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs font-semibold text-[#29a399] mb-1">PRÉ-OPERATÓRIO</div>
                <p className="text-xs text-white/70 leading-relaxed">Imagem inicial como referência.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs font-semibold text-[#29a399] mb-1">PÓS-OPERATÓRIO</div>
                <p className="text-xs text-white/70 leading-relaxed">Imagem atual para comparação.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs font-semibold text-[#29a399] mb-1">EVOLUÇÃO</div>
                <p className="text-xs text-white/70 leading-relaxed">Visualize diferenças entre os exames.</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-white/40 mt-4 italic">
            Este conteúdo ajuda a compreender o propósito clínico da análise comparativa.
          </p>
        </div>
      </div>
    );
  }

  const handleSaveComparisonCase = async (beforeImage: string, afterImage: string, aiReport: any): Promise<ClinicalCase | null> => {
    try {
      if (!user) {
        addToast('Médico-veterinário não autenticado no sistema.', 'error');
        return null;
      }

      const reportText = typeof aiReport === 'string'
        ? aiReport
        : (aiReport?.fullAnalysis
          || [aiReport?.alignment, aiReport?.boneDensity, aiReport?.recommendation]
            .filter(Boolean)
            .join('\n\n')
          || 'Análise comparativa de Mesa de Luz — dados não disponíveis.');

      const caseTitle = buildCaseTitle(
        activeCase.patientName,
        activeCase.procedure ?? 'other'
      );

      const comparativeExam: CaseExam = {
        id: `exam-compare-${Date.now()}`,
        modality: 'comparative_study',
        imageUrls: [beforeImage, afterImage].filter(Boolean),
        analysisText: reportText,
        createdAt: new Date().toISOString(),
      };

      const primaryImage = afterImage || beforeImage || '';
      const storagePath = `${user.id}/comparative/${Date.now()}`;
      const imageStorageUrl = await uploadRadiografia(primaryImage, storagePath);

      const clinicalCase = approveAndIntegrateCase({
        veterinarianId: user.id,
        imageDataUrl: primaryImage,
        imageStorageUrl: imageStorageUrl ?? undefined,
        analysisText: `[Mesa de Luz - Comparativo Antes/Depois]\n\n${reportText}`,
        clinicalContext: {
          patientName: activeCase.patientName,
          procedure: activeCase.procedure ?? 'other'
        },
        titleOverride: caseTitle,
        status: 'completed',
        additionalExams: [comparativeExam],
      });

      addAnalysisToHistory({
        id: `analysis-${clinicalCase.id}`,
        caseId: clinicalCase.id,
        imageData: afterImage || beforeImage || '',
        analysisResult: reportText,
        createdAt: new Date().toISOString(),
        model: PRIMARY_MODEL,
        context: {
          patientName: activeCase.patientName,
          procedure: activeCase.procedure ?? 'other',
        },
      });

      addToast('Caso comparativo integrado com sucesso!', 'success');
      return clinicalCase;
    } catch (err: any) {
      console.error('[Mesa de Luz] Erro ao salvar caso comparativo:', err);
      addToast(`Falha ao salvar o caso: ${err.message || 'erro desconhecido'}`, 'error');
      return null;
    }
  };

  return (
    <div className="p-4 w-full space-y-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#16191b] to-[#0e1011] text-white">
      <SectionHeader
        title="Mesa de Luz Digital"
        subtitle="Comparação de exames pré e pós-operatórios"
      />

      <Card className="p-6">
        <ErrorBoundary fallback={
          <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
            <p className="text-sm text-white/70">Não foi possível carregar a Mesa de Luz.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#29a399] hover:bg-[#1c6b62] transition-colors"
            >
              Recarregar
            </button>
          </div>
        }>
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-[#29a399]/20 border-t-[#29a399] rounded-full animate-spin" />
          </div>
        }>
          <PrePostComparison onSaveCase={handleSaveComparisonCase} />
        </Suspense>
        </ErrorBoundary>
      </Card>
      {/* Navegação de Saída */}
      <div className="flex justify-start pt-2">
        <button
          onClick={() => setCurrentPage('gallery')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold transition-all border border-white/10"
        >
          <ArrowLeft size={14} /> Voltar à Central de Casos
        </button>
      </div>
    </div>
  );
}

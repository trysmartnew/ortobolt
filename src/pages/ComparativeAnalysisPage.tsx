// src/pages/ComparativeAnalysisPage.tsx
import React, { Suspense, lazy } from 'react';
import { SectionHeader, Card, EmptyState } from '@/components/ui';
import { useApp } from '@/contexts/AppContext';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { buildCaseTitle } from '@/services/clinicalCaseIntegrationService';
import { PRIMARY_MODEL } from '@/services/aiService';
import type { ClinicalCase, CaseExam } from '@/types';

const PrePostComparison = lazy(() => import('@/components/analysis/PrePostComparison'));
import { User } from 'lucide-react';

export default function ComparativeAnalysisPage() {
  const { user, approveAndIntegrateCase, addToast, activeCase } = useApp();
  const { addAnalysisToHistory } = useAnalysis();

  if (!activeCase) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <EmptyState
          icon={<User size={48} className="text-slate-300" />}
          title="Nenhum Paciente Ativo"
          description="Por favor, selecione um paciente na galeria antes de iniciar uma análise comparativa."
        />
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

      const clinicalCase = approveAndIntegrateCase({
        veterinarianId: user.id,
        imageDataUrl: afterImage || beforeImage || '',
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
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        }>
          <PrePostComparison onSaveCase={handleSaveComparisonCase} />
        </Suspense>
      </Card>
    </div>
  );
}
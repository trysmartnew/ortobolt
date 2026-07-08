// src/pages/ComparativeAnalysisPage.tsx
import React, { Suspense, lazy } from 'react';
import { SectionHeader, Card } from '@/components/ui';
import { useApp } from '@/contexts/AppContext';

const PrePostComparison = lazy(() => import('@/components/analysis/PrePostComparison'));

export default function ComparativeAnalysisPage() {
  const { setCurrentPage } = useApp();

  return (
    <div className="p-4 w-full space-y-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#16191b] to-[#0e1011] text-white">
      <SectionHeader
        title="Estudo Comparativo"
        subtitle="Análise Comparativa - Pré e Pós Operatório"
      />
       
      <Card className="p-6">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        }>
          <PrePostComparison />
        </Suspense>
      </Card>
    </div>
  );
}
// src/components/CaseAnalysisTab.tsx
// ✅ Componente isolado para exibir Análise IA e Copiloto dentro do Caso Clínico
import React from 'react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useApp } from '@/contexts/AppContext';
import CopilotClinical from './CopilotClinical';
import { Card } from '@/components/ui';
import { Scan, AlertCircle } from 'lucide-react';

export default function CaseAnalysisTab() {
  const { activeCase } = useApp();
  const { getAnalysisByCaseId } = useAnalysis();

  if (!activeCase) return null;

  const analysis = getAnalysisByCaseId(activeCase.id);

  if (!analysis) {
    return (
      <div className="p-8 text-center">
        <Scan className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Nenhuma análise de IA vinculada a este caso.</p>
        <p className="text-xs text-slate-400 mt-2">Vá para a página "Análise Visual" para realizar o exame.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Scan size={16} className="text-[#0056b3]" />
          <h3 className="font-bold text-slate-900 text-sm">Análise de Imagem Vinculada</h3>
        </div>
        <img 
          src={analysis.imageData} 
          alt="Análise" 
          className="w-full rounded-xl border border-slate-100 max-h-64 object-contain bg-slate-50" 
        />
        <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {analysis.analysisResult}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-mono">
            Gerado em: {new Date(analysis.createdAt).toLocaleString('pt-BR')}
          </span>
          <span className="text-[10px] px-2 py-1 bg-blue-50 text-[#0056b3] rounded-full font-medium">
            {analysis.model.split('/')[1] || 'OrthoVision'}
          </span>
        </div>
      </Card>

      {/* Copiloto Clínico integrado ao contexto do caso */}
      <CopilotClinical 
        mode="case" 
        caseData={activeCase} 
        originalAnalysis={analysis} 
      />
    </div>
  );
}

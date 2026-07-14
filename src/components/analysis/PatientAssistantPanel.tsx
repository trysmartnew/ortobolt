import { X, Bot } from 'lucide-react';
import ClinicalAssistant from './ClinicalAssistant';
import type { ClinicalCase, AIAnalysisResult } from '@/types/index';

interface PatientAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: ClinicalCase;
}

export default function PatientAssistantPanel({ isOpen, onClose, caseData }: PatientAssistantPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
        <div className="flex items-center gap-2">
          <Bot className="text-primary" size={20} />
          <h3 className="font-bold text-sm">Assistente Clínico: {caseData.patientName}</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ClinicalAssistant 
            caseData={caseData} 
            originalAnalysis={(caseData.aiAnalysis || { id: 'placeholder', timestamp: new Date().toISOString(), precisionScore: 0, riskFactors: [], anatomicalLandmarks: [], confidence: 0, processingTimeMs: 0, recommendations: [] }) as AIAnalysisResult} 
        />
      </div>
    </div>
  );
}

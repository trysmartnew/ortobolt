import { useEffect, useRef } from 'react';
import { useClinicalCopilot } from '@/hooks/useClinicalCopilot';
import ClinicalCopilotPanel from './ClinicalCopilotPanel';
import type { ClinicalCase as Case, AIAnalysisResult } from '@/types/index';

interface ClinicalAssistantProps {
  caseData: Case;
  originalAnalysis: AIAnalysisResult; 
  enabled?: boolean;
}

export default function ClinicalAssistant({ caseData, originalAnalysis, enabled = true }: ClinicalAssistantProps) {
  const imageBase64 = (originalAnalysis as any)?.imageData?.split(',')[1] || (originalAnalysis as any)?.imageData;
  const prevCaseData = useRef(caseData);
  
  const {
    session,
    streaming,
    refining,
    error,
    initSession,
    updateContext,
    sendMessage,
    refineAnalysis,
    resetCopilot // Assumindo necessidade de re-init
  } = useClinicalCopilot(imageBase64);

  const handleRetry = () => {
    resetCopilot();
    if (imageBase64) {
      initSession(imageBase64, {
        patientName: caseData.patientName,
        species: caseData.species,
        breed: caseData.breed,
        weightKg: caseData.weightKg,
        procedure: caseData.procedure,
        clinicalNotes: caseData.notes
      });
    }
  };

  return (
    <ClinicalCopilotPanel
      enabled={enabled}
      messages={session?.messages ?? []}
      streaming={streaming}
      refining={refining}
      error={error}
      clinicalContext={session?.clinicalContext ?? {}}
      onContextChange={updateContext}
      onSend={sendMessage}
      onRefineAnalysis={refineAnalysis}
      onRetry={handleRetry}
    />
  );

}

import { useEffect } from 'react';
import { useClinicalCopilot } from '@/hooks/useClinicalCopilot';
import ClinicalCopilotPanel from './ClinicalCopilotPanel';
import type { ClinicalCase as Case } from '@/types/index';

interface ClinicalAssistantProps {
  caseData: Case;
  originalAnalysis: any; 
  enabled?: boolean;
}

export default function ClinicalAssistant({ caseData, originalAnalysis, enabled = true }: ClinicalAssistantProps) {
  const imageBase64 = originalAnalysis?.imageData?.split(',')[1] || originalAnalysis?.imageData;
  
  const {
    session,
    streaming,
    refining,
    error,
    initSession,
    updateContext,
    sendMessage,
    refineAnalysis
  } = useClinicalCopilot(imageBase64);

  // Inicializa a sessão com dados do caso quando necessário
  useEffect(() => {
    if (imageBase64 && !session) {
      initSession(imageBase64, {
        patientName: caseData.patientName,
        species: caseData.species,
        breed: caseData.breed,
        weightKg: caseData.weightKg,
        procedure: caseData.procedure,
        clinicalNotes: caseData.notes
      });
    }
  }, [imageBase64, session, initSession, caseData]);

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
    />
  );
}

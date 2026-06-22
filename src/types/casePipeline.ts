import type { ChatMessage, CaseStatus, CaseExam } from '@/types/index';
import type { ClinicalContextDraft } from '@/types/clinicalCopilot';

/** Entrada unificada ao aprovar Caso Completo na Análise */
export interface ApproveCompleteCaseInput {
  veterinarianId: string;
  imageDataUrl: string;
  imageStorageUrl?: string;
  analysisText: string;
  clinicalContext: ClinicalContextDraft;
  copilotMessages?: ChatMessage[];
  copilotSessionId?: string;
  titleOverride?: string;
  status?: CaseStatus;
  additionalExams?: CaseExam[];
}

export const PIPELINE_TAG_INTEGRATED = 'integrado';
export const PIPELINE_TAG_ANALYSIS = 'analise-ia';

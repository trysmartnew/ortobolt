import type { AnimalSpecies, ChatMessage, ProcedureType } from '@/types/index';

/** Contexto clínico editável na sessão de análise */
export interface ClinicalContextDraft {
  patientName?: string;
  species?: AnimalSpecies;
  breed?: string;
  ageYears?: number;
  weightKg?: number;
  procedure?: ProcedureType;
  clinicalNotes?: string;
  linkedCaseId?: string;
}

/** Sessão do copiloto vinculada a uma radiografia + análise visual */
export interface ClinicalCopilotSession {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  /** Análise visual inicial (IA) */
  visionAnalysis: string;
  /** Análise após refinamento (copiloto / merge) */
  refinedAnalysis: string | null;
  clinicalContext: ClinicalContextDraft;
  messages: ChatMessage[];
}

export interface ClinicalCopilotPayload {
  imageBase64: string;
  visionAnalysis: string;
  refinedAnalysis: string | null;
  clinicalContext: ClinicalContextDraft;
  userMessage: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}

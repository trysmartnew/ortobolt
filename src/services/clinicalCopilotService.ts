import type { ChatMessage } from '@/types/index';
import type { ClinicalContextDraft, ClinicalCopilotSession } from '@/types/clinicalCopilot';
import { refineClinicalAnalysis, sendClinicalCopilotStream } from '@/services/aiService';
import { localAuditService } from '@/services/localAuditService';

export async function createCopilotSession(
  visionAnalysis: string,
  clinicalContext: ClinicalContextDraft = {}
): Promise<ClinicalCopilotSession> {
  const now = new Date().toISOString();
  const session: ClinicalCopilotSession = {
    sessionId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    visionAnalysis,
    refinedAnalysis: null,
    clinicalContext,
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sou o Assistente Clínico desta sessão. Tenho acesso à radiografia, à análise visual e ao contexto que você informar. Como posso refinar a interpretação?',
        timestamp: now,
      },
    ],
  };
  await saveCopilotSession(session);
  return session;
}

export async function loadCopilotSession(sessionId: string): Promise<ClinicalCopilotSession | null> {
  const allLogs = await localAuditService.getAll();
  const sessionLog = allLogs.find(log => log.caseId === sessionId);
  if (!sessionLog) return null;
  try {
    return JSON.parse(sessionLog.finalRefinement) as ClinicalCopilotSession;
  } catch {
    return null;
  }
}

export async function saveCopilotSession(session: ClinicalCopilotSession): Promise<void> {
  await localAuditService.save({
    caseId: session.sessionId,
    context: session.clinicalContext,
    finalRefinement: JSON.stringify({ ...session, updatedAt: new Date().toISOString() })
  });
}

export function historyForApi(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.id !== 'welcome' && !m.isLoading && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function sendCopilotMessage(params: {
  session: ClinicalCopilotSession;
  imageBase64: string;
  userMessage: string;
  onChunk: (text: string) => void;
}): Promise<{ session: ClinicalCopilotSession; reply: string }> {
  const { session, imageBase64, userMessage, onChunk } = params;
  const now = new Date().toISOString();

  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: userMessage,
    timestamp: now,
  };

  const history = historyForApi(session.messages);

  const reply = await sendClinicalCopilotStream(
    { imageBase64, visionAnalysis: session.visionAnalysis, refinedAnalysis: session.refinedAnalysis, clinicalContext: session.clinicalContext, userMessage, history },
    onChunk
  );

  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  };

  const next: ClinicalCopilotSession = {
    ...session,
    messages: [...session.messages, userMsg, assistantMsg],
    updatedAt: assistantMsg.timestamp,
  };

  await saveCopilotSession(next);
  return { session: next, reply };
}

export async function refineSessionAnalysis(params: { session: ClinicalCopilotSession; imageBase64: string }): Promise<ClinicalCopilotSession> {
  const { session, imageBase64 } = params;
  const history = historyForApi(session.messages);

  const refined = await refineClinicalAnalysis({
    imageBase64,
    visionAnalysis: session.visionAnalysis,
    refinedAnalysis: session.refinedAnalysis,
    clinicalContext: session.clinicalContext,
    userMessage: 'Consolidar análise refinada.',
    history,
  });

  const next: ClinicalCopilotSession = { ...session, refinedAnalysis: refined, updatedAt: new Date().toISOString() };
  await saveCopilotSession(next);
  return next;
}

export async function updateSessionContext(session: ClinicalCopilotSession, clinicalContext: ClinicalContextDraft): Promise<ClinicalCopilotSession> {
  const next = { ...session, clinicalContext, updatedAt: new Date().toISOString() };
  await saveCopilotSession(next);
  return next;
}

export function getDisplayAnalysis(session: ClinicalCopilotSession): string {
  return session.refinedAnalysis?.trim() || session.visionAnalysis;
}

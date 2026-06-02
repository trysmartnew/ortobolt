import type { ChatMessage } from '@/types/index';
import type {
  ClinicalContextDraft,
  ClinicalCopilotSession,
} from '@/types/clinicalCopilot';
import {
  refineClinicalAnalysis,
  sendClinicalCopilotStream,
} from '@/services/aiService';

const STORAGE_PREFIX = 'ortobolt-clinical-copilot-';

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

export function createCopilotSession(
  visionAnalysis: string,
  clinicalContext: ClinicalContextDraft = {}
): ClinicalCopilotSession {
  const now = new Date().toISOString();
  return {
    sessionId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    visionAnalysis,
    refinedAnalysis: null,
    clinicalContext,
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Sou o Copiloto Clínico desta sessão. Tenho acesso à radiografia, à análise visual e ao contexto que você informar. Como posso refinar a interpretação?',
        timestamp: now,
      },
    ],
  };
}

export function loadCopilotSession(sessionId: string): ClinicalCopilotSession | null {
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as ClinicalCopilotSession;
  } catch {
    return null;
  }
}

export function saveCopilotSession(session: ClinicalCopilotSession): void {
  const updated = { ...session, updatedAt: new Date().toISOString() };
  try {
    sessionStorage.setItem(storageKey(session.sessionId), JSON.stringify(updated));
  } catch (err) {
    console.warn('clinicalCopilotService: falha ao persistir sessão', err);
  }
}

export function clearCopilotSession(sessionId: string): void {
  sessionStorage.removeItem(storageKey(sessionId));
}

function historyForApi(messages: ChatMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((m) => m.id !== 'welcome' && !m.isLoading && m.content.trim())
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
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
    id: `u-${Date.now()}`,
    role: 'user',
    content: userMessage,
    timestamp: now,
  };

  const history = historyForApi(session.messages);

  const reply = await sendClinicalCopilotStream(
    {
      imageBase64,
      visionAnalysis: session.visionAnalysis,
      refinedAnalysis: session.refinedAnalysis,
      clinicalContext: session.clinicalContext,
      userMessage,
      history,
    },
    onChunk
  );

  const assistantMsg: ChatMessage = {
    id: `a-${Date.now()}`,
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  };

  const next: ClinicalCopilotSession = {
    ...session,
    messages: [...session.messages, userMsg, assistantMsg],
    updatedAt: assistantMsg.timestamp,
  };

  saveCopilotSession(next);
  return { session: next, reply };
}

export async function refineSessionAnalysis(params: {
  session: ClinicalCopilotSession;
  imageBase64: string;
}): Promise<ClinicalCopilotSession> {
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

  const next: ClinicalCopilotSession = {
    ...session,
    refinedAnalysis: refined,
    updatedAt: new Date().toISOString(),
  };

  saveCopilotSession(next);
  return next;
}

export function updateSessionContext(
  session: ClinicalCopilotSession,
  clinicalContext: ClinicalContextDraft
): ClinicalCopilotSession {
  const next = { ...session, clinicalContext, updatedAt: new Date().toISOString() };
  saveCopilotSession(next);
  return next;
}

export function getDisplayAnalysis(session: ClinicalCopilotSession): string {
  return session.refinedAnalysis?.trim() || session.visionAnalysis;
}

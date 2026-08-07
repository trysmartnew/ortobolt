import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createCopilotSession,
  getDisplayAnalysis,
  loadCopilotSession,
  refineSessionAnalysis,
  sendCopilotMessage,
  updateSessionContext,
} from '@/services/clinicalCopilotService';
import { localAuditService } from '@/services/localAuditService';
import type {
  ClinicalContextDraft,
  ClinicalCopilotSession,
} from '@/types/clinicalCopilot';
import type { ChatMessage } from '@/types/index';

export function useClinicalCopilot(imageBase64: string | null) {
  const [session, setSession] = useState<ClinicalCopilotSession | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Aborta requisições pendentes ao desmontar
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const initSession = useCallback(
    async (visionAnalysis: string, initialContext?: ClinicalContextDraft) => {
      const created = await createCopilotSession(visionAnalysis, initialContext ?? {});
      setSession(created);
      setError(null);
      return created.sessionId;
    },
    []
  );

  const restoreSession = useCallback(async (sessionId: string) => {
    const loaded = await loadCopilotSession(sessionId);
    if (loaded) setSession(loaded);
    return loaded;
  }, []);

  const updateContext = useCallback(async (ctx: ClinicalContextDraft) => {
    if (!session) return;
    const next = await updateSessionContext(session, { ...session.clinicalContext, ...ctx });
    setSession(next);
  }, [session]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!session || !imageBase64?.trim()) return;
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setStreaming(true);
      setError(null);

      // Aborta requisição anterior se existir
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const loadingId = 'copilot-loading';
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      const loadingMsg: ChatMessage = {
        id: loadingId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isLoading: true,
      };

      setSession((prev) =>
        prev ? { ...prev, messages: [...prev.messages, userMsg, loadingMsg] } : prev
      );

      try {
        const { session: next } = await sendCopilotMessage({
          session,
          imageBase64,
          userMessage: trimmed,
          signal: abortControllerRef.current?.signal,
          onChunk: (accumulated) => {
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === loadingId
                    ? { ...m, content: accumulated, isLoading: false }
                    : m
                ),
              };
            });
          },
        });

        setSession(next);
      } catch (err) {
        // Ignora erros de abort (usuário mudou de contexto ou desmontou)
        if (err instanceof Error && err.name === 'AbortError') return;
        const msg =
          err instanceof Error ? err.message : 'Erro ao conectar com o copiloto.';
        setError(msg);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter(
                  (m) => m.id !== loadingId && m.id !== userMsg.id
                ),
              }
            : prev
        );
      } finally {
        setStreaming(false);
      }
    },
    [session, imageBase64, streaming]
  );

  const refineAnalysis = useCallback(async () => {
    if (!session || !imageBase64?.trim()) return null;
    setRefining(true);
    setError(null);
    try {
      const next = await refineSessionAnalysis({ session, imageBase64, signal: abortControllerRef.current?.signal });
      setSession(next);
      
      // Registro local do checkpoint de refinamento
      await localAuditService.save({
        caseId: session.sessionId,
        context: session.clinicalContext,
        finalRefinement: getDisplayAnalysis(next) || ''
      });

      return getDisplayAnalysis(next);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao refinar análise.';
      setError(msg);
      return null;
    } finally {
      setRefining(false);
    }
  }, [session, imageBase64]);

  const resetCopilot = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  const displayAnalysis = session ? getDisplayAnalysis(session) : null;

  return {
    session,
    streaming,
    refining,
    error,
    displayAnalysis,
    initSession,
    restoreSession,
    updateContext,
    sendMessage,
    refineAnalysis,
    resetCopilot,
  };
}

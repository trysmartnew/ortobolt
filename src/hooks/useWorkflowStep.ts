// src/hooks/useWorkflowStep.ts
// Store reativo minimo (useSyncExternalStore) para reportar
// progresso de workflow das paginas de analise para o AppLayout.
// Nao cria estado global novo: apenas observa derivacoes locais.

import { useSyncExternalStore } from 'react';

import type { Page } from '@/contexts/AppContext';

type PageId = Extract<Page, 'analysis' | 'comparative'> | null;

export interface WorkflowState {
  page: PageId;
  currentStep: number; // -1 = oculto (render condicional no AppLayout)
}

let state: WorkflowState = { page: null, currentStep: -1 };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  listeners.forEach((l) => l());
}

/**
 * Chamado por paginas de analise para reportar o step atual.
 * Ignora chamadas redundantes (evita re-renders desnecessarios).
 */
export function reportWorkflowStep(page: PageId, currentStep: number): void {
  if (state.page !== page || state.currentStep !== currentStep) {
    state = { page, currentStep };
    notify();
  }
}

export function useWorkflowStep(): WorkflowState {
  return useSyncExternalStore(subscribe, () => state);
}

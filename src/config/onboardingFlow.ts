// src/config/onboardingFlow.ts
// Fase 1 do onboarding global -- so dados, sem logica de UI.
import type { Page } from '@/contexts/AppContext';

export interface OnboardingStage {
  page: Page;
  label: string;
}

export const ONBOARDING_FLOW: OnboardingStage[] = [
  { page: 'dashboard', label: 'Visão geral' },
  { page: 'gallery',   label: 'Seus casos' },
  { page: 'analysis',  label: 'Análise de Imagens com IA' },
  { page: 'reports',   label: 'Laudos e Relatórios' },
];

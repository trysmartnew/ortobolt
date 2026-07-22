/**
 * Consentimento IA — cache leve (30s) para evitar leituras repetidas de storage.
 */

const CACHE_TTL_MS = 30_000;

let consentCache: { allowed: boolean; at: number } | null = null;
let profileFallback: boolean | null = null;

export const AI_CONSENT_DENIED_MESSAGE =
  '⚠️ Análise por IA desativada nas configurações. Ative em Configurações → IA e Análise para continuar.';

export function invalidateAiConsentCache(): void {
  consentCache = null;
}

/** Sincroniza fallback a partir do perfil Supabase (chamado no login). */
export function setAiConsentFromProfile(autoAnalysis: boolean | undefined): void {
  profileFallback = typeof autoAnalysis === 'boolean' ? autoAnalysis : null;
  invalidateAiConsentCache();
}

export function isAiConsentGranted(): boolean {
  const now = Date.now();
  if (consentCache && now - consentCache.at < CACHE_TTL_MS) {
    return consentCache.allowed;
  }

  let allowed = profileFallback ?? true;

  try {
    const raw = localStorage.getItem('vanguard-veterinary_prefs');
    if (raw) {
      const prefs = JSON.parse(raw) as { autoAnalysis?: boolean };
      if (typeof prefs.autoAnalysis === 'boolean') {
        allowed = prefs.autoAnalysis;
      }
    }
  } catch {
    /* mantém fallback */
  }

  consentCache = { allowed, at: now };
  return allowed;
}

export class AiConsentDeniedError extends Error {
  constructor() {
    super(AI_CONSENT_DENIED_MESSAGE);
    this.name = 'AiConsentDeniedError';
  }
}

export function assertAiConsentGranted(): void {
  if (!isAiConsentGranted()) {
    throw new AiConsentDeniedError();
  }
}

/** Auto-análise ao carregar imagens (mesmo flag, uso distinto). */
export function isAutoAnalysisEnabled(): boolean {
  return isAiConsentGranted();
}

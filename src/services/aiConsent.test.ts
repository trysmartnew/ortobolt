import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAiConsentGranted,
  invalidateAiConsentCache,
  setAiConsentFromProfile,
} from '@/services/aiConsent';

describe('aiConsent', () => {
  beforeEach(() => {
    invalidateAiConsentCache();
    setAiConsentFromProfile(undefined as unknown as boolean);
    localStorage.clear();
  });

  it('permite IA por padrão quando não há prefs', () => {
    expect(isAiConsentGranted()).toBe(true);
  });

  it('bloqueia quando autoAnalysis=false no localStorage', () => {
    localStorage.setItem('ortobolt_prefs', JSON.stringify({ autoAnalysis: false }));
    invalidateAiConsentCache();
    expect(isAiConsentGranted()).toBe(false);
  });

  it('memoiza resultado por 30s', () => {
    localStorage.setItem('ortobolt_prefs', JSON.stringify({ autoAnalysis: true }));
    expect(isAiConsentGranted()).toBe(true);
    localStorage.setItem('ortobolt_prefs', JSON.stringify({ autoAnalysis: false }));
    expect(isAiConsentGranted()).toBe(true);
  });

  it('invalida cache ao chamar invalidateAiConsentCache', () => {
    localStorage.setItem('ortobolt_prefs', JSON.stringify({ autoAnalysis: true }));
    isAiConsentGranted();
    localStorage.setItem('ortobolt_prefs', JSON.stringify({ autoAnalysis: false }));
    invalidateAiConsentCache();
    expect(isAiConsentGranted()).toBe(false);
  });

  it('usa fallback do perfil quando localStorage ausente', () => {
    setAiConsentFromProfile(false);
    expect(isAiConsentGranted()).toBe(false);
  });
});

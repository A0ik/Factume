// ARGOS (CIBLE 2) — Source unique du consentement cookies.
// CITADEL avait introduit un format JSON v2 ({v,ts,analytics}) mais GoogleAnalytics
// continuait à tester la chaîne 'accepted' (v1) → GA ne se chargeait jamais. Ce module
// centralise la lecture pour éviter toute nouvelle divergence.

export const CONSENT_KEY = 'cookie_consent';
export const CONSENT_VERSION = 2;
export const CONSENT_EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 mois

export interface ConsentData {
  v: number;
  ts: number;
  analytics: boolean;
}

/** Lit et valide le consentement stocké (gère legacy v1 + expiration + version). */
export function readConsent(): ConsentData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Legacy v1 : chaîne 'accepted'/'refused'
    if (typeof parsed === 'string') {
      return { v: 1, ts: Date.now(), analytics: parsed === 'accepted' };
    }
    if (!parsed || typeof parsed !== 'object') return null;
    // Expiration
    if (parsed.ts && Date.now() - parsed.ts > CONSENT_EXPIRY_MS) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    // Version obsolète → re-demander
    if (!parsed.v || parsed.v < CONSENT_VERSION) return null;
    return parsed as ConsentData;
  } catch {
    return null;
  }
}

/** Vrai si l'utilisateur a consenti à l'analytics (format v2 ou legacy accepté). */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

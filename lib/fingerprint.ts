'use client';

import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * OVERLORD (CIBLE 2) — Empreinte device robuste (FingerprintJS open-source) pour
 * le blindage anti-fraude de l'essai gratuit. Remplace le btoa(UA|screen|tz)
 * trivial (triviallement spoofable) utilisé jusque-là.
 *
 * Le visitorId repose sur canvas, WebGL, polices, audio… : bien plus dur à
 * falsifier qu'un user-agent. Largement suffisant, combiné au throttle IP et à
 * la normalisation email, pour élever le coût de triche sans exiger de carte.
 */

let _visitorIdPromise: Promise<string> | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (_visitorIdPromise) return _visitorIdPromise;
  _visitorIdPromise = (async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      return result.visitorId || 'fp-unknown';
    } catch {
      // Repli si FingerprintJS échoue à charger (CSP, navigateur exotique).
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const screen =
        typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '';
      const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
      return `fp-fallback-${btoa(`${ua}|${screen}|${tz}`).slice(0, 32)}`;
    }
  })();
  return _visitorIdPromise;
}

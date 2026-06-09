'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

// CITADEL: RGPD-compliant cookie consent with timestamp, version, and 6-month expiration
const CONSENT_KEY = 'cookie_consent';
const CONSENT_VERSION = 2;
const CONSENT_EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months

interface ConsentData {
  v: number;
  ts: number;
  analytics: boolean;
}

function readConsent(): ConsentData | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Legacy format: string 'accepted'/'refused'
    if (typeof parsed === 'string') {
      return { v: 1, ts: Date.now(), analytics: parsed === 'accepted' };
    }
    // Check expiration
    if (parsed.ts && Date.now() - parsed.ts > CONSENT_EXPIRY_MS) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    // Check version
    if (parsed.v < CONSENT_VERSION) return null;
    return parsed as ConsentData;
  } catch {
    return null;
  }
}

function updateGtagConsent(analytics: boolean) {
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
    const gtag = (window as unknown as Record<string, (...args: unknown[]) => void>).gtag;
    gtag('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: 'denied',
    });
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    if (!consent) {
      setVisible(true);
    } else {
      updateGtagConsent(consent.analytics);
    }
  }, []);

  const saveConsent = (analytics: boolean) => {
    const data: ConsentData = { v: CONSENT_VERSION, ts: Date.now(), analytics };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    updateGtagConsent(analytics);
    setVisible(false);
    window.dispatchEvent(new Event('cookie_consent_changed'));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-gray-700">
              Nous utilisons des cookies essentiels pour le fonctionnement du site et des cookies d'analyse (Google Analytics) pour améliorer votre expérience.
            </p>
            <Link href="/legal/confidentialite" className="text-xs text-primary hover:underline mt-1 inline-block">
              Politique de confidentialité
            </Link>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => saveConsent(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
            Essentiels uniquement
          </button>
          <button onClick={() => saveConsent(true)} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}

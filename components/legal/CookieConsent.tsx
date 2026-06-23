'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  readConsent,
  type ConsentData,
} from '@/lib/cookieConsent';

function updateGtagConsent(analytics: boolean) {
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
    const gtag = (window as unknown as Record<string, (...args: unknown[]) => void>).gtag;
    gtag('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
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
    <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl dark:border-white/[0.08] dark:bg-[#111113]/95 safe-area-bottom">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Nous utilisons des cookies essentiels pour le fonctionnement du site et des cookies d'analyse (Google Analytics) pour améliorer votre expérience.
            </p>
            {/* ARGOS (CIBLE 2) : contraste WCAG AA — text-brand-700 (≥5:1) au lieu de text-primary #10b981 (2.64:1). */}
            <Link href="/legal/confidentialite" className="text-xs font-medium text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 underline mt-1 inline-block">
              Politique de confidentialité
            </Link>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => saveConsent(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10">
            Essentiels uniquement
          </button>
          {/* ARGOS (CIBLE 2) : contraste WCAG AA — bg-brand-700 (texte blanc ≥5:1) au lieu de bg-primary #10b981 (2.64:1). */}
          <button onClick={() => saveConsent(true)} className="px-4 py-2 text-sm font-medium text-white bg-brand-700 hover:bg-brand-800 dark:bg-brand-700 dark:hover:bg-brand-600 rounded-lg transition-colors">
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  );
}

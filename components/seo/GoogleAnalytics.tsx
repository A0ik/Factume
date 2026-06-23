'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { hasAnalyticsConsent } from '@/lib/cookieConsent';

const GA_ID = 'G-WHKB8Y57YS';

interface GoogleAnalyticsProps {
  /** Nonce CSP issu du middleware (x-nonce) — requis pour les scripts inline en strict CSP. */
  nonce?: string;
}

export function GoogleAnalytics({ nonce }: GoogleAnalyticsProps) {
  // ARGOS (CIBLE 2) — lit le consentement via la source unique (format JSON v2).
  // Avant : `consent === 'accepted'` ne matchait jamais le format v2 → GA muet.
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const check = () => setConsented(hasAnalyticsConsent());
    check();

    const handler = () => check();
    window.addEventListener('cookie_consent_changed', handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener('cookie_consent_changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  if (!consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}

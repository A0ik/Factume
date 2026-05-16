'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
    window.dispatchEvent(new Event('cookie_consent_changed'));
  };

  const refuse = () => {
    localStorage.setItem('cookie_consent', 'refused');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-gray-700">
              Nous utilisons des cookies pour améliorer votre expérience et mesurer l'audience (Google Analytics).
              Vous pouvez les accepter ou les refuser.
            </p>
            <Link href="/legal/confidentialite" className="text-xs text-primary hover:underline mt-1 inline-block">
              En savoir plus
            </Link>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={refuse} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
            Refuser
          </button>
          <button onClick={accept} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

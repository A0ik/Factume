'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Une erreur est survenue</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Veuillez réessayer ou contacter le support.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 2rem', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Recharger la page
          </button>
        </div>
      </body>
    </html>
  );
}

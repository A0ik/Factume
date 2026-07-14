'use client';

/**
 * ZÉNITH (CIBLE 2) — Error Boundary client pour tout le groupe (app).
 * Rattrape les erreurs de rendu runtime (ex: donnée Supabase malformée qui ferait
 * planter /calendar, /invoices/[id], etc.) et affiche un fallback élégant brandé
 * émeraude au lieu d'une page morte. NB : ceci NE rattrape PAS les bail-outs
 * framework Next (useSearchParams sans Suspense) — ceux-ci sont traités à la racine
 * (voir app/(app)/calendar/page.tsx qui enveloppe désormais son contenu dans <Suspense>).
 */
import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Une erreur est survenue</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          La page n&apos;a pas pu s&apos;afficher correctement. Vos données sont intactes.
          Vous pouvez réessayer — si le problème persiste, rechargez l&apos;application.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Réessayer
          </button>
          <button
            onClick={() => { if (typeof window !== 'undefined') window.location.href = '/dashboard'; }}
            className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted font-medium text-sm transition-colors"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    </div>
  );
}

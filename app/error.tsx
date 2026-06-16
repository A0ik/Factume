'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // SPECTRE (diagnostic crash /contracts) — capturer L'INTÉGRALITÉ de l'erreur.
  // En prod Next 15 / React 19, l'objet error peut arriver « digest-only »
  // (message/stack vides) pour les erreurs serveur ou d'hydration → console
  // apparemment vide. On logge donc tous les champs + on pousse à Sentry.
  useEffect(() => {
    const payload = {
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
      cause: error?.cause ? String(error.cause) : undefined,
      href: typeof window !== 'undefined' ? window.location.href : undefined,
    };
    console.error('[Factu.me Error]', payload);
    Sentry.captureException(error, {
      tags: { source: 'app_error_boundary' },
      extra: { ...payload },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" variant="full" />
        </div>

        {/* Error icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-red-500 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Une erreur est survenue
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
          Désolé, quelque chose s&apos;est mal passé. Notre équipe a été notifiée et travaille
          à résoudre le problème.
        </p>

        {/* Error digest for support */}
        {error.digest && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 font-mono">
            Ref: {error.digest}
          </p>
        )}

        {/* SPECTRE DEBUG (temporaire — crash /contracts) — afficher l'erreur réelle
            pour diagnostic. À retirer une fois la cause racine fixée. */}
        <details className="mb-6 text-left">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            Détails techniques (debug)
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg text-[10px] leading-relaxed text-red-500 dark:text-red-400 overflow-auto whitespace-pre-wrap break-all">
{JSON.stringify({
  name: error?.name,
  message: error?.message,
  digest: error?.digest,
  stack: error?.stack,
  cause: error?.cause ? String(error.cause) : undefined,
}, null, 2)}
          </pre>
        </details>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25"
          >
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold text-sm transition-all duration-200"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

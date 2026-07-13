'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function CabinetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[cabinet] render error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Une erreur est survenue sur cette page
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Le cabinet n&apos;a pas pu charger cette vue. Vous pouvez réessayer — vos données ne sont pas affectées.
        </p>
        {error?.digest && (
          <p className="mt-2 text-[11px] font-mono text-gray-400">Réf. {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <RefreshCw size={15} />
          Réessayer
        </button>
      </motion.div>
    </div>
  );
}

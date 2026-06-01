'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Building2, User, ArrowRight } from 'lucide-react';

interface ClientTypeModalProps {
  open: boolean;
  onSelect: (type: 'b2b' | 'b2c') => void;
  clientName?: string;
}

/**
 * ClientTypeModal — "Ce client est-il une entreprise ou un particulier ?"
 *
 * Apparaît AVANT la création de la facture pour déterminer le régime :
 * - B2B (Entreprise) : SIRET requis, facture électronique PDP activée
 * - B2C (Particulier) : Pas de SIRET, facture classique, e-reporting agrégé
 *
 * Perfect dark/light mode support via Tailwind dark: variants.
 */
export default function ClientTypeModal({ open, onSelect, clientName }: ClientTypeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Header gradient */}
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 px-6 py-6 pb-8">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-6 -translate-x-6" />

              <div className="relative">
                <h2 className="text-xl font-bold text-white">Type de client</h2>
                <p className="text-sm text-emerald-100/80 mt-1">
                  {clientName
                    ? `"${clientName}" est une entreprise ou un particulier ?`
                    : 'Ce client est-il une entreprise ou un particulier ?'
                  }
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 -mt-4 pb-6 pt-2 space-y-3">
              {/* B2B Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('b2b')}
                className="w-full group relative flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                  <Building2 size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Entreprise</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Client avec SIRET/SIREN · Facture électronique PDP</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </motion.button>

              {/* B2C Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect('b2c')}
                className="w-full group relative flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                  <User size={22} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Particulier</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Client sans SIRET · Facture classique</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </motion.button>

              {/* Info */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">i</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>B2B</strong> : La facture sera transmise électroniquement via PDP (obligatoire 2026-2027).<br />
                  <strong>B2C</strong> : Facture classique — la transmission PDP n'est pas requise pour les particuliers.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

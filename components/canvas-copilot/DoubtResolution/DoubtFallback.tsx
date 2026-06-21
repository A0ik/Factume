'use client';

/**
 * CIBLE 4 (AEGIS) — DoubtFallback
 * Boîte de confirmation CENTRÉE pour les doutes dont le champ n'est pas ancré
 * dans le formulaire (ex : client_name qui est un CompanySearch, ou items[N].*).
 * Ces doutes étaient auparavant silencieusement droppés par DocumentFormPanel.
 *
 * Réutilise les mêmes handlers (onConfirm/onCorrect/onDismiss) que InlineDoubtCard
 * pour une cohérence totale avec le flux de résolution du store.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X, Pencil } from 'lucide-react';
import { VoiceUncertainField } from '@/types';
import { getFieldLabel } from './fieldLabels';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 25, mass: 0.8 };

interface DoubtFallbackProps {
  doubts: VoiceUncertainField[];
  onConfirm: (doubt: VoiceUncertainField, value: string | number) => void;
  onCorrect: (doubt: VoiceUncertainField, value: string | number) => void;
  onDismiss: (doubt: VoiceUncertainField) => void;
}

export default function DoubtFallback({ doubts, onConfirm, onCorrect, onDismiss }: DoubtFallbackProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  return (
    <AnimatePresence>
      {doubts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 p-4 dark:bg-black/50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={SPRING}
            className="w-full max-w-md rounded-2xl border border-amber-200 bg-white shadow-2xl dark:border-amber-500/30 dark:bg-[#111113]"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-amber-100 p-4 dark:border-white/[0.06]">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
                <AlertTriangle size={16} className="text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  Je veux être sûr d&apos;avoir bien compris
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pouvez-vous confirmer {doubts.length > 1 ? 'ces points' : 'ce point'} avant de continuer ?
                </p>
              </div>
            </div>

            {/* Doubts list */}
            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
              {doubts.map((doubt) => {
                const label = getFieldLabel(doubt.field);
                const display = doubt.current_value ?? '--';
                const suggestion = doubt.suggestion ?? null;
                const isEditing = editingField === doubt.field;
                return (
                  <div key={doubt.field} className="rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-400 dark:bg-white/[0.06] dark:text-gray-500">
                        {label}
                      </span>
                    </div>
                    {doubt.reason && (
                      <p className="mb-1.5 text-[11px] italic text-gray-400 dark:text-gray-500">{doubt.reason}</p>
                    )}
                    <p className="mb-2.5 text-base font-bold text-gray-900 dark:text-white">{String(display)}</p>

                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editValue.trim()) {
                              onCorrect(doubt, editValue.trim());
                              setEditingField(null);
                            }
                          }}
                          className="flex-1 rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-blue-500/40 dark:bg-white/[0.06] dark:text-white"
                        />
                        <button
                          onClick={() => {
                            if (editValue.trim()) {
                              onCorrect(doubt, editValue.trim());
                              setEditingField(null);
                            }
                          }}
                          className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600"
                        >
                          Valider
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onConfirm(doubt, display)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
                        >
                          <Check size={12} /> C&apos;est correct
                        </button>
                        {suggestion != null && String(suggestion) !== String(display) && (
                          <button
                            onClick={() => onCorrect(doubt, suggestion as string | number)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600"
                          >
                            Plutôt {String(suggestion)}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingField(doubt.field);
                            setEditValue(String(suggestion ?? display));
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                          <Pencil size={11} /> Corriger
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-gray-100 p-3 dark:border-white/[0.06]">
              <button
                onClick={() => doubts.forEach(onDismiss)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={12} /> Tout garder tel quel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

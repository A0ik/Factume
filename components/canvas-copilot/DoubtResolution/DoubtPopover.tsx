'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X, Pencil, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceUncertainField } from '@/types';
import { getFieldLabel } from './fieldLabels';

// ─── Spring animation config ───────────────────────────

const SPRING = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

const popoverVariants = {
  hidden: { opacity: 0, x: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: SPRING,
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.9,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
};

// ─── Single Doubt Card ─────────────────────────────────

interface DoubtCardProps {
  doubt: VoiceUncertainField;
  onConfirm: (value: string | number) => void;
  onCorrect: (value: string | number) => void;
  onDismiss: () => void;
}

function DoubtCard({ doubt, onConfirm, onCorrect, onDismiss }: DoubtCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(doubt.suggestion ?? doubt.current_value ?? ''));

  const fieldLabel = getFieldLabel(doubt.field);
  const displayValue = doubt.current_value ?? '—';
  const suggestion = doubt.suggestion ?? null;

  return (
    <motion.div
      variants={popoverVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-800 shadow-xl shadow-amber-500/10"
    >
      {/* Emerald pulse border */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-emerald-400"
        animate={{
          opacity: [0.6, 0],
          scale: [1, 1.01],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
              Confirmation requise
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500/80 mt-0.5">
              {doubt.reason}
            </p>
          </div>
        </div>

        {/* Field name */}
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-700 inline-flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase">{fieldLabel}</span>
        </div>

        {/* Current value display */}
        <div className="mb-3 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">
            J'ai compris :
          </p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
            {String(displayValue)}
          </p>
        </div>

        {/* Editing mode */}
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-blue-300 dark:border-blue-500/40 text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="Corrigez la valeur..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editValue.trim()) {
                  onCorrect(editValue.trim());
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (editValue.trim()) onCorrect(editValue.trim());
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
              >
                <Check size={13} /> Valider
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          /* Quick action buttons */
          <div className="space-y-2">
            {/* Confirm button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onConfirm(displayValue)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Check size={15} />
              Oui, c'est correct — {String(displayValue)}
            </motion.button>

            {/* Suggestion alternative (if available) */}
            {suggestion && suggestion !== displayValue && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onCorrect(suggestion)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-colors"
              >
                <ChevronRight size={14} />
                Non, plutôt — {String(suggestion)}
              </motion.button>
            )}

            {/* Manual edit */}
            <button
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <Pencil size={11} />
              Saisir une autre valeur
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Doubt Popover Container ───────────────────────────

interface DoubtPopoverProps {
  doubts: VoiceUncertainField[];
  onResolve: (corrections: Record<string, string | number>) => void;
  onDismiss: () => void;
}

export default function DoubtPopover({ doubts, onResolve, onDismiss }: DoubtPopoverProps) {
  const correctionsRef = useRef<Record<string, string | number>>({});

  const handleConfirm = (doubt: VoiceUncertainField, value: string | number) => {
    correctionsRef.current[doubt.field] = value;
    checkAllResolved(doubt);
  };

  const handleCorrect = (doubt: VoiceUncertainField, value: string | number) => {
    correctionsRef.current[doubt.field] = value;
    checkAllResolved(doubt);
  };

  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(new Set());

  const checkAllResolved = (doubt: VoiceUncertainField) => {
    setResolvedKeys((prev) => {
      const next = new Set(prev);
      next.add(doubt.field);
      // If all doubts are resolved, trigger the callback
      if (next.size === doubts.length) {
        // Apply the corrections for previously resolved ones too
        setTimeout(() => onResolve({...correctionsRef.current}), 100);
      }
      return next;
    });
  };

  const remainingDoubts = doubts.filter((d) => !resolvedKeys.has(d.field));

  return (
    <div className="space-y-3">
      {/* Header */}
      {remainingDoubts.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(16, 185, 129, 0.4)',
                  '0 0 0 6px rgba(16, 185, 129, 0)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center"
            >
              <AlertTriangle size={12} className="text-white" />
            </motion.div>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {remainingDoubts.length} champ{remainingDoubts.length > 1 ? 's' : ''} à confirmer
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <X size={12} /> Ignorer
          </button>
        </div>
      )}

      {/* Doubt cards */}
      <AnimatePresence>
        {remainingDoubts.map((doubt) => (
          <DoubtCard
            key={doubt.field}
            doubt={doubt}
            onConfirm={(val) => handleConfirm(doubt, val)}
            onCorrect={(val) => handleCorrect(doubt, val)}
            onDismiss={() => {
              // Treat dismissal as confirming current value
              correctionsRef.current[doubt.field] = doubt.current_value ?? '';
              checkAllResolved(doubt);
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────
// getFieldLabel is imported from './fieldLabels'

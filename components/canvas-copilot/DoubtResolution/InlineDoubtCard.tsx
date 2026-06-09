'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
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

// ─── Field Labels ──────────────────────────────────────
// getFieldLabel is imported from './fieldLabels'

// ─── Position Calculation ──────────────────────────────

interface Position {
  top: number;
  left: number;
  placement: 'right' | 'below';
}

function calcPosition(targetEl: HTMLElement): Position {
  const rect = targetEl.getBoundingClientRect();
  const vw = window.innerWidth;

  // Card dimensions (approximate)
  const cardW = 320;

  // FLAW 3 FIX: On mobile (< 640px), always center the card for better UX
  if (vw < 640) {
    return {
      top: Math.max(80, rect.bottom + 8),
      left: (vw - Math.min(cardW, vw - 32)) / 2,
      placement: 'below',
    };
  }

  // Desktop: try placing to the right of the field
  const spaceRight = vw - rect.right;

  if (spaceRight >= cardW + 16) {
    return {
      top: rect.top,
      left: rect.right + 12,
      placement: 'right',
    };
  }

  // Fallback: place below
  return {
    top: rect.bottom + 8,
    left: Math.max(16, Math.min(rect.left, vw - cardW - 16)),
    placement: 'below',
  };
}

// ─── Inline Doubt Card ─────────────────────────────────

interface InlineDoubtCardProps {
  doubt: VoiceUncertainField;
  targetRef: React.RefObject<HTMLElement>;
  onConfirm: (value: string | number) => void;
  onCorrect: (value: string | number) => void;
  onDismiss: () => void;
}

export default function InlineDoubtCard({
  doubt,
  targetRef,
  onConfirm,
  onCorrect,
  onDismiss,
}: InlineDoubtCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(doubt.suggestion ?? doubt.current_value ?? ''));
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, placement: 'right' });
  const cardRef = useRef<HTMLDivElement>(null);

  const fieldLabel = getFieldLabel(doubt.field);
  const displayValue = doubt.current_value ?? '--';
  const suggestion = doubt.suggestion ?? null;

  // Calculate and update position
  const updatePosition = useCallback(() => {
    if (targetRef.current) {
      setPosition(calcPosition(targetRef.current));
    }
  }, [targetRef]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  // Update position on scroll/resize
  useEffect(() => {
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [updatePosition]);

  return (
    <>
      {/* FLAW 3 FIX: More visible backdrop for AI confidence check (Loi: User Control & Freedom — NN/g Heuristic 3) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/20 dark:bg-black/30"
        onClick={onDismiss}
      />

      {/* Card */}
      <motion.div
        ref={cardRef}
        initial={{
          opacity: 0,
          scale: 0.92,
          x: position.placement === 'right' ? -12 : 0,
          y: position.placement === 'below' ? -8 : 0,
        }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={SPRING}
        className={cn(
          'fixed z-[9999] w-[320px] max-w-[calc(100vw-32px)]',
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-800 shadow-xl shadow-amber-500/10">
          {/* Emerald pulse border */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-emerald-400"
            animate={{ opacity: [0.6, 0], scale: [1, 1.01] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          <div className="relative p-3.5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle size={14} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                  Confirmation requise
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500/80 mt-0.5 truncate">
                  {doubt.reason}
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Field label */}
            <div className="mb-2 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-slate-700 inline-flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">{fieldLabel}</span>
            </div>

            {/* Current value */}
            <div className="mb-2.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">
                J'ai compris :
              </p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
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
                  className="w-full px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-500/40 text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                    <Check size={12} /> Valider
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
              <div className="space-y-1.5">
                {/* Confirm button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onConfirm(displayValue)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Check size={14} />
                  Oui, c'est correct — {String(displayValue)}
                </motion.button>

                {/* Suggestion alternative */}
                {suggestion && suggestion !== displayValue && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onCorrect(suggestion)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors"
                  >
                    <ChevronRight size={13} />
                    Non, plutot — {String(suggestion)}
                  </motion.button>
                )}

                {/* Manual edit */}
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-[10px] font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <Pencil size={10} />
                  Saisir une autre valeur
                </button>
              </div>
            )}
          </div>

          {/* Arrow pointing to field (right placement only) */}
          {position.placement === 'right' && (
            <div className="absolute left-0 top-4 -translate-x-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-l border-b border-amber-200 dark:border-amber-500/30 rotate-45" />
          )}
        </div>
      </motion.div>
    </>
  );
}

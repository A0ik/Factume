'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save,
  Loader2, Undo2, Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentSessionStore } from './documentSessionStore';
import { DOC_TYPE_CONFIGS } from './config/documentTypeConfig';
import DocumentFormPanel from './Form/DocumentFormPanel';
import VoiceOneShot from './Voice/VoiceOneShot';
import SmartTextBar from './Voice/SmartTextBar';

// ─── Layout Props ──────────────────────────────────────

interface CanvasCopilotLayoutProps {
  profile: any;
  isPro: boolean;
  onPaywall: () => void;
  onSave: () => void;
  onBack: () => void;
  /** 'create' (défaut) ou 'edit'. Pilote le label du bouton + le préfixe du titre. */
  mode?: 'create' | 'edit';
}

/**
 * CanvasCopilotLayout — Voice-First document creation layout.
 *
 * ═══ FIXES APPLIED ═══
 * • FLAW 1 (Mobile Scroll): min-h-0 on ALL flex containers prevents the
 *   classic flexbox overflow bug. Removed the duplicate Create button from
 *   mobile bottom bar (it's already in the header). Compacted bottom bar.
 * • FLAW 4 (Voice-First): Voice button is positioned FIRST (left = primary),
 *   is visually dominant. Text input is the alternative, not the default.
 *
 * ═══ UX LAWS APPLIED ═══
 * • Fitts's Law — Large touch targets for primary actions
 * • Hick's Law — Single clear primary action (voice) reduces decision time
 * • Shneiderman Rule 3 — Informative feedback on every state change
 * • Law of Proximity — Voice + text grouped, create action separate
 * • Miller's Law — Minimal choices in the action bar (voice, text, create)
 * • Von Restorff Effect — Voice button is the most distinctive element
 */
export default function CanvasCopilotLayout({
  profile,
  isPro,
  onPaywall,
  onSave,
  onBack,
  mode = 'create',
}: CanvasCopilotLayoutProps) {
  const {
    documentType,
    saving,
    error,
    canUndo,
    canRedo,
    undo,
    redo,
    total,
    items,
  } = useDocumentSessionStore();

  const config = DOC_TYPE_CONFIGS[documentType];
  const hasContent = items.some(i => i.description || i.unit_price > 0);
  const isEdit = mode === 'edit';
  const saveLabel = isEdit ? 'Enregistrer' : 'Créer';

  // Negative margins break out of app layout py-5/px-5 padding
  // Mobile: 100dvh - top bar (3.5rem) - BottomTabBar (4rem) | Desktop: full viewport
  return (
    <div className="flex flex-col -my-5 -mx-5 lg:-my-6 lg:-mx-8 h-[calc(100dvh-3.5rem-4rem)] lg:h-screen">

      {/* ═══════════ TOP HEADER BAR ═══════════ */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-white/10 z-20">
        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 transition-all"
        >
          <ArrowLeft size={15} />
        </motion.button>

        {/* Doc type badge + title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br',
              config.gradient,
            )}>
              <config.icon size={12} className="text-white" />
            </div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {isEdit ? 'Modifier ' : ''}{config.label}
            </h1>
          </div>
        </div>

        {/* Undo/Redo — desktop only */}
        <div className="hidden sm:flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-all"
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-all"
            title="Retablir (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </motion.button>
        </div>

        {/* Total indicator — desktop only */}
        {hasContent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.04]"
          >
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Total</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(total)}
            </span>
          </motion.div>
        )}

        {/* ═══ Save/Create button — ALWAYS visible & clickable (mobile + desktop) ═══
            SENTINEL (URGENCE 1) : le bouton n'est JAMAIS désactivé par manque de
            contenu — la validation se fait au clic dans handleSave avec un message
            clair. Avant, un item vide (description '' + unit_price 0) gardait le
            bouton `disabled` silencieusement → le clic était avalé par le HTML,
            sans aucun feedback → « rien ne se passe ». */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
            saving
              ? 'bg-gray-200 dark:bg-white/[0.06] text-gray-400 cursor-wait'
              : `bg-gradient-to-r ${config.gradient} text-white shadow-lg hover:shadow-xl`,
          )}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>{saveLabel}</span>
            </>
          )}
        </motion.button>
      </div>

      {/* ═══════════ ERROR BANNER ═══════════ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/30"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      {/* FLAW 1 FIX: min-h-0 on this flex container prevents overflow */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">

        {/* ─── DESKTOP: Full-width form + voice-first bar ─── */}
        <div className="hidden lg:flex flex-1 min-h-0">
          <div className="w-full flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              <DocumentFormPanel
                profile={profile}
                isPro={isPro}
                onPaywall={onPaywall}
              />
            </div>

            {/* ═══ Voice-First Bar ═══
                Voice LEFT = primary (Von Restorff).
                Text RIGHT = secondary alternative. */}
            <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 z-10">
              <div className="flex items-center gap-3">
                <VoiceOneShot
                  sector={profile?.sector}
                />
                <SmartTextBar
                  profile={profile}
                  isPro={isPro}
                  onPaywall={onPaywall}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── MOBILE: Scrollable form + compact voice-first bar ─── */}
        {/* FLAW 1 FIX: min-h-0 on BOTH flex containers is critical.
            Without it, flex-1 children won't shrink below their content
            height, causing the scroll to break on small viewports.
            Also: removed duplicate Create button (already in header). */}
        <div className="lg:hidden flex-1 flex flex-col min-h-0">
          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            <DocumentFormPanel
              profile={profile}
              isPro={isPro}
              onPaywall={onPaywall}
            />
          </div>

          {/* ═══ Compact Voice-First Bar ═══
              FLAW 1: Removed the full-width Create button that was here.
              It duplicated the header button and ate 64px of vertical space.
              FLAW 4: Voice button is FIRST (left), text bar is secondary. */}
          <div className="shrink-0 px-3 py-2.5 border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2.5">
              {/* HERO: Voice button first — Loi: Von Restorff Effect */}
              <VoiceOneShot
                sector={profile?.sector}
              />
              {/* ALTERNATIVE: Text input second — Loi: Hick's Law */}
              <SmartTextBar
                profile={profile}
                isPro={isPro}
                onPaywall={onPaywall}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

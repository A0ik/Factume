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
}

export default function CanvasCopilotLayout({
  profile,
  isPro,
  onPaywall,
  onSave,
  onBack,
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

  // Negative margins break out of app layout py-5/px-5 padding
  // Mobile: 100dvh - top bar (3.5rem) - BottomTabBar (4rem) | Desktop: full viewport
  return (
    <div className="flex flex-col -my-5 -mx-5 lg:-my-6 lg:-mx-8 h-[calc(100dvh-3.5rem-4rem)] lg:h-screen">

      {/* ═══════════ TOP HEADER BAR ═══════════ */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 z-20">
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
              {config.label}
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
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800"
          >
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Total</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(total)}
            </span>
          </motion.div>
        )}

        {/* Save/Create button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSave}
          disabled={saving || !hasContent}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
            hasContent && !saving
              ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
              : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed',
          )}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span className="hidden sm:inline">Cr&eacute;ation...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span className="hidden sm:inline">Cr&eacute;er</span>
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
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ─── DESKTOP: Full-width form + voice bar ─── */}
        <div className="hidden lg:flex flex-1">
          <div className="w-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <DocumentFormPanel
                profile={profile}
                isPro={isPro}
                onPaywall={onPaywall}
              />
            </div>

            {/* Voice + Text Bar — always visible at bottom */}
            <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <SmartTextBar
                  profile={profile}
                  isPro={isPro}
                  onPaywall={onPaywall}
                  className="flex-1"
                />
                <VoiceOneShot
                  sector={profile?.sector}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── MOBILE: Scrollable form + fixed bottom bar ─── */}
        <div className="lg:hidden flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <DocumentFormPanel
              profile={profile}
              isPro={isPro}
              onPaywall={onPaywall}
            />
          </div>

          {/* Bottom Bar — always visible */}
          <div className="shrink-0 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900">
            <div className="px-3 pt-2">
              <div className="flex items-center gap-2">
                <SmartTextBar
                  profile={profile}
                  isPro={isPro}
                  onPaywall={onPaywall}
                  className="flex-1"
                />
                <VoiceOneShot
                  sector={profile?.sector}
                />
              </div>
            </div>

            {/* Create button — full width */}
            <div className="px-3 py-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onSave}
                disabled={saving || !hasContent}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all',
                  hasContent && !saving
                    ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg shadow-emerald-500/20`
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed',
                )}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cr&eacute;ation...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Cr&eacute;er le document
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

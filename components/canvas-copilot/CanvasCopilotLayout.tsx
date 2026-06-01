'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Eye, MessageSquare, Save,
  Loader2, FileText, Undo2, Redo2, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentSessionStore } from './documentSessionStore';
import { DOC_TYPE_CONFIGS } from './config/documentTypeConfig';
import LivePdfCanvas from './Canvas/LivePdfCanvas';
import CopilotPanel from './Copilot/CopilotPanel';
import DoubtPopover from './DoubtResolution/DoubtPopover';

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
    pendingDoubts,
    resolveDoubts,
    dismissDoubts,
    mobileTab,
    setMobileTab,
    canUndo,
    canRedo,
    undo,
    redo,
    total,
    clientName,
    items,
  } = useDocumentSessionStore();

  const config = DOC_TYPE_CONFIGS[documentType];
  const hasContent = items.some(i => i.description || i.unit_price > 0);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {/* ─── Top Header Bar ─────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 z-20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 transition-all"
        >
          <ArrowLeft size={15} />
        </motion.button>

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

        {/* Undo/Redo */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 disabled:opacity-30 transition-all"
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 disabled:opacity-30 transition-all"
            title="Rétablir (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {/* Total indicator */}
        {hasContent && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800">
            <span className="text-[10px] text-gray-400 font-medium">Total</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(total)}
            </span>
          </div>
        )}

        {/* Save button */}
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
              <span className="hidden sm:inline">Création...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span className="hidden sm:inline">Créer</span>
            </>
          )}
        </motion.button>
      </div>

      {/* ─── Error Banner ───────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/30"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content ───────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop: Canvas (left 55%) */}
        <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] border-r border-gray-200 dark:border-white/10">
          <LivePdfCanvas profile={profile} className="w-full" />
        </div>

        {/* Desktop: Copilot (right 45%) */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[42%]">
          <div className="w-full flex flex-col">
            {/* Doubt Resolution area */}
            <AnimatePresence>
              {pendingDoubts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pt-4 overflow-y-auto max-h-[40%]"
                >
                  <DoubtPopover
                    doubts={pendingDoubts}
                    onResolve={resolveDoubts}
                    onDismiss={dismissDoubts}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Copilot Panel */}
            <div className="flex-1 overflow-hidden">
              <CopilotPanel profile={profile} isPro={isPro} onPaywall={onPaywall} />
            </div>
          </div>
        </div>

        {/* ─── Mobile: Tabbed View ──────────────────── */}
        <div className="lg:hidden flex-1 flex flex-col">
          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900">
            <button
              onClick={() => setMobileTab('copilot')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all',
                mobileTab === 'copilot'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-400',
              )}
            >
              <MessageSquare size={14} />
              Copilot
            </button>
            <button
              onClick={() => setMobileTab('canvas')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all',
                mobileTab === 'canvas'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : 'text-gray-400',
              )}
            >
              <Eye size={14} />
              Aperçu
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {mobileTab === 'canvas' ? (
                <motion.div
                  key="canvas"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                  <LivePdfCanvas profile={profile} className="h-full" />
                </motion.div>
              ) : (
                <motion.div
                  key="copilot"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full flex flex-col"
                >
                  {/* Doubts on mobile */}
                  <AnimatePresence>
                    {pendingDoubts.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-3 pt-3 overflow-y-auto max-h-[35%]"
                      >
                        <DoubtPopover
                          doubts={pendingDoubts}
                          onResolve={resolveDoubts}
                          onDismiss={dismissDoubts}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex-1 overflow-hidden">
                    <CopilotPanel profile={profile} isPro={isPro} onPaywall={onPaywall} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Eye, Save,
  Loader2, Undo2, Redo2,
  X, FileText, Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useDocumentSessionStore } from './documentSessionStore';
import { DOC_TYPE_CONFIGS } from './config/documentTypeConfig';
import PdfCanvasErrorBoundary from './Canvas/PdfCanvasErrorBoundary';
import DocumentFormPanel from './Form/DocumentFormPanel';
import VoiceOneShot from './Voice/VoiceOneShot';
import SmartTextBar from './Voice/SmartTextBar';

// Dynamic PDF canvas — SSR disabled for CSP/WASM safety
const LivePdfCanvas = dynamic(() => import('./Canvas/LivePdfCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Chargement de l&apos;aper&ccedil;u...</p>
    </div>
  ),
});

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

  // ─── Mobile State ──────────────────────────────────
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // ─── Desktop: 2-column layout ──────────────────────
  // Left: PDF Canvas (~45%) | Right: Structured Form (~55%)

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
      <div className="flex-1 flex overflow-hidden relative">

        {/* ─── DESKTOP: 2-column ──────────────────── */}
        {/* Left: PDF Canvas */}
        <div className="hidden lg:flex lg:w-[45%] border-r border-gray-200 dark:border-white/10">
          <PdfCanvasErrorBoundary className="w-full">
            <LivePdfCanvas profile={profile} className="w-full" />
          </PdfCanvasErrorBoundary>
        </div>

        {/* Right: Structured Form + Voice/Text Bar */}
        <div className="hidden lg:flex lg:w-[55%]">
          <div className="w-full flex flex-col">
            {/* The structured form — doubts are now rendered inline */}
            <div className="flex-1 overflow-y-auto">
              <DocumentFormPanel
                profile={profile}
                isPro={isPro}
                onPaywall={onPaywall}
              />
            </div>

            {/* ─── Voice + Text Bar (desktop) — always visible at bottom ─── */}
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
          {/* Form fills available space and scrolls independently */}
          <div className="flex-1 overflow-y-auto">
            <DocumentFormPanel
              profile={profile}
              isPro={isPro}
              onPaywall={onPaywall}
            />
          </div>

          {/* ─── Fixed Bottom Bar (always visible, never hidden) ─── */}
          <div className="shrink-0 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900">
            {/* Voice + Text Bar (mobile) */}
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

            {/* Action buttons */}
            <div className="flex gap-2 px-3 py-2">
              {/* Preview button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMobilePreview(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-all min-w-[100px]"
              >
                <Eye size={16} />
                Aper&ccedil;u
              </motion.button>

              {/* Create button — primary CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onSave}
                disabled={saving || !hasContent}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all',
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

          {/* ─── Mobile: Bottom Sheet for PDF Preview ─── */}
          <AnimatePresence>
            {showMobilePreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowMobilePreview(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl overflow-hidden"
                  style={{ height: '85vh' }}
                >
                  {/* Drag handle */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  </div>

                  {/* Preview header */}
                  <div className="flex items-center justify-between px-4 pb-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Aper&ccedil;u PDF</h3>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowMobilePreview(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>

                  {/* PDF Canvas in bottom sheet */}
                  <div className="h-[calc(100%-60px)]">
                    <PdfCanvasErrorBoundary className="h-full">
                      <LivePdfCanvas profile={profile} className="h-full" />
                    </PdfCanvasErrorBoundary>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

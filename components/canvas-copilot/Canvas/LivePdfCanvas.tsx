'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, Eye, FileWarning } from 'lucide-react';
import { useDocumentSessionStore } from '../documentSessionStore';
import { Invoice, Profile } from '@/types';
import { formatCurrency } from '@/lib/utils';

// ─── PDF.js lazy loader ──────────────────────────────────
// Lazy-imported to avoid SSR bundling issues (component is ssr: false).
// The worker is served from /public for zero-CDN-dependency reliability.

type PdfjsModule = typeof import('pdfjs-dist');

let _pdfjs: PdfjsModule | null = null;
let _pdfjsPromise: Promise<PdfjsModule> | null = null;

async function getPdfjs(): Promise<PdfjsModule> {
  if (_pdfjs) return _pdfjs;
  if (_pdfjsPromise) return _pdfjsPromise;

  _pdfjsPromise = import('pdfjs-dist').then((mod) => {
    // Worker served from /public — copied at build time via postinstall
    mod.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
    _pdfjs = mod;
    return mod;
  }).catch((err) => {
    // Reset so next call can retry
    _pdfjsPromise = null;
    throw err;
  });

  return _pdfjsPromise;
}

/** Reset pdfjs module — used when retrying after a failure */
function resetPdfjs() {
  _pdfjs = null;
  _pdfjsPromise = null;
}

// ─── Props ───────────────────────────────────────────────

interface LivePdfCanvasProps {
  profile: Profile | null;
  className?: string;
}

// ─── Skeleton Loader ─────────────────────────────────────

function PdfSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4">
      <div className="w-full max-w-[595px] aspect-[210/297] bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden">
        <div className="p-8 space-y-4 animate-pulse">
          {/* Header block */}
          <div className="flex justify-between">
            <div className="h-6 bg-gray-100 dark:bg-slate-700 rounded w-1/4" />
            <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-1/6" />
          </div>
          {/* Client info */}
          <div className="mt-6 space-y-2">
            <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-1/2" />
            <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-2/5" />
          </div>
          {/* Table lines */}
          <div className="mt-6 space-y-2">
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-full" />
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-5/6" />
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-4/6" />
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-full" />
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded w-3/4" />
          </div>
          {/* Total */}
          <div className="mt-6 flex justify-end">
            <div className="h-5 bg-gray-100 dark:bg-slate-700 rounded w-1/4" />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 animate-pulse">
        G&eacute;n&eacute;ration de l&apos;aper&ccedil;u...
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

/**
 * Live PDF Canvas — renders a real-time preview of the document
 * being created via pdfjs-dist on an HTML5 <canvas>.
 *
 * Flow:
 * 1. User edits → canvas marked "stale"
 * 2. After 600ms debounce → POST /api/pdf/preview → ArrayBuffer
 * 3. pdfjs-dist renders page 1 to <canvas> (HiDPI-aware)
 * 4. ResizeObserver keeps canvas responsive
 *
 * NO iframe, NO embed, NO object — pure canvas rendering.
 * Works on ALL browsers (Chrome, Firefox, Safari, Edge, iOS Safari, Android Chrome).
 */
export default function LivePdfCanvas({ profile, className }: LivePdfCanvasProps) {
  // ─── Refs ────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderTaskRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // ─── State ───────────────────────────────────────────────
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [containerWidth, setContainerWidth] = useState(595); // A4 @72dp

  const MAX_RETRIES = 5;

  // ─── Mounted guard ───────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Subscribe to store fields ───────────────────────────
  const canvasData = useDocumentSessionStore((state) => ({
    documentType: state.documentType,
    items: state.items,
    clientName: state.clientName,
    clientEmail: state.clientEmail,
    clientPhone: state.clientPhone,
    clientAddress: state.clientAddress,
    clientCity: state.clientCity,
    clientPostalCode: state.clientPostalCode,
    clientSiret: state.clientSiret,
    clientVatNumber: state.clientVatNumber,
    notes: state.notes,
    discountPercent: state.discountPercent,
    issueDate: state.issueDate,
    paymentDays: state.paymentDays,
    total: state.total,
    subtotal: state.subtotal,
    vatAmount: state.vatAmount,
    dueDate: state.dueDate,
    templateId: state.templateId,
  }));

  // ─── Synthetic Invoice from store ────────────────────────
  const syntheticInvoice = useMemo((): Invoice => {
    const d = canvasData;
    return {
      id: '__draft__',
      user_id: profile?.id || '',
      number: 'BROUILLON',
      document_type: d.documentType,
      status: 'draft',
      issue_date: d.issueDate,
      due_date: d.dueDate || undefined,
      client_id: undefined,
      client_name_override: d.clientName || undefined,
      items: d.items.map((item) => ({
        ...item,
        total: item.quantity * item.unit_price * (1 - ((item as any).discount_percent ?? 0) / 100),
      })),
      subtotal: d.subtotal,
      vat_amount: d.vatAmount,
      discount_percent: d.discountPercent > 0 ? d.discountPercent : null,
      total: d.total,
      notes: d.notes || undefined,
      client_email: d.clientEmail || undefined,
      client_phone: d.clientPhone || undefined,
      client_address: d.clientAddress || undefined,
      client_city: d.clientCity || undefined,
      client_postal_code: d.clientPostalCode || undefined,
      client_siret: d.clientSiret || undefined,
      client_vat_number: d.clientVatNumber || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Invoice;
  }, [canvasData, profile]);

  // ─── Responsive container width via ResizeObserver ───────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width - 32; // minus padding
        if (width > 50 && mountedRef.current) setContainerWidth(width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Generate PDF via server-side API ────────────────────
  const generatePdf = useCallback(async () => {
    if (generatingRef.current || !profile) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/pdf/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: syntheticInvoice,
          profile: { ...profile, template_id: canvasData.templateId },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur serveur (${res.status})`);
      }

      const arrayBuffer = await res.arrayBuffer();

      if (!mountedRef.current) return;

      setPdfData(arrayBuffer);
      setIsStale(false);
      setRetryCount(0);
    } catch (err: any) {
      if (!mountedRef.current) return;
      console.error('[LivePdfCanvas] PDF generation error:', err?.message);
      setRetryCount((prev) => prev + 1);
      setError('Erreur de pr&eacute;visualisation');
    } finally {
      generatingRef.current = false;
      if (mountedRef.current) setIsGenerating(false);
    }
  }, [syntheticInvoice, profile, canvasData.templateId]);

  // ─── Render PDF to <canvas> via pdfjs-dist ───────────────
  useEffect(() => {
    if (!pdfData) return;

    let cancelled = false;
    setIsRendering(true);

    const renderToCanvas = async () => {
      try {
        const pdfjsLib = await getPdfjs();
        if (cancelled || !mountedRef.current) return;

        // Cancel any in-progress render
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch { /* already cancelled */ }
          renderTaskRef.current = null;
        }

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
        const pdf = await loadingTask.promise;
        if (cancelled || !mountedRef.current) return;

        const page = await pdf.getPage(1);
        if (cancelled || !mountedRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Scale page to fit container width
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = (containerWidth * zoom) / baseViewport.width;
        const viewport = page.getViewport({ scale });

        // HiDPI / Retina support
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
        if (!cancelled && mountedRef.current) setIsRendering(false);
      } catch (err: any) {
        // RenderingCancelledException is normal — a newer render superseded this one
        if (err?.name === 'RenderingCancelledException') return;
        console.error('[LivePdfCanvas] Canvas render error:', err?.message);
        if (!cancelled && mountedRef.current) {
          setError('Erreur de rendu PDF');
          setIsRendering(false);
        }
      }
    };

    renderToCanvas();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
        renderTaskRef.current = null;
      }
    };
  }, [pdfData, containerWidth, zoom]);

  // ─── Debounce: regenerate PDF after 600ms of inactivity ──
  useEffect(() => {
    setIsStale(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (mountedRef.current) generatePdf();
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [syntheticInvoice]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Initial render ──────────────────────────────────────
  useEffect(() => {
    if (profile && !pdfData && mountedRef.current) {
      setRetryCount(0);
      generatePdf();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Cleanup on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
      }
    };
  }, []);

  // ─── Retry handler ───────────────────────────────────────
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    resetPdfjs();
    generatePdf();
  }, [generatePdf]);

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className={`relative flex flex-col h-full bg-gray-100 dark:bg-slate-900 ${className || ''}`}>
      {/* ─── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Aper&ccedil;u temps r&eacute;el
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Stale indicator */}
          <AnimatePresence>
            {isStale && !error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                <RefreshCw size={11} className="animate-spin" />
                <span className="text-[10px] font-medium">Mise &agrave; jour...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zoom controls */}
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            aria-label="Zoom arri&egrave;re"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] text-gray-400 font-mono w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            aria-label="Zoom avant"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* ─── Canvas Area ─────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 overflow-auto flex items-start justify-center p-4">
        {error ? (
          /* ── Error state with retry ── */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4">
              <FileWarning size={24} className="text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Aper&ccedil;u indisponible
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[260px] mb-4">
              {retryCount >= MAX_RETRIES
                ? 'Plusieurs tentatives ont échoué. Vérifiez votre connexion et réessayez.'
                : 'Le serveur n&apos;a pas pu générer l&apos;aperçu. Réessayez.'}
            </p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              <RefreshCw size={14} />
              R&eacute;essayer
            </button>
          </div>
        ) : pdfData ? (
          /* ── PDF rendered on canvas ── */
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="bg-white shadow-2xl rounded-lg"
            />
            {/* Rendering overlay spinner */}
            <AnimatePresence>
              {isRendering && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 rounded-lg flex items-center justify-center backdrop-blur-[2px]"
                >
                  <Loader2 size={20} className="text-gray-400 animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* ── Skeleton loader ── */
          <PdfSkeleton />
        )}
      </div>

      {/* ─── Quick Stats Bar ─────────────────────────────────── */}
      <div className="px-4 py-2 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase">Total TTC</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(canvasData.total)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 uppercase">Lignes</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {canvasData.items.filter((i) => i.description || i.unit_price > 0).length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canvasData.clientName ? (
            <span className="text-[10px] text-emerald-500 font-semibold">
              ● {canvasData.clientName}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">Aucun client</span>
          )}
        </div>
      </div>
    </div>
  );
}

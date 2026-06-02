'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, Eye, FileWarning } from 'lucide-react';
import { useDocumentSessionStore } from '../documentSessionStore';
import { Invoice, InvoiceItem, Profile } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface LivePdfCanvasProps {
  profile: Profile | null;
  className?: string;
}

/**
 * Live PDF Canvas — renders a real-time preview of the document
 * being created via a server-side API endpoint.
 *
 * Strategy:
 * 1. User edits mark canvas as "stale"
 * 2. After 500ms of inactivity, PDF regenerates via /api/pdf/preview
 * 3. Server uses @react-pdf/renderer (no CSP restrictions)
 * 4. Client displays the returned PDF in an iframe
 *
 * This approach works on ALL browsers (Chrome, Firefox, Safari, Edge)
 * including iOS Safari, because the PDF generation happens server-side
 * where there are no CSP 'unsafe-eval' restrictions.
 */
export default function LivePdfCanvas({ profile, className }: LivePdfCanvasProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pdfEngineFailed, setPdfEngineFailed] = useState(false);
  const generatingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Subscribe to fields that affect the canvas
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
  }));

  /**
   * Build a synthetic Invoice object from session state
   * that the server-side PdfDocument can render.
   */
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

  /**
   * Generate PDF via server-side API.
   * No @react-pdf/renderer import on the client — no CSP issues.
   */
  const generatePdf = useCallback(async () => {
    if (generatingRef.current || !profile || pdfEngineFailed || retryCountRef.current >= MAX_RETRIES) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/pdf/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: syntheticInvoice, profile }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur serveur (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setIsStale(false);
      retryCountRef.current = 0;
    } catch (err: any) {
      console.error('[LivePdfCanvas] PDF generation error:', err);

      retryCountRef.current += 1;
      if (retryCountRef.current >= MAX_RETRIES) {
        console.warn('[LivePdfCanvas] Max retries reached, disabling PDF engine');
        setPdfEngineFailed(true);
      }

      setError('Erreur de prévisualisation');
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }, [syntheticInvoice, profile, pdfEngineFailed]);

  // Debounce: regenerate PDF after 500ms of inactivity
  useEffect(() => {
    if (pdfEngineFailed) return;
    setIsStale(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      generatePdf();
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [syntheticInvoice, pdfEngineFailed]);

  // Initial render
  useEffect(() => {
    if (profile && !pdfUrl && !pdfEngineFailed) {
      generatePdf();
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── PDF Engine disabled fallback ──────────────────────
  const renderPdfEngineFallback = () => (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4">
        <FileWarning size={24} className="text-amber-500" />
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        Aperçu indisponible
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[240px]">
        Le moteur PDF n&apos;a pas pu se charger. Votre document sera toujours créé correctement.
      </p>
    </div>
  );

  return (
    <div className={`relative flex flex-col h-full bg-gray-100 dark:bg-slate-900 ${className || ''}`}>
      {/* Canvas Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Aperçu temps réel
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Stale indicator */}
          <AnimatePresence>
            {isStale && !pdfEngineFailed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                <RefreshCw size={11} className="animate-spin" />
                <span className="text-[10px] font-medium">Mise à jour...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zoom controls — hidden when engine is disabled */}
          {!pdfEngineFailed && (
            <>
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] text-gray-400 font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
              >
                <ZoomIn size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {pdfEngineFailed ? (
          renderPdfEngineFallback()
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
              <RefreshCw size={20} className="text-red-400" />
            </div>
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={generatePdf}
              className="mt-3 text-xs text-blue-500 hover:text-blue-600 font-semibold"
            >
              Réessayer
            </button>
          </div>
        ) : pdfUrl ? (
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            className="transition-transform duration-200"
          >
            <iframe
              src={pdfUrl}
              className="w-[595px] h-[842px] bg-white shadow-2xl rounded-lg"
              title="Aperçu du document"
              style={{ border: 'none' }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 size={32} className="text-gray-300 dark:text-gray-600 animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Génération de l&apos;aperçu...</p>
          </div>
        )}
      </div>

      {/* Quick Stats Bar */}
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
              {canvasData.items.filter(i => i.description || i.unit_price > 0).length}
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

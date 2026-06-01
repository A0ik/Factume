'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, Eye } from 'lucide-react';
import { useDocumentSessionStore } from '../documentSessionStore';
import { Invoice, InvoiceItem, Profile, Client } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface LivePdfCanvasProps {
  profile: Profile | null;
  className?: string;
}

/**
 * Live PDF Canvas — renders a real-time preview of the document
 * being created using @react-pdf/renderer.
 *
 * Uses a 3-tier debounce strategy:
 * 1. User edits mark canvas as "stale"
 * 2. After 500ms of inactivity, PDF regenerates
 * 3. Always shows last generated PDF while new one is rendering
 */
export default function LivePdfCanvas({ profile, className }: LivePdfCanvasProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const generatingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // clientId is tracked in canvasData above; clients fetched from dataStore in the page

  /**
   * Build a synthetic Invoice object from session state
   * that PdfDocument can render
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
   * Generate PDF blob from the synthetic invoice
   */
  const generatePdf = useCallback(async () => {
    if (generatingRef.current || !profile) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { default: PdfDocument } = await import('@/components/pdf-document');

      const element = React.createElement(PdfDocument, {
        invoice: syntheticInvoice,
        profile: profile || {} as Profile,
      });

      const blob = await pdf(element as any).toBlob();
      const url = URL.createObjectURL(blob);

      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setIsStale(false);
    } catch (err: any) {
      console.error('[LivePdfCanvas] PDF generation error:', err);
      setError('Erreur de prévisualisation');
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }, [syntheticInvoice, profile]);

  // Debounce: regenerate PDF after 500ms of inactivity
  useEffect(() => {
    setIsStale(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      generatePdf();
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [syntheticInvoice]);

  // Initial render
  useEffect(() => {
    if (profile && !pdfUrl) {
      generatePdf();
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, []);

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
            {isStale && (
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

          {/* Zoom controls */}
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
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {error ? (
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
            <p className="text-sm text-gray-400 mt-3">Génération de l'aperçu...</p>
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

// Need React for createElement
import React from 'react';

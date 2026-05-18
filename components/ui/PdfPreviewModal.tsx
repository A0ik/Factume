'use client';

import { X, Loader2, Download, ExternalLink, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Invoice, Profile } from '@/types';
import { generateInvoiceHtml } from '@/lib/pdf';

interface PdfPreviewModalProps {
  invoice: Invoice;
  profile?: Profile | null;
  onClose: () => void;
}

const MOBILE_REGEX = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i;

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return MOBILE_REGEX.test(navigator.userAgent);
}

export function PdfPreviewModal({ invoice, profile, onClose }: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [useHtmlFallback, setUseHtmlFallback] = useState(false);
  const urlRef = useRef<string>('');
  const isMobile = isMobileDevice();

  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      // Custom templates can't be rendered by React-PDF → use HTML
      if (profile?.custom_template_html) {
        setHtml(generateInvoiceHtml(invoice, profile));
        setUseHtmlFallback(true);
        setLoading(false);
        return;
      }

      // On mobile, always use HTML fallback - most mobile browsers can't render PDF blobs in iframes
      if (isMobile) {
        setHtml(generateInvoiceHtml(invoice, profile));
        setUseHtmlFallback(true);
        setLoading(false);
        // Also generate PDF in background for download button
        try {
          const { pdf } = await import('@react-pdf/renderer');
          const { PdfDocument } = await import('@/components/pdf-document');
          const element = React.createElement(PdfDocument, { invoice, profile: profile || {} as Profile });
          const blob = await (pdf as any)(element).toBlob();
          if (!cancelled) {
            const url = URL.createObjectURL(blob);
            urlRef.current = url;
            setPdfUrl(url);
          }
        } catch {
          // PDF generation in background failed, that's fine - HTML is already showing
        }
        return;
      }

      // Desktop: use React-PDF for high quality rendering
      try {
        const { pdf } = await import('@react-pdf/renderer');
        const { PdfDocument } = await import('@/components/pdf-document');
        const element = React.createElement(PdfDocument, { invoice, profile: profile || {} as Profile });
        const blob = await (pdf as any)(element).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPdfUrl(url);
        setLoading(false);
      } catch {
        // Fallback to HTML if React-PDF fails
        if (!cancelled) {
          setHtml(generateInvoiceHtml(invoice, profile));
          setUseHtmlFallback(true);
          setLoading(false);
        }
      }
    };

    generate();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [invoice, profile, isMobile]);

  const handleDownload = async () => {
    try {
      if (isMobile) {
        // On mobile, use server endpoint for download
        window.location.href = `/api/download/pdf/${invoice.id}`;
        return;
      }

      if (useHtmlFallback) {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.number.replace(/\//g, '-')}.html`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      } else if (pdfUrl) {
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.number.replace(/\//g, '-')}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      }
    } catch (error) {
      console.error('[PDF Download Error]', error);
      // Ultimate fallback: use server endpoint
      window.location.href = `/api/download/pdf/${invoice.id}`;
    }
  };

  const handleOpenNewTab = () => {
    if (isMobile || !pdfUrl) {
      // On mobile or no PDF blob, use server endpoint
      window.open(`/api/download/pdf/${invoice.id}`, '_blank');
    } else if (useHtmlFallback) {
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } else {
      window.open(pdfUrl, '_blank');
    }
  };

  const isReady = !loading && (pdfUrl || html);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col">
      {/* Header - Mobile First Design */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 truncate">Aperçu PDF</h2>
            <p className="text-[10px] text-gray-500 truncate">
              {invoice.number}
              {isMobile && useHtmlFallback && !pdfUrl && ' • Aperçu HTML'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors flex-shrink-0"
        >
          Fermer
        </button>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={handleDownload}
          disabled={!isReady}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 flex-shrink-0"
        >
          <Download size={14} />
          <span>{isMobile ? 'Ouvrir PDF' : 'Télécharger'}</span>
        </button>
        <button
          onClick={handleOpenNewTab}
          disabled={!isReady}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <ExternalLink size={14} />
          <span>Nouvel onglet</span>
        </button>
        {isMobile && useHtmlFallback && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400 flex-shrink-0">
            <Smartphone size={12} />
            Aperçu optimisé mobile
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-100 p-2 sm:p-4 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-gray-500">Génération de l'aperçu...</p>
            </div>
          </div>
        ) : useHtmlFallback ? (
          <iframe
            srcDoc={html}
            className="w-full h-full rounded-xl border-0 shadow-lg bg-white"
            title="PDF Preview"
            sandbox="allow-same-origin allow-scripts allow-popups allow-modals"
          />
        ) : (
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-xl border-0 shadow-lg bg-white"
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  );
}

export default PdfPreviewModal;

'use client';

import { X, Loader2, Download, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Invoice, Profile } from '@/types';
import { generateInvoiceHtml } from '@/lib/pdf';

interface PdfPreviewModalProps {
  invoice: Invoice;
  profile?: Profile | null;
  onClose: () => void;
}

export function PdfPreviewModal({ invoice, profile, onClose }: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [useHtmlFallback, setUseHtmlFallback] = useState(false);
  const urlRef = useRef<string>('');

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

      // Use same React-PDF renderer as the email attachment
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
  }, [invoice, profile]);

  const handleDownload = () => {
    if (useHtmlFallback) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.number.replace(/\//g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    } else if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${invoice.number.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleOpenNewTab = () => {
    if (useHtmlFallback) {
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const isReady = !loading && (pdfUrl || html);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Aperçu du PDF</h2>
              <p className="text-xs text-gray-500">{invoice.number} · {profile?.company_name || 'Sans nom'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!isReady}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Download size={16} />
              Télécharger
            </button>
            <button
              onClick={handleOpenNewTab}
              disabled={!isReady}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <ExternalLink size={16} />
              Ouvrir dans un onglet
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={40} className="animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-gray-500">Génération de l'aperçu...</p>
              </div>
            </div>
          ) : useHtmlFallback ? (
            <iframe
              srcDoc={html}
              className="w-full h-full rounded-xl border-0 shadow-lg bg-white"
              title="PDF Preview"
              sandbox="allow-same-origin"
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
    </div>
  );
}

export default PdfPreviewModal;

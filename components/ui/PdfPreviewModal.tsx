'use client';

import { X, Loader2, Download, ExternalLink, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Invoice, Profile } from '@/types';

interface PdfPreviewModalProps {
  invoice: Invoice;
  profile?: Profile | null;
  onClose: () => void;
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export function PdfPreviewModal({ invoice, profile, onClose }: PdfPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const urlRef = useRef<string>('');

  // On iOS, the server URL is used directly (no blob) — iOS Safari renders server-served PDFs natively
  // On desktop/Android, we generate a blob URL for the iframe
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const ios = isIOSSafari();
  const serverPdfUrl = `/api/download/pdf/${invoice.id}`;
  const previewServerUrl = `/api/download/pdf/${invoice.id}?mode=preview`;

  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      // iOS: use server URL directly — Safari can render server-served PDFs in iframe
      // This avoids the blob URL blank page issue on iOS
      if (ios) {
        // Verify the server endpoint responds before showing the iframe
        try {
          const res = await fetch(previewServerUrl, { method: 'HEAD' });
          if (res.ok && !cancelled) {
            setPreviewUrl(previewServerUrl);
            setLoading(false);
          } else if (!cancelled) {
            setError('Impossible de générer l\'aperçu PDF');
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setError('Erreur réseau');
            setLoading(false);
          }
        }
        return;
      }

      // Desktop / Android: try client-side React-PDF first, then server blob
      try {
        const { pdf } = await import('@react-pdf/renderer');
        const { PdfDocument } = await import('@/components/pdf-document');
        const element = React.createElement(PdfDocument, { invoice, profile: profile || {} as Profile });
        const blob = await (pdf as any)(element).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPreviewUrl(url);
        setLoading(false);
        return;
      } catch {
        // Client-side failed, try server blob
      }

      try {
        const response = await fetch(previewServerUrl);
        if (response.ok && !cancelled) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setPreviewUrl(url);
          setLoading(false);
        } else if (!cancelled) {
          setError('Impossible de générer l\'aperçu PDF');
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Erreur réseau lors de la génération du PDF');
          setLoading(false);
        }
      }
    };

    generate();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [invoice, profile, ios, previewServerUrl]);

  const handleDownload = () => {
    // On mobile (iOS/Android), navigate to server PDF — triggers native share/download
    if (isMobile()) {
      window.location.href = serverPdfUrl;
      return;
    }
    // Desktop: open server URL which returns Content-Disposition: attachment
    window.location.href = serverPdfUrl;
  };

  const handleOpenNewTab = () => {
    window.open(serverPdfUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 truncate">Aperçu PDF</h2>
            <p className="text-[10px] text-gray-500 truncate">{invoice.number}</p>
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
          disabled={!previewUrl && !error}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 flex-shrink-0"
        >
          <Download size={14} />
          {isMobile() ? 'Ouvrir / Partager' : 'Télécharger PDF'}
        </button>
        <button
          onClick={handleOpenNewTab}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <ExternalLink size={14} />
          Nouvel onglet
        </button>
        {ios && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400 flex-shrink-0">
            <Smartphone size={12} />
            Aperçu iOS
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-100 p-2 sm:p-4 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-gray-500">Génération de l'aperçu PDF...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <X size={24} className="text-red-500" />
              </div>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={handleOpenNewTab}
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold"
              >
                Ouvrir dans un nouvel onglet
              </button>
            </div>
          </div>
        ) : (
          <iframe
            src={previewUrl}
            className="w-full h-full rounded-xl border-0 shadow-lg bg-white"
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  );
}

export default PdfPreviewModal;

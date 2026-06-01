'use client';

import {
  X,
  Loader2,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  FileText,
  Share,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Invoice, Profile } from '@/types';

interface PdfPreviewModalProps {
  invoice: Invoice;
  profile?: Profile | null;
  onClose: () => void;
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent,
  );
}

type RenderMode = 'loading' | 'canvas' | 'iframe' | 'error';

/**
 * PdfPreviewModal -- 2026 Canvas-Based PDF Preview
 *
 * Problem: iOS Safari (WebKit) cannot render PDF blob URLs in iframes.
 * All iOS browsers use Apple's WebKit engine, so they all share this bug.
 *
 * Solution: Use pdfjs-dist (already installed) to render PDF pages
 * directly to HTML5 Canvas elements, then display as images.
 * This bypasses ALL iframe/WebKit/blob issues because it's pure Canvas.
 *
 * Fallback chain:
 *   1. Canvas rendering (pdfjs-dist) -- works on ALL platforms
 *   2. Iframe with blob URL -- works on desktop/Android
 *   3. Error state with download/new-tab buttons -- always available
 */
export function PdfPreviewModal({
  invoice,
  profile,
  onClose,
}: PdfPreviewModalProps) {
  const [mode, setMode] = useState<RenderMode>('loading');
  const [error, setError] = useState<string>('');
  const [numPages, setNumPages] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [iframeUrl, setIframeUrl] = useState('');
  const iframeUrlRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF and render to canvas images
  useEffect(() => {
    let cancelled = false;

    const loadAndRender = async () => {
      // === LEVEL 1: Canvas rendering via pdfjs-dist ===
      try {
        const pdfjsLib = await import('pdfjs-dist');

        // Configure worker from CDN (avoids bundling issues with Next.js)
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        } catch {
          // Worker failed to load -- will run in main thread (slower but functional)
        }

        // Get PDF binary data
        let arrayBuffer: ArrayBuffer;

        try {
          // Client-side generation using @react-pdf/renderer (fast, no network)
          const { pdf } = await import('@react-pdf/renderer');
          const { PdfDocument } = await import('@/components/pdf-document');
          const element = React.createElement(PdfDocument, {
            invoice,
            profile: profile || ({} as Profile),
          });
          const blob = await (pdf as any)(element).toBlob();
          arrayBuffer = await blob.arrayBuffer();
        } catch {
          // Client-side failed -- fetch from server endpoint
          const response = await fetch(
            `/api/download/pdf/${invoice.id}?mode=preview`,
          );
          if (!response.ok) throw new Error('Erreur serveur');
          const blob = await response.blob();
          arrayBuffer = await blob.arrayBuffer();
        }

        if (cancelled) return;

        // Parse the PDF document
        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        }).promise;
        if (cancelled) return;

        setNumPages(doc.numPages);

        // Render each page to an off-screen canvas, convert to image
        const images: string[] = [];
        const RENDER_SCALE = 2.0; // High quality for crisp text on retina

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvas,
            viewport,
          }).promise;

          // JPEG at 92% quality -- good balance of quality vs memory
          images.push(canvas.toDataURL('image/jpeg', 0.92));
        }

        if (cancelled) return;

        setPageImages(images);
        setMode('canvas');
        return; // Success -- skip fallbacks
      } catch {
        // Canvas rendering failed -- proceed to fallback
      }

      if (cancelled) return;

      // === LEVEL 2: Iframe fallback (works on desktop/Android) ===
      try {
        const { pdf } = await import('@react-pdf/renderer');
        const { PdfDocument } = await import('@/components/pdf-document');
        const element = React.createElement(PdfDocument, {
          invoice,
          profile: profile || ({} as Profile),
        });
        const blob = await (pdf as any)(element).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        iframeUrlRef.current = url;
        setIframeUrl(url);
        setMode('iframe');
        return;
      } catch {
        // Iframe fallback also failed
      }

      if (cancelled) return;

      // === LEVEL 3: Error state with download buttons ===
      setError(
        "Impossible de generer l'apercu. Vous pouvez telecharger le PDF.",
      );
      setMode('error');
    };

    loadAndRender();

    return () => {
      cancelled = true;
      if (iframeUrlRef.current) {
        URL.revokeObjectURL(iframeUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id]);

  const serverPdfUrl = `/api/download/pdf/${invoice.id}`;

  const handleDownload = () => {
    window.location.href = serverPdfUrl;
  };

  const handleOpenNewTab = () => {
    window.open(serverPdfUrl, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: invoice.number,
          url: window.location.origin + serverPdfUrl,
        });
      } catch {
        // User cancelled or share API unavailable
      }
    } else {
      handleOpenNewTab();
    }
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              Apercu
            </h2>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
              {invoice.number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Zoom controls (canvas mode only) */}
          {mode === 'canvas' && (
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 w-9 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200/50 dark:bg-slate-800/50"
      >
        {/* Loading */}
        {mode === 'loading' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <Loader2
                size={32}
                className="animate-spin text-primary mx-auto mb-3"
              />
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Generation de l&apos;apercu...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {mode === 'error' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <X size={28} className="text-red-500" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mb-5 leading-relaxed">
                {error}
              </p>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all"
                >
                  <Download size={16} />
                  Telecharger PDF
                </button>
                <button
                  onClick={handleOpenNewTab}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink size={16} />
                  Nouvel onglet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas images (primary -- works on ALL platforms including iOS) */}
        {mode === 'canvas' && (
          <div
            className="min-w-full inline-flex flex-col items-center gap-4 p-3 sm:p-5"
            style={{ width: zoom > 1 ? `${zoom * 100}%` : undefined }}
          >
            {pageImages.map((img, i) => (
              <div key={i} className="w-full flex flex-col items-center">
                <div
                  className="bg-white shadow-xl rounded-lg overflow-hidden"
                  style={{ maxWidth: zoom <= 1 ? '600px' : undefined }}
                >
                  <img
                    src={img}
                    alt={`Page ${i + 1}`}
                    className="w-full h-auto"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </div>
                {numPages > 1 && (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 font-medium">
                    Page {i + 1} sur {numPages}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Iframe fallback (desktop/Android) */}
        {mode === 'iframe' && (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0 bg-white"
            title="PDF Preview"
          />
        )}
      </div>

      {/* ── Bottom Actions ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-white/10 flex-shrink-0 safe-area-bottom">
        {/* Mobile zoom controls (canvas mode) */}
        {mode === 'canvas' && (
          <div className="flex sm:hidden items-center gap-0.5 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              className="p-1.5 rounded-md active:bg-gray-200 dark:active:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-30"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[9px] font-semibold text-gray-500 dark:text-slate-400 w-7 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= 3}
              className="p-1.5 rounded-md active:bg-gray-200 dark:active:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-30"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        )}

        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all active:scale-[0.98]"
        >
          <Download size={16} />
          {isMobile() ? 'Ouvrir / Partager' : 'Telecharger PDF'}
        </button>

        <button
          onClick={handleOpenNewTab}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.95]"
          title="Ouvrir dans un nouvel onglet"
        >
          <ExternalLink size={18} />
        </button>

        {isMobile() &&
          typeof navigator !== 'undefined' &&
          'share' in navigator && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.95]"
              title="Partager"
            >
              <Share size={18} />
            </button>
          )}
      </div>
    </div>
  );
}

export default PdfPreviewModal;

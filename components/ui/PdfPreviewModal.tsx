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
import { Invoice, Profile } from '@/types';
import { getPaymentUrl } from '@/lib/pdf';

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

type RenderMode = 'loading' | 'canvas' | 'error';

/**
 * PdfPreviewModal — 2026 Canvas-Based PDF Preview.
 *
 * PROMETHEUS (CIBLE 4) — parité stricte preview == download.
 *
 * On ne rend JAMAIS via @react-pdf/renderer : ce moteur n'implémentait pas les
 * templates 7/8/9 (PUR/AUDACE/ÉLÉGANCE) et divergeait donc du PDF téléchargé.
 * Désormais l'aperçu provient UNIQUEMENT du même endpoint serveur pdf-lib que le
 * téléchargement (/api/download/pdf/[id]?mode=preview) — les octets sont identiques,
 * le rendu l'est donc aussi (au pixel près). Si le serveur est injoignable, on
 * affiche l'état d'erreur (avec le bouton de téléchargement, qui frappe le même
 * endpoint) plutôt qu'un aperçu trompeusement différent.
 *
 * Rendu Canvas via pdfjs-dist : fonctionne sur TOUTES les plateformes, y compris
 * iOS Safari/WebKit (qui ne sait pas afficher un blob PDF en iframe).
 */
export function PdfPreviewModal({
  invoice,
  onClose,
}: PdfPreviewModalProps) {
  const [mode, setMode] = useState<RenderMode>('loading');
  const [error, setError] = useState<string>('');
  const [numPages, setNumPages] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // ALCHEMIST — l'URL résolue change quand l'utilisateur crée/régénère un lien de
  // paiement. En l'ajoutant aux dépendances du rendu, l'aperçu se rafraîchit au
  // lieu de garder un QR absent/obsolète (l'ancien code ne dépendait que de invoice.id).
  const paymentUrl = getPaymentUrl(invoice);

  // Load PDF (serveur pdf-lib) and render to canvas images
  useEffect(() => {
    let cancelled = false;

    const loadAndRender = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');

        // Configure worker from CDN (avoids bundling issues with Next.js)
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        } catch {
          // Worker failed to load -- will run in main thread (slower but functional)
        }

        // OVERLORD/PROMETHEUS (CIBLE 4) — UNIQUEMENT le serveur pdf-lib (même moteur
        // que le téléchargement) → preview == download garanti. Aucun repli
        // @react-pdf/renderer (templates 7/8/9 absents → divergence).
        const response = await fetch(`/api/download/pdf/${invoice.id}?mode=preview`);
        if (!response.ok) throw new Error('Erreur serveur');
        const arrayBuffer = await (await response.blob()).arrayBuffer();

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
      } catch {
        // Serveur injoignable ou rendu échoué. Pas de repli @react-pdf : on
        // affiche l'état d'erreur (le bouton Télécharger frappe le même endpoint).
        if (cancelled) return;
        setError(
          "Impossible de générer l'aperçu. Vous pouvez télécharger le PDF.",
        );
        setMode('error');
      }
    };

    loadAndRender();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id, paymentUrl]);

  const serverPdfUrl = `/api/download/pdf/${invoice.id}`;

  // PROMETHEUS (CIBLE 5) — téléchargement mobile parfait : sur iOS/Android on
  // récupère le blob et on invoque navigator.share({files}) pour ouvrir la feuille
  // de partage NATIVE avec le vrai fichier PDF (enregistrer dans Fichiers,
  // WhatsApp, mail…). Sur desktop, on laisse la navigation (attachment →
  // téléchargement). Repli sur navigation si l'API share/files est absente.
  const handleDownload = async () => {
    const mobile = isMobile();
    if (mobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const res = await fetch(serverPdfUrl);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File(
            [blob],
            `${invoice.number.replace(/[/\r\n"']/g, '-')}.pdf`,
            { type: 'application/pdf' },
          );
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: invoice.number });
            return; // partage effectué (ou annulé par l'utilisateur)
          }
        }
      } catch (e: any) {
        // Annulation utilisateur → on ne fait rien ; autre erreur → repli navigation.
        if (e?.name === 'AbortError') return;
      }
    }
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
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              Aperçu
            </h2>
            <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate">
              {invoice.number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Zoom controls (canvas mode only) */}
          {mode === 'canvas' && (
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-lg p-0.5">
              <button
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-600 dark:text-zinc-300 disabled:opacity-30 transition-colors"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 w-9 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-600 dark:text-zinc-300 disabled:opacity-30 transition-colors"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-700 dark:text-zinc-200 text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200/50 dark:bg-white/[0.03]"
      >
        {/* Loading */}
        {mode === 'loading' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <Loader2
                size={32}
                className="animate-spin text-primary mx-auto mb-3"
              />
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Génération de l&apos;aperçu...
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
                  Télécharger PDF
                </button>
                <button
                  onClick={handleOpenNewTab}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-gray-700 dark:text-zinc-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
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
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-2 font-medium">
                    Page {i + 1} sur {numPages}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Actions ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-white/10 flex-shrink-0 safe-area-bottom">
        {/* Mobile zoom controls (canvas mode) */}
        {mode === 'canvas' && (
          <div className="flex sm:hidden items-center gap-0.5 bg-gray-100 dark:bg-white/[0.04] rounded-lg p-0.5">
            <button
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              className="p-1.5 rounded-md active:bg-gray-200 dark:active:bg-white/[0.08] text-gray-600 dark:text-zinc-300 disabled:opacity-30"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[9px] font-semibold text-gray-500 dark:text-zinc-400 w-7 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= 3}
              className="p-1.5 rounded-md active:bg-gray-200 dark:active:bg-white/[0.08] text-gray-600 dark:text-zinc-300 disabled:opacity-30"
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
          {isMobile() ? 'Ouvrir / Partager' : 'Télécharger PDF'}
        </button>

        <button
          onClick={handleOpenNewTab}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors active:scale-[0.95]"
          title="Ouvrir dans un nouvel onglet"
        >
          <ExternalLink size={18} />
        </button>

        {isMobile() &&
          typeof navigator !== 'undefined' &&
          'share' in navigator && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors active:scale-[0.95]"
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

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  X, ZoomIn, ZoomOut, Download, RotateCw, Maximize2, ChevronLeft, ChevronRight,
  FileText, Calendar, Building2, CreditCard, AlertCircle, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceViewerProps {
  expense: {
    id: string;
    vendor: string;
    amount: number;
    date: string;
    receipt_url: string | null;
    receipt_storage_path: string | null;
    description?: string;
    category?: string;
    invoice_number?: string;
    ocr_confidence?: number;
  };
  onClose?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceViewer({ expense, onClose, className }: InvoiceViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  const loadImage = useCallback(async () => {
    if (!expense.receipt_url) return;

    setLoading(true);
    setError(null);

    try {
      // Create a cache-busting URL
      const url = `${expense.receipt_url}?t=${Date.now()}`;

      // Fetch with auth header
      const response = await fetch(url);
      if (!response.ok) throw new Error('Impossible de charger l\'image');

      const blob = await response.blob();
      const src = URL.createObjectURL(blob);
      setImageSrc(src);
    } catch (err) {
      console.error('Error loading image:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      toast.error('Impossible de charger la facture');
    } finally {
      setLoading(false);
    }
  }, [expense.receipt_url]);

  // Load image on mount and revoke object URL on unmount
  useEffect(() => {
    loadImage();
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadImage]);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Download
  const handleDownload = async () => {
    if (!imageSrc) return;

    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture_${expense.vendor}_${expense.date}.${blob.type.includes('pdf') ? 'pdf' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Téléchargement réussi');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  // Confidence indicator
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-amber-500';
    return 'text-red-500';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return AlertCircle;
    if (confidence >= 0.8) return CheckCircle;
    if (confidence >= 0.6) return AlertCircle;
    return AlertCircle;
  };

  const ConfidenceIcon = getConfidenceIcon(expense.ocr_confidence);

  return (
    <div className={cn('fixed inset-0 z-50 bg-black', className)}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Invoice Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>

            <div>
              <h3 className="text-white font-bold text-lg">{expense.vendor}</h3>
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(expense.date).toLocaleDateString('fr-FR')}
                </span>
                <span>•</span>
                <span className="font-semibold text-white">{formatCurrency(expense.amount)}</span>
                {expense.ocr_confidence && (
                  <>
                    <span>•</span>
                    <span className={cn('flex items-center gap-1', getConfidenceColor(expense.ocr_confidence))}>
                      <ConfidenceIcon size={14} />
                      {Math.round(expense.ocr_confidence * 100)}% confiance
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleZoomOut}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20"
              title="Zoom arrière"
            >
              <ZoomOut size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleResetZoom}
              className="px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 font-mono text-sm"
            >
              {Math.round(zoom * 100)}%
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleZoomIn}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20"
              title="Zoom avant"
            >
              <ZoomIn size={20} />
            </motion.button>

            <div className="w-px h-8 bg-white/20 mx-2" />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRotate}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20"
              title="Pivoter"
            >
              <RotateCw size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20"
              title="Télécharger"
            >
              <Download size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20"
              title="Fermer"
            >
              <X size={20} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-white/70 text-sm">Chargement de la facture...</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 text-center max-w-md"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Erreur de chargement</h3>
                <p className="text-white/70 text-sm mt-1">{error}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadImage}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20"
              >
                Réessayer
              </motion.button>
            </motion.div>
          )}

          {imageSrc && !loading && !error && (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <img
                src={imageSrc}
                alt={`Facture ${expense.vendor}`}
                className="max-w-none max-h-[80vh] object-contain rounded-lg shadow-2xl"
                draggable={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      {expense.description && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
        >
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <p className="text-white text-sm">
                <span className="font-semibold">Description :</span> {expense.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default InvoiceViewer;

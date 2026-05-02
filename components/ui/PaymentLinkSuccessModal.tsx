'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, X, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentLinkSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentLinkUrl: string;
  invoiceNumber: string;
  invoiceTotal: number;
  onDownloadPdf?: () => Promise<void>;
}

/**
 * Modal de succès après création d'un lien de paiement
 * Permet de copier le lien, de l'ouvrir ou de télécharger la facture avec QR code
 */
export function PaymentLinkSuccessModal({
  isOpen,
  onClose,
  paymentLinkUrl,
  invoiceNumber,
  invoiceTotal,
  onDownloadPdf,
}: PaymentLinkSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentLinkUrl);
      setCopied(true);
      toast.success('Lien copié dans le presse-papiers !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const handleOpenLink = () => {
    window.open(paymentLinkUrl, '_blank');
  };

  const handleDownload = async () => {
    if (!onDownloadPdf) return;
    setDownloading(true);
    try {
      await onDownloadPdf();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors du téléchargement.');
    } finally {
      setDownloading(false);
    }
  };

  const fmtAmount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceTotal);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
            <Check size={32} className="text-white" />
          </div>

          <h2 className="text-2xl font-black text-white mb-2">
            Lien de paiement créé !
          </h2>
          <p className="text-emerald-50">
            {invoiceNumber} · {fmtAmount}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Lien affiché */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              Lien de paiement
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <input
                type="text"
                value={paymentLinkUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate font-mono"
              />
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  copied
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Envoyez ce lien</strong> à votre client par email, SMS ou WhatsApp pour recevoir le paiement.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold hover:opacity-90 transition-all"
            >
              <Copy size={18} />
              {copied ? 'Copié !' : 'Copier le lien'}
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading || !onDownloadPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {downloading ? 'Génération...' : 'Télécharger la facture (PDF)'}
            </button>

            <button
              onClick={handleOpenLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              <ExternalLink size={18} />
              Ouvrir le lien
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentLinkSuccessModal;

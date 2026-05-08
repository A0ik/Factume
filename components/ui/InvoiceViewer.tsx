'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  X, ZoomIn, ZoomOut, Download, RotateCw, FileText, Calendar,
  AlertCircle, CheckCircle, RefreshCw, Edit2, Save, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import { UpdatedExpenseData } from '@/types';

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
  onReanalyzed?: (updatedExpense: UpdatedExpenseData) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceViewer({ expense, onClose, onReanalyzed, className }: InvoiceViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  // Inline edit state
  const [editing, setEditing] = useState(false);
  const [editVendor, setEditVendor] = useState(expense.vendor);
  const [editAmount, setEditAmount] = useState(String(expense.amount));
  const [editDate, setEditDate] = useState(expense.date);
  const [saving, setSaving] = useState(false);

  const isPdf = Boolean(
    expense.receipt_storage_path?.toLowerCase().endsWith('.pdf') ||
    expense.receipt_url?.toLowerCase().includes('.pdf')
  );

  // Zoom / rotate
  const handleZoomIn = () => setZoom(p => Math.min(p + 0.25, 4));
  const handleZoomOut = () => setZoom(p => Math.max(p - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);
  const handleRotate = () => setRotation(p => (p + 90) % 360);

  // Download — direct link
  const handleDownload = () => {
    if (!expense.receipt_url) return;
    const a = document.createElement('a');
    a.href = expense.receipt_url;
    a.download = `facture_${expense.vendor}_${expense.date}${isPdf ? '.pdf' : '.jpg'}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Téléchargement lancé');
  };

  // Re-analyze with OCR
  const handleReanalyze = async () => {
    if (!expense.receipt_url) return;
    setReanalyzing(true);
    try {
      const res = await fetch('/api/ai/ocr-reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expense_id: expense.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur re-analyse');
      toast.success('Facture re-analysée avec succès');
      onReanalyzed?.(data.expense);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la re-analyse');
    } finally {
      setReanalyzing(false);
    }
  };

  // Save inline edits
  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      const { getSupabaseClient } = await import('@/lib/supabase');
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('expenses')
        .update({
          vendor: editVendor.trim(),
          amount: parseFloat(editAmount) || expense.amount,
          date: editDate,
        })
        .eq('id', expense.id);
      if (error) throw error;
      toast.success('Modifications enregistrées');
      setEditing(false);
      onReanalyzed?.({ ...expense, vendor: editVendor, amount: parseFloat(editAmount), date: editDate });
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Confidence helpers
  const confidenceColor = !expense.ocr_confidence ? 'text-gray-400'
    : expense.ocr_confidence >= 0.8 ? 'text-green-400'
    : expense.ocr_confidence >= 0.6 ? 'text-amber-400'
    : 'text-red-400';
  const ConfidenceIcon = expense.ocr_confidence && expense.ocr_confidence >= 0.8 ? CheckCircle : AlertCircle;

  return (
    <div className={cn('fixed inset-0 z-50 bg-black/95 flex flex-col', className)}>
      {/* ── Header ── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-shrink-0 bg-gradient-to-b from-black to-transparent px-4 py-3"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
          {/* Invoice info / inline edit */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>

            {editing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={editVendor}
                  onChange={e => setEditVendor(e.target.value)}
                  className="bg-white/10 text-white rounded-lg px-2 py-1 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-white/40"
                  placeholder="Fournisseur"
                />
                <input
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  className="bg-white/10 text-white rounded-lg px-2 py-1 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-white/40"
                  placeholder="Montant"
                />
                <input
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  type="date"
                  className="bg-white/10 text-white rounded-lg px-2 py-1 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
            ) : (
              <div className="min-w-0">
                <h3 className="text-white font-bold text-base truncate">{expense.vendor}</h3>
                <div className="flex items-center gap-2 text-white/60 text-xs flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(expense.date).toLocaleDateString('fr-FR')}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-white">{formatCurrency(expense.amount)}</span>
                  {expense.invoice_number && <><span>•</span><span>{expense.invoice_number}</span></>}
                  {expense.ocr_confidence && (
                    <>
                      <span>•</span>
                      <span className={cn('flex items-center gap-1', confidenceColor)}>
                        <ConfidenceIcon size={12} />
                        {Math.round(expense.ocr_confidence * 100)}% confiance
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Zoom */}
            <button onClick={handleZoomOut} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title="Zoom -">
              <ZoomOut size={18} />
            </button>
            <button onClick={handleResetZoom} className="px-2.5 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 font-mono text-xs min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={handleZoomIn} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title="Zoom +">
              <ZoomIn size={18} />
            </button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Rotate */}
            <button onClick={handleRotate} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title="Pivoter">
              <RotateCw size={18} />
            </button>

            {/* Download */}
            <button onClick={handleDownload} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title="Télécharger">
              <Download size={18} />
            </button>

            <div className="w-px h-6 bg-white/20 mx-1" />

            {/* Edit inline */}
            {editing ? (
              <button
                onClick={handleSaveEdits}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-500 rounded-lg text-white hover:bg-green-600 text-xs font-semibold disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 text-xs font-semibold"
                title="Modifier"
              >
                <Edit2 size={14} />
                Modifier
              </button>
            )}

            {/* Re-analyze */}
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing || !expense.receipt_url}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/80 rounded-lg text-white hover:bg-blue-500 text-xs font-semibold disabled:opacity-50"
              title="Re-analyser avec l'IA"
            >
              {reanalyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Re-analyser
            </button>

            {/* Close */}
            <button onClick={onClose} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 ml-1" title="Fermer">
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Document viewer ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
        {!expense.receipt_url ? (
          <div className="flex flex-col items-center gap-3 text-white/50">
            <FileText size={64} />
            <p className="text-sm">Aucune image associée à cette facture</p>
          </div>
        ) : imgError ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-16 h-16 text-red-400" />
            <div>
              <p className="text-white font-semibold">Impossible de charger la facture</p>
              <p className="text-white/50 text-sm mt-1">L'image a peut-être été supprimée du stockage</p>
            </div>
            <a
              href={expense.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 text-sm"
            >
              Ouvrir dans un nouvel onglet
            </a>
          </div>
        ) : isPdf ? (
          <motion.iframe
            key="pdf"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={expense.receipt_url}
            className="w-full h-full rounded-lg border border-white/10"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease',
              transformOrigin: 'center center',
              maxHeight: '100%',
            }}
            title={`Facture ${expense.vendor}`}
          />
        ) : (
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expense.receipt_url}
              alt={`Facture ${expense.vendor}`}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
              draggable={false}
              onError={() => setImgError(true)}
            />
          </motion.div>
        )}
      </div>

      {/* ── Footer description ── */}
      {expense.description && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 bg-gradient-to-t from-black to-transparent px-4 py-3"
        >
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <p className="text-white text-sm truncate">
                <span className="font-semibold text-white/70">Description :</span> {expense.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default InvoiceViewer;

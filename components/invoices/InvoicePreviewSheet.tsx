'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Clock, Send, AlertTriangle, Receipt, User, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

/* ═══════════════════════════════════════════════════════════
   InvoicePreviewSheet — Bottom Sheet de preview rapide
   Apparaît sur Long Press d'une carte de facture
   Montre : Client, Montant, Statut, Échéance
   ═══════════════════════════════════════════════════════════ */

interface InvoicePreviewData {
  id: string;
  number?: string;
  clientName: string;
  amount: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate?: string;
  dueDate?: string;
  paidAt?: string;
}

interface InvoicePreviewSheetProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoicePreviewData | null;
}

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  draft: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Receipt, label: 'Brouillon' },
  sent: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Send, label: 'Envoyée' },
  paid: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle, label: 'Payée' },
  overdue: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle, label: 'En retard' },
};

export function InvoicePreviewSheet({ open, onClose, invoice }: InvoicePreviewSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!invoice) return null;

  const s = statusConfig[invoice.status] || statusConfig.draft;
  const StatusIcon = s.icon;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet — compact, not full height */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute left-0 right-0 bottom-0 bg-card border-t border-border rounded-t-3xl shadow-2xl"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Content — compact */}
            <div className="px-5 pt-2 pb-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">Aperçu rapide</h3>
                  <span className="text-xs font-mono text-muted-foreground">
                    {invoice.number || '—'}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Main info card */}
              <div className="bg-muted/50 rounded-2xl p-4 mb-4">
                {/* Client */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <User size={18} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{invoice.clientName}</p>
                    <p className="text-xs text-muted-foreground">Client</p>
                  </div>
                  <p className="text-xl font-black text-foreground tabular-nums">{invoice.amount}</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-border mb-3" />

                {/* Status + Dates */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Status */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Statut</p>
                    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg', s.bg)}>
                      <StatusIcon size={14} className={s.color} />
                      <span className={cn('text-xs font-bold', s.color)}>{s.label}</span>
                    </div>
                  </div>

                  {/* Due date */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      {invoice.status === 'paid' ? 'Encaissé le' : 'Échéance'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        {formatDate(
                          invoice.status === 'paid' ? invoice.paidAt : invoice.dueDate
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Open full page */}
              <Link
                href={`/invoices/${invoice.id}`}
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
              >
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25"
                >
                  Voir la facture complète
                  <ArrowRight size={16} />
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency, formatDateShort, downloadCSV } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { FacturXBatchExport } from '@/components/ui/FacturXBatchExport';
import SwipeableCard from '@/components/layout/SwipeableCard';
import QuickCreateSheet from '@/components/invoices/QuickCreateSheet';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileText, Download, Zap, AlertTriangle,
  TrendingUp, Clock, CheckCircle2, XCircle, Eye, Send,
  ChevronRight, Filter, SlidersHorizontal, ArrowUpRight,
  ReceiptText, BadgeDollarSign, Hourglass, ShoppingCart, Truck,
  Wallet, Trash2, CheckSquare, X, Lock, Edit2, Sparkles,
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { onQuickCreate } from '@/lib/quick-create-events';

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const SPRING = { type: 'spring' as const, damping: 25, stiffness: 200 };

const STATUS_OPTS: { value: string; label: string; dot: string }[] = [
  { value: '',        label: 'Tous',       dot: 'bg-slate-500' },
  { value: 'draft',   label: 'Brouillon',  dot: 'bg-slate-400' },
  { value: 'sent',    label: 'Envoyée',    dot: 'bg-blue-500' },
  { value: 'paid',    label: 'Payée',      dot: 'bg-emerald-500' },
  { value: 'overdue', label: 'En retard',  dot: 'bg-red-500' },
];

const TYPE_OPTS = [
  { value: '', label: 'Tous types' },
  { value: 'invoice', label: 'Factures' },
  { value: 'quote', label: 'Devis' },
  { value: 'credit_note', label: 'Avoirs' },
  { value: 'purchase_order', label: 'Bons de cde' },
  { value: 'delivery_note', label: 'Bons de liv.' },
  { value: 'deposit', label: 'Acomptes' },
];

const TYPE_LABELS: Record<string, string> = {
  invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir',
  purchase_order: 'Bon de commande', delivery_note: 'Bon de livraison',
  deposit: 'Acompte',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', accepted: 'Accepté', refused: 'Refusé',
};

const STATUS_DOT_COLOR: Record<string, string> = {
  draft: 'bg-slate-400',
  sent: 'bg-blue-500',
  paid: 'bg-emerald-500',
  overdue: 'bg-red-500',
  accepted: 'bg-emerald-500',
  refused: 'bg-red-500',
};

function getDocIcon(documentType: string, size: number) {
  if (documentType === 'purchase_order') return <ShoppingCart size={size} className="text-orange-500" />;
  if (documentType === 'delivery_note') return <Truck size={size} className="text-cyan-500" />;
  if (documentType === 'deposit') return <Wallet size={size} className="text-violet-500" />;
  return (
    <FileText
      size={size}
      className={cn(
        documentType === 'quote' ? 'text-blue-500'
        : documentType === 'credit_note' ? 'text-purple-500'
        : 'text-emerald-500',
      )}
    />
  );
}

function getDocBg(documentType: string) {
  if (documentType === 'quote') return 'bg-blue-500/10';
  if (documentType === 'credit_note') return 'bg-purple-500/10';
  if (documentType === 'purchase_order') return 'bg-orange-500/10';
  if (documentType === 'delivery_note') return 'bg-cyan-500/10';
  if (documentType === 'deposit') return 'bg-violet-500/10';
  return 'bg-emerald-500/10';
}

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, deleteInvoice, updateInvoiceStatus, fetchInvoices } = useDataStore();
  const sub = useSubscription();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Écoute le FAB pour ouvrir le QuickCreateSheet
  useEffect(() => {
    return onQuickCreate(() => setShowQuickCreate(true));
  }, []);

  const paidInvoices = useMemo(() => invoices.filter((i) => i.status === 'paid'), [invoices]);
  const sentInvoices = useMemo(() => invoices.filter((i) => i.status === 'sent'), [invoices]);
  const overdueInvoices = useMemo(() => invoices.filter((i) => i.status === 'overdue'), [invoices]);
  const totalRevenue = useMemo(() => paidInvoices.reduce((s, i) => s + i.total, 0), [paidInvoices]);
  const pendingAmount = useMemo(() => sentInvoices.reduce((s, i) => s + i.total, 0), [sentInvoices]);
  const overdueAmount = useMemo(() => overdueInvoices.reduce((s, i) => s + i.total, 0), [overdueInvoices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch = !q
        || inv.number.toLowerCase().includes(q)
        || (inv.client?.name || '').toLowerCase().includes(q)
        || (inv.client_name_override || '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || inv.status === statusFilter;
      const matchType = !typeFilter || (inv.document_type || 'invoice') === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [invoices, search, statusFilter, typeFilter]);

  const allFilteredIds = filtered.map((i) => i.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = allFilteredIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allSelected, allFilteredIds]);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  const handleExport = () => {
    downloadCSV(
      `factures-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Numéro', 'Type', 'Client', 'Date émission', 'Échéance', 'HT', 'TVA', 'TTC', 'Statut', 'Payée le'],
      invoices.map((inv) => [
        inv.number,
        TYPE_LABELS[inv.document_type] || inv.document_type,
        inv.client?.name || inv.client_name_override || '',
        inv.issue_date,
        inv.due_date || '',
        inv.subtotal,
        inv.vat_amount,
        inv.total,
        STATUS_LABELS[inv.status] || inv.status,
        inv.paid_at || '',
      ]),
    );
  };

  const handleBulkExportCSV = () => {
    const selected = invoices.filter((inv) => selectedIds.has(inv.id));
    downloadCSV(
      `factures-selection-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Numéro', 'Type', 'Client', 'Date émission', 'Échéance', 'HT', 'TVA', 'TTC', 'Statut', 'Payée le'],
      selected.map((inv) => [
        inv.number,
        TYPE_LABELS[inv.document_type] || inv.document_type,
        inv.client?.name || inv.client_name_override || '',
        inv.issue_date,
        inv.due_date || '',
        inv.subtotal,
        inv.vat_amount,
        inv.total,
        STATUS_LABELS[inv.status] || inv.status,
        inv.paid_at || '',
      ]),
    );
  };

  const handleBulkMarkPaid = async () => {
    const eligible = invoices.filter(
      (inv) => selectedIds.has(inv.id) && (inv.status === 'sent' || inv.status === 'overdue'),
    );
    await Promise.all(eligible.map((inv) => updateInvoiceStatus(inv.id, 'paid')));
    clearSelection();
  };

  const handleBulkDelete = async () => {
    if (sub.isFree) {
      toast.error('Les utilisateurs du plan gratuit ne peuvent pas supprimer de factures. Passez à un plan payant pour débloquer cette fonctionnalité.');
      return;
    }
    const count = selectedIds.size;
    const confirmed = window.confirm(
      `Supprimer ${count} document${count !== 1 ? 's' : ''} ? Cette action est irréversible.`,
    );
    if (!confirmed) return;
    await Promise.all([...selectedIds].map((id) => deleteInvoice(id)));
    clearSelection();
  };

  const handleSingleDelete = async (id: string) => {
    if (sub.isFree) {
      toast.error('Passez à un plan payant pour supprimer des documents.');
      return;
    }
    triggerHaptic('heavy');
    await deleteInvoice(id);
    toast.success('Document supprimé');
  };

  const handleSingleMarkPaid = async (id: string) => {
    triggerHaptic('success');
    await updateInvoiceStatus(id, 'paid');
    toast.success('Marqué comme payée');
  };

  const eligibleForPaidCount = invoices.filter(
    (inv) => selectedIds.has(inv.id) && (inv.status === 'sent' || inv.status === 'overdue'),
  ).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  };

  return (
    <>
      <h1 className="sr-only">Factures & Documents - Factu.me</h1>
      <PullToRefresh onRefresh={fetchInvoices}>
        <main aria-label="Factures et documents">
        <div className="space-y-6 pb-24 md:pb-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Documents</h1>
              <p className="text-sm text-slate-500 mt-1">{invoices.length} document{invoices.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {invoices.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  className="hidden md:flex items-center gap-1.5 text-slate-400 hover:text-white border border-white/10 px-4 py-2 rounded-xl text-sm font-medium hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  <Download size={15} />
                  <span>Export</span>
                </motion.button>
              )}
              {invoices.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  className="md:hidden flex items-center justify-center w-10 h-10 text-slate-400 hover:text-white border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  <Download size={16} />
                </motion.button>
              )}
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  href="/invoices/new"
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Plus size={16} />
                  <span>Nouveau</span>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Paywall banner */}
          {sub.isFree && sub.invoiceCount >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <Link
                href="/paywall"
                className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 hover:border-amber-500/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  {sub.isAtLimit
                    ? <AlertTriangle size={18} className="text-amber-400" />
                    : <Zap size={18} className="text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-400 text-sm">
                    {sub.isAtLimit
                      ? 'Limite atteinte — passez à Pro pour continuer'
                      : `Plan Discovery · ${sub.invoiceCount}/3 factures ce mois`}
                  </p>
                  <p className="text-xs text-amber-500/70 mt-0.5">
                    Factures illimitées dès 19€/mois →
                  </p>
                </div>
                <ChevronRight size={17} className="text-amber-400/60 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </Link>
            </motion.div>
          )}

          {/* Stats pills */}
          {invoices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, ease: EASE }}
              className="flex flex-wrap gap-2 md:gap-3"
            >
              <div className="flex items-center gap-2 bg-slate-800/50 border border-white/5 rounded-full px-3.5 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-400">Encaissé</span>
                <span className="text-sm font-semibold text-white">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 border border-white/5 rounded-full px-3.5 py-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-400">En attente</span>
                <span className="text-sm font-semibold text-white">{formatCurrency(pendingAmount)}</span>
              </div>
              {overdueAmount > 0 && (
                <div className="flex items-center gap-2 bg-slate-800/50 border border-red-500/20 rounded-full px-3.5 py-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-slate-400">En retard</span>
                  <span className="text-sm font-semibold text-red-400">{formatCurrency(overdueAmount)}</span>
                </div>
              )}
              <div className="hidden md:flex items-center gap-2 bg-slate-800/50 border border-white/5 rounded-full px-3.5 py-2">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-sm font-semibold text-white">{invoices.length}</span>
              </div>
            </motion.div>
          )}

          {/* Status filter tabs — sticky glassmorphism on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, ...SPRING }}
            className="sticky top-14 z-20 -mx-5 px-5 py-2 md:py-0 md:static md:z-auto md:-mx-0 md:px-0 bg-slate-950/80 md:bg-transparent backdrop-blur-2xl md:backdrop-blur-none border-b border-white/[0.04] md:border-0"
          >
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {STATUS_OPTS.map((s) => (
                <motion.button
                  key={s.value}
                  whileTap={{ scale: 0.93 }}
                  transition={SPRING}
                  onClick={() => setStatusFilter(s.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                    statusFilter === s.value
                      ? 'bg-white/15 text-white'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                  {s.label}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Search + filter toggle */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ease: EASE }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher par numéro ou client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/10 transition-all"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                  showFilters
                    ? 'bg-white/10 text-white border-white/15'
                    : 'bg-slate-800/50 text-slate-400 border-white/5 hover:border-white/10 hover:text-slate-300',
                )}
              >
                <SlidersHorizontal size={15} />
                <span className="hidden sm:inline">Filtres</span>
              </motion.button>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  href="/invoices/new?type=quote"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/15 text-sm font-medium transition-all"
                >
                  + Devis
                </Link>
              </motion.div>
            </div>

            {/* Type filter panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-800/50 border border-white/5 rounded-xl">
                    {TYPE_OPTS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTypeFilter(t.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          typeFilter === t.value
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Content */}
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, ease: EASE }}
              className="text-center py-20 px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center mx-auto mb-5">
                <FileText size={28} className="text-slate-600" />
              </div>
              <p className="font-semibold text-slate-400 text-base mb-1">
                {search || statusFilter || typeFilter ? 'Aucun résultat trouvé' : 'Prêt à envoyer votre première facture ?'}
              </p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                {search || statusFilter || typeFilter
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Créez une facture en moins d\'une minute et envoyez-la directement à votre client par email.'}
              </p>
              {!search && !statusFilter && !typeFilter && (
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href="/invoices/new"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Plus size={15} /> Créer une facture
                  </Link>
                  <Link
                    href="/invoices/new?type=quote"
                    className="inline-flex items-center gap-1.5 bg-slate-800/50 border border-white/5 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl hover:border-white/10 transition-all"
                  >
                    Créer un devis
                  </Link>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              {/* Mobile card list — native feel */}
              <motion.div
                className="md:hidden space-y-2"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {filtered.map((inv) => {
                  const isOverdue = inv.status === 'overdue';
                  const isPaid = inv.status === 'paid';
                  const isSent = inv.status === 'sent';
                  const isSelected = selectedIds.has(inv.id);
                  const canSwipeDelete = !sub.isFree;
                  const canSwipePaid = inv.status === 'sent' || inv.status === 'overdue';

                  return (
                    <motion.div key={inv.id} variants={cardVariants} layout>
                      <SwipeableCard
                        onDelete={canSwipeDelete ? () => handleSingleDelete(inv.id) : undefined}
                        onMarkPaid={canSwipePaid ? () => handleSingleMarkPaid(inv.id) : undefined}
                        className={cn(isSelected && 'ring-1 ring-emerald-500/50')}
                      >
                        {/* Magic Move: layoutId partagé avec le header du détail */}
                        <motion.div
                          layoutId={`invoice-card-${inv.id}`}
                          transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="flex items-center gap-3.5 p-4"
                          >
                            {/* Status dot — the primary visual signal */}
                            <div className="relative flex-shrink-0">
                              <span className={cn(
                                'block w-2.5 h-2.5 rounded-full',
                                isPaid ? 'bg-emerald-400' : isOverdue ? 'bg-red-400 animate-pulse' : isSent ? 'bg-blue-400' : 'bg-slate-500',
                              )} />
                            </div>

                            {/* Client name — the WHO */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] text-white font-semibold truncate leading-tight">
                                {inv.client?.name || inv.client_name_override || 'Sans client'}
                              </p>
                              <p className="text-[12px] text-slate-500 mt-0.5 font-mono">
                                {inv.number}
                              </p>
                            </div>

                            {/* Amount — the HOW MUCH */}
                            <div className="text-right flex-shrink-0">
                              <p className={cn(
                                'text-[15px] font-bold tabular-nums',
                                isPaid ? 'text-emerald-400' : isOverdue ? 'text-red-400' : 'text-white',
                              )}>
                                {formatCurrency(inv.total)}
                              </p>
                              {isOverdue && (
                                <p className="text-[11px] text-red-400/70 font-medium">En retard</p>
                              )}
                            </div>
                          </Link>
                        </motion.div>
                      </SwipeableCard>
                    </motion.div>
                  );
                })}

                {/* Mobile footer — compact totals */}
                {filtered.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between pt-2 px-1"
                  >
                    <p className="text-xs text-slate-500">{filtered.length} documents</p>
                    <p className="text-sm font-semibold text-white tabular-nums">
                      {formatCurrency(filtered.reduce((s, i) => s + i.total, 0))}
                    </p>
                  </motion.div>
                )}
              </motion.div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded border-white/20 accent-emerald-500 cursor-pointer"
                              title="Tout sélectionner"
                            />
                          </th>
                          <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Émission</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Échéance</th>
                          <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Montant TTC</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filtered.map((inv, index) => {
                          const isOverdue = inv.status === 'overdue';
                          const isPaid = inv.status === 'paid';
                          const isSelected = selectedIds.has(inv.id);
                          return (
                            <motion.tr
                              key={inv.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02, ease: EASE }}
                              className={cn(
                                'hover:bg-white/[0.03] cursor-pointer transition-colors group',
                                isSelected && 'bg-emerald-500/5 hover:bg-emerald-500/8',
                              )}
                              onClick={() => router.push(`/invoices/${inv.id}`)}
                            >
                              <td className="px-4 py-3.5 w-10" onClick={(e) => toggleSelect(inv.id, e)}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded border-white/20 accent-emerald-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', getDocBg(inv.document_type))}>
                                    {getDocIcon(inv.document_type, 14)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-400">{inv.number}</p>
                                    <p className="text-[11px] text-slate-500">{TYPE_LABELS[inv.document_type] || 'Facture'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <p className="text-sm font-medium text-white truncate max-w-[160px]">
                                  {inv.client?.name || inv.client_name_override || <span className="text-slate-600 italic">Sans client</span>}
                                </p>
                              </td>
                              <td className="px-4 py-3.5 text-sm text-slate-400">{formatDateShort(inv.issue_date)}</td>
                              <td className="px-4 py-3.5">
                                <span className={cn('text-sm', isOverdue && 'text-red-400 font-medium', !isOverdue && 'text-slate-400')}>
                                  {inv.due_date ? formatDateShort(inv.due_date) : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <p className={cn('text-sm font-bold', isPaid ? 'text-emerald-400' : isOverdue ? 'text-red-400' : 'text-white')}>
                                  {formatCurrency(inv.total)}
                                </p>
                                <p className="text-[11px] text-slate-500">HT {formatCurrency(inv.subtotal)}</p>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT_COLOR[inv.status] || 'bg-slate-500')} />
                                  <span className={cn(
                                    'text-xs font-medium',
                                    isPaid ? 'text-emerald-400' : isOverdue ? 'text-red-400' : inv.status === 'sent' ? 'text-blue-400' : 'text-slate-400',
                                  )}>
                                    {STATUS_LABELS[inv.status] || inv.status}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center justify-end gap-1">
                                  {sub.canEditInvoice ? (
                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                      <Link
                                        href={`/invoices/${inv.id}/edit`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-500 transition-all opacity-0 group-hover:opacity-100"
                                        title="Modifier"
                                      >
                                        <Edit2 size={14} />
                                      </Link>
                                    </motion.div>
                                  ) : (
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => { e.stopPropagation(); router.push('/paywall'); }}
                                      className="p-1.5 rounded-lg hover:bg-white/5 text-slate-600 hover:text-slate-400 transition-all opacity-0 group-hover:opacity-100"
                                      title="Modifier (Plan payant)"
                                    >
                                      <Lock size={14} />
                                    </motion.button>
                                  )}
                                  <motion.div whileHover={{ x: 0.5 }}>
                                    <ChevronRight
                                      size={15}
                                      className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all ml-auto"
                                    />
                                  </motion.div>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Table footer */}
                    {filtered.length > 1 && (
                      <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between bg-white/[0.02]">
                        <p className="text-xs text-slate-500">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
                        <p className="text-sm font-semibold text-white">
                          Total : {formatCurrency(filtered.reduce((s, i) => s + i.total, 0))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Bulk action bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
              >
                <div className="flex items-center gap-2 bg-slate-800 text-white rounded-2xl px-4 py-3 border border-white/10 backdrop-blur-sm">
                  <span className="text-sm font-semibold whitespace-nowrap mr-1">
                    {selectedIds.size} sélectionné{selectedIds.size !== 1 ? 's' : ''}
                  </span>

                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    {eligibleForPaidCount > 0 && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBulkMarkPaid}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <CheckCircle2 size={13} />
                        Marquer payées
                        {eligibleForPaidCount !== selectedIds.size && (
                          <span className="opacity-70">({eligibleForPaidCount})</span>
                        )}
                      </motion.button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleBulkExportCSV}
                      className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Download size={13} />
                      Exporter CSV
                    </motion.button>

                    {(sub.isPro || sub.isBusiness || sub.isTrialActive) && (
                      <FacturXBatchExport
                        selectedInvoices={invoices.filter((inv) => selectedIds.has(inv.id))}
                        onClear={clearSelection}
                        variant="button"
                        className="!py-1.5 !px-3 !text-xs"
                      />
                    )}

                    {!sub.isFree && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Trash2 size={13} />
                        Supprimer
                      </motion.button>
                    )}
                    {sub.isFree && selectedIds.size > 0 && (
                      <motion.div whileTap={{ scale: 0.95 }}>
                        <Link
                          href="/paywall"
                          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Lock size={13} />
                          Débloquer la suppression
                        </Link>
                      </motion.div>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={clearSelection}
                    className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-medium px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap ml-1"
                    title="Désélectionner"
                  >
                    <X size={14} />
                    <span className="hidden sm:inline">Fermer</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      </PullToRefresh>

      {/* Quick Create Bottom Sheet — déclenché par le FAB */}
      <QuickCreateSheet
        open={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
      />
    </>
  );
}

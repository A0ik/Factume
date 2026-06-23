'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Plus, Search, FileText, CheckCircle, Clock, XCircle,
  Send, Loader2, Bell, SlidersHorizontal, RefreshCw,
  FileCheck, Truck, CreditCard, ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { BulkActions } from '@/components/invoices/BulkActions';
import { AdvancedFilters, InvoiceFilters } from '@/components/invoices/AdvancedFilters';
import { InvoicePreviewSheet } from '@/components/invoices/InvoicePreviewSheet';
import { RemindersModal } from '@/components/invoices/RemindersModal';
import SwipeableCard from '@/components/layout/SwipeableCard';
import { useToast } from '@/components/ui/SuccessToast';
import { PdpStatusBadge } from '@/components/invoices/PdpStatusBadge';
import { cn } from '@/lib/utils';

// ─── Document Type Configuration ──────────────────────────────────

type DocType = 'all' | 'invoice' | 'quote' | 'credit_note' | 'purchase_order' | 'delivery_note' | 'deposit';

interface DocTypeConfig {
  key: DocType;
  label: string;
  icon: any;
  filterValue: string | null;
  createHref: string;
  statuses: { key: string; label: string; dot: string; color: string }[];
}

const DOC_TYPES: DocTypeConfig[] = [
  {
    key: 'all', label: 'Tout', icon: FileText, filterValue: null, createHref: '/documents/factures/new',
    statuses: [{ key: 'all', label: 'Tout', dot: '', color: '' }],
  },
  {
    key: 'invoice', label: 'Factures', icon: Receipt, filterValue: 'invoice', createHref: '/documents/factures/new',
    statuses: [
      { key: 'all', label: 'Tout', dot: '', color: '' },
      { key: 'paid', label: 'Payées', dot: 'bg-emerald-500', color: 'text-emerald-400' },
      { key: 'sent', label: 'Envoyées', dot: 'bg-blue-500', color: 'text-blue-400' },
      { key: 'draft', label: 'Brouillons', dot: 'bg-slate-500', color: 'text-slate-400' },
      { key: 'overdue', label: 'En retard', dot: 'bg-red-500', color: 'text-red-400' },
    ],
  },
  {
    key: 'quote', label: 'Devis', icon: FileCheck, filterValue: 'quote', createHref: '/documents/devis/new',
    statuses: [
      { key: 'all', label: 'Tout', dot: '', color: '' },
      { key: 'accepted', label: 'Acceptés', dot: 'bg-emerald-500', color: 'text-emerald-400' },
      { key: 'sent', label: 'Envoyés', dot: 'bg-blue-500', color: 'text-blue-400' },
      { key: 'draft', label: 'Brouillons', dot: 'bg-slate-500', color: 'text-slate-400' },
      { key: 'expired', label: 'Expirés', dot: 'bg-orange-500', color: 'text-orange-400' },
    ],
  },
  {
    key: 'credit_note', label: 'Avoirs', icon: RefreshCw, filterValue: 'credit_note', createHref: '/documents/avoirs/new',
    statuses: [
      { key: 'all', label: 'Tout', dot: '', color: '' },
      { key: 'paid', label: 'Payés', dot: 'bg-emerald-500', color: 'text-emerald-400' },
      { key: 'sent', label: 'Envoyés', dot: 'bg-blue-500', color: 'text-blue-400' },
      { key: 'draft', label: 'Brouillons', dot: 'bg-slate-500', color: 'text-slate-400' },
      { key: 'cancelled', label: 'Annulés', dot: 'bg-red-500', color: 'text-red-400' },
    ],
  },
  {
    key: 'purchase_order', label: 'Commandes', icon: ShoppingBag, filterValue: 'purchase_order', createHref: '/documents/commandes/new',
    statuses: [
      { key: 'all', label: 'Tout', dot: '', color: '' },
      { key: 'accepted', label: 'Acceptées', dot: 'bg-emerald-500', color: 'text-emerald-400' },
      { key: 'sent', label: 'Envoyées', dot: 'bg-blue-500', color: 'text-blue-400' },
      { key: 'draft', label: 'Brouillons', dot: 'bg-slate-500', color: 'text-slate-400' },
      { key: 'rejected', label: 'Refusées', dot: 'bg-red-500', color: 'text-red-400' },
    ],
  },
  {
    key: 'delivery_note', label: 'Livraisons', icon: Truck, filterValue: 'delivery_note', createHref: '/documents/livraisons/new',
    statuses: [
      { key: 'all', label: 'Tout', dot: '', color: '' },
      { key: 'delivered', label: 'Livrés', dot: 'bg-emerald-500', color: 'text-emerald-400' },
      { key: 'pending', label: 'En attente', dot: 'bg-blue-500', color: 'text-blue-400' },
      { key: 'partial', label: 'Partiels', dot: 'bg-amber-500', color: 'text-amber-400' },
      { key: 'draft', label: 'Brouillons', dot: 'bg-slate-500', color: 'text-slate-400' },
    ],
  },
  {
    key: 'deposit', label: 'Acomptes', icon: CreditCard, filterValue: 'deposit', createHref: '/documents/acomptes/new',
    statuses: [
      { key: 'all', label: 'Tout', dot: '', color: '' },
      { key: 'paid', label: 'Payés', dot: 'bg-emerald-500', color: 'text-emerald-400' },
      { key: 'sent', label: 'Envoyés', dot: 'bg-blue-500', color: 'text-blue-400' },
      { key: 'draft', label: 'Brouillons', dot: 'bg-slate-500', color: 'text-slate-400' },
      { key: 'cancelled', label: 'Annulés', dot: 'bg-red-500', color: 'text-red-400' },
    ],
  },
];

function getStatusDisplay(status: string) {
  const map: Record<string, { dot: string; color: string; label: string }> = {
    draft: { dot: 'bg-slate-500', color: 'text-slate-400', label: 'Brouillon' },
    sent: { dot: 'bg-blue-500', color: 'text-blue-400', label: 'Envoyé' },
    paid: { dot: 'bg-emerald-500', color: 'text-emerald-400', label: 'Payé' },
    overdue: { dot: 'bg-red-500', color: 'text-red-400', label: 'En retard' },
    accepted: { dot: 'bg-emerald-500', color: 'text-emerald-400', label: 'Accepté' },
    rejected: { dot: 'bg-red-500', color: 'text-red-400', label: 'Refusé' },
    expired: { dot: 'bg-orange-500', color: 'text-orange-400', label: 'Expiré' },
    cancelled: { dot: 'bg-orange-500', color: 'text-orange-400', label: 'Annulé' },
    refunded: { dot: 'bg-orange-500', color: 'text-orange-400', label: 'Remboursé' },
    pending: { dot: 'bg-blue-500', color: 'text-blue-400', label: 'En attente' },
    partial: { dot: 'bg-amber-500', color: 'text-amber-400', label: 'Partiel' },
    delivered: { dot: 'bg-emerald-500', color: 'text-emerald-400', label: 'Livré' },
  };
  return map[status] || map.draft;
}

function getDocTypeLabel(type: string) {
  const labels: Record<string, string> = {
    invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir',
    purchase_order: 'Commande', delivery_note: 'Livraison', deposit: 'Acompte',
  };
  return labels[type] || 'Document';
}

function getDocTypeIcon(type: string) {
  const icons: Record<string, any> = {
    invoice: Receipt, quote: FileCheck, credit_note: RefreshCw,
    purchase_order: ShoppingBag, delivery_note: Truck, deposit: CreditCard,
  };
  return icons[type] || FileText;
}

// Formatage monétaire cohérent (fr-FR EUR) — utilisé partout dans la liste au lieu
// du toFixed(2) + ' €' qui produisait « 1500.00 € » au lieu de « 1 500,00 € ».
const fmtEUR = (n: number | undefined | null): string =>
  n != null && !Number.isNaN(n)
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
    : '—';

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const listItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { invoices, fetchInvoices, clients } = useDataStore();
  const { session } = useAuthStore();
  const { showToast } = useToast();

  const initialType = (searchParams.get('type') as DocType) || 'all';
  const [activeType, setActiveType] = useState<DocType>(initialType);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<InvoiceFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { setStatusFilter('all'); }, [activeType]);

  const currentConfig = DOC_TYPES.find(d => d.key === activeType) || DOC_TYPES[0];

  const filteredDocs = invoices.filter((doc) => {
    if (currentConfig.filterValue && (doc.document_type || 'invoice') !== currentConfig.filterValue) return false;
    const clientName = doc.client?.name || doc.client_name_override || '';
    const matchesSearch = searchQuery === '' ||
      doc.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    let matchesAdvanced = true;
    if (advancedFilters.dateFrom) matchesAdvanced = matchesAdvanced && new Date(doc.issue_date || doc.created_at) >= new Date(advancedFilters.dateFrom);
    if (advancedFilters.dateTo) matchesAdvanced = matchesAdvanced && new Date(doc.issue_date || doc.created_at) <= new Date(advancedFilters.dateTo);
    if (advancedFilters.amountMin !== undefined) matchesAdvanced = matchesAdvanced && (doc.total || 0) >= advancedFilters.amountMin;
    if (advancedFilters.amountMax !== undefined) matchesAdvanced = matchesAdvanced && (doc.total || 0) <= advancedFilters.amountMax;
    if (advancedFilters.clientIds?.length) matchesAdvanced = matchesAdvanced && !!doc.client_id && advancedFilters.clientIds.includes(doc.client_id);
    return matchesSearch && matchesStatus && matchesAdvanced;
  });

  const stats = {
    total: filteredDocs.length,
    totalAmount: filteredDocs.reduce((s, d) => s + (d.total || 0), 0),
  };

  const handleSendReminder = async (invoiceId: string) => {
    if (!session) return;
    setSendingReminder(invoiceId);
    try {
      const res = await fetch('/api/reminders/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, reminderLevel: 1, confirmed: true }),
      });
      if (!res.ok) throw new Error();
      toast.success('Relance envoyée');
      fetchInvoices();
    } catch { toast.error('Erreur'); } finally { setSendingReminder(null); }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (!res.ok) throw new Error();
      showToast({ icon: 'success', title: 'Document supprimé' });
      fetchInvoices();
    } catch { toast.error('Erreur suppression'); }
  }, [session, showToast, fetchInvoices]);

  const handleMarkPaid = useCallback(async (id: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (!res.ok) throw new Error();
      showToast({ icon: 'success', title: 'Marqué payé' });
      fetchInvoices();
    } catch { toast.error('Erreur'); }
  }, [session, showToast, fetchInvoices]);

  return (
    <div>
      <BulkActions selectedIds={Array.from(selectedIds)} onClear={() => setSelectedIds(new Set())} onActionComplete={() => fetchInvoices()} />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {activeType === 'all' ? 'Documents' : currentConfig.label}
          </h1>
          <div className="flex items-center gap-2">
            {invoices.some((d: any) => d.document_type === 'invoice' && (d.status === 'sent' || d.status === 'overdue')) && (
              <button
                onClick={() => setShowReminders(true)}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold rounded-control transition-colors hover:bg-red-500/20 active:scale-95"
                title="Relancer les factures impayées par email"
              >
                <Bell size={16} />
                <span className="hidden sm:inline">Relancer</span>
              </button>
            )}
            <Link href={currentConfig.createHref} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-control shadow-elev-1 transition-colors hover:bg-primary/90 active:scale-95">
              <Plus size={16} />
              <span className="hidden sm:inline">Nouveau</span>
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{stats.total} documents · {fmtEUR(stats.totalAmount)}</p>
      </motion.div>

      {/* Segment Control — Document Type Tabs */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.03 }}
        className="flex gap-1 mb-5 overflow-x-auto scrollbar-none bg-gray-100 dark:bg-white/5 p-1 rounded-xl"
      >
        {DOC_TYPES.map(dt => {
          const Icon = dt.icon;
          const isActive = activeType === dt.key;
          return (
            <button key={dt.key} onClick={() => setActiveType(dt.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                isActive ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              <Icon size={14} strokeWidth={isActive ? 2.2 : 1.5} />
              {dt.label}
            </button>
          );
        })}
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.06 }} className="mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input type="text" placeholder="Rechercher par numéro, client..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
          />
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn('absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all', showFilters ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300')}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mt-3">
              <AdvancedFilters filters={advancedFilters} onFiltersChange={setAdvancedFilters}
                clients={clients.map(c => ({ id: c.id, name: c.name }))} onReset={() => setAdvancedFilters({})}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status Tabs (only when a specific type is selected) */}
      {activeType !== 'all' && currentConfig.statuses.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.09 }}
          className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-none"
        >
          {currentConfig.statuses.map(s => {
            const count = s.key === 'all' ? stats.total : filteredDocs.filter(d => d.status === s.key).length;
            return (
              <button key={s.key} onClick={() => setStatusFilter(s.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                  statusFilter === s.key ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5',
                )}
              >
                {s.label}
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', statusFilter === s.key ? 'bg-gray-100 dark:bg-white/10' : 'bg-gray-50 dark:bg-white/5')}>{count}</span>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* List */}
      {filteredDocs.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-primary/10 rounded-card rotate-6" />
            <div className="relative w-16 h-16 bg-card border border-border rounded-card flex items-center justify-center shadow-elev-1">
              <FileText className="text-primary" size={26} />
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">Aucun document pour l'instant</p>
          <p className="text-xs text-muted-foreground mt-1 mb-5">Créez votre première facture, devis ou avoir en quelques secondes.</p>
          <Link href={currentConfig.createHref} className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-control shadow-elev-1 transition-colors hover:bg-primary/90 active:scale-95">
            <Plus size={16} /> Créer un document
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Desktop table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden md:block bg-card border border-border rounded-card shadow-elev-1 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-muted/40">
              <div className="col-span-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Type</div>
              <div className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Numéro</div>
              <div className="col-span-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client</div>
              <div className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</div>
              <div className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Total</div>
              <div className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Statut</div>
            </div>
            <div className="divide-y divide-border">
              {filteredDocs.map((doc) => {
                const s = getStatusDisplay(doc.status || 'draft');
                const TypeIcon = getDocTypeIcon(doc.document_type || 'invoice');
                const clientName = doc.client?.name || doc.client_name_override || '';
                return (
                  <Link key={doc.id} href={`/invoices/${doc.id}`} className="grid grid-cols-12 gap-4 px-5 py-3.5 even:bg-muted/20 hover:bg-muted/60 transition-colors items-center group">
                    <div className="col-span-1"><TypeIcon size={16} className="text-muted-foreground" /></div>
                    <div className="col-span-2 text-sm font-semibold text-primary group-hover:underline">{doc.number || '—'}</div>
                    <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center uppercase">
                        {(clientName || '?').trim().charAt(0)}
                      </span>
                      <span className="text-sm text-foreground truncate">{clientName || '—'}</span>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('fr-FR') : '—'}</div>
                    <div className="col-span-2 text-sm font-bold text-foreground text-right tabular-nums">{fmtEUR(doc.total)}</div>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', s.color)}>
                        <div className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />{s.label}
                      </span>
                      <PdpStatusBadge status={doc.pdp_status} transmittedAt={doc.pdp_transmitted_at} compact />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* Mobile cards */}
          <motion.div variants={listContainerVariants} initial="hidden" animate="visible" className="md:hidden space-y-2.5">
            {filteredDocs.map((doc) => {
              const s = getStatusDisplay(doc.status || 'draft');
              const clientName = doc.client?.name || doc.client_name_override || 'Client inconnu';
              const amount = fmtEUR(doc.total);
              const date = doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
              const TypeIcon = getDocTypeIcon(doc.document_type || 'invoice');
              return (
                <motion.div key={doc.id} variants={listItemVariants}>
                  <SwipeableCard
                    onDelete={() => handleDelete(doc.id)}
                    onMarkPaid={doc.status !== 'paid' ? () => handleMarkPaid(doc.id) : undefined}
                    onLongPress={() => {
                      setPreviewInvoice({ id: doc.id, number: doc.number, clientName, amount, status: doc.status || 'draft', issueDate: doc.issue_date, dueDate: doc.due_date, paidAt: doc.paid_at });
                      setShowPreview(true);
                    }}
                  >
                    <div onClick={() => router.push(`/invoices/${doc.id}`)} className="block p-4 cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <TypeIcon size={12} className="text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{getDocTypeLabel(doc.document_type || 'invoice')}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{clientName}</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">{doc.number || '—'}</p>
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white flex-shrink-0">{amount}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-200">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', s.color)}>
                          <div className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />{s.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {date && <span className="text-xs text-slate-500">{date}</span>}
                          {(doc.status === 'sent' || doc.status === 'overdue') && doc.document_type === 'invoice' && (
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendReminder(doc.id); }} disabled={sendingReminder === doc.id}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                            >
                              {sendingReminder === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      <InvoicePreviewSheet open={showPreview} onClose={() => setShowPreview(false)} invoice={previewInvoice} />
      <RemindersModal open={showReminders} onClose={() => setShowReminders(false)} />
    </div>
  );
}

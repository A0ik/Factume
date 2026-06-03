'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Plus, Search, FileText, CheckCircle, Clock, XCircle,
  Send, Loader2, Bell, SlidersHorizontal, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { BulkActions } from '@/components/invoices/BulkActions';
import { AdvancedFilters, InvoiceFilters } from '@/components/invoices/AdvancedFilters';
import { InvoicePreviewSheet } from '@/components/invoices/InvoicePreviewSheet';
import SwipeableCard from '@/components/layout/SwipeableCard';
import { useToast } from '@/components/ui/SuccessToast';
import { PdpStatusBadge } from '@/components/invoices/PdpStatusBadge';

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

const statusConfig: Record<string, { color: string; dot: string; label: string; icon: any }> = {
  draft: { color: 'text-slate-400', dot: 'bg-slate-500', label: 'Brouillon', icon: FileText },
  sent: { color: 'text-blue-400', dot: 'bg-blue-500', label: 'Envoyée', icon: Send },
  paid: { color: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Payée', icon: CheckCircle },
  overdue: { color: 'text-red-400', dot: 'bg-red-500', label: 'En retard', icon: XCircle },
};

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export default function FacturesPage() {
  const { invoices, fetchInvoices, clients } = useDataStore();
  const { session } = useAuthStore();
  const router = useRouter();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedFactures, setSelectedFactures] = useState<Set<string>>(new Set());
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<InvoiceFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Long Press preview state
  const [previewInvoice, setPreviewInvoice] = useState<{
    id: string;
    number?: string;
    clientName: string;
    amount: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    issueDate?: string;
    dueDate?: string;
    paidAt?: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const factures = invoices.filter((inv) => (inv.document_type || 'invoice') === 'invoice');

  const filteredFactures = factures.filter((facture) => {
    const clientName = facture.client?.name || facture.client_name_override || '';
    const matchesSearch = searchQuery === '' ||
      facture.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facture.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || facture.status === statusFilter;

    let matchesAdvanced = true;
    if (advancedFilters.dateFrom) { matchesAdvanced = matchesAdvanced && new Date(facture.issue_date || facture.created_at) >= new Date(advancedFilters.dateFrom); }
    if (advancedFilters.dateTo) { matchesAdvanced = matchesAdvanced && new Date(facture.issue_date || facture.created_at) <= new Date(advancedFilters.dateTo); }
    if (advancedFilters.amountMin !== undefined) { matchesAdvanced = matchesAdvanced && (facture.total || 0) >= advancedFilters.amountMin; }
    if (advancedFilters.amountMax !== undefined) { matchesAdvanced = matchesAdvanced && (facture.total || 0) <= advancedFilters.amountMax; }
    if (advancedFilters.clientIds && advancedFilters.clientIds.length > 0) { matchesAdvanced = matchesAdvanced && !!facture.client_id && advancedFilters.clientIds.includes(facture.client_id); }
    if (advancedFilters.statuses && advancedFilters.statuses.length > 0) { matchesAdvanced = matchesAdvanced && facture.status !== undefined && advancedFilters.statuses.includes(facture.status); }

    return matchesSearch && matchesStatus && matchesAdvanced;
  });

  const stats = {
    total: factures.length,
    draft: factures.filter((f) => f.status === 'draft').length,
    sent: factures.filter((f) => f.status === 'sent').length,
    paid: factures.filter((f) => f.status === 'paid').length,
    overdue: factures.filter((f) => f.status === 'overdue').length,
    totalAmount: factures.reduce((sum, f) => sum + (f.total || 0), 0),
  };

  const handleSendReminder = async (invoiceId: string) => {
    if (!session) return;
    setSendingReminder(invoiceId);
    try {
      const res = await fetch('/api/reminders/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, reminderLevel: 1 }),
      });
      if (!res.ok) throw new Error();
      toast.success('Relance envoyée');
      fetchInvoices();
    } catch { toast.error('Erreur'); } finally { setSendingReminder(null); }
  };

  const handleDelete = useCallback(async (invoiceId: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (!res.ok) throw new Error();
      showToast({
        icon: 'success',
        title: 'Facture supprimée',
        subtitle: 'La facture a été définitivement supprimée',
      });
      fetchInvoices();
    } catch {
      toast.error('Erreur suppression');
    }
  }, [session, showToast, fetchInvoices]);

  const handleMarkPaid = useCallback(async (invoiceId: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (!res.ok) throw new Error();
      showToast({
        icon: 'success',
        title: 'Facture marquée payée',
        subtitle: 'Le statut a été mis à jour',
      });
      fetchInvoices();
    } catch {
      toast.error('Erreur');
    }
  }, [session, showToast, fetchInvoices]);

  const handleLongPress = useCallback((facture: any) => {
    const clientName = facture.client?.name || facture.client_name_override || 'Client inconnu';
    const amount = facture.total ? facture.total.toFixed(2) + ' €' : '—';
    setPreviewInvoice({
      id: facture.id,
      number: facture.number,
      clientName,
      amount,
      status: facture.status || 'draft',
      issueDate: facture.issue_date,
      dueDate: facture.due_date,
      paidAt: facture.paid_at,
    });
    setShowPreview(true);
  }, []);

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Tout', count: stats.total },
    { key: 'paid', label: 'Payées', count: stats.paid },
    { key: 'sent', label: 'Envoyées', count: stats.sent },
    { key: 'draft', label: 'Brouillons', count: stats.draft },
    { key: 'overdue', label: 'En retard', count: stats.overdue },
  ];

  return (
    <div>
      <BulkActions selectedIds={Array.from(selectedFactures)} onClear={() => setSelectedFactures(new Set())} onActionComplete={() => fetchInvoices()} />

      {/* Header — big, airy, dark */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Factures</h1>
          <div className="hidden md:flex gap-3">
            <Link href="/documents/factures/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl transition-colors active:scale-95">
              <Plus size={18} /> Nouvelle facture
            </Link>
            <Link href="/documents/factures/recurring" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-white/15 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors">
              <RefreshCw size={16} /> Récurrente
            </Link>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-6">{stats.total} factures · {stats.totalAmount.toFixed(2)} €</p>
      </motion.div>

      {/* Stats row — minimal pills */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
        {[
          { label: 'Payées', value: stats.paid, dot: 'bg-emerald-500' },
          { label: 'Envoyées', value: stats.sent, dot: 'bg-blue-500' },
          { label: 'Brouillons', value: stats.draft, dot: 'bg-slate-500' },
          ...(stats.overdue > 0 ? [{ label: 'En retard', value: stats.overdue, dot: 'bg-red-500' }] : []),
        ].map(({ label, value, dot }) => (
          <div key={label} className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 border border-gray-200 rounded-xl flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            <span className="text-xs text-slate-400">{label}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">{value}</span>
          </div>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }} className="mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input
            type="text"
            placeholder="Rechercher par numéro, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
              showFilters ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-3"
            >
              <AdvancedFilters
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                clients={clients.map(c => ({ id: c.id, name: c.name }))}
                onReset={() => setAdvancedFilters({})}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status tabs — horizontal scroll */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.12 }} className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-none">
        {statusTabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === key
                ? 'bg-white/15 text-gray-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-gray-100'
            }`}
          >
            {label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              statusFilter === key ? 'bg-gray-100' : 'bg-gray-50'
            }`}>{count}</span>
          </button>
        ))}
      </motion.div>

      {/* List */}
      {filteredFactures.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="text-gray-400" size={28} />
          </div>
          <p className="text-sm text-slate-400 font-medium">Aucune facture</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Créez votre première facture</p>
          <Link href="/documents/factures/new" className="inline-flex items-center gap-2 bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors active:scale-95">
            <Plus size={16} /> Créer
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Desktop table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-200">
              <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Numéro</div>
              <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client</div>
              <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</div>
              <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Total</div>
              <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut</div>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredFactures.map((facture) => {
                const s = statusConfig[facture.status || 'draft'] || statusConfig.draft;
                return (
                  <Link key={facture.id} href={`/invoices/${facture.id}`} className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-gray-100 transition-colors items-center group">
                    <div className="col-span-2 text-sm font-semibold text-emerald-400 group-hover:underline">{facture.number || '—'}</div>
                    <div className="col-span-3 text-sm text-slate-300 truncate">{facture.client?.name || facture.client_name_override || '—'}</div>
                    <div className="col-span-2 text-sm text-slate-500">{facture.issue_date ? new Date(facture.issue_date).toLocaleDateString('fr-FR') : '—'}</div>
                    <div className="col-span-2 text-sm font-bold text-gray-900 dark:text-white text-right">{facture.total ? facture.total.toFixed(2) + ' €' : '—'}</div>
                    <div className="col-span-3 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                      <PdpStatusBadge status={facture.pdp_status} transmittedAt={facture.pdp_transmitted_at} compact />
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* Mobile card list — with swipe + long press */}
          <motion.div variants={listContainerVariants} initial="hidden" animate="visible" className="md:hidden space-y-2.5">
            {filteredFactures.map((facture) => {
              const s = statusConfig[facture.status || 'draft'] || statusConfig.draft;
              const clientName = facture.client?.name || facture.client_name_override || 'Client inconnu';
              const amount = facture.total ? facture.total.toFixed(2) + ' €' : '—';
              const date = facture.issue_date ? new Date(facture.issue_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

              return (
                <motion.div key={facture.id} variants={listItemVariants}>
                  <SwipeableCard
                    onDelete={() => handleDelete(facture.id)}
                    onMarkPaid={facture.status !== 'paid' ? () => handleMarkPaid(facture.id) : undefined}
                    onLongPress={() => handleLongPress(facture)}
                  >
                    <div
                      onClick={() => router.push(`/invoices/${facture.id}`)}
                      className="block p-5 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{clientName}</p>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">{facture.number || '—'}</p>
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white flex-shrink-0">{amount}</p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                        <PdpStatusBadge status={facture.pdp_status} transmittedAt={facture.pdp_transmitted_at} compact />
                        <div className="flex items-center gap-2">
                          {date && <span className="text-xs text-slate-500">{date}</span>}
                          {(facture.status === 'sent' || facture.status === 'overdue') && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendReminder(facture.id); }}
                              disabled={sendingReminder === facture.id}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                            >
                              {sendingReminder === facture.id ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
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

      {/* Long Press Preview Sheet */}
      <InvoicePreviewSheet
        open={showPreview}
        onClose={() => setShowPreview(false)}
        invoice={previewInvoice}
      />
    </div>
  );
}

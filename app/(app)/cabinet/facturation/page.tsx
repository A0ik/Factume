'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Loader2, Search, FileText, Euro, Clock,
  AlertTriangle, CheckCircle2, Printer, Mail, Eye, Download,
  SlidersHorizontal, Send, TrendingUp, Receipt, Filter,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, formatDateShort, downloadXLSX } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CabinetInvoice {
  id: string;
  number: string;
  client_name: string;
  client_email?: string;
  object?: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  issue_date: string;
  due_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  document_type?: string;
  pdf_url?: string;
}

interface InvoiceData {
  invoices: CabinetInvoice[];
  kpis: {
    total_facture: number;
    total_payees: number;
    total_en_attente: number;
    total_en_retard: number;
    montant_facture: number;
    montant_payees: number;
    montant_en_attente: number;
    montant_en_retard: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  draft:    { label: 'Brouillon',   dot: 'bg-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-600 dark:text-gray-400' },
  sent:     { label: 'Envoyée',     dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-500/10',  text: 'text-blue-700 dark:text-blue-400' },
  paid:     { label: 'Payée',       dot: 'bg-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
  overdue:  { label: 'En retard',   dot: 'bg-red-500',    bg: 'bg-red-50 dark:bg-red-500/10',    text: 'text-red-700 dark:text-red-400' },
  cancelled:{ label: 'Annulée',     dot: 'bg-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-500 dark:text-gray-400' },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '',        label: 'Tous' },
  { value: 'paid',    label: 'Payées' },
  { value: 'sent',    label: 'Envoyées' },
  { value: 'overdue', label: 'En retard' },
  { value: 'draft',   label: 'Brouillons' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - i);
  const val = d.toISOString().slice(0, 7);
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) };
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CabinetFacturationPage() {
  const profile = useAuthStore(state => state.profile);
  const sub = useSubscription();
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [showNewInvoiceForm, setShowNewInvoiceForm] = useState(false);

  useEffect(() => { if (profile) loadInvoices(); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expirée.');
        return;
      }
      const res = await fetch('/api/cabinet/invoices', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(err.error || 'Erreur de chargement');
      }
      const raw = await res.json();
      // Transform API 'stats' (Record<status, {count, total}>) into expected 'kpis' format
      const stats = raw.stats || {};
      const kpis = {
        total_facture: Object.values(stats).reduce((s: number, v: any) => s + (v?.count || 0), 0),
        total_payees: stats.paid?.count || 0,
        total_en_attente: stats.sent?.count || 0,
        total_en_retard: stats.overdue?.count || 0,
        montant_facture: Object.values(stats).reduce((s: number, v: any) => s + (v?.total || 0), 0),
        montant_payees: stats.paid?.total || 0,
        montant_en_attente: stats.sent?.total || 0,
        montant_en_retard: stats.overdue?.total || 0,
      };
      setData({ invoices: raw.invoices || [], kpis });
    } catch (error: any) {
      console.error('[CabinetFacturation] load error:', error);
      toast.error(error.message || 'Erreur de chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleViewPDF = (invoice: CabinetInvoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    } else {
      toast.info('Le PDF sera bientôt disponible');
    }
  };

  const handlePrint = (invoice: CabinetInvoice) => {
    if (invoice.pdf_url) {
      const w = window.open(invoice.pdf_url, '_blank');
      w?.addEventListener('load', () => w.print());
    } else {
      toast.info('Le PDF sera bientôt disponible');
    }
  };

  const handleSendEmail = async (invoice: CabinetInvoice) => {
    if (!invoice.client_email) {
      toast.error('Aucune adresse email pour ce client');
      return;
    }
    setSendingEmail(invoice.id);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/cabinet/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || "Erreur lors de l'envoi");
      }
      toast.success(`Facture ${invoice.number} envoyée à ${invoice.client_email}`);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setSendingEmail(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered list
  // ---------------------------------------------------------------------------

  const filtered = useMemo(() => {
    if (!data?.invoices) return [];
    const q = search.toLowerCase();
    return data.invoices.filter((inv) => {
      const matchSearch = !q
        || inv.number.toLowerCase().includes(q)
        || inv.client_name.toLowerCase().includes(q)
        || (inv.object || '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || inv.status === statusFilter;
      const matchMonth = !monthFilter || inv.issue_date.startsWith(monthFilter);
      return matchSearch && matchStatus && matchMonth;
    });
  }, [data?.invoices, search, statusFilter, monthFilter]);

  // ---------------------------------------------------------------------------
  // Paywall
  // ---------------------------------------------------------------------------

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/20">
            <Receipt size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Facturation du cabinet</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Gérez vos propres factures de cabinet, suivez les paiements et relancez vos clients automatiquement.
          </p>
          <Link href="/paywall?plan=business" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all">
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <FileText size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
        <Link href="/cabinet" className="mt-4 text-sm text-blue-500 hover:text-blue-600">
          Retour au cabinet
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const kpis = data.kpis || {
    total_facture: 0, total_payees: 0, total_en_attente: 0, total_en_retard: 0,
    montant_facture: 0, montant_payees: 0, montant_en_attente: 0, montant_en_retard: 0,
  };

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Facturation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.invoices.length} facture{data.invoices.length !== 1 ? 's' : ''} &middot; Facturation propre du cabinet
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (filtered.length === 0) return;
              downloadXLSX(
                `cabinet-facturation-${new Date().toISOString().slice(0, 10)}.xlsx`,
                [{
                  name: 'Factures',
                  headers: ['N° Facture', 'Client', 'Objet', 'Montant HT', 'TVA', 'TTC', 'Date', 'Echeance', 'Statut'],
                  rows: filtered.map((inv) => [
                    inv.number,
                    inv.client_name,
                    inv.object || '',
                    inv.subtotal,
                    inv.vat_amount,
                    inv.total,
                    inv.issue_date,
                    inv.due_date || '',
                    STATUS_CONFIG[inv.status]?.label || inv.status,
                  ]),
                }]
              );
              toast.success('Export Excel telecharge');
            }}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            title="Exporter Excel"
          >
            <Download size={16} />
          </button>
          <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowNewInvoiceForm(!showNewInvoiceForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all"
        >
          <Plus size={16} />
          Nouvelle facture          </motion.button>
        </div>
      </div>

      {/* New invoice form (collapsible) */}
      <AnimatePresence>
        {showNewInvoiceForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Nouvelle facture cabinet</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Client</label>
                  <input
                    type="text"
                    placeholder="Nom du client"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Objet</label>
                  <input
                    type="text"
                    placeholder="Ex : Honoraires comptables T3 2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Montant HT</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Echeance</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowNewInvoiceForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    toast.info('La creation de facture cabinet sera disponible prochainement.');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-md"
                >
                  Creer la facture
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total facture',
            value: formatCurrency(kpis.montant_facture),
            sub: `${kpis.total_facture} facture${kpis.total_facture !== 1 ? 's' : ''}`,
            icon: TrendingUp,
            gradient: 'from-emerald-500 to-teal-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            text: 'text-emerald-700 dark:text-emerald-400',
          },
          {
            label: 'Payees',
            value: formatCurrency(kpis.montant_payees),
            sub: `${kpis.total_payees} payee${kpis.total_payees !== 1 ? 's' : ''}`,
            icon: CheckCircle2,
            gradient: 'from-green-500 to-emerald-600',
            bg: 'bg-green-50 dark:bg-green-900/20',
            text: 'text-green-700 dark:text-green-400',
          },
          {
            label: 'En attente',
            value: formatCurrency(kpis.montant_en_attente),
            sub: `${kpis.total_en_attente} en attente`,
            icon: Clock,
            gradient: 'from-amber-500 to-yellow-500',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-700 dark:text-amber-400',
          },
          {
            label: 'En retard',
            value: formatCurrency(kpis.montant_en_retard),
            sub: `${kpis.total_en_retard} en retard`,
            icon: AlertTriangle,
            gradient: kpis.total_en_retard > 0 ? 'from-red-500 to-rose-600' : 'from-gray-400 to-gray-500',
            bg: kpis.total_en_retard > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900/20',
            text: kpis.total_en_retard > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
          },
        ].map(({ label, value, sub, icon: Icon, gradient, bg, text }) => (
          <div key={label} className={cn('p-5 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', gradient)}>
              <Icon size={16} className="text-white" />
            </div>
            <p className={cn('text-xl font-black', text)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par numero, client, objet..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm',
              showFilters
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300',
            )}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filtres</span>
          </motion.button>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                {/* Status pills */}
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FILTERS.map((s) => (
                    <motion.button
                      key={s.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStatusFilter(s.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        statusFilter === s.value
                          ? 'bg-primary text-white ring-2 ring-primary/30'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700',
                      )}
                    >
                      {s.label}
                    </motion.button>
                  ))}
                </div>

                {/* Month filter */}
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-0 outline-none cursor-pointer"
                >
                  <option value="">Tous les mois</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invoice Table */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center mx-auto mb-4"
            >
              <FileText size={28} className="text-gray-300 dark:text-gray-600" />
            </motion.div>
            <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">
              {search || statusFilter || monthFilter ? 'Aucun resultat trouve' : 'Aucune facture cabinet'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
              {search || statusFilter || monthFilter
                ? 'Modifiez vos criteres de recherche'
                : 'Creez votre premiere facture pour commencer a suivre vos honoraires.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50/70 dark:bg-white/5">
                    <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">N° Facture</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Objet</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Montant HT</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">TVA</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">TTC</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Echeance</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {filtered.map((inv, index) => {
                    const status = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                    const isOverdue = inv.status === 'overdue';
                    return (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          'hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors',
                          isOverdue && 'bg-red-50/30 dark:bg-red-500/5',
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-bold text-primary">{inv.number}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">
                            {inv.client_name}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                            {inv.object || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-gray-700 dark:text-gray-300">
                          {formatCurrency(inv.subtotal)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(inv.vat_amount)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className={cn('text-sm font-bold', isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white')}>
                            {formatCurrency(inv.total)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                          {formatDateShort(inv.issue_date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-sm', isOverdue && 'text-red-500 font-semibold')}>
                            {inv.due_date ? formatDateShort(inv.due_date) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', status.bg, status.text)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleViewPDF(inv)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 text-gray-400 hover:text-blue-500 transition-all"
                              title="Voir le PDF"
                            >
                              <Eye size={14} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handlePrint(inv)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 transition-all"
                              title="Imprimer"
                            >
                              <Printer size={14} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleSendEmail(inv)}
                              disabled={sendingEmail === inv.id}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-500 transition-all disabled:opacity-50"
                              title="Envoyer par email"
                            >
                              {sendingEmail === inv.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Mail size={14} />}
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table footer */}
              {filtered.length > 1 && (
                <div className="border-t border-gray-100 dark:border-white/10 px-5 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {filtered.length} facture{filtered.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Total TTC : {formatCurrency(filtered.reduce((s, i) => s + i.total, 0))}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile list */}
            <div className="lg:hidden divide-y divide-gray-50 dark:divide-white/5">
              {filtered.map((inv, index) => {
                const status = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                const isOverdue = inv.status === 'overdue';
                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors',
                      isOverdue && 'bg-red-50/30 dark:bg-red-500/5',
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-primary">{inv.number}</span>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', status.bg, status.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{inv.client_name}</p>
                    {inv.object && <p className="text-xs text-gray-400 mt-0.5">{inv.object}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className={cn('text-sm font-bold', isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white')}>
                        {formatCurrency(inv.total)} TTC
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateShort(inv.issue_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleViewPDF(inv)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                      >
                        <Eye size={12} /> PDF
                      </button>
                      <button
                        onClick={() => handlePrint(inv)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                      >
                        <Printer size={12} /> Imprimer
                      </button>
                      <button
                        onClick={() => handleSendEmail(inv)}
                        disabled={sendingEmail === inv.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        {sendingEmail === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                        Envoyer
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
    </CabinetGuard>
  );
}

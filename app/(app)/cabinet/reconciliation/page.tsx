'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Landmark, Filter, Search,
  CheckCircle2, XCircle, Link2, Unlink, Calendar, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_date: string;
  label: string;
  description?: string;
  status: 'unreconciled' | 'reconciled' | 'matched';
  matched_expense_id?: string;
  clientName?: string;
}

interface ClientOption {
  id: string;
  client_user_id: string;
  name: string;
}

export default function CabinetReconciliationPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unreconciled' | 'reconciled'>('all');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { if (profile) loadData(); }, [profile]);

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expiree');
        return;
      }

      // Get cabinet and clients
      const cabRes = await fetch('/api/cabinet/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!cabRes.ok) throw new Error('Erreur de chargement du cabinet');
      const cabData = await cabRes.json();

      const activeClients: ClientOption[] = (cabData.clientStats || []).map((c: any) => ({
        id: c.id,
        client_user_id: c.client_user_id,
        name: c.name,
      }));
      setClients(activeClients);

      // Fetch bank transactions for all active clients
      const allTransactions: Transaction[] = [];

      for (const client of activeClients) {
        const { data: txData } = await supabase
          .from('bank_transactions')
          .select('id, user_id, amount, transaction_date, label, description, status, matched_expense_id')
          .eq('user_id', client.client_user_id)
          .order('transaction_date', { ascending: false })
          .limit(100);

        if (txData) {
          for (const tx of txData) {
            allTransactions.push({ ...tx, clientName: client.name });
          }
        }
      }

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      setTransactions(allTransactions);
    } catch (error: any) {
      console.error('[loadData] Error:', error);
      toast.error(error.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleReconcile = async (tx: Transaction) => {
    setUpdatingId(tx.id);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expiree'); return; }

      const newStatus = tx.status === 'unreconciled' ? 'reconciled' : 'unreconciled';

      const res = await fetch('/api/cabinet/reconciliation', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transactionId: tx.id,
          clientUserId: tx.user_id,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur');
      }

      setTransactions((prev) =>
        prev.map((t) => (t.id === tx.id ? { ...t, status: newStatus as any } : t))
      );
      toast.success(newStatus === 'reconciled' ? 'Transaction rapprochee' : 'Rapprochement annule');
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status === filterStatus);
    }

    if (filterClientId !== 'all') {
      const client = clients.find((c) => c.id === filterClientId);
      if (client) {
        result = result.filter((t) => t.user_id === client.client_user_id);
      }
    }

    if (dateFrom) {
      result = result.filter((t) => t.transaction_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((t) => t.transaction_date <= dateTo);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.label?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.clientName?.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
      );
    }

    return result;
  }, [transactions, filterStatus, filterClientId, dateFrom, dateTo, searchQuery, clients]);

  const stats = useMemo(() => {
    const total = transactions.length;
    const reconciled = transactions.filter((t) => t.status === 'reconciled' || t.status === 'matched').length;
    const unreconciled = transactions.filter((t) => t.status === 'unreconciled').length;
    const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { total, reconciled, unreconciled, totalIn, totalOut };
  }, [transactions]);

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <Landmark size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Rapprochement bancaire</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Le rapprochement bancaire centralise est disponible avec le plan Business.
          </p>
          <Link href="/paywall?plan=business" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg shadow-violet-500/25">
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Rapprochement bancaire</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats.total} transactions · {stats.unreconciled} a rapprocher
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors',
              showFilters
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            )}
          >
            <Filter size={14} />
            Filtres
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total transactions', value: String(stats.total), color: 'text-gray-900 dark:text-white', bg: 'bg-gray-50 dark:bg-gray-900/20' },
          { label: 'Rapprochees', value: String(stats.reconciled), color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'A rapprocher', value: String(stats.unreconciled), color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Taux rapprochement', value: stats.total > 0 ? `${Math.round((stats.reconciled / stats.total) * 100)}%` : '0%', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn('p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
            <p className={cn('text-xl font-black', color)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Status filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Statut</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Tous</option>
                    <option value="unreconciled">Non rapprochees</option>
                    <option value="reconciled">Rapprochees</option>
                  </select>
                </div>

                {/* Client filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Client</label>
                  <select
                    value={filterClientId}
                    onChange={(e) => setFilterClientId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Tous les clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date from */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date debut</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Date to */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date fin</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par libelle, client, montant..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction List */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <Landmark size={16} className="text-gray-400" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
            Transactions ({filteredTransactions.length})
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Entrees: <span className="font-bold text-emerald-600">{formatCurrency(stats.totalIn)}</span></span>
            <span>Sorties: <span className="font-bold text-red-500">{formatCurrency(stats.totalOut)}</span></span>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Landmark size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucune transaction trouvee</p>
            <p className="text-sm text-gray-400">Modifiez les filtres ou synchronisez vos comptes bancaires.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            <AnimatePresence>
              {filteredTransactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Status icon */}
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    tx.status === 'reconciled' || tx.status === 'matched'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-amber-100 dark:bg-amber-900/30'
                  )}>
                    {tx.status === 'reconciled' || tx.status === 'matched'
                      ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      : <XCircle size={16} className="text-amber-600 dark:text-amber-400" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{tx.label || 'Transaction sans libelle'}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {tx.clientName}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(tx.transaction_date)}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      'text-sm font-bold',
                      tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                    )}>
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>

                  {/* Reconcile toggle */}
                  <button
                    onClick={() => handleToggleReconcile(tx)}
                    disabled={updatingId === tx.id}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0',
                      tx.status === 'reconciled' || tx.status === 'matched'
                        ? 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                    )}
                  >
                    {updatingId === tx.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : tx.status === 'reconciled' || tx.status === 'matched' ? (
                      <Unlink size={12} />
                    ) : (
                      <Link2 size={12} />
                    )}
                    {tx.status === 'reconciled' || tx.status === 'matched' ? 'Annuler' : 'Rapprocher'}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

'use client';
import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Landmark, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  CreditCard, Building2, Wallet, PiggyBank, ArrowRight,
  Lock, Crown, FileText, Download, ExternalLink, Clock, CheckCircle,
  AlertTriangle, Plus,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

// ── Helpers ────────────────────────────────────────────────────────────────

function maskIBAN(iban?: string): string {
  if (!iban) return '';
  const clean = iban.replace(/\s/g, '');
  if (clean.length < 8) return clean;
  return clean.slice(0, 4) + ' **** **** ' + clean.slice(-4);
}

function formatTxDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 20, stiffness: 100 },
  },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function BankingPage() {
  const { profile, user } = useAuthStore();
  const { invoices } = useDataStore();
  const sub = useSubscription();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);

  const hasBankInfo = profile?.iban;

  // ── Fetch Expenses ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    setExpensesLoading(true);
    getSupabaseClient()
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Error fetching expenses:', error);
        setExpenses(data || []);
        setExpensesLoading(false);
      });
  }, [user]);

  // ── Computed Values ──────────────────────────────────────────────────────

  const paidInvoices = useMemo(
    () =>
      invoices.filter(
        (i) => i.status === 'paid' && (!i.document_type || i.document_type === 'invoice')
      ),
    [invoices]
  );

  const totalRevenue = useMemo(
    () => paidInvoices.reduce((s, i) => s + i.total, 0),
    [paidInvoices]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0),
    [expenses]
  );

  const netBalance = totalRevenue - totalExpenses;

  const pendingInvoices = useMemo(
    () =>
      invoices.filter(
        (i) => ['sent', 'overdue'].includes(i.status) && (!i.document_type || i.document_type === 'invoice')
      ),
    [invoices]
  );

  const totalPending = useMemo(
    () => pendingInvoices.reduce((s, i) => s + i.total, 0),
    [pendingInvoices]
  );

  // ── Unified Transaction List ─────────────────────────────────────────────

  const transactions = useMemo(() => {
    const txns: any[] = [];

    paidInvoices.forEach((inv) => {
      txns.push({
        id: inv.id,
        type: 'income' as const,
        title: `Facture ${inv.number}`,
        subtitle: inv.client?.name || inv.client_name_override || 'Client',
        amount: inv.total,
        date: inv.paid_at || inv.issue_date,
      });
    });

    expenses.forEach((exp: any) => {
      txns.push({
        id: exp.id,
        type: 'expense' as const,
        title: exp.vendor || 'Dépense',
        subtitle: exp.category || '',
        amount: exp.amount,
        date: exp.date || exp.created_at,
      });
    });

    return txns
      .filter((t) => t.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [paidInvoices, expenses]);

  // ── Monthly Cash Flow (last 6 months) ────────────────────────────────────

  const monthlyData = useMemo(() => {
    const months: { key: string; label: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      months.push({
        key,
        label: MONTH_LABELS[d.getMonth()],
        income: 0,
        expenses: 0,
      });
    }

    paidInvoices.forEach((inv) => {
      const refDate = inv.paid_at || inv.issue_date;
      if (!refDate) return;
      const key = refDate.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.income += inv.total;
    });

    expenses.forEach((exp: any) => {
      const refDate = exp.date || exp.created_at;
      if (!refDate) return;
      const key = refDate.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.expenses += exp.amount || 0;
    });

    return months;
  }, [paidInvoices, expenses]);

  const maxMonthlyAmount = useMemo(
    () =>
      Math.max(
        ...monthlyData.map((m) => Math.max(m.income, m.expenses)),
        1
      ),
    [monthlyData]
  );

  const hasTransactions = transactions.length > 0;

  // ── Paywall Gate ─────────────────────────────────────────────────────────

  if (!sub.effectiveIsPro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Lock size={36} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
            Abonnement requis
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            La vue Bancaire est disponible avec les abonnements Pro et Business.
            Suivez vos encaissements, dépenses et flux de trésorerie en un coup d'œil.
          </p>
          <Link
            href="/paywall?plan=pro"
            className="group inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Crown size={18} />
            Passer à Pro
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Main Render ──────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 relative"
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/[0.02] dark:bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-emerald-500/[0.02] dark:bg-emerald-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Header
          title="Banque"
          subtitle="Vue d'ensemble de votre trésorerie"
          actions={
            <div className="flex items-center gap-3">
              <Link
                href="/banking/connect"
                className="group inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:border-primary hover:text-primary hover:scale-105 active:scale-95"
              >
                <Landmark size={16} />
                Connecter
              </Link>
              <Link
                href="/expenses"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95"
              >
                <Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                Dépense
              </Link>
            </div>
          }
        />
      </motion.div>

      {/* ── Bank Account Summary Card ──────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/[0.03] rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/[0.02] rounded-full" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Landmark size={24} className="text-white/80" />
              </div>
              <div>
                <p className="text-sm text-white/60 font-medium">
                  {profile?.bank_name || 'Compte principal'}
                </p>
                <p className="text-xs text-white/40 font-mono mt-0.5 tracking-wider">
                  {hasBankInfo ? maskIBAN(profile!.iban) : 'IBAN non configuré'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50 uppercase tracking-wide font-semibold">
                Solde net
              </p>
              <p className="text-3xl font-black tracking-tight mt-0.5">
                {formatCurrency(netBalance)}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${netBalance >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs text-white/50">
                  {netBalance >= 0 ? 'Positif' : 'Négatif'}
                </span>
              </div>
            </div>
          </div>

          {/* Mini progress: revenue vs expenses */}
          <div className="relative mt-5">
            <div className="flex items-center gap-3 text-xs text-white/40 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Encaissé {formatCurrency(totalRevenue)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Dépense {formatCurrency(totalExpenses)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
              {totalRevenue + totalExpenses > 0 && (
                <>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(totalRevenue / (totalRevenue + totalExpenses)) * 100}%`,
                    }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="bg-green-400/80 rounded-l-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(totalExpenses / (totalRevenue + totalExpenses)) * 100}%`,
                    }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="bg-red-400/80 rounded-r-full"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Bank Info CTA (if no IBAN) ─────────────────────────────────────── */}
      {!hasBankInfo && (
        <motion.div variants={itemVariants}>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Landmark size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  Informations bancaires
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Configurez vos informations bancaires pour apparaître sur vos factures.
                </p>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline mt-2"
                >
                  Configurer <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Quick Stats Row ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {/* Total Encaisse */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp size={16} className="text-green-500 dark:text-green-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">
              Total encaissé
            </p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {paidInvoices.length} facture{paidInvoices.length !== 1 ? 's' : ''} payée{paidInvoices.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total Depense */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown size={16} className="text-red-500 dark:text-red-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">
              Total dépense
            </p>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {formatCurrency(totalExpenses)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {expenses.length} dépense{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Solde Net */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-5 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
              netBalance >= 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                : 'bg-orange-50 dark:bg-orange-900/20'
            }`}>
              <Wallet size={16} className={
                netBalance >= 0
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : 'text-orange-500 dark:text-orange-400'
              } />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">
              Solde net
            </p>
          </div>
          <p className={`text-2xl font-black ${
            netBalance >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            {formatCurrency(netBalance)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {netBalance >= 0 ? 'Excédent' : 'Déficit'}
          </p>
        </div>
      </motion.div>

      {/* ── Pending Payments Section ────────────────────────────────────────── */}
      {pendingInvoices.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                  Paiements en attente
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatCurrency(totalPending)} à encaisser
                </p>
              </div>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group"
            >
              Voir tout <ArrowUpRight size={11} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {pendingInvoices.slice(0, 5).map((inv, i) => {
              const isOverdue = inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < new Date());
              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isOverdue
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-amber-50 dark:bg-amber-900/20'
                    }`}>
                      {isOverdue ? (
                        <AlertTriangle size={16} className="text-red-500 dark:text-red-400" />
                      ) : (
                        <Clock size={16} className="text-amber-500 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                        {inv.client?.name || inv.client_name_override || 'Sans client'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {inv.number} &middot; {inv.due_date ? `Échéance ${formatTxDate(inv.due_date)}` : 'Sans échéance'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(inv.total)}
                      </p>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wide">
                          En retard
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Monthly Cash Flow Visual ────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Flux de trésorerie
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              6 derniers mois &middot; Encaissements vs Dépenses
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-200 dark:bg-green-800/50" />
              Encaissements
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-200 dark:bg-red-800/50" />
              Dépenses
            </span>
          </div>
        </div>

        <div className="flex items-end gap-2 h-32">
          {monthlyData.map((m, i) => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end h-24">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.income / maxMonthlyAmount) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="flex-1 bg-green-200 dark:bg-green-800/50 rounded-t"
                  title={`Encaissé: ${formatCurrency(m.income)}`}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.expenses / maxMonthlyAmount) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 + 0.1 }}
                  className="flex-1 bg-red-200 dark:bg-red-800/50 rounded-t"
                  title={`Dépense: ${formatCurrency(m.expenses)}`}
                />
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Recent Transactions ─────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard size={14} className="text-primary" />
            Transactions récentes
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href="/invoices"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group"
            >
              Factures <ArrowUpRight size={11} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/expenses"
              className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary hover:underline flex items-center gap-1 group"
            >
              Dépenses <ArrowUpRight size={11} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {expensesLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasTransactions ? (
          /* ── Empty State ────────────────────────────────────────────────── */
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm text-center py-16">
            <Landmark size={40} className="text-gray-200 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Aucune transaction
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Vos encaissements et décaissements apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {transactions.map((txn, i) => (
              <motion.div
                key={`${txn.type}-${txn.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    txn.type === 'income'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  {txn.type === 'income' ? (
                    <ArrowDownRight size={18} className="text-green-500 dark:text-green-400" />
                  ) : (
                    <ArrowUpRight size={18} className="text-red-500 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {txn.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {txn.subtitle} &middot; {formatTxDate(txn.date)}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold flex-shrink-0 ${
                    txn.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {txn.type === 'income' ? '+' : '-'}
                  {formatCurrency(txn.amount)}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Quick Links ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <Link
          href="/invoices"
          className="group flex items-center gap-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-4 hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <FileText size={18} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Factures</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Gérer vos factures et devis</p>
          </div>
          <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        <Link
          href="/expenses"
          className="group flex items-center gap-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-4 hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <PiggyBank size={18} className="text-red-500 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Notes de frais</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Suivi de vos dépenses</p>
          </div>
          <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        <Link
          href="/settings"
          className="group flex items-center gap-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-4 hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900/20 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <Building2 size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Paramètres</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Compte & informations bancaires</p>
          </div>
          <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

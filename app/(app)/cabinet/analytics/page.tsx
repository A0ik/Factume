'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, TrendingUp, Euro, AlertTriangle, Users,
  BarChart3, FileText, Receipt, Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface ClientAnalytics {
  id: string;
  name: string;
  revenue: number;
  expenses: number;
  invoiceCount: number;
  expenseCount: number;
  overdueCount: number;
  paidCount: number;
  pendingCount: number;
}

interface MonthlyRevenue {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
}

interface AnalyticsData {
  totalClients: number;
  totalRevenue: number;
  totalExpenses: number;
  totalInvoices: number;
  totalExpensesCount: number;
  totalOverdue: number;
  totalPaid: number;
  totalPending: number;
  netBalance: number;
  topClients: ClientAnalytics[];
  monthlyRevenue: MonthlyRevenue[];
}

export default function CabinetAnalyticsPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile) loadAnalytics(); }, [profile]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      const res = await fetch('/api/cabinet/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(error.error || 'Erreur de chargement');
      }
      const dashboardData = await res.json();

      // Build analytics from dashboard data + additional aggregation
      const clientStats: ClientAnalytics[] = (dashboardData.clientStats || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        revenue: c.revenue || 0,
        expenses: c.expenses || 0,
        invoiceCount: 0,
        expenseCount: 0,
        overdueCount: c.overdueCount || 0,
        paidCount: 0,
        pendingCount: 0,
      }));

      // Fetch detailed analytics per client
      const cabinetId = dashboardData.cabinet?.id;

      if (cabinetId) {
        const { data: cabinetClients } = await supabase
          .from('cabinet_clients')
          .select('client_user_id, status')
          .eq('cabinet_id', cabinetId);

        const activeClients = (cabinetClients || []).filter((c: any) => c.status === 'active');

        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalInvoices = 0;
        let totalExpensesCount = 0;
        let totalOverdue = 0;
        let totalPaid = 0;
        let totalPending = 0;
        const detailedClients: ClientAnalytics[] = [];
        const monthlyMap: Record<string, { revenue: number; expenses: number }> = {};

        for (const client of activeClients) {
          const [invRes, expRes] = await Promise.all([
            supabase.from('invoices').select('id, total, status, document_type, issue_date').eq('user_id', client.client_user_id),
            supabase.from('expenses').select('id, amount, date').eq('user_id', client.client_user_id),
          ]);

          const invoices = (invRes.data || []).filter((i: any) => i.document_type === 'invoice');
          const expenses = expRes.data || [];

          const clientRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.total), 0);
          const clientExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
          const clientOverdue = invoices.filter((i: any) => i.status === 'overdue').length;
          const clientPaid = invoices.filter((i: any) => i.status === 'paid').length;
          const clientPending = invoices.filter((i: any) => i.status === 'sent').length;

          totalRevenue += clientRevenue;
          totalExpenses += clientExpenses;
          totalInvoices += invoices.length;
          totalExpensesCount += expenses.length;
          totalOverdue += clientOverdue;
          totalPaid += clientPaid;
          totalPending += clientPending;

          // Build monthly data
          for (const inv of invoices.filter((i: any) => i.status === 'paid')) {
            const month = inv.issue_date?.slice(0, 7);
            if (month) {
              if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, expenses: 0 };
              monthlyMap[month].revenue += Number(inv.total);
            }
          }
          for (const exp of expenses) {
            const month = exp.date?.slice(0, 7);
            if (month) {
              if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, expenses: 0 };
              monthlyMap[month].expenses += Number(exp.amount);
            }
          }

          // Get client name from existing stats
          const existing = clientStats.find((c: any) => c.client_user_id === client.client_user_id);
          const name = existing?.name || 'Client';

          detailedClients.push({
            id: client.client_user_id,
            name,
            revenue: clientRevenue,
            expenses: clientExpenses,
            invoiceCount: invoices.length,
            expenseCount: expenses.length,
            overdueCount: clientOverdue,
            paidCount: clientPaid,
            pendingCount: clientPending,
          });
        }

        // Sort months and build monthlyRevenue array
        const sortedMonths = Object.keys(monthlyMap).sort();
        const monthLabels: Record<string, string> = {
          '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Jun',
          '07': 'Jul', '08': 'Aou', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
        };
        const monthlyRevenue: MonthlyRevenue[] = sortedMonths.map((m) => ({
          month: m,
          label: `${monthLabels[m.slice(5, 7)] || m.slice(5)} ${m.slice(2, 4)}`,
          revenue: monthlyMap[m].revenue,
          expenses: monthlyMap[m].expenses,
        }));

        // Top clients by revenue
        const topClients = [...detailedClients].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        setData({
          totalClients: activeClients.length,
          totalRevenue,
          totalExpenses,
          totalInvoices,
          totalExpensesCount,
          totalOverdue,
          totalPaid,
          totalPending,
          netBalance: totalRevenue - totalExpenses,
          topClients,
          monthlyRevenue,
        });
      }
    } catch (error: any) {
      console.error('[loadAnalytics] Error:', error);
      toast.error(error.message || 'Erreur de chargement des analyses');
    } finally {
      setLoading(false);
    }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <BarChart3 size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Analyses avancees</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Les analyses avancees du cabinet sont disponibles avec le plan Business.
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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <BarChart3 size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Aucune donnee disponible</p>
        <Link href="/cabinet" className="mt-4 text-sm text-blue-500 hover:text-blue-600">Retour au cabinet</Link>
      </div>
    );
  }

  const maxMonthly = Math.max(...data.monthlyRevenue.map((m) => Math.max(m.revenue, m.expenses)), 1);
  const maxClientRevenue = Math.max(...data.topClients.map((c) => c.revenue), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Analyses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vue d'ensemble de votre cabinet</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Clients actifs', value: String(data.totalClients), icon: Users, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'Factures emises', value: String(data.totalInvoices), sub: `${data.totalPaid} payees / ${data.totalPending} en attente`, icon: FileText, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'CA total', value: formatCurrency(data.totalRevenue), icon: TrendingUp, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Depenses totales', value: formatCurrency(data.totalExpenses), sub: `${data.totalExpensesCount} enregistrements`, icon: Receipt, color: 'from-red-500 to-rose-600', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
        ].map(({ label, value, sub, icon: Icon, color, bg, text }) => (
          <div key={label} className={cn('p-5 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', color)}>
              <Icon size={16} className="text-white" />
            </div>
            <p className={cn('text-xl font-black', text)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn('p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', data.totalOverdue > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-900/20')}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className={data.totalOverdue > 0 ? 'text-amber-500' : 'text-gray-400'} />
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Factures en retard</span>
          </div>
          <p className={cn('text-2xl font-black', data.totalOverdue > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500')}>{data.totalOverdue}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700/40 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Euro size={14} className="text-blue-500" />
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Solde net</span>
          </div>
          <p className={cn('text-2xl font-black', data.netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>{formatCurrency(data.netBalance)}</p>
        </div>
        <div className="p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700/40 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-emerald-500" />
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Taux paiement</span>
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {data.totalInvoices > 0 ? Math.round((data.totalPaid / data.totalInvoices) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {data.monthlyRevenue.length > 0 && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-6">
            <TrendingUp size={15} className="text-blue-500" />
            Tendance CA mensuel
          </h3>
          <div className="flex items-end gap-2 h-48">
            {data.monthlyRevenue.slice(-12).map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '160px' }}>
                  <div className="w-full flex-1 flex flex-col justify-end items-center gap-0.5">
                    {/* Revenue bar */}
                    <div
                      className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-500"
                      style={{ height: `${(m.revenue / maxMonthly) * 100}%`, minHeight: m.revenue > 0 ? '4px' : '0' }}
                      title={`CA: ${formatCurrency(m.revenue)}`}
                    />
                    {/* Expenses bar */}
                    <div
                      className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-red-400 to-red-300 transition-all duration-500"
                      style={{ height: `${(m.expenses / maxMonthly) * 100}%`, minHeight: m.expenses > 0 ? '4px' : '0' }}
                      title={`Depenses: ${formatCurrency(m.expenses)}`}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 truncate w-full text-center">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-xs text-gray-500">Chiffre d'affaires</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-400" />
              <span className="text-xs text-gray-500">Depenses</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Clients */}
      {data.topClients.length > 0 && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <Users size={16} className="text-gray-400" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Top clients par chiffre d'affaires</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {data.topClients.map((client, i) => (
              <div key={client.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{client.name}</p>
                  <p className="text-xs text-gray-400">{client.invoiceCount} factures · {client.expenseCount} depenses</p>
                </div>
                {/* Revenue bar */}
                <div className="hidden md:block w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: `${(client.revenue / maxClientRevenue) * 100}%` }}
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(client.revenue)}</p>
                  {client.overdueCount > 0 && (
                    <p className="text-xs text-amber-500">{client.overdueCount} en retard</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice Status Breakdown */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4">
          <FileText size={15} className="text-blue-500" />
          Repartition des factures
        </h3>
        {data.totalInvoices > 0 ? (
          <div className="space-y-3">
            {[
              { label: 'Payees', count: data.totalPaid, color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'En attente', count: data.totalPending, color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-400' },
              { label: 'En retard', count: data.totalOverdue, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400' },
              { label: 'Brouillon / autres', count: Math.max(0, data.totalInvoices - data.totalPaid - data.totalPending - data.totalOverdue), color: 'bg-gray-400', textColor: 'text-gray-500' },
            ].map(({ label, count, color, textColor }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', color)} style={{ width: `${(count / data.totalInvoices) * 100}%` }} />
                </div>
                <span className={cn('text-sm font-bold w-16 text-right', textColor)}>{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Aucune facture pour le moment</p>
        )}
      </div>
    </motion.div>
  );
}

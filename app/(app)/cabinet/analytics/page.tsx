'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, TrendingUp, Euro, AlertTriangle, Users,
  BarChart3, FileText, Receipt, Calendar, Download,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, downloadCSV } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell as RechartsCell, Legend,
} from 'recharts';

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

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#9ca3af'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

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
        toast.error('Session expiree. Veuillez vous reconnecter.');
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

      const cabinetId = dashboardData.cabinet?.id;
      if (!cabinetId) { setLoading(false); return; }

      // Batch fetch: get all active client user IDs at once
      const { data: cabinetClients } = await supabase
        .from('cabinet_clients')
        .select('client_user_id, status')
        .eq('cabinet_id', cabinetId);

      const activeClients = (cabinetClients || []).filter((c: any) => c.status === 'active');
      const activeUserIds = activeClients.map((c: any) => c.client_user_id);

      if (activeUserIds.length === 0) {
        setData({
          totalClients: 0, totalRevenue: 0, totalExpenses: 0, totalInvoices: 0,
          totalExpensesCount: 0, totalOverdue: 0, totalPaid: 0, totalPending: 0,
          netBalance: 0, topClients: [], monthlyRevenue: [],
        });
        setLoading(false);
        return;
      }

      // Batch fetch all invoices and expenses in parallel (2 queries instead of N*2)
      const [invRes, expRes] = await Promise.all([
        supabase.from('invoices').select('id, total, status, document_type, issue_date, user_id').in('user_id', activeUserIds),
        supabase.from('expenses').select('id, amount, date, user_id').in('user_id', activeUserIds),
      ]);

      const allInvoices = (invRes.data || []).filter((i: any) => i.document_type === 'invoice');
      const allExpenses = expRes.data || [];

      // Group by client for per-client analytics
      const clientMap: Record<string, ClientAnalytics> = {};
      const nameMap: Record<string, string> = {};
      for (const cs of (dashboardData.clientStats || [])) {
        nameMap[cs.client_user_id] = cs.name;
      }

      for (const uid of activeUserIds) {
        clientMap[uid] = {
          id: uid, name: nameMap[uid] || 'Client',
          revenue: 0, expenses: 0, invoiceCount: 0, expenseCount: 0,
          overdueCount: 0, paidCount: 0, pendingCount: 0,
        };
      }

      // Aggregate invoices per client
      for (const inv of allInvoices) {
        const c = clientMap[inv.user_id];
        if (!c) continue;
        c.invoiceCount++;
        if (inv.status === 'paid') { c.revenue += Number(inv.total); c.paidCount++; }
        else if (inv.status === 'overdue') { c.overdueCount++; }
        else if (inv.status === 'sent') { c.pendingCount++; }
      }

      // Aggregate expenses per client
      for (const exp of allExpenses) {
        const c = clientMap[exp.user_id];
        if (!c) continue;
        c.expenses += Number(exp.amount);
        c.expenseCount++;
      }

      // Build monthly data
      const monthlyMap: Record<string, { revenue: number; expenses: number }> = {};
      for (const inv of allInvoices.filter((i: any) => i.status === 'paid')) {
        const month = inv.issue_date?.slice(0, 7);
        if (month) {
          if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, expenses: 0 };
          monthlyMap[month].revenue += Number(inv.total);
        }
      }
      for (const exp of allExpenses) {
        const month = exp.date?.slice(0, 7);
        if (month) {
          if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, expenses: 0 };
          monthlyMap[month].expenses += Number(exp.amount);
        }
      }

      const monthLabels: Record<string, string> = {
        '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Jun',
        '07': 'Jul', '08': 'Aou', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
      };

      const monthlyRevenue = Object.keys(monthlyMap).sort().map((m) => ({
        month: m,
        label: `${monthLabels[m.slice(5, 7)] || m.slice(5)} ${m.slice(2, 4)}`,
        revenue: monthlyMap[m].revenue,
        expenses: monthlyMap[m].expenses,
      }));

      const detailedClients = Object.values(clientMap);
      const topClients = [...detailedClients].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      const totals = detailedClients.reduce((acc, c) => ({
        totalRevenue: acc.totalRevenue + c.revenue,
        totalExpenses: acc.totalExpenses + c.expenses,
        totalInvoices: acc.totalInvoices + c.invoiceCount,
        totalExpensesCount: acc.totalExpensesCount + c.expenseCount,
        totalOverdue: acc.totalOverdue + c.overdueCount,
        totalPaid: acc.totalPaid + c.paidCount,
        totalPending: acc.totalPending + c.pendingCount,
      }), { totalRevenue: 0, totalExpenses: 0, totalInvoices: 0, totalExpensesCount: 0, totalOverdue: 0, totalPaid: 0, totalPending: 0 });

      setData({
        totalClients: activeClients.length,
        ...totals,
        netBalance: totals.totalRevenue - totals.totalExpenses,
        topClients,
        monthlyRevenue,
      });
    } catch (error: any) {
      console.error('[loadAnalytics] Error:', error);
      toast.error(error.message || 'Erreur de chargement des analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    downloadCSV(
      `cabinet-analyse-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Client', 'CA', 'Depenses', 'Factures', 'Payees', 'En attente', 'En retard'],
      data.topClients.map(c => [
        c.name,
        formatCurrency(c.revenue),
        formatCurrency(c.expenses),
        String(c.invoiceCount),
        String(c.paidCount),
        String(c.pendingCount),
        String(c.overdueCount),
      ])
    );
    toast.success('Export telecharge');
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

  const invoicePieData = [
    { name: 'Payees', value: data.totalPaid },
    { name: 'En attente', value: data.totalPending },
    { name: 'En retard', value: data.totalOverdue },
    { name: 'Autres', value: Math.max(0, data.totalInvoices - data.totalPaid - data.totalPending - data.totalOverdue) },
  ].filter(d => d.value > 0);

  const maxClientRevenue = Math.max(...data.topClients.map(c => c.revenue), 1);

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
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Analyses</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Vue d&apos;ensemble de votre cabinet</p>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <Download size={14} />
          Exporter
        </button>
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

      {/* Secondary KPIs */}
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

      {/* Revenue Trend + Invoice Pie - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Revenue Trend Line Chart */}
        {data.monthlyRevenue.length > 0 && (
          <div className="lg:col-span-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-blue-500" />
              Tendance CA mensuel
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.monthlyRevenue.slice(-12)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" name="CA" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="expenses" name="Depenses" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-xs text-gray-500">Chiffre d&apos;affaires</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-red-500" style={{ borderTop: '2px dashed #ef4444' }} />
                <span className="text-xs text-gray-500">Depenses</span>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Status Pie Chart */}
        {data.totalInvoices > 0 && (
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4">
              <FileText size={15} className="text-blue-500" />
              Repartition factures
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={invoicePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {invoicePieData.map((_, index) => (
                    <RechartsCell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [String(value), '']} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-gray-500">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Clients Bar Chart */}
      {data.topClients.length > 0 && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <Users size={16} className="text-gray-400" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">Top clients par chiffre d&apos;affaires</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topClients.map(c => ({
                name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
                CA: c.revenue,
              }))} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="CA" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Client Detail Table */}
      {data.topClients.length > 0 && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <FileText size={16} className="text-gray-400" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Details par client</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">CA</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Depenses</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Factures</th>
                  <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">En retard</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">CA visuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {data.topClients.map((client, i) => (
                  <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-[150px]">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.invoiceCount} factures · {client.expenseCount} depenses</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(client.revenue)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-sm font-bold text-red-500 dark:text-red-400">{formatCurrency(client.expenses)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{client.invoiceCount}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {client.overdueCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">{client.overdueCount}</span>
                      ) : (
                        <span className="text-xs text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                          style={{ width: `${(client.revenue / maxClientRevenue) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
    </CabinetGuard>
  );
}

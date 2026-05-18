'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  TrendingDown, TrendingUp, Receipt, ArrowDownUp, Calculator,
  Building2, Clock, Check, X, Download, Calendar, BarChart3,
  PieChart, FileText, Euro, ArrowRight, ChevronRight,
  Car, Coffee, Home, Laptop, Briefcase, ShoppingCart, Gauge,
  Smartphone, Shield, Disc, Package
} from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Expense {
  id: string;
  user_id: string;
  vendor: string;
  amount: number;
  vat_amount: number;
  category: string;
  date: string;
  description: string;
  receipt_url: string | null;
  payment_method: string;
  status: 'pending' | 'validated' | 'rejected';
  created_at: string;
  location_city?: string;
  location_country?: string;
  is_deductible?: boolean;
  tax_free_amount?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { value: 'transport', label: 'Transport', Icon: Car, color: 'from-blue-500 to-blue-600' },
  { value: 'meals', label: 'Repas', Icon: Coffee, color: 'from-amber-500 to-amber-600' },
  { value: 'accommodation', label: 'Hébergement', Icon: Home, color: 'from-green-500 to-green-600' },
  { value: 'equipment', label: 'Matériel', Icon: Laptop, color: 'from-purple-500 to-purple-600' },
  { value: 'office', label: 'Bureau', Icon: Briefcase, color: 'from-cyan-500 to-cyan-600' },
  { value: 'shopping', label: 'Achats', Icon: ShoppingCart, color: 'from-pink-500 to-pink-600' },
  { value: 'mileage', label: 'IK', Icon: Gauge, color: 'from-red-500 to-red-600' },
  { value: 'telecom', label: 'Télécom', Icon: Smartphone, color: 'from-indigo-500 to-indigo-600' },
  { value: 'insurance', label: 'Assurance', Icon: Shield, color: 'from-teal-500 to-teal-600' },
  { value: 'software', label: 'Logiciel', Icon: Disc, color: 'from-violet-500 to-violet-600' },
  { value: 'other', label: 'Autre', Icon: Package, color: 'from-gray-500 to-gray-600' },
];

const STATUS_STYLES: Record<string, { label: string; class: string; icon: typeof Check }> = {
  pending: { label: 'En attente', class: 'bg-amber-50/80 text-amber-600 border-amber-200/50', icon: Clock },
  validated: { label: 'Validée', class: 'bg-green-50/80 text-green-600 border-green-200/50', icon: Check },
  rejected: { label: 'Rejetée', class: 'bg-red-50/80 text-red-600 border-red-200/50', icon: X },
};

type Period = 'month' | 'quarter' | 'year' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
  { value: 'custom', label: 'Personnalisé' },
];

const MONTHS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
];

const BAR_COLORS = [
  'bg-blue-500', 'bg-amber-500', 'bg-green-500', 'bg-purple-500',
  'bg-cyan-500', 'bg-pink-500', 'bg-red-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-violet-500', 'bg-gray-500',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCat(value: string) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  if (period === 'quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    start.setMonth(qStart, 1);
    end.setMonth(qStart + 2, new Date(now.getFullYear(), qStart + 3, 0).getDate());
  }
  if (period === 'year') {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }
  return { start, end };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ExpenseAnalyticsPage() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // ---- Data fetching ----
  useEffect(() => {
    if (user) fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      setExpenses(data || []);
    } finally {
      setLoading(false);
    }
  };

  // ---- Period filtering ----
  const filteredExpenses = (() => {
    if (period === 'custom' && customStart && customEnd) {
      return expenses.filter((e) => e.date >= customStart && e.date <= customEnd);
    }
    const { start, end } = getPeriodRange(period);
    const s = start.toISOString().slice(0, 10);
    const e = end.toISOString().slice(0, 10);
    return expenses.filter((ex) => ex.date >= s && ex.date <= e);
  })();

  // ---- KPIs ----
  const totalDepenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalVat = filteredExpenses.reduce((s, e) => s + (e.vat_amount || 0), 0);
  const pendingExpenses = filteredExpenses.filter((e) => e.status === 'pending');
  const totalPending = pendingExpenses.reduce((s, e) => s + e.amount, 0);
  const totalDeductible = filteredExpenses
    .filter((e) => e.is_deductible !== false)
    .reduce((s, e) => s + e.amount, 0);
  const estimatedTaxSavings = totalDeductible * 0.25;
  const receiptCount = filteredExpenses.filter((e) => e.receipt_url).length;

  const monthsInRange = period === 'year' ? 12 : period === 'quarter' ? 3 : 1;
  const avgMonthlyBudget = monthsInRange > 0 ? totalDepenses / monthsInRange : totalDepenses;

  // ---- Category breakdown ----
  const categoryBreakdown = CATEGORIES.map((cat) => {
    const catExpenses = filteredExpenses.filter((e) => e.category === cat.value);
    const total = catExpenses.reduce((s, e) => s + e.amount, 0);
    return { ...cat, total, count: catExpenses.length };
  })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const categoryMax = categoryBreakdown.length > 0 ? categoryBreakdown[0].total : 1;

  // ---- Monthly trend (last 6 months) ----
  const monthlyTrend = (() => {
    const months: { label: string; total: number; month: number; year: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const total = expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((s, e) => s + e.amount, 0);
      months.push({
        label: MONTHS_FR[d.getMonth()],
        total,
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }
    return months;
  })();
  const trendMax = Math.max(...monthlyTrend.map((m) => m.total), 1);
  const currentMonthIdx = monthlyTrend.length - 1;
  const prevMonth = monthlyTrend[currentMonthIdx - 1];
  const curMonth = monthlyTrend[currentMonthIdx];
  const trendDirection = prevMonth && curMonth
    ? curMonth.total >= prevMonth.total ? 'up' : 'down'
    : 'up';

  // ---- Top vendors ----
  const topVendors = (() => {
    const map = new Map<string, { total: number; count: number; lastDate: string }>();
    filteredExpenses.forEach((e) => {
      const existing = map.get(e.vendor);
      if (existing) {
        existing.total += e.amount;
        existing.count += 1;
        if (e.date > existing.lastDate) existing.lastDate = e.date;
      } else {
        map.set(e.vendor, { total: e.amount, count: 1, lastDate: e.date });
      }
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  })();
  const vendorMax = topVendors.length > 0 ? topVendors[0].total : 1;

  // ---- Tax summary ----
  const totalHT = filteredExpenses.reduce((s, e) => s + (e.amount - (e.vat_amount || 0)), 0);
  const totalTTC = totalDepenses;
  const deductibleTotal = filteredExpenses
    .filter((e) => e.is_deductible !== false)
    .reduce((s, e) => s + e.amount, 0);
  const nonDeductibleTotal = filteredExpenses
    .filter((e) => e.is_deductible === false)
    .reduce((s, e) => s + e.amount, 0);

  // Estimated VAT by rate (heuristic based on common French rates)
  const vatByRate = [
    { rate: '20%', amount: Math.round(totalVat * 0.65 * 100) / 100, color: 'bg-blue-500' },
    { rate: '10%', amount: Math.round(totalVat * 0.20 * 100) / 100, color: 'bg-cyan-500' },
    { rate: '5.5%', amount: Math.round(totalVat * 0.10 * 100) / 100, color: 'bg-teal-500' },
    { rate: '2.1%', amount: Math.round(totalVat * 0.05 * 100) / 100, color: 'bg-green-500' },
  ];

  // ---- Recent activity ----
  const recentExpenses = filteredExpenses.slice(0, 10);

  // ---- CSV Export ----
  const handleExportCSV = () => {
    const headers = [
      'Date', 'Fournisseur', 'Catégorie', 'Montant TTC',
      'TVA', 'Montant HT', 'Statut', 'Déductible', 'Ville', 'Pays',
    ];
    const rows = filteredExpenses.map((e) => [
      e.date,
      e.vendor,
      getCat(e.category).label,
      e.amount.toFixed(2),
      (e.vat_amount || 0).toFixed(2),
      (e.amount - (e.vat_amount || 0)).toFixed(2),
      STATUS_STYLES[e.status]?.label || e.status,
      e.is_deductible !== false ? 'Oui' : 'Non',
      e.location_city || '',
      e.location_country || '',
    ]);
    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_depenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-400">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  // ---- KPI card data ----
  const kpis = [
    {
      label: 'Total dépenses',
      value: formatCurrency(totalDepenses),
      sub: 'période sélectionnée',
      icon: TrendingDown,
      color: 'from-red-500 to-rose-500',
    },
    {
      label: 'TVA récupérable',
      value: formatCurrency(totalVat),
      sub: 'sur la période',
      icon: ArrowDownUp,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'En attente',
      value: formatCurrency(totalPending),
      sub: `${pendingExpenses.length} note${pendingExpenses.length !== 1 ? 's' : ''}`,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Économies fiscales',
      value: formatCurrency(estimatedTaxSavings),
      sub: 'estimées (25%)',
      icon: Calculator,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      label: 'Justificatifs',
      value: String(receiptCount),
      sub: `sur ${filteredExpenses.length} dépenses`,
      icon: Receipt,
      color: 'from-purple-500 to-violet-500',
    },
    {
      label: 'Budget mensuel moy.',
      value: formatCurrency(avgMonthlyBudget),
      sub: 'moyenne / mois',
      icon: Euro,
      color: 'from-cyan-500 to-teal-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6 lg:p-8">

      {/* ================================================================== */}
      {/* HEADER                                                              */}
      {/* ================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              Analytics Dépenses
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Vue d'ensemble de vos dépenses professionnelles
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center bg-white/50 dark:bg-slate-700/50 rounded-2xl border border-gray-200 dark:border-gray-600 p-1 gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-bold transition-all',
                    period === p.value
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/30'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date pickers */}
            {period === 'custom' && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                className="flex items-center gap-2"
              >
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 text-xs"
                />
                <span className="text-gray-400 text-xs">→</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 text-xs"
                />
              </motion.div>
            )}

            {/* Export CSV */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ================================================================== */}
      {/* KPI CARDS                                                           */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className="relative group"
            >
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-5 overflow-hidden">
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', kpi.color)} />
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />
                <div className="relative">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg', kpi.color)}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <p className="text-xl font-black text-gray-900 dark:text-white group-hover:text-white transition-colors truncate">
                    {kpi.value}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 group-hover:text-white/70 transition-colors mt-1 truncate">
                    {kpi.sub}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-white/70 transition-colors mt-0.5">
                    {kpi.label}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* MAIN GRID: Category Breakdown + Monthly Trend                       */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">

        {/* CATEGORY BREAKDOWN */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
              <BarChart3 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Répartition par catégorie</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {categoryBreakdown.length} catégorie{categoryBreakdown.length !== 1 ? 's' : ''} active{categoryBreakdown.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <PieChart size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Aucune donnée pour cette période</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat, idx) => {
                const pct = totalDepenses > 0 ? (cat.total / totalDepenses) * 100 : 0;
                const barWidth = categoryMax > 0 ? (cat.total / categoryMax) * 100 : 0;
                return (
                  <motion.div
                    key={cat.value}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.05 }}
                    className="group"
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-lg flex-shrink-0"><cat.Icon size={18} /></span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{cat.label}</span>
                      <span className="text-xs text-gray-400 mr-2">{cat.count} dépense{cat.count !== 1 ? 's' : ''}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 w-10 text-right">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + idx * 0.05, ease: 'easeOut' }}
                        className={cn('h-full rounded-full bg-gradient-to-r', cat.color)}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* MONTHLY TREND */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tendance mensuelle</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">6 derniers mois</p>
              </div>
            </div>
            {prevMonth && curMonth && prevMonth.total > 0 && (
              <div className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold',
                trendDirection === 'up'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              )}>
                {trendDirection === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {trendDirection === 'up' ? '+' : ''}
                {((curMonth.total - prevMonth.total) / prevMonth.total * 100).toFixed(1)}%
              </div>
            )}
          </div>

          <div className="flex items-end gap-3 h-52">
            {monthlyTrend.map((m, idx) => {
              const barH = trendMax > 0 ? (m.total / trendMax) * 100 : 0;
              const isCurrent = idx === currentMonthIdx;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {m.total > 0 ? formatCurrency(m.total) : '-'}
                  </span>
                  <div className="w-full relative" style={{ height: '75%' }}>
                    <div className="absolute inset-0 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${barH}%` }}
                        transition={{ duration: 0.7, delay: 0.5 + idx * 0.08, ease: 'easeOut' }}
                        className={cn(
                          'w-full rounded-t-xl transition-colors',
                          isCurrent
                            ? 'bg-gradient-to-t from-primary to-primary/70 shadow-lg shadow-primary/30'
                            : 'bg-gray-200 dark:bg-slate-700 group-hover:bg-gray-300'
                        )}
                      />
                    </div>
                  </div>
                  <span className={cn(
                    'text-[11px] font-bold',
                    isCurrent ? 'text-primary' : 'text-gray-400'
                  )}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ================================================================== */}
      {/* SECOND ROW: Top Vendors + Tax Summary                               */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">

        {/* TOP VENDORS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top fournisseurs</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Les plus gros montants</p>
            </div>
          </div>

          {topVendors.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <Building2 size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Aucun fournisseur sur la période</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topVendors.map((v, idx) => {
                const barWidth = vendorMax > 0 ? (v.total / vendorMax) * 100 : 0;
                return (
                  <motion.div
                    key={v.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + idx * 0.06 }}
                    className="group p-4 rounded-2xl bg-white/40 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-600/30 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white',
                        idx === 0 ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                        idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                        idx === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700' :
                        'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-slate-600 dark:to-slate-500'
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{v.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <span>{v.count} transaction{v.count !== 1 ? 's' : ''}</span>
                          <span>·</span>
                          <Calendar size={10} />
                          <span>{new Date(v.lastDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(v.total)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + idx * 0.06, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* TAX SUMMARY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <Calculator size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Résumé fiscal</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">HT / TTC &amp; TVA</p>
            </div>
          </div>

          {/* HT vs TTC */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/40">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Total HT</p>
              <p className="text-xl font-black text-blue-700 dark:text-blue-300">{formatCurrency(totalHT)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-100 dark:border-purple-800/40">
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">Total TTC</p>
              <p className="text-xl font-black text-purple-700 dark:text-purple-300">{formatCurrency(totalTTC)}</p>
            </div>
          </div>

          {/* TVA by rate */}
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">TVA par taux</p>
            <div className="space-y-2">
              {vatByRate.map((v, idx) => {
                const vatMax = vatByRate[0]?.amount || 1;
                const barW = (v.amount / vatMax) * 100;
                return (
                  <div key={v.rate} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-10 text-right">{v.rate}</span>
                    <div className="flex-1 h-5 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barW}%` }}
                        transition={{ duration: 0.7, delay: 0.7 + idx * 0.08, ease: 'easeOut' }}
                        className={cn('h-full rounded-full', v.color)}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-24 text-right">
                      {formatCurrency(v.amount)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 w-10 text-right">Total</span>
                <div className="flex-1" />
                <span className="text-sm font-black text-gray-900 dark:text-white w-24 text-right">
                  {formatCurrency(totalVat)}
                </span>
              </div>
            </div>
          </div>

          {/* Deductible vs non-deductible */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Déductibilité</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <Check size={14} className="text-green-600" />
                  <span className="text-[11px] font-bold text-green-600 dark:text-green-400">Déductible</span>
                </div>
                <p className="text-lg font-black text-green-700 dark:text-green-300">{formatCurrency(deductibleTotal)}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <X size={14} className="text-red-500" />
                  <span className="text-[11px] font-bold text-red-500 dark:text-red-400">Non déductible</span>
                </div>
                <p className="text-lg font-black text-red-600 dark:text-red-300">{formatCurrency(nonDeductibleTotal)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ================================================================== */}
      {/* RECENT ACTIVITY                                                     */}
      {/* ================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Activité récente</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filteredExpenses.length} dépense{filteredExpenses.length !== 1 ? 's' : ''} au total
              </p>
            </div>
          </div>
          <Link href="/expenses">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer"
            >
              Voir tout
              <ArrowRight size={14} />
            </motion.span>
          </Link>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <Receipt size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Aucune dépense sur cette période</p>
            <Link href="/expenses">
              <span className="text-primary text-xs font-bold mt-2 hover:underline cursor-pointer">
                Ajouter une dépense
              </span>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentExpenses.map((expense, idx) => {
              const cat = getCat(expense.category);
              const StatusIcon = STATUS_STYLES[expense.status]?.icon || Clock;
              const statusLabel = STATUS_STYLES[expense.status]?.label || expense.status;
              const statusClass = STATUS_STYLES[expense.status]?.class || '';
              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + idx * 0.04 }}
                  className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-all"
                >
                  <span className="text-lg flex-shrink-0 flex items-center"><cat.Icon size={18} /></span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {expense.vendor}
                      </p>
                      <span className={cn(
                        'flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm',
                        statusClass
                      )}>
                        <StatusIcon size={10} />
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                      <span>{cat.label}</span>
                      <span>·</span>
                      <Calendar size={10} />
                      <span>{new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </p>
                    {expense.vat_amount > 0 && (
                      <p className="text-[10px] text-gray-400">
                        TVA {formatCurrency(expense.vat_amount)}
                      </p>
                    )}
                  </div>

                  <Link href="/expenses" className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <ChevronRight size={16} className="text-gray-400 hover:text-primary transition-colors" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  );
}

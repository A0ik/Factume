'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import {
  FileText, Clipboard, RefreshCw, Plus, TrendingUp,
  ArrowUpRight, Clock, AlertTriangle, Zap, ShoppingCart, Truck,
  Users, Sparkles, ChevronRight, Receipt, Award,
  ArrowDownRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 p-3 rounded-lg text-xs">
        <p className="text-slate-400 font-medium mb-1 capitalize">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white font-semibold">{entry.name}: {formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Dashboard Mobile — "Le Chiffre est Roi"
 *
 * Le point focal absolu : "À encaisser" en grand.
 * L'utilisateur ouvre l'app pour UNE question : combien on me doit ?
 * Le reste est secondaire et accessible en scrollant.
 */

const springTransition = { type: 'spring' as const, damping: 25, stiffness: 200 };

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { invoices, stats, fetchInvoices } = useDataStore();
  const sub = useSubscription();
  const [period, setPeriod] = useState<1 | 3 | 6 | 12>(6);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir');
  }, []);

  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);

  // --- Calcul du montant "À encaisser" (envoyées + en retard) ---
  const { toCollect, toCollectOverdue, toCollectPending } = useMemo(() => {
    const sent = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
    const overdue = sent.filter(i => i.status === 'overdue');
    const pending = sent.filter(i => i.status === 'sent');
    return {
      toCollect: sent.reduce((s, i) => s + i.total, 0),
      toCollectOverdue: overdue.reduce((s, i) => s + i.total, 0),
      toCollectPending: pending.reduce((s, i) => s + i.total, 0),
    };
  }, [invoices]);

  const overdueCount = useMemo(() => invoices.filter(i => i.status === 'overdue').length, [invoices]);

  const chartData = useMemo(() => {
    const data = Array.from({ length: period }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (period - 1 - i));
      return { label: d.toLocaleString('fr-FR', { month: 'short' }), key: d.toISOString().slice(0, 7), paid: 0, pending: 0 };
    });
    invoices.filter((inv) => inv.document_type === 'invoice' || !inv.document_type).forEach((inv) => {
      const refDate = inv.paid_at || inv.issue_date || inv.created_at;
      if (!refDate) return;
      const entry = data.find((d) => d.key === refDate.slice(0, 7));
      if (!entry) return;
      if (inv.status === 'paid') entry.paid += inv.total;
      else if (inv.status === 'sent' || inv.status === 'draft') entry.pending += inv.total;
    });
    return data;
  }, [invoices, period]);

  const { topClients, maxPaid } = useMemo(() => {
    const clientMap: Record<string, { name: string; id: string; paid: number; count: number }> = {};
    invoices.filter((inv) => inv.status === 'paid').forEach((inv) => {
      const name = inv.client?.name || inv.client_name_override || 'Sans nom';
      const id = inv.client_id || name;
      if (!clientMap[id]) clientMap[id] = { name, id: inv.client_id || '', paid: 0, count: 0 };
      clientMap[id].paid += inv.total;
      clientMap[id].count += 1;
    });
    const sorted = Object.values(clientMap).sort((a, b) => b.paid - a.paid).slice(0, 5);
    return { topClients: sorted, maxPaid: sorted[0]?.paid || 1 };
  }, [invoices]);

  const monthOverMonthGrowth = useMemo(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 999);
    const lastMRR = invoices.filter((inv) => inv.paid_at && new Date(inv.paid_at) >= start && new Date(inv.paid_at) <= end).reduce((s, i) => s + i.total, 0);
    return lastMRR > 0 ? ((stats?.mrr || 0) - lastMRR) / lastMRR * 100 : 0;
  }, [invoices, stats?.mrr]);

  const dso = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid' && i.paid_at && i.issue_date);
    return paid.length > 0 ? Math.round(paid.reduce((s, inv) => s + Math.floor((new Date(inv.paid_at!).getTime() - new Date(inv.issue_date).getTime()) / 86400000), 0) / paid.length) : 0;
  }, [invoices]);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

  // Animation variants — spring-based, not ease-in-out
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } },
  };

  const quickActions = [
    { href: '/invoices/new?type=invoice', icon: FileText, label: 'Facture', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { href: '/invoices/new?type=quote', icon: Clipboard, label: 'Devis', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { href: '/invoices/new?type=credit_note', icon: RefreshCw, label: 'Avoir', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { href: '/invoices/new?type=purchase_order', icon: ShoppingCart, label: 'Bon cde', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { href: '/invoices/new?type=delivery_note', icon: Truck, label: 'Bon liv.', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <>
      <h1 className="sr-only">Tableau de bord</h1>
      <PullToRefresh onRefresh={fetchInvoices}>
        <main>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">

          {/* ══════════════════════════════════════════════════════════
              HERO — LE CHIFFRE EST ROI
              Point focal absolu : "À encaisser" en grand
              ══════════════════════════════════════════════════════════ */}
          <motion.div variants={itemVariants} className="lg:hidden">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10" />
              </div>

              <div className="relative">
                {/* Greeting */}
                <p className="text-emerald-200/80 text-sm font-medium">{greeting} 👋</p>

                {/* The BIG number */}
                <div className="mt-3 mb-1">
                  <p className="text-[11px] font-bold text-emerald-200/60 uppercase tracking-widest mb-1">
                    À encaisser
                  </p>
                  <motion.p
                    key={toCollect}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={springTransition}
                    className="text-4xl font-bold text-white tracking-tight"
                  >
                    {formatCurrency(toCollect)}
                  </motion.p>
                </div>

                {/* Sub-metrics */}
                <div className="flex items-center gap-4 mt-3">
                  {overdueCount > 0 && (
                    <Link href="/documents/factures?status=overdue" className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse" />
                      <span className="text-xs text-emerald-200/70 font-medium">
                        {formatCurrency(toCollectOverdue)} en retard
                      </span>
                    </Link>
                  )}
                  {toCollectPending > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-200/50" />
                      <span className="text-xs text-emerald-200/70 font-medium">
                        {formatCurrency(toCollectPending)} en attente
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick action strip — juste 2 boutons */}
                <div className="flex gap-2 mt-4">
                  <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                    <Link
                      href="/invoices/new?type=invoice"
                      className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      Facturer
                    </Link>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <button
                      onClick={() => setShowQuickActions(!showQuickActions)}
                      className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white transition-colors"
                    >
                      <Sparkles size={16} />
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Quick actions — bottom sheet style expand */}
            <AnimatePresence>
              {showQuickActions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-3 pb-1 overflow-x-auto scrollbar-none">
                    {quickActions.map(({ href, icon: Icon, label, color, bg }) => (
                      <Link key={href} href={href} className="group flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-colors active:scale-95 min-w-[72px]">
                        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                          <Icon size={16} className={color} />
                        </div>
                        <span className="text-[11px] font-medium text-slate-400">{label}</span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Desktop header — unchanged */}
          <motion.div variants={itemVariants} className="hidden lg:flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{greeting}</p>
              <h2 className="text-3xl font-bold tracking-tight text-white mt-0.5">
                {profile?.company_name || 'Mon entreprise'}
              </h2>
            </div>
            <Link
              href="/documents"
              className="group flex-shrink-0 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
              Nouveau document
            </Link>
          </motion.div>

          {/* Paywall hint */}
          {sub.isFree && sub.invoiceCount >= 2 && (
            <motion.div variants={itemVariants}>
              <Link href="/paywall" className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:border-amber-500/30 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-amber-400" />
                </div>
                <p className="text-sm text-amber-300 font-medium flex-1 truncate">
                  {sub.isAtLimit ? 'Limite atteinte' : `${sub.invoiceCount}/5 factures ce mois`}
                </p>
                <ArrowUpRight size={14} className="text-amber-500 flex-shrink-0" />
              </Link>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STATS STRIP — 3 métriques essentielles en ligne
              Mobile: cartes compactes, pas de grid 2x2
              ══════════════════════════════════════════════════════════ */}
          <motion.div variants={itemVariants}>
            {/* Mobile: horizontal scroll strip */}
            <div className="flex gap-2 lg:hidden overflow-x-auto scrollbar-none pb-1">
              <div className="flex-shrink-0 bg-slate-800/50 border border-white/5 rounded-2xl p-3.5 min-w-[130px]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CA ce mois</p>
                <p className="text-lg font-bold text-white">{formatCurrency(stats?.mrr || 0)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {monthOverMonthGrowth > 0 ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}%
                </p>
              </div>
              <Link href="/documents/factures?status=overdue" className="flex-shrink-0 min-w-[130px]">
                <motion.div whileTap={{ scale: 0.98 }} className={cn(
                  "border rounded-2xl p-3.5 h-full",
                  overdueCount ? "bg-red-500/5 border-red-500/20" : "bg-slate-800/50 border-white/5"
                )}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">En retard</p>
                  <p className={cn("text-lg font-bold", overdueCount ? "text-red-400" : "text-white")}>{overdueCount}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">factures</p>
                </motion.div>
              </Link>
              <div className="flex-shrink-0 bg-slate-800/50 border border-white/5 rounded-2xl p-3.5 min-w-[130px]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">DSO moyen</p>
                <p className="text-lg font-bold text-white">{dso}<span className="text-xs text-slate-500 ml-1">jours</span></p>
                <p className="text-[10px] text-slate-500 mt-0.5">délai paiement</p>
              </div>
            </div>

            {/* Desktop: grid 4 cols */}
            <div className="hidden lg:grid grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5">
                <p className="text-xs text-emerald-200/70 font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                  <TrendingUp size={10} /> CA ce mois
                </p>
                <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(stats?.mrr || 0)}</p>
                <p className="text-[11px] text-emerald-200/50 mt-1.5">
                  {monthOverMonthGrowth > 0 ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}% vs mois dernier
                </p>
              </div>

              {[
                { label: 'DSO', value: dso, sub: 'jours', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/documents/factures?status=paid' },
                { label: 'En retard', value: stats?.overdueCount || 0, sub: 'factures', icon: AlertTriangle, color: stats?.overdueCount ? 'text-red-400' : 'text-slate-500', bg: stats?.overdueCount ? 'bg-red-500/10' : 'bg-white/5', href: '/documents/factures?status=overdue' },
                { label: 'En attente', value: stats?.pendingCount || 0, sub: formatCurrency(stats?.pendingRevenue || 0), icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/documents/factures?status=sent' },
              ].map(({ label, value, sub, icon: Icon, color, bg, href }) => (
                <Link key={label} href={href} className="block">
                  <motion.div whileTap={{ scale: 0.98 }} className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 h-full">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                        <Icon size={13} className={color} />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-white">{value}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Quick actions — desktop only */}
          <motion.div variants={itemVariants} className="hidden lg:block bg-slate-800/30 border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles size={10} className="text-emerald-400" /> Créer
            </p>
            <div className="grid grid-cols-5 gap-2">
              {quickActions.map(({ href, icon: Icon, label, color, bg }) => (
                <Link key={href} href={href} className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-colors">
                  <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon size={20} className={color} />
                  </div>
                  <span className="text-xs font-medium text-slate-400">{label}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Chart */}
          <motion.div variants={itemVariants} className="bg-slate-800/30 border border-white/5 rounded-2xl p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-400" /> Évolution
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Facturé vs encaissé</p>
              </div>
              <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
                {([1, 3, 6, 12] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      period === p ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {p}M
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[170px] sm:h-[200px] lg:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={3} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="paid" name="Payé" radius={[4, 4, 0, 0]}>{chartData.map((_, i) => <Cell key={i} fill="#10b981" />)}</Bar>
                  <Bar dataKey="pending" name="En attente" radius={[4, 4, 0, 0]}>{chartData.map((_, i) => <Cell key={i} fill="#f59e0b" />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top clients + Recent invoices — côte à côte sur desktop */}
          <div className="lg:grid lg:grid-cols-2 gap-5 space-y-5 lg:space-y-0">
          {/* Top clients */}
          {topClients.length > 0 && (
            <motion.div variants={itemVariants} className="bg-slate-800/30 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-400" /> Top clients
                </h2>
                <Link href="/clients" className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 hover:underline">
                  Tout <ChevronRight size={10} />
                </Link>
              </div>
              <div className="space-y-2">
                {topClients.slice(0, 3).map((c, i) => {
                  const initials = c.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                  const pct = Math.round((c.paid / maxPaid) * 100);
                  return (
                    <motion.div key={c.id || c.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: COLORS[i] + '20', color: COLORS[i] }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{c.name}</p>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} className="h-full rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white flex-shrink-0">{formatCurrency(c.paid)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Recent invoices — cartes épurées */}
          <motion.div variants={itemVariants} className="bg-slate-800/30 border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 cursor-pointer">
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <FileText size={14} className="text-emerald-400" /> Récents
              </h2>
              <Link href="/documents/factures" className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 hover:underline">
                Tout <ChevronRight size={10} />
              </Link>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Receipt size={22} className="text-slate-600" />
                </div>
                <p className="text-sm text-slate-400">Aucune facture</p>
                <p className="text-xs text-slate-600 mt-0.5 mb-4">Créez votre première facture</p>
                <Link href="/invoices/new" className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-emerald-400 transition-colors active:scale-95">
                  <Plus size={13} /> Créer
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentInvoices.map((inv, i) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200, delay: i * 0.04 }}
                  >
                    <Link href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors group active:bg-white/[0.05] cursor-pointer">
                      {/* Mini colored dot — status indicator */}
                      <div className="relative w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Receipt size={14} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-slate-900 ${
                          inv.status === 'paid' ? 'bg-emerald-400'
                          : inv.status === 'overdue' ? 'bg-red-400'
                          : inv.status === 'sent' ? 'bg-blue-400'
                          : 'bg-slate-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                          {inv.client?.name || inv.client_name_override || 'Sans client'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{inv.number}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn(
                          "text-sm font-bold",
                          inv.status === 'paid' ? 'text-emerald-400' : inv.status === 'overdue' ? 'text-red-400' : 'text-white',
                        )}>
                          {formatCurrency(inv.total)}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
          </div>{/* fin lg:grid-cols-2 */}
        </motion.div>
      </main>
      </PullToRefresh>
    </>
  );
}


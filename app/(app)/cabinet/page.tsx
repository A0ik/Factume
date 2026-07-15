'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  TrendingUp, Receipt, Shield, AlertTriangle, Plus, Loader2, Crown,
  RefreshCw, Download, Settings, UserPlus, Building2, Bell, ChevronRight,
  Users, CalendarClock, BarChart3, PieChart, FileWarning, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetData } from '@/hooks/useCabinetData';
import { clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, formatCurrency, downloadCSV } from '@/lib/utils';
import { toast } from 'sonner';
import {
  KpiCard, SectionCard, StatusBadge, Avatar, EmptyState, KpiSkeleton, DateBlock, DonutChart,
} from '@/components/cabinet/ui';
import type { DonutSlice } from '@/components/cabinet/ui';

interface ClientStat {
  id: string;
  client_user_id: string;
  name: string;
  email?: string;
  health: 'good' | 'warning' | 'critical';
  revenue: number;
  expenses: number;
  overdueCount?: number;
}

interface Alert {
  id: string;
  type: 'overdue' | 'warning' | 'deadline' | 'dsn';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  clientName?: string;
  amount?: number;
  daysOverdue?: number;
  href?: string;
}

interface Deadline {
  id: string;
  date: string;
  label: string;
  type: string;
  description: string;
  daysUntil: number;
}

interface MissionSlice {
  label: string;
  value: number;
  fee: number;
  color: string;
}

interface MonthlyBucket {
  key: string;
  label: string;
  total: number;
  count: number;
}

interface CabinetData {
  cabinet: {
    id: string;
    name: string;
    siret?: string;
    primary_color?: string;
    logo_url?: string;
    white_label_name?: string;
    hide_factu_branding?: boolean;
  } | null;
  totalClients: number;
  activeClients: number;
  stats: { totalRevenue: number; totalExpenses: number; totalOverdue: number };
  clientStats: ClientStat[];
  alerts?: Alert[];
  upcomingDeadlines?: Deadline[];
  missionBreakdown?: MissionSlice[];
  monthlyBilling?: MonthlyBucket[];
}

const HEALTH_TONE = {
  good: 'good',
  warning: 'warning',
  critical: 'critical',
} as const;

const HEALTH_LABEL = { good: 'Bon état', warning: 'Attention', critical: 'Critique' };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
          {p.name} : {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function CabinetPage() {
  const { profile, initialized } = useAuthStore();
  const cabinetFromStore = useCabinetStore((state) => state.cabinet);
  const sub = useSubscription();
  const { data, loading, error, refresh } = useCabinetData<CabinetData>(
    initialized && profile ? '/api/cabinet/dashboard' : null,
    { pauseUntilCabinetReady: false, wholeObject: true },
  );
  const [creating, setCreating] = useState(false);
  const [cabinetName, setCabinetName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateCabinet = async () => {
    if (!cabinetName.trim()) return;
    setCreating(true);
    try {
      const { createCabinet } = useCabinetStore.getState();
      const cabinet = await createCabinet(cabinetName.trim());
      if (cabinet) {
        toast.success('Cabinet créé avec succès');
        setCabinetName('');
        clearCabinetCache();
        await refresh();
      } else {
        toast.error('Erreur lors de la création');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.clientStats?.length) return;
    downloadCSV(
      `cabinet-clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Client', 'Email', 'Santé', 'CA', 'Dépenses', 'Factures en retard'],
      (data?.clientStats || []).map((c) => [
        c.name,
        c.email || '',
        c.health === 'good' ? 'Bon' : c.health === 'critical' ? 'Critique' : 'Attention',
        formatCurrency(c.revenue),
        formatCurrency(c.expenses),
        String(c.overdueCount || 0),
      ]),
    );
    toast.success('Export CSV téléchargé');
  };

  const safeData = data || {
    cabinet: null,
    totalClients: 0,
    activeClients: 0,
    stats: { totalRevenue: 0, totalExpenses: 0, totalOverdue: 0 },
    clientStats: [] as ClientStat[],
    alerts: [],
    upcomingDeadlines: [],
    missionBreakdown: [],
    monthlyBilling: [],
  };

  const cabinetData =
    data?.cabinet ||
    (cabinetFromStore
      ? {
          id: cabinetFromStore.id,
          name: cabinetFromStore.name,
          siret: cabinetFromStore.siret,
          primary_color: cabinetFromStore.primary_color,
          logo_url: cabinetFromStore.logo_url,
          white_label_name: cabinetFromStore.white_label_name,
          hide_factu_branding: cabinetFromStore.hide_factu_branding,
        }
      : null);

  const primaryColor = cabinetData?.primary_color || '#10b981';
  const netBalance = (safeData.stats?.totalRevenue || 0) - (safeData.stats?.totalExpenses || 0);
  const hasCabinet = !!(cabinetData || cabinetFromStore);

  const chartData = useMemo(() => {
    if (!safeData.clientStats?.length) return [];
    return safeData.clientStats.slice(0, 8).map((c) => ({
      name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
      CA: c.revenue,
      Dépenses: c.expenses,
    }));
  }, [safeData.clientStats]);

  const donutData = useMemo<DonutSlice[]>(
    () => (safeData.missionBreakdown || []).map((m) => ({ label: m.label, value: m.value, color: m.color })),
    [safeData.missionBreakdown],
  );

  const monthly = safeData.monthlyBilling || [];
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.total));
  const totalMissions = donutData.reduce((s, d) => s + d.value, 0);

  // ── Garde 1 : abonnement Business requis ──
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${primaryColor}1a` }}
          >
            <Crown size={40} style={{ color: primaryColor }} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">Cabinet Expert-Comptable</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Gérez tous vos clients depuis un tableau de bord unique. Consultez leurs factures,
            dépenses et indicateurs de santé financière.
          </p>
          <Link
            href="/paywall?plan=business"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold shadow-lg transition-all hover:shadow-xl"
            style={{ backgroundColor: primaryColor }}
          >
            <Crown size={18} />
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Garde 2 : chargement ──
  if (loading && !cabinetFromStore) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Garde 3 : erreur ──
  if (error && !cabinetFromStore) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-red-600" />
        </div>
        <p className="text-gray-900 font-semibold mb-1">Erreur de chargement</p>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    );
  }

  // ── Garde 4 : pas de cabinet → création ──
  if (!hasCabinet) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
      >
        <div className="w-24 h-24 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <Building2 size={40} className="text-gray-400" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Créez votre cabinet</h1>
        <p className="text-gray-500 mb-8 max-w-md leading-relaxed">
          Donnez un nom à votre cabinet comptable pour commencer à inviter des clients et
          centraliser leur gestion.
        </p>
        <div className="flex items-center gap-3 w-full max-w-sm">
          <input
            type="text"
            value={cabinetName}
            onChange={(e) => setCabinetName(e.target.value)}
            placeholder="Ex : Cabinet Dubois & Associés"
            className="flex-1 px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCabinet()}
          />
          <button
            onClick={handleCreateCabinet}
            disabled={!cabinetName.trim() || creating}
            className="px-6 py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40 transition-opacity flex items-center"
            style={{ backgroundColor: primaryColor }}
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : 'Créer'}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* ─── En-tête : actions rapides ─── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">
            {safeData.activeClients} client{safeData.activeClients !== 1 ? 's' : ''} actif
            {safeData.activeClients !== 1 ? 's' : ''}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {safeData.totalClients > safeData.activeClients
              ? `${safeData.totalClients - safeData.activeClients} en attente · `
              : ''}
            Vue d&apos;ensemble du portefeuille
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExportCSV}
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Exporter en CSV"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/cabinet/settings"
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Paramètres"
          >
            <Settings size={16} />
          </Link>
          <Link
            href="/cabinet/invitations"
            className="ml-1 flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            <UserPlus size={15} />
            <span className="hidden sm:inline">Inviter</span>
          </Link>
        </div>
      </div>

      {/* ─── KPI ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="CA total des clients"
          value={formatCurrency(safeData.stats?.totalRevenue || 0)}
          icon={TrendingUp}
          accent="#10b981"
        />
        <KpiCard
          label="Dépenses totales"
          value={formatCurrency(safeData.stats?.totalExpenses || 0)}
          icon={Receipt}
          accent="#ef4444"
        />
        <KpiCard
          label="Solde net consolidé"
          value={formatCurrency(netBalance)}
          icon={Shield}
          accent={netBalance >= 0 ? '#3b82f6' : '#ef4444'}
        />
        <KpiCard
          label="Factures en retard"
          value={String(safeData.stats?.totalOverdue || 0)}
          icon={AlertTriangle}
          accent={(safeData.stats?.totalOverdue || 0) > 0 ? '#f59e0b' : '#6b7280'}
          hint={(safeData.stats?.totalOverdue || 0) > 0 ? 'à relancer' : undefined}
        />
      </div>

      {/* ─── Alerte retard (bandeau) ─── */}
      {(safeData.stats?.totalOverdue || 0) > 0 && (
        <Link
          href="/cabinet/relances"
          className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100 hover:bg-amber-50/70 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/80 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-700">
              {safeData.stats.totalOverdue} facture{safeData.stats.totalOverdue > 1 ? 's' : ''} en retard de paiement
            </p>
            <p className="text-xs text-amber-700/70">Cliquez pour gérer les relances</p>
          </div>
          <ChevronRight size={16} className="text-amber-700/60 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* ─── Alertes ─── */}
      {safeData.alerts && safeData.alerts.length > 0 && (
        <SectionCard
          title="Alertes"
          icon={AlertCircle}
          accent="#f59e0b"
          badge={
            <StatusBadge tone="neutral" size="sm">
              {safeData.alerts.length}
            </StatusBadge>
          }
          noPadding
        >
          <ul className="divide-y divide-gray-100">
            {safeData.alerts.slice(0, 6).map((alert) => (
              <li key={alert.id}>
                <Link
                  href={alert.href || '/cabinet'}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                      alert.severity === 'critical'
                        ? 'bg-red-50'
                        : alert.severity === 'warning'
                          ? 'bg-amber-50'
                          : 'bg-blue-50',
                    )}
                  >
                    {alert.type === 'dsn' ? (
                      <Shield size={14} className="text-blue-600" />
                    ) : alert.type === 'overdue' ? (
                      <FileWarning
                        size={14}
                        className={alert.severity === 'critical' ? 'text-red-600' : 'text-amber-700'}
                      />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-semibold truncate',
                        alert.severity === 'critical' ? 'text-red-700' : 'text-gray-900',
                      )}
                    >
                      {alert.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{alert.description}</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 flex-shrink-0 mt-1" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ─── Grille 3 colonnes : graph CA · donut missions · échéances ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CA / Dépenses par client */}
        {chartData.length > 0 && (
          <SectionCard
            className="lg:col-span-2"
            title="CA / Dépenses par client"
            icon={BarChart3}
            accent={primaryColor}
          >
            <div className="text-gray-400" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--border))', opacity: 0.3 }} />
                  <Bar dataKey="CA" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
              <Legend color="#10b981" label="Chiffre d'affaires" />
              <Legend color="#ef4444" label="Dépenses" />
            </div>
          </SectionCard>
        )}

        {/* Répartition missions */}
        <SectionCard title="Répartition des missions" icon={PieChart} accent="#8b5cf6">
          {donutData.length > 0 ? (
            <DonutChart
              data={donutData}
              centerValue={String(totalMissions)}
              centerLabel="missions"
            />
          ) : (
            <EmptyState
              icon={PieChart}
              title="Aucune mission"
              description="Renseignez des lettres de mission pour visualiser la répartition."
            />
          )}
        </SectionCard>
      </div>

      {/* ─── Facturation mensuelle + Échéances ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {monthly.length > 0 && (
          <SectionCard
            className="lg:col-span-2"
            title="Facturation mensuelle"
            icon={TrendingUp}
            accent={primaryColor}
          >
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {monthly.map((m, i) => {
                const isCurrent = i === monthly.length - 1;
                const heightPct = Math.round((m.total / maxMonthly) * 100);
                return (
                  <div key={m.key} className="flex flex-col items-center gap-2">
                    <div className="w-full h-24 flex items-end justify-center">
                      <div
                        className="w-full max-w-[34px] rounded-lg transition-all"
                        style={{
                          height: `${Math.max(6, heightPct)}%`,
                          backgroundColor: isCurrent ? primaryColor : '#d1d5db',
                        }}
                        title={`${formatCurrency(m.total)} · ${m.count} facture(s)`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                        {m.label}
                      </p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {m.total >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : formatCurrency(m.total)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Prochaines échéances */}
        {safeData.upcomingDeadlines && safeData.upcomingDeadlines.length > 0 && (
          <SectionCard title="Prochaines échéances" icon={CalendarClock} accent="#3b82f6">
            <ul className="space-y-2.5">
              {safeData.upcomingDeadlines.slice(0, 6).map((dl) => (
                <li key={dl.id} className="flex items-center gap-3">
                  <DateBlock date={dl.date} daysUntil={dl.daysUntil} compact />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{dl.label}</p>
                    <p className="text-[11px] text-gray-500 truncate capitalize">
                      {dl.type} · {dl.daysUntil < 0 ? 'dépassée' : `dans ${dl.daysUntil}j`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>

      {/* ─── Portefeuille clients ─── */}
      <SectionCard
        title={`Portefeuille clients (${safeData.clientStats?.length ?? 0})`}
        icon={Users}
        accent={primaryColor}
        noPadding
      >
        {(safeData.clientStats?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun client connecté"
            description="Invitez vos clients pour accéder à leurs données."
            action={
              <Link
                href="/cabinet/invitations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus size={15} />
                Inviter un client
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">
                    CA
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">
                    Dépenses
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Santé
                  </th>
                  <th className="px-5 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(safeData.clientStats || []).map((client) => (
                  <tr key={client.id} className="group">
                    <td className="px-5 py-3">
                      <Link
                        href={`/cabinet/clients/${client.id}`}
                        className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Avatar name={client.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{client.name}</p>
                          {client.email && (
                            <p className="text-xs text-gray-500 truncate">{client.email}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600 hidden sm:table-cell">
                      {formatCurrency(client.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600 hidden md:table-cell">
                      {formatCurrency(client.expenses)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={HEALTH_TONE[client.health]}>
                        {HEALTH_LABEL[client.health]}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/cabinet/clients/${client.id}`}
                        className="inline-flex text-gray-300 group-hover:text-gray-600 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

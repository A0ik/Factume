'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, AlertTriangle, Plus, Loader2, Shield,
  Search, ChevronRight, Crown, Settings, UserPlus, RefreshCw,
  CheckCircle2, Clock, XCircle, Building2, Euro, Users,
  Bell, Download, AlertCircle, CalendarClock, FileWarning,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, downloadCSV } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

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
  alerts?: {
    id: string;
    type: 'overdue' | 'warning' | 'deadline' | 'dsn';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    clientName?: string;
    amount?: number;
    daysOverdue?: number;
    href?: string;
  }[];
  upcomingDeadlines?: {
    id: string;
    date: string;
    label: string;
    type: string;
    description: string;
    daysUntil: number;
  }[];
}

function HealthDot({ health }: { health: string }) {
  return (
    <span className={cn(
      'inline-block w-2.5 h-2.5 rounded-full flex-shrink-0',
      health === 'good' ? 'bg-emerald-500' : health === 'critical' ? 'bg-red-500' : 'bg-amber-400'
    )} />
  );
}

// Navigation moved to cabinet/layout.tsx sidebar

export default function CabinetPage() {
  const { profile, initialized } = useAuthStore();
  const sub = useSubscription();
  const [data, setData] = useState<CabinetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cabinetName, setCabinetName] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'health'>('name');

  useEffect(() => { if (initialized && profile) loadDashboard(); }, [initialized, profile]);

  const loadDashboard = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
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
      setData(await res.json());
    } catch (error: any) {
      console.error('[loadDashboard] Error:', error);
      toast.error(error.message || 'Erreur de chargement du tableau de bord');
    } finally {
      setLoading(false);
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
        toast.success('Cabinet cree avec succes');
        setCabinetName('');
        await loadDashboard();
      } else {
        toast.error('Erreur lors de la creation');
      }
    } catch (error: any) {
      console.error('[handleCreateCabinet] Error:', error);
      toast.error(error.message || 'Erreur lors de la creation');
    } finally {
      setCreating(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.clientStats?.length) return;
    downloadCSV(
      `cabinet-clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Client', 'Email', 'Sante', 'CA', 'Depenses', 'Factures en retard'],
      data.clientStats.map(c => [
        c.name,
        c.email || '',
        c.health === 'good' ? 'Bon' : c.health === 'critical' ? 'Critique' : 'Attention',
        formatCurrency(c.revenue),
        formatCurrency(c.expenses),
        String(c.overdueCount || 0),
      ])
    );
    toast.success('Export CSV telecharge');
  };

  const filteredClients = useMemo(() => {
    if (!data?.clientStats) return [];
    let result = data.clientStats;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'revenue') result = [...result].sort((a, b) => b.revenue - a.revenue);
    else if (sortBy === 'health') {
      const order = { critical: 0, warning: 1, good: 2 };
      result = [...result].sort((a, b) => order[a.health] - order[b.health]);
    }
    return result;
  }, [data?.clientStats, search, sortBy]);

  const chartData = useMemo(() => {
    if (!data?.clientStats?.length) return [];
    return data.clientStats.slice(0, 10).map(c => ({
      name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
      CA: c.revenue,
      Depenses: c.expenses,
    }));
  }, [data?.clientStats]);

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <Crown size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Cabinet Expert-Comptable</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Gerez tous vos clients depuis un tableau de bord unique. Consultez leurs factures, depenses et indicateurs de sante financiere.
          </p>
          <Link href="/paywall?plan=business" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 transition-all">
            <Crown size={18} />
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

  if (!data?.cabinet) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/20">
          <Building2 size={40} className="text-blue-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Creer votre cabinet</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md leading-relaxed">
          Donnez un nom a votre cabinet comptable pour commencer a inviter des clients et centraliser leur gestion.
        </p>
        <div className="flex items-center gap-3 w-full max-w-sm">
          <input
            type="text"
            value={cabinetName}
            onChange={(e) => setCabinetName(e.target.value)}
            placeholder="Ex : Cabinet Dubois & Associes"
            className="flex-1 px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCabinet()}
          />
          <button
            onClick={handleCreateCabinet}
            disabled={!cabinetName.trim() || creating}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm disabled:opacity-50 shadow-md"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : 'Creer'}
          </button>
        </div>
      </motion.div>
    );
  }

  const netBalance = (data.stats?.totalRevenue || 0) - (data.stats?.totalExpenses || 0);
  const primaryColor = data.cabinet?.primary_color || '#4f46e5';
  const brandName = data.cabinet?.hide_factu_branding && data.cabinet?.white_label_name
    ? data.cabinet.white_label_name
    : data.cabinet?.white_label_name || 'Factu.me';

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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
          >
            {data.cabinet?.logo_url ? (
              <img src={data.cabinet.logo_url} alt={brandName} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <Building2 size={24} className="text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{data.cabinet.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {data.activeClients} client{data.activeClients !== 1 ? 's' : ''} actif{data.activeClients !== 1 ? 's' : ''}
              {data.totalClients > data.activeClients && ` · ${data.totalClients - data.activeClients} en attente`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            title="Exporter CSV"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link href="/cabinet/settings" className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors" title="Parametres">
            <Settings size={16} />
          </Link>
          <Link
            href="/cabinet/invitations"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px -3px ${primaryColor}40` }}
          >
            <UserPlus size={15} />
            <span className="hidden sm:inline">Inviter</span>
          </Link>
        </div>
      </div>


      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        {[
          {
            label: 'CA total des clients',
            value: formatCurrency(data.stats?.totalRevenue || 0),
            icon: TrendingUp,
            color: 'from-emerald-500 to-teal-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            text: 'text-emerald-700 dark:text-emerald-400',
          },
          {
            label: 'Depenses totales',
            value: formatCurrency(data.stats?.totalExpenses || 0),
            icon: Euro,
            color: 'from-red-500 to-rose-600',
            bg: 'bg-red-50 dark:bg-red-900/20',
            text: 'text-red-700 dark:text-red-400',
          },
          {
            label: 'Solde net consolide',
            value: formatCurrency(netBalance),
            icon: Shield,
            color: netBalance >= 0 ? 'from-blue-500 to-indigo-600' : 'from-red-500 to-rose-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            text: 'text-blue-700 dark:text-blue-400',
          },
          {
            label: 'Factures en retard',
            value: String(data.stats?.totalOverdue || 0),
            icon: AlertTriangle,
            color: (data.stats?.totalOverdue || 0) > 0 ? 'from-amber-500 to-orange-500' : 'from-gray-400 to-gray-500',
            bg: (data.stats?.totalOverdue || 0) > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-900/20',
            text: (data.stats?.totalOverdue || 0) > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400',
          },
        ].map(({ label, value, icon: Icon, color, bg, text }) => (
          <div key={label} className={cn('p-3 lg:p-5 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', color)}>
              <Icon size={16} className="text-white" />
            </div>
            <p className={cn('text-xl font-black', text)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>


      {/* Alerts Panel */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-white/5">
            <AlertCircle size={15} className="text-amber-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Alertes ({data.alerts.length})</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {data.alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href || '#'}
                className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
                  alert.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                  'bg-blue-100 dark:bg-blue-900/30'
                )}>
                  {alert.type === 'overdue' ? <FileWarning size={14} className={alert.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} /> :
                  alert.type === 'dsn' ? <Shield size={14} className="text-blue-600 dark:text-blue-400" /> :
                  <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-semibold truncate',
                    alert.severity === 'critical' ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'
                  )}>
                    {alert.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{alert.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Fiscal Deadlines */}
      {data.upcomingDeadlines && data.upcomingDeadlines.length > 0 && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-white/5">
            <CalendarClock size={15} className="text-blue-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Prochaines echeances fiscales</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 sm:gap-3 p-3 lg:p-4">
            {data.upcomingDeadlines.slice(0, 8).map((dl) => (
              <div key={dl.id} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                dl.daysUntil < 0 ? 'bg-red-50 dark:bg-red-900/10' :
                dl.daysUntil <= 3 ? 'bg-amber-50 dark:bg-amber-900/10' :
                'bg-gray-50 dark:bg-white/[0.02]'
              )}>
                <div className={cn(
                  'text-center flex-shrink-0',
                  dl.daysUntil < 0 ? 'text-red-600 dark:text-red-400' :
                  dl.daysUntil <= 3 ? 'text-amber-600 dark:text-amber-400' :
                  'text-gray-500 dark:text-gray-400'
                )}>
                  <p className="text-lg font-black leading-none">{dl.daysUntil < 0 ? '!' : dl.daysUntil === 0 ? 'J' : dl.daysUntil}</p>
                  <p className="text-[9px] font-semibold mt-0.5">{dl.daysUntil < 0 ? 'Depasse' : dl.daysUntil === 0 ? 'Ce jour' : 'jours'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{dl.label}</p>
                  <p className="text-[10px] text-gray-400">{new Date(dl.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4">
            <BarChart3 size={15} className="text-blue-500" />
            CA / Depenses par client
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="CA" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Depenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-xs text-gray-500">Chiffre d&apos;affaires</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-xs text-gray-500">Depenses</span>
            </div>
          </div>
        </div>
      )}

      {/* Alert Banner */}
      {(data.stats?.totalOverdue || 0) > 0 && (
        <Link
          href="/cabinet/relances"
          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/60 dark:border-amber-800/30 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {data.stats.totalOverdue} facture{data.stats.totalOverdue > 1 ? 's' : ''} en retard de paiement
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Cliquez pour gerer les relances</p>
          </div>
          <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* Client List */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
        {/* List header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <Users size={16} className="text-gray-400 flex-shrink-0" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">Mes clients ({filteredClients.length})</h3>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-gray-500 outline-none"
            >
              <option value="name">Nom</option>
              <option value="revenue">CA</option>
              <option value="health">Sante</option>
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-8 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-40"
              />
            </div>
          </div>
        </div>

        {filteredClients.length === 0 && !search ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucun client connecte</p>
            <p className="text-sm text-gray-400 mb-5">Invitez vos clients pour acceder a leurs donnees.</p>
            <Link href="/cabinet/invitations" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors" style={{ backgroundColor: primaryColor }}>
              <Plus size={15} />
              Inviter un client
            </Link>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">
            Aucun client correspondant a &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            <AnimatePresence>
              {filteredClients.map((client, i) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/cabinet/clients/${client.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
                      client.health === 'good'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : client.health === 'critical'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    )}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <HealthDot health={client.health} />
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{client.name}</p>
                      </div>
                      {client.email && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{client.email}</p>
                      )}
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-right">
                      <div>
                        <p className="text-xs text-gray-400">CA</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(client.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Depenses</p>
                        <p className="text-sm font-bold text-red-500 dark:text-red-400">{formatCurrency(client.expenses)}</p>
                      </div>
                    </div>
                    <div className="flex md:hidden items-center gap-3 text-right">
                      <div>
                        <p className="text-[10px] text-gray-400">CA</p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(client.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Dep.</p>
                        <p className="text-xs font-bold text-red-500 dark:text-red-400">{formatCurrency(client.expenses)}</p>
                      </div>
                    </div>

                    <div className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold sm:text-xs sm:px-3 sm:py-1.5',
                      client.health === 'good'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : client.health === 'critical'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    )}>
                      {client.health === 'good'
                        ? <><CheckCircle2 size={11} />Bon etat</>
                        : client.health === 'critical'
                        ? <><XCircle size={11} />Critique</>
                        : <><AlertTriangle size={11} />Attention</>
                      }
                    </div>

                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors flex-shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

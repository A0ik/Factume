'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity, Clock, CheckCircle, Send, AlertTriangle, Plus,
  Receipt, UserPlus, TrendingUp, Bell, FileText, Users,
  DollarSign, Zap, Search, CreditCard, Package, Lock, Crown, Filter,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "À l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type EventType = 'invoice' | 'expense' | 'client' | 'notification';
type TabId = 'all' | 'invoices' | 'expenses' | 'clients' | 'notifications';

interface TimelineEvent {
  id: string;
  type: EventType;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  amount?: number;
  date: string;
  href?: string;
  unread?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Status & config maps                                              */
/* ------------------------------------------------------------------ */

const INVOICE_STATUS: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; label: string }> = {
  paid:     { icon: CheckCircle,   color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20',  label: 'payée' },
  sent:     { icon: Send,          color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20',    label: 'envoyée' },
  overdue:  { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20',      label: 'en retard' },
  draft:    { icon: Plus,          color: 'text-gray-500 dark:text-gray-400',    bg: 'bg-gray-100 dark:bg-gray-800',      label: 'créée' },
  accepted: { icon: CheckCircle,   color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'acceptée' },
  refused:  { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'refusée' },
};

const NOTIF_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string }> = {
  invoice_paid:    { icon: CheckCircle,   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  invoice_overdue: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-900/20' },
  invoice_sent:    { icon: Send,          color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  system:          { icon: Activity,      color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800' },
  upgrade:         { icon: TrendingUp,    color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
};

const TABS: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'all',           label: 'Tout',     icon: Activity },
  { id: 'invoices',      label: 'Factures', icon: FileText },
  { id: 'expenses',      label: 'Dépenses', icon: Receipt },
  { id: 'clients',       label: 'Clients',  icon: Users },
  { id: 'notifications', label: 'Notifs',   icon: Bell },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

/* ================================================================== */
/*  Page component                                                    */
/* ================================================================== */

export default function ActivityPage() {
  const sub = useSubscription();
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markRead } = useWorkspaceStore();
  const { invoices, clients } = useDataStore();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  /* ---- Data fetching ---- */
  useEffect(() => {
    if (!user) return;
    fetchNotifications(user.id);
    import('@/lib/supabase').then(({ getSupabaseClient }) => {
      getSupabaseClient()
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data }) => setExpenses(data || []));
    });
  }, [user]);

  /* ---- Build unified timeline ---- */
  const allEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Invoice events
    invoices.slice(0, 30).forEach((inv) => {
      const conf = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft;
      const clientName = inv.client?.name || inv.client_name_override || 'Sans client';
      events.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        icon: conf.icon,
        iconColor: conf.color,
        iconBg: conf.bg,
        title: `Facture ${inv.number} ${conf.label}`,
        subtitle: `${clientName} · ${formatCurrency(inv.total)}`,
        amount: inv.total,
        date: inv.updated_at || inv.created_at || '',
        href: `/invoices/${inv.id}`,
      });
    });

    // Expense events
    expenses.slice(0, 15).forEach((exp) => {
      events.push({
        id: `exp-${exp.id}`,
        type: 'expense',
        icon: Receipt,
        iconColor: 'text-orange-600 dark:text-orange-400',
        iconBg: 'bg-orange-50 dark:bg-orange-900/20',
        title: `Dépense ajoutée — ${exp.vendor}`,
        subtitle: `${exp.category || 'Non classé'} · ${formatCurrency(exp.amount)}`,
        amount: exp.amount,
        date: exp.created_at || exp.date,
        href: '/expenses',
      });
    });

    // Client events
    clients.slice(0, 10).forEach((client) => {
      events.push({
        id: `cli-${client.id}`,
        type: 'client',
        icon: UserPlus,
        iconColor: 'text-violet-600 dark:text-violet-400',
        iconBg: 'bg-violet-50 dark:bg-violet-900/20',
        title: `Client ajouté — ${client.name}`,
        subtitle: client.email || client.city || 'Nouveau client',
        date: (client as any).created_at || '',
        href: `/clients/${client.id}`,
      });
    });

    // Notification events
    notifications.slice(0, 10).forEach((n) => {
      const conf = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.system;
      events.push({
        id: `notif-${n.id}`,
        type: 'notification',
        icon: conf.icon,
        iconColor: conf.color,
        iconBg: conf.bg,
        title: n.title,
        subtitle: n.body || '',
        date: n.created_at,
        href: n.link || undefined,
        unread: !n.read,
      });
    });

    return events
      .filter((e) => e.date)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, expenses, clients, notifications]);

  /* ---- Filter by tab + search ---- */
  const filtered = useMemo(() => {
    let result = allEvents;

    // Tab filter
    if (activeTab !== 'all') {
      const typeMap: Record<TabId, EventType[]> = {
        all: [],
        invoices: ['invoice'],
        expenses: ['expense'],
        clients: ['client'],
        notifications: ['notification'],
      };
      result = result.filter((e) => typeMap[activeTab].includes(e.type));
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q),
      );
    }

    return result;
  }, [allEvents, activeTab, searchQuery]);

  /* ---- Group by date ---- */
  const groups = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    filtered.forEach((ev) => {
      const key = ev.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  /* ---- Summary stats ---- */
  const stats = useMemo(
    () => ({
      invoicesPaid: invoices.filter((i) => i.status === 'paid').length,
      totalRevenue: invoices
        .filter((i) => i.status === 'paid')
        .reduce((s, i) => s + i.total, 0),
      expensesCount: expenses.length,
      unreadNotifs: notifications.filter((n) => !n.read).length,
    }),
    [invoices, expenses, notifications],
  );

  /* ---- Tab counts ---- */
  const tabCounts = useMemo(() => {
    const counts: Record<TabId, number> = {
      all: allEvents.length,
      invoices: allEvents.filter((e) => e.type === 'invoice').length,
      expenses: allEvents.filter((e) => e.type === 'expense').length,
      clients: allEvents.filter((e) => e.type === 'client').length,
      notifications: stats.unreadNotifs,
    };
    return counts;
  }, [allEvents, stats.unreadNotifs]);

  /* ================================================================ */
  /*  Paywall gate (after all hooks)                                  */
  /* ================================================================ */

  if (!sub.effectiveIsPro) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Header title="Journal d'activité" back="/dashboard" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/10 flex items-center justify-center mb-6">
            <Lock size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Abonnement requis
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            Le journal d&apos;activité est disponible avec les plans Pro et Business.
          </p>
          <Link
            href="/paywall?plan=pro"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            <Crown size={16} /> Passer à Pro
          </Link>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Main content                                                    */
  /* ================================================================ */

  return (
    <div className="space-y-5 max-w-2xl">
      <Header title="Journal d'activité" back="/dashboard" />

      {/* ---- Summary stats ---- */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {[
          {
            label: 'Factures payées',
            value: stats.invoicesPaid,
            icon: CheckCircle,
            color: 'text-green-500 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-900/20',
          },
          {
            label: 'CA encaissé',
            value: formatCurrency(stats.totalRevenue),
            icon: DollarSign,
            color: 'text-primary',
            bg: 'bg-primary/10',
          },
          {
            label: 'Dépenses',
            value: stats.expensesCount,
            icon: Receipt,
            color: 'text-orange-500 dark:text-orange-400',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
          },
          {
            label: 'Non lues',
            value: stats.unreadNotifs,
            icon: Bell,
            color: 'text-amber-500 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div
            key={label}
            variants={itemVariants}
            className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}
              >
                <Icon size={14} className={color} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {label}
              </span>
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white">
              {value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* ---- Search bar ---- */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher dans l'activité..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <AlertTriangle size={14} />
          </button>
        )}
      </div>

      {/* ---- Filter tabs ---- */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
              activeTab === id
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-white dark:bg-slate-800/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700/50 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <TabIcon size={12} />
            {label}
            {tabCounts[id] > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === id
                    ? 'bg-white/20 dark:bg-gray-900/20 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {tabCounts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Timeline ---- */}
      {groups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm text-center py-16"
        >
          <Activity
            size={40}
            className="text-gray-200 dark:text-gray-600 mx-auto mb-4"
          />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Aucune activité
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Les actions apparaîtront ici au fil du temps
          </p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {groups.map(([dateKey, events]) => (
            <div key={dateKey}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-100 dark:bg-slate-700/50" />
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {formatDateFull(dateKey)}
                </span>
                <div className="h-px flex-1 bg-gray-100 dark:bg-slate-700/50" />
              </div>

              {/* Events card */}
              <motion.div
                className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <div className="divide-y divide-gray-50 dark:divide-slate-700/30">
                  {events.map((ev) => {
                    const Icon = ev.icon;
                    const isNotif = ev.type === 'notification';
                    const notif = isNotif
                      ? notifications.find((n) => ev.id === `notif-${n.id}`)
                      : null;

                    return (
                      <motion.div
                        key={ev.id}
                        variants={itemVariants}
                        className={`flex items-start gap-3.5 px-5 py-4 transition-colors cursor-pointer ${
                          isNotif && notif && !notif.read
                            ? 'bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/15'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                        }`}
                        onClick={() => {
                          if (isNotif && notif && !notif.read) markRead(notif.id);
                          if (ev.href) window.location.href = ev.href;
                        }}
                      >
                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.iconBg}`}
                        >
                          <Icon size={15} className={ev.iconColor} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                              {ev.title}
                            </p>
                            {ev.unread && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          {ev.subtitle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {ev.subtitle}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                            <Clock size={9} />
                            {formatRelative(ev.date)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Footer tip ---- */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 px-1 pt-2 pb-4">
          <Filter size={12} className="text-gray-400 dark:text-gray-500" />
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Utilisez les filtres et la recherche pour retrouver une activité précise
          </p>
        </div>
      )}
    </div>
  );
}

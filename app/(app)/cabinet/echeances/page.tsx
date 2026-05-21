'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Calendar, Filter, Plus, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, XCircle, Search, RefreshCw,
  FileText, Receipt, Shield, Landmark, TrendingUp, X, Download,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatDate, downloadXLSX } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Deadline {
  id: string;
  cabinet_id: string;
  client_id: string | null;
  deadline_type: 'bilan' | 'tva' | 'social' | 'fiscal' | 'is' | 'autre';
  description: string;
  deadline_date: string;
  priority: 'urgent' | 'normal' | 'low';
  status: 'pending' | 'done' | 'overdue';
  responsible: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    profile?: {
      company_name?: string;
      first_name?: string;
      last_name?: string;
    };
  } | null;
}

interface ClientOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  bilan: { label: 'Bilan', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30', icon: FileText },
  tva: { label: 'TVA', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Receipt },
  social: { label: 'Social', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Shield },
  fiscal: { label: 'Fiscal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: Landmark },
  is: { label: 'IS', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: TrendingUp },
  autre: { label: 'Autre', color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', icon: Calendar },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  normal: { label: 'Normal', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  low: { label: 'Basse', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'En attente', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Clock },
  done: { label: 'Traite', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  overdue: { label: 'En retard', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: AlertTriangle },
};

const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ---------------------------------------------------------------------------
// Helper: build calendar cells for a given month/year
// ---------------------------------------------------------------------------
interface CalendarCell {
  date: number;
  isCurrentMonth: boolean;
  fullDate: string; // YYYY-MM-DD
}

function buildCalendarCells(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = lastDay.getDate();

  const cells: CalendarCell[] = [];

  // Previous month padding
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevLastDay - i;
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    cells.push({ date: d, isCurrentMonth: false, fullDate: `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, isCurrentMonth: true, fullDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    cells.push({ date: d, isCurrentMonth: false, fullDate: `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function CabinetEcheancesPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();

  // Data
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Calendar navigation
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // View mode
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add deadline form
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: '',
    deadline_type: 'tva',
    description: '',
    deadline_date: '',
    priority: 'normal',
    responsible: '',
    notes: '',
  });

  // Updating status
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expiree');
        return;
      }

      // Build month range: current month + next month
      const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const nextMonthDate = new Date(currentYear, currentMonth + 2, 1);
      const monthEnd = nextMonthDate.toISOString().split('T')[0];

      const res = await fetch(`/api/cabinet/deadlines?month=${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(err.error || 'Erreur de chargement');
      }

      const data = await res.json();
      setDeadlines(data.deadlines || []);
      setClients(data.clients || []);

      // Also fetch next month's deadlines
      const nextMonthNum = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const nextMonthStr = `${nextYear}-${String(nextMonthNum + 1).padStart(2, '0')}`;

      const res2 = await fetch(`/api/cabinet/deadlines?month=${nextMonthStr}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res2.ok) {
        const data2 = await res2.json();
        setDeadlines(prev => {
          const existingIds = new Set(prev.map(d => d.id));
          const newOnes = (data2.deadlines || []).filter((d: Deadline) => !existingIds.has(d.id));
          return [...prev, ...newOnes];
        });
      }
    } catch (error: any) {
      console.error('[loadData] Error:', error);
      toast.error(error.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => { if (profile) loadData(); }, [profile, loadData]);

  // ---------------------------------------------------------------------------
  // Calendar navigation
  // ---------------------------------------------------------------------------
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const goToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  const calendarCells = useMemo(() => buildCalendarCells(currentYear, currentMonth), [currentYear, currentMonth]);

  const deadlinesByDate = useMemo(() => {
    const map: Record<string, Deadline[]> = {};
    deadlines.forEach(d => {
      if (!map[d.deadline_date]) map[d.deadline_date] = [];
      map[d.deadline_date].push(d);
    });
    return map;
  }, [deadlines]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const filteredDeadlines = useMemo(() => {
    let result = [...deadlines];

    if (filterClient !== 'all') result = result.filter(d => d.client_id === filterClient);
    if (filterType !== 'all') result = result.filter(d => d.deadline_type === filterType);
    if (filterPriority !== 'all') result = result.filter(d => d.priority === filterPriority);
    if (filterStatus !== 'all') result = result.filter(d => d.status === filterStatus);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.description?.toLowerCase().includes(q) ||
        d.responsible?.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q) ||
        getClientName(d)?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.deadline_date.localeCompare(b.deadline_date));
  }, [deadlines, filterClient, filterType, filterPriority, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = deadlines.length;
    const urgent = deadlines.filter(d => d.priority === 'urgent').length;
    const done = deadlines.filter(d => d.status === 'done').length;
    const overdue = deadlines.filter(d => d.status === 'overdue').length;
    return { total, urgent, done, overdue };
  }, [deadlines]);

  const getClientName = (d: Deadline): string => {
    if (!d.client) return '—';
    return d.client.profile?.company_name || d.client.profile?.first_name || 'Client';
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleAddDeadline = async () => {
    if (!form.description.trim() || !form.deadline_date) {
      toast.error('Description et date sont requises');
      return;
    }
    setSaving(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expiree'); return; }

      const res = await fetch('/api/cabinet/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          client_id: form.client_id || null,
          deadline_type: form.deadline_type,
          description: form.description.trim(),
          deadline_date: form.deadline_date,
          priority: form.priority,
          responsible: form.responsible || null,
          notes: form.notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur');
      }

      toast.success('Echeance creee');
      setShowAddForm(false);
      setForm({ client_id: '', deadline_type: 'tva', description: '', deadline_date: '', priority: 'normal', responsible: '', notes: '' });
      await loadData(true);
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (deadline: Deadline) => {
    const newStatus: 'pending' | 'done' = deadline.status === 'done' ? 'pending' : 'done';
    setUpdatingId(deadline.id);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expiree'); return; }

      const res = await fetch('/api/cabinet/deadlines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: deadline.id, status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur');
      }

      setDeadlines(prev => prev.map(d => d.id === deadline.id ? { ...d, status: newStatus } : d));
      toast.success(newStatus === 'done' ? 'Echeance traitee' : 'Echeance remise en attente');
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setUpdatingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Paywall
  // ---------------------------------------------------------------------------
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <Calendar size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Echeances fiscales & sociales</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Le suivi des echeances fiscales et sociales de vos clients est disponible avec le plan Business.
          </p>
          <Link href="/paywall?plan=business" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg shadow-violet-500/25">
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
  // Render
  // ---------------------------------------------------------------------------
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
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Echeances fiscales & sociales</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats.total} echeance{stats.total !== 1 ? 's' : ''} · {stats.overdue} en retard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors',
              showFilters
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
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
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={15} />
            Ajouter
          </button>
          <button
            onClick={() => {
              if (filteredDeadlines.length === 0) return;
              const TypeLabel = TYPE_CONFIG;
              const PrioLabel = PRIORITY_CONFIG;
              const StatusLabel = STATUS_CONFIG;
              downloadXLSX(
                `cabinet-echeances-${new Date().toISOString().slice(0, 10)}.xlsx`,
                [{
                  name: 'Echeances',
                  headers: ['Date', 'Client', 'Type', 'Description', 'Responsable', 'Priorite', 'Statut'],
                  rows: filteredDeadlines.map((d) => [
                    d.deadline_date,
                    getClientName(d),
                    TypeLabel[d.deadline_type]?.label || d.deadline_type,
                    d.description,
                    d.responsible || '',
                    PrioLabel[d.priority]?.label || d.priority,
                    StatusLabel[d.status]?.label || d.status,
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total echeances', value: String(stats.total), icon: Calendar, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Urgentes', value: String(stats.urgent), icon: AlertTriangle, color: 'from-red-500 to-rose-600', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
          { label: 'Traitees', value: String(stats.done), icon: CheckCircle2, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'En retard', value: String(stats.overdue), icon: XCircle, color: stats.overdue > 0 ? 'from-red-500 to-rose-600' : 'from-gray-400 to-gray-500', bg: stats.overdue > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900/20', text: stats.overdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400' },
        ].map(({ label, value, icon: Icon, color, bg, text }) => (
          <div key={label} className={cn('p-5 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', color)}>
              <Icon size={16} className="text-white" />
            </div>
            <p className={cn('text-xl font-black', text)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters Panel */}
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
                {/* Client filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Client</label>
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les clients</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Type filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les types</option>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Priorite</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Toutes</option>
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Statut</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les statuts</option>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par description, client, responsable..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Mode Toggle + Month Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ChevronLeft size={18} className="text-gray-400" />
          </button>
          <h2 className="text-lg font-black text-gray-900 dark:text-white min-w-[200px] text-center">
            {MONTHS_FR[currentMonth]} {currentYear}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ChevronRight size={18} className="text-gray-400" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            Aujourd&apos;hui
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Calendrier
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Tableau
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/5">
            {DAYS_FR.map(day => (
              <div key={day} className="px-2 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, i) => {
              const dayDeadlines = deadlinesByDate[cell.fullDate] || [];
              const isToday = cell.fullDate === todayStr;
              const hasOverdue = dayDeadlines.some(d => d.status === 'overdue');
              const hasUrgent = dayDeadlines.some(d => d.priority === 'urgent');

              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[100px] md:min-h-[120px] p-1.5 border-b border-r border-gray-100 dark:border-white/[0.04] transition-colors',
                    !cell.isCurrentMonth && 'bg-gray-50/50 dark:bg-white/[0.01]',
                    cell.isCurrentMonth && 'hover:bg-gray-50 dark:hover:bg-white/[0.02]',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full',
                      isToday && 'bg-emerald-500 text-white',
                      !isToday && cell.isCurrentMonth && 'text-gray-700 dark:text-gray-300',
                      !isToday && !cell.isCurrentMonth && 'text-gray-400 dark:text-gray-600',
                    )}>
                      {cell.date}
                    </span>
                    {dayDeadlines.length > 0 && (
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        hasOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                        hasUrgent ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      )}>
                        {dayDeadlines.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayDeadlines.slice(0, 3).map(d => {
                      const typeCfg = TYPE_CONFIG[d.deadline_type] || TYPE_CONFIG.autre;
                      return (
                        <div
                          key={d.id}
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition-colors',
                            typeCfg.bg, typeCfg.color,
                            d.status === 'overdue' && 'ring-1 ring-red-300 dark:ring-red-700',
                            d.status === 'done' && 'opacity-50 line-through',
                          )}
                          title={`${d.description} — ${getClientName(d)}`}
                        >
                          {d.description}
                        </div>
                      );
                    })}
                    {dayDeadlines.length > 3 && (
                      <div className="text-[10px] text-gray-400 pl-1.5">+{dayDeadlines.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 border-b border-gray-100 dark:border-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1">Responsable</div>
            <div className="col-span-1">Priorite</div>
            <div className="col-span-1">Statut</div>
            <div className="col-span-1">Action</div>
          </div>

          {filteredDeadlines.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucune echeance trouvee</p>
              <p className="text-sm text-gray-400">Modifiez les filtres ou ajoutez une echeance.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              <AnimatePresence>
                {filteredDeadlines.map((deadline, i) => {
                  const typeCfg = TYPE_CONFIG[deadline.deadline_type] || TYPE_CONFIG.autre;
                  const prioCfg = PRIORITY_CONFIG[deadline.priority] || PRIORITY_CONFIG.normal;
                  const statusCfg = STATUS_CONFIG[deadline.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const TypeIcon = typeCfg.icon;
                  const isOverdue = deadline.status === 'overdue' || (deadline.status === 'pending' && deadline.deadline_date < todayStr);

                  return (
                    <motion.div
                      key={deadline.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn(
                        'px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group',
                        isOverdue && deadline.status !== 'done' && 'bg-red-50/50 dark:bg-red-900/10',
                      )}
                    >
                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                        {/* Date */}
                        <div className="col-span-2">
                          <span className={cn(
                            'text-sm font-semibold',
                            isOverdue && deadline.status !== 'done' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                          )}>
                            {formatDate(deadline.deadline_date)}
                          </span>
                        </div>

                        {/* Client */}
                        <div className="col-span-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">
                            {getClientName(deadline)}
                          </span>
                        </div>

                        {/* Type */}
                        <div className="col-span-1">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold', typeCfg.bg, typeCfg.color)}>
                            <TypeIcon size={11} />
                            {typeCfg.label}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="col-span-3">
                          <p className={cn(
                            'text-sm text-gray-900 dark:text-white truncate',
                            deadline.status === 'done' && 'line-through opacity-60'
                          )}>
                            {deadline.description}
                          </p>
                        </div>

                        {/* Responsible */}
                        <div className="col-span-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
                            {deadline.responsible || '—'}
                          </span>
                        </div>

                        {/* Priority */}
                        <div className="col-span-1">
                          <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold', prioCfg.bg, prioCfg.color)}>
                            {prioCfg.label}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="col-span-1">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold', statusCfg.bg, statusCfg.color)}>
                            <StatusIcon size={11} />
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Action */}
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => handleToggleStatus(deadline)}
                            disabled={updatingId === deadline.id}
                            className={cn(
                              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                              deadline.status === 'done'
                                ? 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'
                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                            )}
                          >
                            {updatingId === deadline.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : deadline.status === 'done' ? (
                              'Reouvrir'
                            ) : (
                              <>
                                <CheckCircle2 size={12} />
                                Traiter
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-semibold text-gray-900 dark:text-white',
                              deadline.status === 'done' && 'line-through opacity-60'
                            )}>
                              {deadline.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{getClientName(deadline)}</p>
                          </div>
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0', statusCfg.bg, statusCfg.color)}>
                            <StatusIcon size={11} />
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'text-xs font-semibold',
                            isOverdue && deadline.status !== 'done' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                          )}>
                            {formatDate(deadline.deadline_date)}
                          </span>
                          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold', typeCfg.bg, typeCfg.color)}>
                            {typeCfg.label}
                          </span>
                          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold', prioCfg.bg, prioCfg.color)}>
                            {prioCfg.label}
                          </span>
                          {deadline.responsible && (
                            <span className="text-[10px] text-gray-400">{deadline.responsible}</span>
                          )}
                          <div className="flex-1" />
                          <button
                            onClick={() => handleToggleStatus(deadline)}
                            disabled={updatingId === deadline.id}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors',
                              deadline.status === 'done'
                                ? 'bg-gray-100 dark:bg-white/5 text-gray-500'
                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {updatingId === deadline.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : deadline.status === 'done' ? 'Reouvrir' : 'Traiter'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Add Deadline Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
            />
            <motion.div
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="font-bold text-gray-900 dark:text-white">Nouvelle echeance</h3>
                <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Description *</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Ex : Declaration TVA mensuelle"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Date + Type row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date *</label>
                    <input
                      type="date"
                      value={form.deadline_date}
                      onChange={(e) => setForm(f => ({ ...f, deadline_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
                    <select
                      value={form.deadline_type}
                      onChange={(e) => setForm(f => ({ ...f, deadline_type: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Client + Priority row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Client</label>
                    <select
                      value={form.client_id}
                      onChange={(e) => setForm(f => ({ ...f, client_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Aucun (general)</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Priorite</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Responsible */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Responsable</label>
                  <input
                    type="text"
                    value={form.responsible}
                    onChange={(e) => setForm(f => ({ ...f, responsible: e.target.value }))}
                    placeholder="Ex : Marie D."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Notes supplementaires..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddDeadline}
                  disabled={saving || !form.description.trim() || !form.deadline_date}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm disabled:opacity-50 shadow-md flex items-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Creer l&apos;echeance
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
    </CabinetGuard>
  );
}

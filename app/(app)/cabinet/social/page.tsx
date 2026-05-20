'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Users, Search, ChevronDown, ChevronLeft,
  ChevronRight, FileText, Shield, AlertTriangle, CheckCircle2, Clock,
  XCircle, Eye, MoreHorizontal, X, Send, Filter, CalendarDays,
  UserCheck, FileCheck, FileWarning, StickyNote, Crown, Building2,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type DSNStatus = 'envoyee' | 'en_attente' | 'bloquee' | 'nc';

interface ClientSocialRow {
  id: string;
  clientName: string;
  nbSalaries: number;
  bsEmis: number;
  bsValidated: number;
  dsnStatus: DSNStatus;
  stc: number;
  contrats: number;
  avenants: number;
  atMp: number;
  observations: string;
}

interface DocumentToProcess {
  id: string;
  clientName: string;
  type: string;
  description: string;
  date: string;
  priority: 'haute' | 'moyenne' | 'basse';
}

interface MonthlyTracking {
  month: string; // 'YYYY-MM'
  data: Record<string, ClientSocialRow>;
}

const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dsnStatusConfig(status: DSNStatus) {
  const map: Record<DSNStatus, { label: string; bg: string; text: string; dot: string }> = {
    envoyee:   { label: 'Envoyee',   bg: 'bg-emerald-100 dark:bg-emerald-900/30',  text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    en_attente:{ label: 'En attente',bg: 'bg-amber-100 dark:bg-amber-900/30',      text: 'text-amber-700 dark:text-amber-400',     dot: 'bg-amber-500' },
    bloquee:   { label: 'Bloquee',   bg: 'bg-red-100 dark:bg-red-900/30',          text: 'text-red-700 dark:text-red-400',         dot: 'bg-red-500' },
    nc:        { label: 'NC',        bg: 'bg-gray-100 dark:bg-gray-800',           text: 'text-gray-500 dark:text-gray-400',       dot: 'bg-gray-400' },
  };
  return map[status] ?? map.nc;
}

function DSNBadge({ status }: { status: DSNStatus }) {
  const cfg = dsnStatusConfig(status);
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS_FR[parseInt(m, 10) - 1]} ${y}`;
}

function shortMonth(key: string): string {
  const [, m] = key.split('-');
  return MONTHS_FR[parseInt(m, 10) - 1].slice(0, 3);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CabinetSocialPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const router = useRouter();
  const { cabinet, fetchCabinet, loading: cabinetLoading } = useCabinetStore();

  // Month / Year selector
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dsnFilter, setDsnFilter] = useState<DSNStatus | 'all'>('all');
  const [showDSNSidebar, setShowDSNSidebar] = useState(false);
  const [showAnnual, setShowAnnual] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Data
  const [clientRows, setClientRows] = useState<ClientSocialRow[]>([]);
  const [documents, setDocuments] = useState<DocumentToProcess[]>([]);
  const [annualData, setAnnualData] = useState<Map<string, ClientSocialRow[]>>(new Map());

  // Load data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      const res = await fetch(`/api/cabinet/social?year=${selectedYear}&month=${selectedMonth}`, { headers });
      if (res.ok) {
        const { tracking } = await res.json();
        const mapped: ClientSocialRow[] = (tracking || []).map((t: any) => ({
          id: t.id || t.client_id,
          clientName: t.client_name || '',
          nbSalaries: t.nb_employees || 0,
          bsEmis: t.bs_issued || 0,
          bsValidated: t.bs_validated || 0,
          dsnStatus: (t.dsn_status || 'nc') as DSNStatus,
          stc: t.stc || 0,
          contrats: t.contracts_count || 0,
          avenants: t.amendments_count || 0,
          atMp: t.at_mp ? 1 : 0,
          observations: t.observations || '',
        }));
        setClientRows(mapped);

        const aMap = new Map<string, ClientSocialRow[]>();
        for (let m = 0; m < 12; m++) {
          const key = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
          const monthRes = await fetch(`/api/cabinet/social?year=${selectedYear}&month=${m + 1}`, { headers });
          if (monthRes.ok) {
            const { tracking: monthTracking } = await monthRes.json();
            aMap.set(key, (monthTracking || []).map((t: any) => ({
              id: t.id || t.client_id,
              clientName: t.client_name || '',
              nbSalaries: t.nb_employees || 0,
              bsEmis: t.bs_issued || 0,
              bsValidated: t.bs_validated || 0,
              dsnStatus: (t.dsn_status || 'nc') as DSNStatus,
              stc: t.stc || 0,
              contrats: t.contracts_count || 0,
              avenants: t.amendments_count || 0,
              atMp: t.at_mp ? 1 : 0,
              observations: t.observations || '',
            })));
          }
        }
        setAnnualData(aMap);
      }

      setDocuments([]);
    } catch (error: any) {
      console.error('[loadData] Error:', error);
      toast.error(error.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (profile) {
      fetchCabinet();
    }
  }, [profile, fetchCabinet]);

  useEffect(() => {
    if (profile && cabinet) loadData();
    else if (profile && !cabinetLoading && !cabinet) {
      toast.error('Creez d\'abord votre cabinet');
      router.push('/cabinet');
    }
  }, [profile, cabinet, cabinetLoading, loadData, router]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = clientRows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => r.clientName.toLowerCase().includes(q));
    }
    if (dsnFilter !== 'all') {
      result = result.filter((r) => r.dsnStatus === dsnFilter);
    }
    return result;
  }, [clientRows, searchQuery, dsnFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalSalaries = clientRows.reduce((s, r) => s + r.nbSalaries, 0);
    const bsTraites = clientRows.reduce((s, r) => s + r.bsValidated, 0);
    const dsnEnvoyees = clientRows.filter((r) => r.dsnStatus === 'envoyee').length;
    const docsATraiter = documents.length;
    return { totalSalaries, bsTraites, dsnEnvoyees, docsATraiter };
  }, [clientRows, documents]);

  // DSN summary for sidebar
  const dsnSummary = useMemo(() => ({
    envoyee: clientRows.filter((r) => r.dsnStatus === 'envoyee').length,
    en_attente: clientRows.filter((r) => r.dsnStatus === 'en_attente').length,
    bloquee: clientRows.filter((r) => r.dsnStatus === 'bloquee').length,
    nc: clientRows.filter((r) => r.dsnStatus === 'nc').length,
  }), [clientRows]);

  // Month navigation
  const goPrev = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1); }
    else { setSelectedMonth((m) => m - 1); }
  };
  const goNext = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1); }
    else { setSelectedMonth((m) => m + 1); }
  };

  // ─── Paywall ──────────────────────────────────────────────────────────────
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <Shield size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Gestion Sociale & Paie</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Suivez les bulletins de salaire, DSN, contrats et obligations sociales de vos clients.
            Disponible avec le plan Business.
          </p>
          <Link href="/paywall?plan=business" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 transition-all">
            <Crown size={18} />
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Gestion Sociale</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Paie, DSN & obligations sociales</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDSNSidebar(!showDSNSidebar)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors',
              showDSNSidebar
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            )}
          >
            <Shield size={14} />
            DSN
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

      {/* ─── Month/Year Selector ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={goPrev} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ChevronLeft size={18} className="text-gray-400" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
            <CalendarDays size={16} className="text-emerald-500" />
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              {MONTHS_FR[selectedMonth - 1]} {selectedYear}
            </span>
          </div>
          <button onClick={goNext} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnnual(!showAnnual)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors',
              showAnnual
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            )}
          >
            <Eye size={14} />
            Vue annuelle
          </button>
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
        </div>
      </div>

      {/* ─── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total salaries', value: String(kpis.totalSalaries), icon: Users, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'BS traites', value: String(kpis.bsTraites), icon: FileCheck, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'DSN envoyees', value: String(kpis.dsnEnvoyees), icon: Send, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Documents a traiter', value: String(kpis.docsATraiter), icon: FileWarning, color: kpis.docsATraiter > 0 ? 'from-amber-500 to-orange-500' : 'from-gray-400 to-gray-500', bg: kpis.docsATraiter > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-900/20', text: kpis.docsATraiter > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400' },
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

      {/* ─── Filters ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un client..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {/* DSN Status filter */}
                <div>
                  <select
                    value={dsnFilter}
                    onChange={(e) => setDsnFilter(e.target.value as DSNStatus | 'all')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les statuts DSN</option>
                    <option value="envoyee">Envoyee</option>
                    <option value="en_attente">En attente</option>
                    <option value="bloquee">Bloquee</option>
                    <option value="nc">Non concernee</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content Area ─────────────────────────────────────────────── */}
      <div className={cn('grid gap-6 transition-all', showDSNSidebar ? 'lg:grid-cols-[1fr_320px]' : 'grid-cols-1')}>

        {/* ─── Left: Main Table ──────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Client Social Table */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
              <Building2 size={16} className="text-emerald-500" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
                Suivi social mensuel ({filteredRows.length} clients)
              </h3>
              {!showFilters && (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-8 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-48"
                  />
                </div>
              )}
            </div>

            {filteredRows.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucun client trouve</p>
                <p className="text-sm text-gray-400">Modifiez vos filtres de recherche.</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="hidden lg:grid grid-cols-[2fr_0.7fr_0.7fr_0.7fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr_2fr_0.6fr] gap-2 px-5 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <span>Client</span>
                  <span className="text-center">Salaries</span>
                  <span className="text-center">BS Emis</span>
                  <span className="text-center">BS Valides</span>
                  <span className="text-center">DSN</span>
                  <span className="text-center">STC</span>
                  <span className="text-center">Contrats</span>
                  <span className="text-center">Avenants</span>
                  <span className="text-center">AT/MP</span>
                  <span>Observations</span>
                  <span />
                </div>

                {/* Table rows */}
                <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  <AnimatePresence>
                    {filteredRows.map((row, i) => (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        {/* Desktop row */}
                        <div className="hidden lg:grid grid-cols-[2fr_0.7fr_0.7fr_0.7fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr_2fr_0.6fr] gap-2 px-5 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors text-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                              {row.clientName.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white truncate">{row.clientName}</span>
                          </div>
                          <span className="text-center font-semibold text-gray-700 dark:text-gray-300">{row.nbSalaries}</span>
                          <span className="text-center text-gray-600 dark:text-gray-400">{row.bsEmis}</span>
                          <span className="text-center text-gray-600 dark:text-gray-400">{row.bsValidated}</span>
                          <div className="flex justify-center"><DSNBadge status={row.dsnStatus} /></div>
                          <span className="text-center text-gray-600 dark:text-gray-400">{row.stc > 0 ? formatCurrency(row.stc) : '-'}</span>
                          <span className="text-center text-gray-600 dark:text-gray-400">{row.contrats || '-'}</span>
                          <span className="text-center text-gray-600 dark:text-gray-400">{row.avenants || '-'}</span>
                          <span className={cn('text-center', row.atMp > 0 ? 'text-red-500 font-semibold' : 'text-gray-400')}>{row.atMp || '-'}</span>
                          <span className="text-xs text-gray-400 truncate">{row.observations || '-'}</span>
                          <div className="flex justify-center">
                            <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Mobile row */}
                        <div className="lg:hidden px-5 py-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                                {row.clientName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{row.clientName}</p>
                                <p className="text-xs text-gray-400">{row.nbSalaries} salaries</p>
                              </div>
                            </div>
                            <DSNBadge status={row.dsnStatus} />
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-xs text-gray-400">BS Emis</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{row.bsEmis}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">BS Val.</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{row.bsValidated}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Contrats</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{row.contrats || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">AT/MP</p>
                              <p className={cn('text-sm font-semibold', row.atMp > 0 ? 'text-red-500' : 'text-gray-400')}>{row.atMp || '-'}</p>
                            </div>
                          </div>
                          {row.observations && (
                            <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                              <StickyNote size={12} className="flex-shrink-0 mt-0.5" />
                              {row.observations}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* ─── Documents to Process Panel ────────────────────────────────────── */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
              <FileWarning size={16} className="text-amber-500" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">Documents a traiter</h3>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-black',
                documents.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              )}>
                {documents.length}
              </span>
            </div>
            {documents.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Tous les documents ont ete traites</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      doc.priority === 'haute' ? 'bg-red-100 dark:bg-red-900/30' : doc.priority === 'moyenne' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    )}>
                      <FileText size={16} className={doc.priority === 'haute' ? 'text-red-600 dark:text-red-400' : doc.priority === 'moyenne' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{doc.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{doc.clientName}</span>
                        <span className="text-gray-300 dark:text-gray-600">.</span>
                        <span className="text-xs text-gray-400">{doc.type}</span>
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                      doc.priority === 'haute' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : doc.priority === 'moyenne' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    )}>
                      {doc.priority === 'haute' ? 'Urgent' : doc.priority === 'moyenne' ? 'Moyen' : 'Faible'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Annual Tracking Table ─────────────────────────────────────────── */}
          <AnimatePresence>
            {showAnnual && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <CalendarDays size={16} className="text-emerald-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Suivi annuel {selectedYear}</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/80 dark:bg-slate-800/50">
                          <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-slate-800">Client</th>
                          {Array.from({ length: 12 }, (_, m) => (
                            <th key={m} className="text-center px-2 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[80px]">
                              {MONTHS_FR[m].slice(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                        {clientRows.slice(0, 6).map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 truncate max-w-[160px]">
                              {client.clientName}
                            </td>
                            {Array.from({ length: 12 }, (_, m) => {
                              const key = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
                              const monthData = annualData.get(key)?.find((r) => r.id === client.id);
                              return (
                                <td key={m} className="text-center px-2 py-3">
                                  {monthData ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <DSNBadge status={monthData.dsnStatus} />
                                      <span className="text-[10px] text-gray-400">{monthData.bsValidated}/{monthData.bsEmis} BS</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 dark:text-gray-600">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Right: DSN Sidebar Panel ──────────────────────────────────────── */}
        <AnimatePresence>
          {showDSNSidebar && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* DSN Status Summary */}
              <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <Shield size={15} className="text-emerald-500" />
                    Statut DSN
                  </h3>
                  <span className="text-xs text-gray-400">{MONTHS_FR[selectedMonth - 1]}</span>
                </div>

                <div className="space-y-2.5">
                  {([
                    { key: 'envoyee' as DSNStatus, label: 'Envoyees', icon: CheckCircle2, color: 'text-emerald-500' },
                    { key: 'en_attente' as DSNStatus, label: 'En attente', icon: Clock, color: 'text-amber-500' },
                    { key: 'bloquee' as DSNStatus, label: 'Bloquees', icon: XCircle, color: 'text-red-500' },
                    { key: 'nc' as DSNStatus, label: 'Non concernees', icon: AlertTriangle, color: 'text-gray-400' },
                  ] as const).map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => setDsnFilter(dsnFilter === key ? 'all' : key)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left',
                        dsnFilter === key
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] border border-transparent'
                      )}
                    >
                      <Icon size={16} className={cn(color, 'flex-shrink-0')} />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{label}</span>
                      <span className={cn('text-sm font-black', color)}>{dsnSummary[key]}</span>
                    </button>
                  ))}
                </div>

                {dsnFilter !== 'all' && (
                  <button
                    onClick={() => setDsnFilter('all')}
                    className="w-full mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                  >
                    Reinitialiser le filtre
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Actions rapides</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Envoyer DSN en attente', icon: Send, count: dsnSummary.en_attente },
                    { label: 'Valider BS en attente', icon: UserCheck, count: clientRows.reduce((s, r) => s + (r.bsEmis - r.bsValidated), 0) },
                  ].map(({ label, icon: ActionIcon, count }) => (
                    <button
                      key={label}
                      disabled={count === 0}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors text-left disabled:opacity-40"
                    >
                      <ActionIcon size={15} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{label}</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

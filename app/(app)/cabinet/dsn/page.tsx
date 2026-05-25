'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Search, Plus, X, ChevronDown,
  FileText, Clock, Eye, Trash2, Filter, AlertTriangle,
  CheckCircle2, Crown, Send, Shield, Info, Calendar,
  ChevronLeft, ChevronRight, Download, XCircle, AlertCircle,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  DSN_TYPES,
  DSN_STATUSES,
  calculateDSNDeadline,
  validateDSN,
  genererDSNFichier,
  type DSNData,
  type DSNSalarie,
} from '@/lib/labor-law/dsn-generator';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

type DSNStatus = 'en_preparation' | 'en_attente' | 'envoyee' | 'acceptee' | 'rejetee' | 'en_anomalie';
type DSNType = 'mensuelle' | 'arret_maladie' | 'reprise_maladie' | 'fin_contrat' | 'autre_evenement';

interface DSN {
  id: string;
  mois: number;
  annee: number;
  type_dsn: DSNType;
  status: DSNStatus;
  effectif: number | null;
  siret: string | null;
  raison_sociale: string | null;
  salaries_data: any;
  fichier_contenu: string | null;
  date_envoi: string | null;
  date_retour: string | null;
  anomalie_details: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  mensuelle: { label: 'Mensuelle', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  arret_maladie: { label: 'Arrêt maladie', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  reprise_maladie: { label: 'Reprise', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  fin_contrat: { label: 'Fin de contrat', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  autre_evenement: { label: 'Autre', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
};

const STATUS_CONFIG: Record<DSNStatus, { label: string; bg: string; text: string; dot: string }> = {
  en_preparation: { label: 'En préparation', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  en_attente: { label: 'En attente', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  envoyee: { label: 'Envoyée', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  acceptee: { label: 'Acceptée', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  rejetee: { label: 'Rejetée', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  en_anomalie: { label: 'En anomalie', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
};

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ─── Helper Components ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.autre_evenement;
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: DSNStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CabinetDSNPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const router = useRouter();
  const { cabinet, fetchCabinet, loading: cabinetLoading } = useCabinetStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dsnList, setDsnList] = useState<DSN[]>([]);

  // Period
  const [selectedMois, setSelectedMois] = useState(1);
  const [selectedAnnee, setSelectedAnnee] = useState(2026);
  const [periodReady, setPeriodReady] = useState(false);

  useEffect(() => {
    const now = new Date();
    setSelectedMois(now.getMonth() + 1);
    setSelectedAnnee(now.getFullYear());
    setPeriodReady(true);
  }, []);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<DSNStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // New DSN modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Consistency check
  const [checking, setChecking] = useState(false);

  // Load data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/cabinet/dsn?mois=${selectedMois}&annee=${selectedAnnee}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setDsnList(data?.dsn || []);
      }
    } catch (error: any) {
      console.error('[loadData] Error:', error);
      toast.error(error.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMois, selectedAnnee]);

  useEffect(() => {
    if (profile) fetchCabinet();
  }, [profile, fetchCabinet]);

  useEffect(() => {
    if (profile && cabinet && periodReady) loadData();
  }, [profile, cabinet, loadData, periodReady]);

  // Filtered
  const filteredDSN = useMemo(() => {
    let result = dsnList;
    if (filterType !== 'all') result = result.filter((d) => d.type_dsn === filterType);
    if (filterStatus !== 'all') result = result.filter((d) => d.status === filterStatus);
    return result;
  }, [dsnList, filterType, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const total = dsnList.length;
    const enPreparation = dsnList.filter((d) => d.status === 'en_preparation').length;
    const envoyees = dsnList.filter((d) => d.status === 'envoyee').length;
    const acceptees = dsnList.filter((d) => d.status === 'acceptee').length;
    return { total, enPreparation, envoyees, acceptees };
  }, [dsnList]);

  // Deadline calculation
  const deadline = useMemo(() => {
    return calculateDSNDeadline(selectedMois, selectedAnnee, cabinet?.effectif || 10);
  }, [selectedMois, selectedAnnee, cabinet]);

  const isPastDeadline = deadline < new Date();

  // Period navigation
  const prevMonth = () => {
    if (selectedMois === 1) { setSelectedMois(12); setSelectedAnnee((a) => a - 1); }
    else setSelectedMois((m) => m - 1);
  };
  const nextMonth = () => {
    if (selectedMois === 12) { setSelectedMois(1); setSelectedAnnee((a) => a + 1); }
    else setSelectedMois((m) => m + 1);
  };

  // Create DSN
  const handleCreateDSN = async (typeDsn: DSNType) => {
    setSaving(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/cabinet/dsn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          mois: selectedMois,
          annee: selectedAnnee,
          type_dsn: typeDsn,
          status: 'en_preparation',
          effectif: cabinet?.effectif || 0,
          siret: cabinet?.siret || '',
          raison_sociale: cabinet?.name || '',
        }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || 'Erreur');
      }

      toast.success('DSN créée');
      setShowNewModal(false);
      loadData(true);
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  // Consistency check
  const handleConsistencyCheck = async () => {
    setChecking(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Fetch employees and bulletins for the period
      const [empRes, bulRes] = await Promise.all([
        fetch('/api/cabinet/employees', { headers }),
        fetch(`/api/cabinet/payroll?mois=${selectedMois}&annee=${selectedAnnee}`, { headers }),
      ]);

      const { employees } = await empRes.json();
      const { bulletins } = await bulRes.json();

      const activeEmployees = (employees || []).filter((e: any) => e.status === 'active');
      const issues: string[] = [];

      // Check: all active employees should have a bulletin
      const bulletinEmployeeIds = new Set((bulletins || []).map((b: any) => b.employee_id));
      const missingBulletins = activeEmployees.filter((e: any) => !bulletinEmployeeIds.has(e.id));
      if (missingBulletins.length > 0) {
        issues.push(`${missingBulletins.length} salarié(s) actif(s) sans bulletin de paie`);
      }

      // Check: NIR validation
      for (const emp of activeEmployees) {
        if (!emp.social_security_number) {
          issues.push(`${emp.first_name} ${emp.last_name} : NIR manquant`);
        }
      }

      if (issues.length === 0) {
        toast.success('Vérification OK : aucune anomalie détectée');
      } else {
        toast.error(`${issues.length} anomalie(s) détectée(s)`);
        issues.forEach((issue) => toast.error(issue));
      }
    } catch (error: any) {
      toast.error('Erreur lors de la vérification');
    } finally {
      setChecking(false);
    }
  };

  // ─── Paywall ──────────────────────────────────────────────────────────────
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <Shield size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">DSN</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Déclarations Sociales Nominatives conformes à la norme NET-URSSAF.
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">DSN</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Déclarations Sociales Nominatives</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleConsistencyCheck}
            disabled={checking}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            {checking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            <span className="hidden sm:inline">Vérifier</span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nouvelle DSN</span>
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Period Selector ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ChevronLeft size={18} className="text-gray-400" />
        </button>
        <div className="text-center">
          <p className="text-xl font-black text-gray-900 dark:text-white">
            {MOIS_LABELS[selectedMois - 1]} {selectedAnnee}
          </p>
          <p className="text-xs text-gray-400">{dsnList.length} déclaration(s)</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* ─── Deadline Banner ──────────────────────────────────────────────── */}
      <div className={cn(
        'rounded-2xl p-4 flex items-start gap-3',
        isPastDeadline
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40'
          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40'
      )}>
        <Calendar size={16} className={cn('mt-0.5 flex-shrink-0', isPastDeadline ? 'text-red-500' : 'text-blue-500')} />
        <div>
          <p className={cn('text-sm font-semibold', isPastDeadline ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300')}>
            Date limite de dépôt : {deadline.toLocaleDateString('fr-FR')}
          </p>
          <p className={cn('text-xs mt-1', isPastDeadline ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')}>
            {isPastDeadline
              ? 'Date limite dépassée. Transmettez votre DSN au plus vite pour éviter les pénalités.'
              : `${(cabinet?.effectif || 0) >= 50 ? '5 du mois suivant (effectif ≥ 50)' : '15 du mois suivant (effectif < 50)'} — Ajustée au jour ouvré suivant si week-end ou jour férié.`
            }
          </p>
        </div>
      </div>

      {/* ─── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: String(kpis.total), icon: FileText, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'En préparation', value: String(kpis.enPreparation), icon: Clock, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400' },
          { label: 'Envoyées', value: String(kpis.envoyees), icon: Send, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'Acceptées', value: String(kpis.acceptees), icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
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
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors flex-shrink-0',
            showFilters
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
          )}
        >
          <Filter size={14} />
          Filtres
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type de DSN</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les types</option>
                    {DSN_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Statut</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as DSNStatus | 'all')}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les statuts</option>
                    {DSN_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {(filterType !== 'all' || filterStatus !== 'all') && (
                <button
                  onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                  className="mt-3 flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  <X size={12} />
                  Réinitialiser
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DSN Table ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <Shield size={16} className="text-emerald-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
            Déclarations ({filteredDSN.length})
          </h3>
        </div>

        {filteredDSN.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucune DSN pour cette période</p>
            <p className="text-sm text-gray-400 mb-5">Créez une nouvelle déclaration.</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
            >
              <Plus size={15} />
              Nouvelle DSN
            </button>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden lg:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Entreprise</span>
              <span className="text-center">Type</span>
              <span className="text-center">Effectif</span>
              <span className="text-center">Statut</span>
              <span>Date envoi</span>
              <span />
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              <AnimatePresence>
                {filteredDSN.map((dsn, i) => (
                  <motion.div
                    key={dsn.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{dsn.raison_sociale || 'Cabinet'}</p>
                        <p className="text-xs text-gray-400 font-mono">{dsn.siret || '-'}</p>
                      </div>
                      <div className="flex justify-center"><TypeBadge type={dsn.type_dsn} /></div>
                      <span className="text-center text-gray-600 dark:text-gray-400">{dsn.effectif || '-'}</span>
                      <div className="flex justify-center"><StatusBadge status={dsn.status} /></div>
                      <span className="text-xs text-gray-400">{dsn.date_envoi ? formatDate(dsn.date_envoi) : '-'}</span>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            // Download DSN file
                            const content = dsn.fichier_contenu || `DSN-${dsn.siret}-${dsn.annee}${String(dsn.mois).padStart(2, '0')}`;
                            const blob = new Blob([content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `DSN_${dsn.annee}${String(dsn.mois).padStart(2, '0')}.dsn`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-300 hover:text-blue-500 transition-colors"
                          title="Télécharger"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{dsn.raison_sociale || 'Cabinet'}</p>
                          <p className="text-xs text-gray-400 font-mono">{dsn.siret || '-'}</p>
                        </div>
                        <StatusBadge status={dsn.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <TypeBadge type={dsn.type_dsn} />
                        <span className="text-xs text-gray-400">Effectif : {dsn.effectif || '-'}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ─── New DSN Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[70vh] flex flex-col max-w-md"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nouvelle DSN</h2>
                <button onClick={() => setShowNewModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sélectionnez le type de DSN pour {MOIS_LABELS[selectedMois - 1]} {selectedAnnee}
                </p>
                {DSN_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleCreateDSN(t.value as DSNType)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left disabled:opacity-50"
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold', TYPE_CONFIG[t.value]?.bg || 'bg-gray-100', TYPE_CONFIG[t.value]?.text || 'text-gray-600')}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.label}</p>
                      <p className="text-xs text-gray-400">Code : {t.code}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-slate-800">
                <button onClick={() => setShowNewModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold">
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </CabinetGuard>
  );
}

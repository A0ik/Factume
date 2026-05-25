'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Search, Plus, X, ChevronDown,
  FileText, Clock, Briefcase, Eye, Edit3, Trash2, Filter,
  Crown, CheckCircle2, AlertCircle, Calendar, Euro, Users,
  ChevronRight, Info, Shield, Ban, PauseCircle, PlayCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractType = 'CDI' | 'CDD' | 'CDD_usage' | 'CDD_reconversion' | 'Interim' | 'Stage' | 'Apprentissage' | 'Professionnalisation';
type ContractStatus = 'en_cours' | 'en_attente_signature' | 'signe' | 'suspendu' | 'rompu' | 'termine';

interface Contract {
  id: string;
  employee_id: string;
  client_id: string;
  type_contrat: ContractType;
  status: ContractStatus;
  date_debut: string;
  date_fin: string | null;
  poste: string;
  lieu_travail: string | null;
  classification: string | null;
  coef: number | null;
  convention_collective: string | null;
  periode_essai_jours: number | null;
  motif_cdd: string | null;
  salaire_brut_mensuel: number;
  taux_horaire: number | null;
  heures_hebdo: number | null;
  clause_non_concurrence: boolean;
  clause_confidentialite: boolean;
  clause_mobility: boolean;
  teletravail: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined / display
  employee_name?: string;
  client_name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_TYPE_CONFIG: Record<ContractType, { label: string; bg: string; text: string }> = {
  CDI: { label: 'CDI', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  CDD: { label: 'CDD', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  CDD_usage: { label: "CDD d'usage", bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400' },
  CDD_reconversion: { label: 'CDD reconversion', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400' },
  Interim: { label: 'Intérim', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  Stage: { label: 'Stage', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400' },
  Apprentissage: { label: 'Apprentissage', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
  Professionnalisation: { label: 'Professionnalisation', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
};

const STATUS_CONFIG: Record<ContractStatus, { label: string; bg: string; text: string; dot: string; icon: any }> = {
  en_cours: { label: 'En cours', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: PlayCircle },
  en_attente_signature: { label: 'En attente', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', icon: Clock },
  signe: { label: 'Signé', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', icon: CheckCircle2 },
  suspendu: { label: 'Suspendu', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500', icon: PauseCircle },
  rompu: { label: 'Rompu', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', icon: Ban },
  termine: { label: 'Terminé', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400', icon: CheckCircle2 },
};

const CONTRACT_TYPES_LIST: { value: ContractType; label: string }[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'CDD_usage', label: "CDD d'usage" },
  { value: 'CDD_reconversion', label: 'CDD de reconversion' },
  { value: 'Interim', label: 'Intérim' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Apprentissage', label: 'Apprentissage' },
  { value: 'Professionnalisation', label: 'Professionnalisation' },
];

// ─── Helper Components ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ContractType }) {
  const cfg = CONTRACT_TYPE_CONFIG[type];
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CabinetContratsPage() {
  const profile = useAuthStore(state => state.profile);
  const sub = useSubscription();
  const router = useRouter();
  const cabinet = useCabinetStore(state => state.cabinet);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContractType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ContractStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Load data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const res = await fetch('/api/cabinet/contracts', { headers });

      if (res.ok) {
        const { contracts: apiContracts } = await res.json();
        setContracts(apiContracts || []);
      }
    } catch (error: any) {
      console.error('[loadData] Error:', error);
      toast.error(error.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile && cabinet) loadData();
  }, [profile, cabinet, loadData]);

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    let result = contracts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.employee_name || '').toLowerCase().includes(q) ||
          (c.poste || '').toLowerCase().includes(q) ||
          (c.client_name || '').toLowerCase().includes(q) ||
          (c.type_contrat || '').toLowerCase().includes(q)
      );
    }
    if (filterType !== 'all') {
      result = result.filter((c) => c.type_contrat === filterType);
    }
    if (filterStatus !== 'all') {
      result = result.filter((c) => c.status === filterStatus);
    }
    return result;
  }, [contracts, searchQuery, filterType, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const total = contracts.length;
    const enCours = contracts.filter((c) => c.status === 'en_cours').length;
    const cdd = contracts.filter((c) => ['CDD', 'CDD_usage', 'CDD_reconversion'].includes(c.type_contrat)).length;
    const termines = contracts.filter((c) => c.status === 'termine' || c.status === 'rompu').length;
    return { total, enCours, cdd, termines };
  }, [contracts]);

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce contrat ?')) return;
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/cabinet/contracts?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      setContracts((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contrat supprimé');
      if (selectedContract?.id === id) {
        setShowDetailModal(false);
        setSelectedContract(null);
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openDetail = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
  };

  // ─── Paywall ──────────────────────────────────────────────────────────────
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <FileText size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Contrats de travail</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Gérez les contrats de travail de vos salariés, de la création à la signature.
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
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Contrats de travail</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{contracts.length} contrats</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/cabinet/contrats/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nouveau contrat</span>
          </Link>
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

      {/* ─── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: String(kpis.total), icon: FileText, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'En cours', value: String(kpis.enCours), icon: PlayCircle, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'CDD', value: String(kpis.cdd), icon: Clock, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
          { label: 'Terminés', value: String(kpis.termines), icon: CheckCircle2, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400' },
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

      {/* ─── Search & Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par salarié, poste, client..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
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

      {/* ─── Advanced Filters ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type de contrat</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as ContractType | 'all')}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les types</option>
                    {CONTRACT_TYPES_LIST.map((ct) => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Statut</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as ContractStatus | 'all')}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les statuts</option>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
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
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Contracts Table ───────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <FileText size={16} className="text-emerald-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
            Liste des contrats ({filteredContracts.length})
          </h3>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucun contrat trouvé</p>
            <p className="text-sm text-gray-400 mb-5">Modifiez vos filtres ou créez un nouveau contrat.</p>
            <Link
              href="/cabinet/contrats/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
            >
              <Plus size={15} />
              Nouveau contrat
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Salarié</span>
              <span className="text-center">Type</span>
              <span className="text-center">Poste</span>
              <span className="text-right">Salaire brut</span>
              <span className="text-center">Statut</span>
              <span>Période</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              <AnimatePresence>
                {filteredContracts.map((contract, i) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {/* Desktop row */}
                    <div
                      className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer text-sm"
                      onClick={() => openDetail(contract)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                          {(contract.employee_name || '??').split(' ').map((n) => n.charAt(0)).join('').substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{contract.employee_name || 'Salarié'}</p>
                          <p className="text-xs text-gray-400 truncate">{contract.client_name || ''}</p>
                        </div>
                      </div>
                      <div className="flex justify-center"><TypeBadge type={contract.type_contrat} /></div>
                      <span className="text-center text-gray-600 dark:text-gray-400 truncate">{contract.poste}</span>
                      <span className="text-right font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(contract.salaire_brut_mensuel)}</span>
                      <div className="flex justify-center"><StatusBadge status={contract.status} /></div>
                      <span className="text-xs text-gray-400">
                        {formatDate(contract.date_debut)}
                        {contract.date_fin ? ` → ${formatDate(contract.date_fin)}` : ''}
                      </span>
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(contract.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div
                      className="lg:hidden px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openDetail(contract)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                            {(contract.employee_name || '??').split(' ').map((n) => n.charAt(0)).join('').substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{contract.employee_name || 'Salarié'}</p>
                            <p className="text-xs text-gray-400 truncate">{contract.poste} · {contract.client_name || ''}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <TypeBadge type={contract.type_contrat} />
                        <StatusBadge status={contract.status} />
                        <span className="text-xs font-semibold text-gray-500 ml-auto">{formatCurrency(contract.salaire_brut_mensuel)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ─── Contract Detail Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showDetailModal && selectedContract && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col max-w-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-black text-emerald-700 dark:text-emerald-400">
                    {(selectedContract.employee_name || '??').split(' ').map((n) => n.charAt(0)).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedContract.employee_name || 'Salarié'}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <TypeBadge type={selectedContract.type_contrat} />
                      <StatusBadge status={selectedContract.status} />
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {/* Poste & période */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contrat</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Poste', value: selectedContract.poste, icon: Briefcase },
                      { label: 'Lieu de travail', value: selectedContract.lieu_travail || '-', icon: Info },
                      { label: 'Date de début', value: formatDate(selectedContract.date_debut), icon: Calendar },
                      { label: 'Date de fin', value: selectedContract.date_fin ? formatDate(selectedContract.date_fin) : '-', icon: Calendar },
                      { label: 'Période d\'essai', value: selectedContract.periode_essai_jours ? `${selectedContract.periode_essai_jours} jours` : '-', icon: Clock },
                      { label: 'Convention collective', value: selectedContract.convention_collective || '-', icon: Shield },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                        <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rémunération */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Rémunération</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Salaire brut</p>
                      <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(selectedContract.salaire_brut_mensuel)}</p>
                      <p className="text-xs text-gray-400">/ mois</p>
                    </div>
                    {[
                      { label: 'Taux horaire', value: selectedContract.taux_horaire ? `${selectedContract.taux_horaire.toFixed(2)} EUR/h` : '-' },
                      { label: 'Heures / semaine', value: selectedContract.heures_hebdo ? `${selectedContract.heures_hebdo}h` : '-' },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clauses */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Clauses</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Non-concurrence', active: selectedContract.clause_non_concurrence },
                      { label: 'Confidentialité', active: selectedContract.clause_confidentialite },
                      { label: 'Mobilité', active: selectedContract.clause_mobility },
                      { label: 'Télétravail', active: selectedContract.teletravail },
                    ].map(({ label, active }) => (
                      <div key={label} className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium',
                        active
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-50 dark:bg-white/[0.02] text-gray-400'
                      )}>
                        {active ? <CheckCircle2 size={12} /> : <X size={12} />}
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Motif CDD */}
                {selectedContract.motif_cdd && (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40">
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Motif CDD</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">{selectedContract.motif_cdd}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedContract.notes && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notes</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium mt-1 whitespace-pre-wrap">{selectedContract.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                <button
                  onClick={() => handleDelete(selectedContract.id)}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20"
                >
                  Fermer
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

'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Search, Plus, X, ChevronDown,
  FileText, Clock, Eye, Trash2, Filter, AlertTriangle,
  CheckCircle2, Crown, Send, ShieldCheck, XCircle, Info,
  ChevronRight, Calendar, Euro,
} from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type DPAEStatus = 'en_preparation' | 'envoyee' | 'confirmee' | 'rejetee';

interface DPAE {
  id: string;
  siret: string;
  raison_sociale: string | null;
  nir: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  lieu_naissance: string | null;
  nationalite: string | null;
  sexe: string | null;
  adresse_salarie: string | null;
  type_contrat: string;
  date_embauche: string;
  poste: string;
  lieu_travail: string | null;
  salaire_brut: number;
  taux_horaire: number | null;
  heures_hebdo: number | null;
  periode_essai: number | null;
  convention_collective: string | null;
  status: DPAEStatus;
  date_envoi: string | null;
  date_confirmation: string | null;
  rejet_motif: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DPAEStatus, { label: string; bg: string; text: string; dot: string; icon: any }> = {
  en_preparation: { label: 'En préparation', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400', icon: Clock },
  envoyee: { label: 'Envoyée', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', icon: Send },
  confirmee: { label: 'Confirmée', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: ShieldCheck },
  rejetee: { label: 'Rejetée', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', icon: XCircle },
};

// ─── Helper Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DPAEStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CabinetDPAEPage() {
  const sub = useSubscription();
  const { data: dpaeList, loading, error, refresh } = useCabinetData<DPAE[]>('/api/cabinet/dpae');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<DPAEStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDPAE, setSelectedDPAE] = useState<DPAE | null>(null);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Filtered
  const filteredDPAE = useMemo(() => {
    let result = dpaeList || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.nom.toLowerCase().includes(q) ||
          d.prenom.toLowerCase().includes(q) ||
          d.nir.includes(q) ||
          d.poste.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      result = result.filter((d) => d.status === filterStatus);
    }
    return result;
  }, [dpaeList, searchQuery, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const list = dpaeList || [];
    const total = list.length;
    const enPreparation = list.filter((d) => d.status === 'en_preparation').length;
    const envoyees = list.filter((d) => d.status === 'envoyee').length;
    const confirmees = list.filter((d) => d.status === 'confirmee').length;
    return { total, enPreparation, envoyees, confirmees };
  }, [dpaeList]);

  // Update status
  const handleUpdateStatus = async (id: string, status: DPAEStatus) => {
    try {
      await cabinetMutation('/api/cabinet/dpae', 'PATCH', { id, status });

      // Update local state optimistically by clearing cache and refreshing
      clearCabinetCache('/api/cabinet/dpae');
      await refresh();

      toast.success(`DPAE ${status === 'envoyee' ? 'envoyée' : status === 'confirmee' ? 'confirmée' : 'mise à jour'}`);
      if (selectedDPAE?.id === id) {
        setSelectedDPAE((prev) => prev ? { ...prev, status } : null);
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette DPAE ?')) return;
    try {
      await cabinetMutation(`/api/cabinet/dpae?id=${id}`, 'DELETE');

      clearCabinetCache('/api/cabinet/dpae');
      await refresh();

      toast.success('DPAE supprimée');
      if (selectedDPAE?.id === id) {
        setShowDetailModal(false);
        setSelectedDPAE(null);
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openDetail = (dpae: DPAE) => {
    setSelectedDPAE(dpae);
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
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">DPAE</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Déclarations préalables à l'embauche conformes au Code du travail.
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

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <p className="text-gray-900 dark:text-white font-semibold mb-1">Erreur de chargement</p>
        <p className="text-sm text-gray-400 mb-5">{error}</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">DPAE</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Déclarations Préalables à l'Embauche</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/cabinet/dpae/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nouvelle DPAE</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Legal Banner ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Obligation légale — Art. L1221-10 du Code du travail
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            La DPAE doit être transmise au plus tard <strong>le jour ouvrable précédant l'embauche</strong> (minimum 2 jours ouvrés avant).
            En cas de non-respect : amende de <strong>4 058 EUR</strong> par infraction (art. L1221-12).
          </p>
        </div>
      </div>

      {/* ─── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: String(kpis.total), icon: FileText, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'En préparation', value: String(kpis.enPreparation), icon: Clock, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400' },
          { label: 'Envoyées', value: String(kpis.envoyees), icon: Send, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'Confirmées', value: String(kpis.confirmees), icon: ShieldCheck, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
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
            placeholder="Rechercher par nom, NIR, poste..."
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

      {/* ─── Filters ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Statut</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as DPAEStatus | 'all')}
                  className="w-full max-w-xs px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">Tous les statuts</option>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              {filterStatus !== 'all' && (
                <button
                  onClick={() => setFilterStatus('all')}
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

      {/* ─── DPAE Table ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <FileText size={16} className="text-emerald-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
            Liste des DPAE ({filteredDPAE.length})
          </h3>
        </div>

        {filteredDPAE.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucune DPAE trouvée</p>
            <p className="text-sm text-gray-400 mb-5">Créez une nouvelle DPAE pour déclarer une embauche.</p>
            <Link
              href="/cabinet/dpae/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
            >
              <Plus size={15} />
              Nouvelle DPAE
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Salarié</span>
              <span className="text-center">Type contrat</span>
              <span className="text-center">Date embauche</span>
              <span className="text-right">Salaire brut</span>
              <span className="text-center">Statut</span>
              <span />
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              <AnimatePresence>
                {filteredDPAE.map((dpae, i) => (
                  <motion.div
                    key={dpae.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {/* Desktop row */}
                    <div
                      className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer text-sm"
                      onClick={() => openDetail(dpae)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                          dpae.status === 'confirmee' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : dpae.status === 'rejetee' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        )}>
                          {dpae.prenom.charAt(0)}{dpae.nom.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{dpae.prenom} {dpae.nom}</p>
                          <p className="text-xs text-gray-400 truncate font-mono">{dpae.nir}</p>
                        </div>
                      </div>
                      <span className="text-center text-gray-600 dark:text-gray-400">{dpae.type_contrat}</span>
                      <span className="text-center text-xs text-gray-500">{formatDate(dpae.date_embauche)}</span>
                      <span className="text-right font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(dpae.salaire_brut)}</span>
                      <div className="flex justify-center"><StatusBadge status={dpae.status} /></div>
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(dpae.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div
                      className="lg:hidden px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openDetail(dpae)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                            dpae.status === 'confirmee' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : dpae.status === 'rejetee' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          )}>
                            {dpae.prenom.charAt(0)}{dpae.nom.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{dpae.prenom} {dpae.nom}</p>
                            <p className="text-xs text-gray-400 truncate">{dpae.poste} · {dpae.type_contrat}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={dpae.status} />
                        <span className="text-xs font-semibold text-gray-500 ml-auto">{formatCurrency(dpae.salaire_brut)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ─── Detail Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDetailModal && selectedDPAE && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col max-w-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-black text-emerald-700 dark:text-emerald-400">
                    {selectedDPAE.prenom.charAt(0)}{selectedDPAE.nom.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedDPAE.prenom} {selectedDPAE.nom}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={selectedDPAE.status} />
                      <span className="text-xs text-gray-400">{selectedDPAE.type_contrat}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Date d\'embauche', value: formatDate(selectedDPAE.date_embauche) },
                    { label: 'Poste', value: selectedDPAE.poste },
                    { label: 'Salaire brut', value: formatCurrency(selectedDPAE.salaire_brut) },
                    { label: 'NIR', value: selectedDPAE.nir },
                    { label: 'SIRET', value: selectedDPAE.siret },
                    { label: 'Lieu de travail', value: selectedDPAE.lieu_travail || '-' },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                {selectedDPAE.rejet_motif && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Motif de rejet</p>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium mt-1">{selectedDPAE.rejet_motif}</p>
                  </div>
                )}

                {selectedDPAE.date_envoi && (
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Date d'envoi</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{formatDate(selectedDPAE.date_envoi)}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(selectedDPAE.id)}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDPAE.status === 'en_preparation' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedDPAE.id, 'envoyee')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm"
                    >
                      <Send size={14} />
                      Envoyer
                    </button>
                  )}
                  {selectedDPAE.status === 'envoyee' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedDPAE.id, 'confirmee')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm"
                    >
                      <ShieldCheck size={14} />
                      Confirmer
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

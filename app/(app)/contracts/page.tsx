'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Filter, FileCheck, Clock, AlertCircle,
  CheckCircle, FileEdit, ArrowRight, Trash2, Copy, Loader2, BarChart3, X, Crown,
  User, Building2, Calendar, Euro, Eye, Send, RefreshCw, ChevronDown,
} from 'lucide-react';
import { useContractStore } from '@/stores/contractStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { ContractSummary, ContractType, ContractStatus } from '@/types';
import { ContractCard } from '@/components/contracts/ContractCard';
import { ContractStatusBadge, ContractTypeBadge } from '@/components/contracts/ContractStatusBadge';
import { toast } from 'sonner';
import Link from 'next/link';
import { downloadCSV } from '@/lib/utils';

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const STATUS_FILTERS: { value: string; label: string; color?: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillons', color: 'text-slate-400' },
  { value: 'pending_signature', label: 'En attente', color: 'text-amber-400' },
  { value: 'signed', label: 'Signés', color: 'text-blue-400' },
  { value: 'active', label: 'Actifs', color: 'text-emerald-400' },
  { value: 'ended', label: 'Terminés', color: 'text-slate-500' },
];

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous types' },
  { value: 'cdi', label: 'CDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'other', label: 'Autres' },
];

export default function ContractsPage() {
  const { profile, initialized } = useAuthStore();
  const { canUseContracts } = useSubscription();
  const { contracts, stats, loading, fetchContracts, deleteContract, duplicateContract } = useContractStore();

  // FIXER (BUG 3) : ne PAS évaluer canUseContracts tant que le profil n'est pas chargé.
  // useSubscription fait défaillir le tier à 'free' quand profile === null (authStore
  // debounce fetchProfile de 300ms). Résultat : flash paywall + redirect /paywall au
  // premier rendu client, qui se corrige tout seul après résolution — d'où l'erreur
  // « au premier chargement » qui disparaît au refresh (le refresh force le bootstrap auth).
  const subscriptionReady = initialized && profile !== null;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'salary' | 'name' | 'status'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showAdvanced, setShowAdvanced] = useState(false);
  // FIXER (AUDIT) — confirmation de suppression via modal au lieu du window.confirm() natif.
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'single'; id: string; type: ContractType; label: string }
    | { kind: 'bulk' }
    | null
  >(null);
  const [deletingContract, setDeletingContract] = useState(false);

  useEffect(() => { fetchContracts(); }, []);

  // SENTINEL (URGENCE 2) — GATE DÉTERMINISTE : plus de router.push('/paywall').
  // L'ancien useEffect redirigeait vers /paywall comme effet de bord pendant la
  // fenêtre de résolution du tier d'abonnement (useSubscription fait défaut à
  // 'free' tant que profile est null / en cours de résolution). Ce redirect
  // provoquait le rebond intermittent « Contrats marche parfois, parfois non ».
  // Désormais le comportement est 100% déterministe via des gates de RENDU :
  //   • profil non résolu  → loader (subscriptionReady)
  //   • résolu, pas accès  → UI paywall inline (return ci-dessous), avec CTA
  //                          « Voir les offres » qui mène toujours à /paywall
  //   • résolu, accès      → liste des contrats
  // Aucun flash, aucun rebond, aucune condition aléatoire.
  // Tant que le profil n'est pas résolu, on affiche un loader plutôt que le paywall
  // (évite le flash paywall + le redirect prématuré vers /paywall).
  if (!subscriptionReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!canUseContracts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">Fonctionnalite Pro</h2>
          <p className="text-slate-400 mb-6">
            Les contrats de travail avec signatures electroniques sont disponibles avec les abonnements Pro et Business.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/paywall" className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-400 transition-colors">
              Voir les offres
            </Link>
            <Link href="/dashboard" className="px-6 py-3 bg-gray-100 border border-gray-200 text-slate-300 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filtered = contracts
    .filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter !== 'all' && c.contract_type !== typeFilter) return false;
      if (dateRangeStart && c.start_date < dateRangeStart) return false;
      if (dateRangeEnd && c.end_date && c.end_date > dateRangeEnd) return false;
      if (salaryMin && c.salary_amount < parseFloat(salaryMin)) return false;
      if (salaryMax && c.salary_amount > parseFloat(salaryMax)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.employee_name.toLowerCase().includes(q) ||
               c.company_name.toLowerCase().includes(q) ||
               (c.contract_number || '').toLowerCase().includes(q) ||
               c.job_title.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'date':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
        case 'salary':
          return (a.salary_amount - b.salary_amount) * dir;
        case 'name':
          return a.employee_name.localeCompare(b.employee_name) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        default:
          return 0;
      }
    });

  // FIXER (AUDIT) — on ouvre un modal de confirmation au lieu du confirm() natif
  // (bloquant pour le main thread, peu accessible, et cassant l'identité visuelle).
  const handleDelete = (id: string, type: ContractType) => {
    const c = contracts.find(x => x.id === id);
    setDeleteTarget({ kind: 'single', id, type, label: c?.employee_name || c?.contract_number || 'ce contrat' });
  };

  const handleDuplicate = async (id: string, type: ContractType) => {
    try {
      await duplicateContract(id, type, profile);
      toast.success('Contrat duplique');
    } catch (e) {
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteTarget({ kind: 'bulk' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingContract(true);
    try {
      if (deleteTarget.kind === 'single') {
        await deleteContract(deleteTarget.id, deleteTarget.type);
        toast.success('Contrat supprime');
      } else {
        for (const id of selectedIds) {
          const c = contracts.find(x => x.id === id);
          if (c) await deleteContract(id, c.contract_type);
        }
        setSelectedIds(new Set());
        toast.success('Contrats supprimes');
      }
      setDeleteTarget(null);
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingContract(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: ContractStatus) => {
    const { updateContractStatus } = useContractStore.getState();
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => {
          const c = contracts.find(c => c.id === id);
          if (c) return updateContractStatus(id, c.contract_type, newStatus);
          return Promise.resolve();
        })
      );
      setSelectedIds(new Set());
      await fetchContracts();
      toast.success(`Statut mis a jour : ${newStatus}`);
    } catch (e) {
      toast.error('Erreur lors de la mise a jour du statut');
    }
  };

  const handleBulkExportCSV = () => {
    // FIXER (AUDIT) — l'ancien mapping plaçait le salaire sous la colonne « Salarie »
    // et omettait le nom du salarié. Colonnes réalignées sur les données réelles.
    const headers = ['Numero', 'Type', 'Salarie', 'Entreprise', 'Poste', 'Salaire', 'Debut', 'Fin', 'Statut'];
    const rows = filtered.map(c => [
      c.contract_number || '',
      c.contract_type,
      c.employee_name,
      c.company_name,
      c.job_title,
      String(c.salary_amount),
      c.start_date,
      c.end_date || '',
      c.status,
    ]);
    downloadCSV('contrats.csv', headers, rows);
    toast.success('Export CSV reussi');
  };

  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  return (
    <>
      <h1 className="sr-only">Contrats de travail - Factu.me</h1>
      <main aria-label="Gestion des contrats de travail">
        <div className="w-full space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Contrats</h2>
              <p className="text-slate-400 mt-1">Gerez vos contrats de travail conformes 2026</p>
            </div>
            <div className="flex gap-2">
              <Link href="/contracts/reports" className="px-4 py-2.5 bg-gray-100 border border-gray-200 text-slate-300 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" />Rapports
              </Link>
              <Link href="/contracts/new/cdi" className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-400 transition-colors flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />CDI
              </Link>
              <Link href="/contracts/new/cdd" className="px-4 py-2.5 bg-blue-600 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-blue-500 transition-colors flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />CDD
              </Link>
              <Link href="/contracts/new/other" className="px-4 py-2.5 bg-purple-600 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />Autre
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: stats.total, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Brouillons', value: stats.drafts, icon: FileEdit, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
                { label: 'En attente', value: stats.pendingSignature, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Actifs', value: stats.active + stats.signed, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, ease }}
                  className="bg-gray-100 border border-gray-200 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${stat.bg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Search & Filters */}
          <div className="space-y-3">
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, entreprise, numero..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div className="hidden sm:flex gap-2">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all">
                  {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                {/* ZENITH: Segment control for type filter */}
                <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                  {TYPE_FILTERS.map((f) => (
                    <button key={f.value} onClick={() => setTypeFilter(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        typeFilter === f.value
                          ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile status filter pills (horizontal scroll) */}
            <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    statusFilter === f.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 border border-gray-200 text-slate-400 hover:text-gray-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* ZENITH: Unified segment control for mobile type filter */}
            <div className="sm:hidden flex gap-1 overflow-x-auto pb-1 scrollbar-hide bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
              {TYPE_FILTERS.map((f) => (
                <button key={f.value} onClick={() => setTypeFilter(f.value)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    typeFilter === f.value
                      ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort & Advanced toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
              >
                <Filter className="w-3 h-3" />
                Filtres avances
                <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
              <span className="text-xs text-gray-900 dark:text-white/10">|</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 border border-gray-200 text-slate-400 outline-none focus:ring-1 focus:ring-emerald-500/30"
              >
                <option value="date">Trier par date</option>
                <option value="salary">Trier par salaire</option>
                <option value="name">Trier par nom</option>
                <option value="status">Trier par statut</option>
              </select>
              <button
                onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors"
                title={sortDir === 'asc' ? 'Croissant' : 'Decroissant'}
              >
                <ArrowRight className={`w-3 h-3 text-slate-400 transition-transform ${sortDir === 'desc' ? 'rotate-90' : '-rotate-90'}`} />
              </button>
            </div>

            {/* Expandable Advanced Filters */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ ease }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-gray-100 border border-gray-200 rounded-xl">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Date debut (apres)</label>
                        <input
                          type="date"
                          value={dateRangeStart}
                          onChange={(e) => setDateRangeStart(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Date fin (avant)</label>
                        <input
                          type="date"
                          value={dateRangeEnd}
                          onChange={(e) => setDateRangeEnd(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Salaire min</label>
                        <input
                          type="number"
                          value={salaryMin}
                          onChange={(e) => setSalaryMin(e.target.value)}
                          placeholder="Euros"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500/30 placeholder-slate-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Salaire max</label>
                        <input
                          type="number"
                          value={salaryMax}
                          onChange={(e) => setSalaryMax(e.target.value)}
                          placeholder="Euros"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500/30 placeholder-slate-600"
                        />
                      </div>
                    </div>
                    {(dateRangeStart || dateRangeEnd || salaryMin || salaryMax) && (
                      <button
                        onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); setSalaryMin(''); setSalaryMax(''); }}
                        className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" /> Reinitialiser les filtres
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ ease }}
                className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-auto z-40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-gray-100 border border-gray-300 rounded-2xl"
              >
                <div className="flex items-center justify-between sm:justify-start gap-3 px-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{selectedIds.size} selectionne(s)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleBulkDelete} className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors whitespace-nowrap">
                    <Trash2 className="w-3 h-3 inline mr-1" />Supprimer
                  </button>
                  <button onClick={() => handleBulkStatusChange('pending_signature')} className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                    Signature
                  </button>
                  <button onClick={() => handleBulkStatusChange('signed')} className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors whitespace-nowrap">
                    Signe
                  </button>
                  <button onClick={() => handleBulkStatusChange('active')} className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                    Activer
                  </button>
                  <button onClick={handleBulkExportCSV} className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/20 transition-colors whitespace-nowrap">
                    <Copy className="w-3 h-3 inline mr-1" />CSV
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="px-3 py-2 bg-gray-200 text-slate-400 rounded-lg text-xs font-medium hover:text-gray-900 transition-colors whitespace-nowrap">
                    Annuler
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          )}

          {/* Empty State */}
          {!loading && filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ease }} className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucun contrat</h2>
              <p className="text-slate-400 mb-6">Creez votre premier contrat de travail conforme 2026</p>
              <div className="flex justify-center gap-3">
                <Link href="/contracts/new/cdi" className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-400 transition-colors flex items-center gap-2">
                  <Plus className="w-5 h-5" />CDI
                </Link>
                <Link href="/contracts/new/cdd" className="px-6 py-3 bg-blue-600 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-blue-500 transition-colors flex items-center gap-2">
                  <Plus className="w-5 h-5" />CDD
                </Link>
              </div>
            </motion.div>
          )}

          {/* Contract List - Desktop */}
          {!loading && filtered.length > 0 && (
            <>
              {/* Desktop grid with ContractCard */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((contract, i) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, ease }}
                    className="relative group"
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <div className="w-6 h-6 rounded-md bg-white/90 flex items-center justify-center border border-gray-200 group-hover:border-emerald-500/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contract.id)}
                          onChange={(e) => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              e.target.checked ? next.add(contract.id) : next.delete(contract.id);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="pl-4">
                      <ContractCard contract={contract} onDelete={handleDelete} onDuplicate={handleDuplicate} />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filtered.map((contract, i) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, ease }}
                    className="bg-gray-100 border border-gray-200 rounded-2xl p-4"
                  >
                    {/* Checkbox + header row */}
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contract.id)}
                        onChange={(e) => {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(contract.id) : next.delete(contract.id);
                            return next;
                          });
                        }}
                        className="mt-1 w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <ContractTypeBadge type={contract.contract_type} />
                          <ContractStatusBadge status={contract.status} />
                          {(contract.renewal_count || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              <RefreshCw className="w-3 h-3" />R{contract.renewal_count}
                            </span>
                          )}
                        </div>
                      </div>
                      {contract.contract_number && (
                        <span className="text-xs text-slate-500 font-mono flex-shrink-0">{contract.contract_number}</span>
                      )}
                    </div>

                    {/* Employee name */}
                    <div className="flex items-center gap-2 mb-2 ml-7">
                      <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{contract.employee_name}</span>
                    </div>

                    {/* Company & job title */}
                    <div className="ml-7 space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{contract.company_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{contract.job_title}</span>
                      </div>
                    </div>

                    {/* Dates & salary */}
                    <div className="flex items-center justify-between ml-7 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{fmtDate(contract.start_date)}{contract.end_date ? ` -> ${fmtDate(contract.end_date)}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                        <Euro className="w-3.5 h-3.5 text-emerald-400" />
                        {fmtMoney(contract.salary_amount)}{contract.salary_frequency === 'hourly' ? '/h' : contract.salary_frequency === 'monthly' ? '/mois' : ''}
                      </div>
                    </div>

                    {/* Active signing indicator */}
                    {(() => {
                      const expiresAt = contract.signing_token_expires_at;
                      const hasActiveSigning = expiresAt ? new Date(expiresAt) > new Date() : false;
                      return hasActiveSigning ? (
                        <div className="ml-7 mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="flex items-center gap-1.5 text-xs text-blue-400">
                            <Send className="w-3 h-3" />
                            <span className="font-medium">Signature envoyee</span>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 ml-7 border-t border-gray-200">
                      <Link href={`/contracts/${contract.id}?type=${contract.contract_type}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                        <Eye className="w-3.5 h-3.5" />Voir
                      </Link>
                      <Link href={`/contracts/${contract.id}/edit?type=${contract.contract_type}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors">
                        <FileEdit className="w-3.5 h-3.5" />Editer
                      </Link>
                      <button onClick={() => handleDuplicate(contract.id, contract.contract_type)} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Dupliquer">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(contract.id, contract.contract_type)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* FIXER (AUDIT) — modal de confirmation de suppression (remplace window.confirm) */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
              onClick={() => !deletingContract && setDeleteTarget(null)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.25, ease }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 border-t lg:border border-gray-200 dark:border-white/10 rounded-t-3xl lg:rounded-2xl w-full lg:max-w-sm p-6 space-y-4 lg:shadow-2xl"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Trash2 size={22} className="text-red-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {deleteTarget.kind === 'bulk' ? `Supprimer ${selectedIds.size} contrat(s) ?` : 'Supprimer le contrat ?'}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {deleteTarget.kind === 'bulk'
                      ? 'Cette action est irreversible. Les contrats selectionnes seront definitivement supprimes.'
                      : <>Cette action est irreversible. Le contrat <strong className="text-gray-700 dark:text-slate-200">{deleteTarget.label}</strong> sera definitivement supprime.</>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={deletingContract}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deletingContract}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingContract ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}

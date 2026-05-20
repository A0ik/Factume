'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Loader2, Search, Filter, FileText,
  CheckCircle2, Clock, AlertTriangle, XCircle, RefreshCw,
  ChevronDown, Calendar, Euro, User, MoreHorizontal, Pencil,
  Trash2, Eye, Repeat, X, Building2, Crown,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MissionLetter {
  id: string;
  client_id: string;
  client_name: string;
  mission_type: MissionType;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  monthly_fees: number;
  status: MissionStatus;
  responsible: string;
  description?: string;
  created_at: string;
}

type MissionType = 'expertise_comptable' | 'paie_social' | 'cac' | 'conseil_fiscal' | 'juridique' | 'autre';
type MissionStatus = 'active' | 'signee' | 'expiree' | 'a_renouveler' | 'annulee';
type TabKey = 'toutes' | 'signees' | 'a_renouveler' | 'expirees' | 'modeles';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MISSION_TYPES: { value: MissionType; label: string }[] = [
  { value: 'expertise_comptable', label: 'Expertise comptable' },
  { value: 'paie_social', label: 'Paie & social' },
  { value: 'cac', label: 'CAC' },
  { value: 'conseil_fiscal', label: 'Conseil fiscal' },
  { value: 'juridique', label: 'Juridique' },
  { value: 'autre', label: 'Autre' },
];

const MISSION_STATUSES: { value: MissionStatus; label: string; icon: any; color: string; bg: string }[] = [
  { value: 'active', label: 'Active', icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'signee', label: 'Signée', icon: FileText, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'a_renouveler', label: 'À renouveler', icon: RefreshCw, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'expiree', label: 'Expirée', icon: Clock, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'annulee', label: 'Annulée', icon: XCircle, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800/30' },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'signees', label: 'Signées' },
  { key: 'a_renouveler', label: 'À renouveler' },
  { key: 'expirees', label: 'Expirées' },
  { key: 'modeles', label: 'Modèles' },
];

const EMPTY_FORM: Omit<MissionLetter, 'id' | 'created_at'> = {
  client_id: '',
  client_name: '',
  mission_type: 'expertise_comptable',
  start_date: '',
  end_date: '',
  auto_renew: false,
  monthly_fees: 0,
  status: 'signee',
  responsible: '',
  description: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMissionTypeLabel(type: MissionType): string {
  return MISSION_TYPES.find((t) => t.value === type)?.label ?? type;
}

function getStatusConfig(status: MissionStatus) {
  return MISSION_STATUSES.find((s) => s.value === status) ?? MISSION_STATUSES[4];
}

function isExpiringSoon(endDate: string): boolean {
  const now = new Date();
  const end = new Date(endDate);
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CabinetMissionsPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();

  // Data state
  const [missions, setMissions] = useState<MissionLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('toutes');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MissionType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Load data
  useEffect(() => { if (profile) loadMissions(); }, [profile]);

  const loadMissions = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }

      // Fetch cabinet info + clients
      const cabRes = await fetch('/api/cabinet/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!cabRes.ok) throw new Error('Erreur de chargement du cabinet');
      const cabData = await cabRes.json();
      const cabinetId = cabData.cabinet?.id;
      if (!cabinetId) { setLoading(false); return; }

      // Fetch mission letters
      const { data: missionData, error } = await supabase
        .from('mission_letters')
        .select('*')
        .eq('cabinet_id', cabinetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMissions((missionData || []) as MissionLetter[]);
    } catch (err: any) {
      console.error('[loadMissions]', err);
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Derived data
  const filteredMissions = useMemo(() => {
    let result = [...missions];

    // Tab filter
    if (activeTab === 'signees') result = result.filter((m) => m.status === 'signee');
    else if (activeTab === 'a_renouveler') result = result.filter((m) => m.status === 'a_renouveler' || isExpiringSoon(m.end_date));
    else if (activeTab === 'expirees') result = result.filter((m) => m.status === 'expiree');

    // Type filter
    if (filterType !== 'all') result = result.filter((m) => m.mission_type === filterType);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.client_name?.toLowerCase().includes(q) ||
          m.responsible?.toLowerCase().includes(q) ||
          getMissionTypeLabel(m.mission_type).toLowerCase().includes(q)
      );
    }

    return result;
  }, [missions, activeTab, filterType, search]);

  const stats = useMemo(() => ({
    total: missions.length,
    active: missions.filter((m) => m.status === 'active').length,
    signees: missions.filter((m) => m.status === 'signee').length,
    aRenouveler: missions.filter((m) => m.status === 'a_renouveler' || isExpiringSoon(m.end_date)).length,
    expirees: missions.filter((m) => m.status === 'expiree').length,
    totalFees: missions.filter((m) => m.status === 'active' || m.status === 'signee').reduce((s, m) => s + (m.monthly_fees || 0), 0),
  }), [missions]);

  // Form handlers
  const handleSave = async () => {
    if (!form.client_name.trim()) { toast.error('Le nom du client est requis'); return; }
    if (!form.start_date || !form.end_date) { toast.error('Les dates de début et fin sont requises'); return; }

    setSaving(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }

      // Get cabinet id
      const cabRes = await fetch('/api/cabinet/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const cabData = await cabRes.json();
      const cabinetId = cabData.cabinet?.id;
      if (!cabinetId) { toast.error('Cabinet non trouvé'); return; }

      const payload = {
        cabinet_id: cabinetId,
        client_name: form.client_name.trim(),
        mission_type: form.mission_type,
        start_date: form.start_date,
        end_date: form.end_date,
        auto_renew: form.auto_renew,
        monthly_fees: form.monthly_fees,
        status: form.status,
        responsible: form.responsible.trim(),
        description: form.description?.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase.from('mission_letters').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Mission mise à jour');
      } else {
        const { error } = await supabase.from('mission_letters').insert(payload);
        if (error) throw error;
        toast.success('Mission créée');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadMissions(true);
    } catch (err: any) {
      console.error('[handleSave]', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette mission ?')) return;
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { error } = await supabase.from('mission_letters').delete().eq('id', id);
      if (error) throw error;
      toast.success('Mission supprimée');
      await loadMissions(true);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
    setActionMenuId(null);
  };

  const handleEdit = (mission: MissionLetter) => {
    setForm({
      client_id: mission.client_id,
      client_name: mission.client_name,
      mission_type: mission.mission_type,
      start_date: mission.start_date,
      end_date: mission.end_date,
      auto_renew: mission.auto_renew,
      monthly_fees: mission.monthly_fees,
      status: mission.status,
      responsible: mission.responsible,
      description: mission.description || '',
    });
    setEditingId(mission.id);
    setShowForm(true);
    setActionMenuId(null);
  };

  // Paywall guard
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/20">
            <FileText size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Lettres de mission</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            La gestion des lettres de mission est disponible avec le plan Business.
          </p>
          <Link
            href="/paywall?plan=business"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 transition-all"
          >
            <Crown size={18} />
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Lettres de mission</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stats.total} mission{stats.total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadMissions(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={15} />
            Nouvelle mission
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300' },
          { label: 'Actives', value: stats.active, icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Signées', value: stats.signees, icon: FileText, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'À renouveler', value: stats.aRenouveler, icon: RefreshCw, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
          { label: 'Honoraires/mois', value: formatCurrency(stats.totalFees), icon: Euro, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
        ].map(({ label, value, icon: Icon, color, bg, text }) => (
          <div key={label} className={cn('p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
            <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2', color)}>
              <Icon size={14} className="text-white" />
            </div>
            <p className={cn('text-lg font-black', text)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 border',
              activeTab === key
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 border-transparent'
            )}
          >
            {label}
            {key === 'a_renouveler' && stats.aRenouveler > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {stats.aRenouveler}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client, responsable..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MissionType | 'all')}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer"
          >
            <option value="all">Tous les types</option>
            {MISSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.6fr_0.8fr_0.8fr_0.8fr_0.5fr] gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
          {['Client', 'Type mission', 'Début', 'Fin', 'Reconduction', 'Honoraires/mois', 'Statut', 'Responsable', 'Actions'].map((h) => (
            <span key={h} className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {filteredMissions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">
              {activeTab === 'modeles' ? 'Aucun modèle de mission' : 'Aucune lettre de mission'}
            </p>
            <p className="text-sm text-gray-400 mb-5">
              {activeTab === 'modeles'
                ? 'Créez un modèle pour réutiliser vos missions types.'
                : 'Créez votre première lettre de mission pour commencer.'}
            </p>
            {activeTab !== 'modeles' && (
              <button
                onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
              >
                <Plus size={15} />
                Nouvelle mission
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            <AnimatePresence>
              {filteredMissions.map((mission, i) => {
                const statusConf = getStatusConfig(mission.status);
                const StatusIcon = statusConf.icon;
                const expiringSoon = isExpiringSoon(mission.end_date);

                return (
                  <motion.div
                    key={mission.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.02 }}
                    className="group"
                  >
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.6fr_0.8fr_0.8fr_0.8fr_0.5fr] gap-3 px-5 py-4 items-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      {/* Client */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0',
                          'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        )}>
                          {mission.client_name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{mission.client_name}</span>
                      </div>

                      {/* Type */}
                      <span className="text-sm text-gray-700 dark:text-gray-300">{getMissionTypeLabel(mission.mission_type)}</span>

                      {/* Dates */
                      <>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{formatDateShort(mission.start_date)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-sm', expiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-600 dark:text-gray-400')}>
                            {formatDateShort(mission.end_date)}
                          </span>
                          {expiringSoon && <AlertTriangle size={12} className="text-amber-500" />}
                        </div>
                      </>}

                      {/* Auto renew */}
                      <div className="flex items-center">
                        {mission.auto_renew ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <Repeat size={12} /> Auto
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>

                      {/* Fees */}
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {mission.monthly_fees > 0 ? formatCurrency(mission.monthly_fees) : '-'}
                      </span>

                      {/* Status */}
                      <div className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold w-fit', statusConf.bg, statusConf.color)}>
                        <StatusIcon size={11} />
                        {statusConf.label}
                      </div>

                      {/* Responsible */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                          {mission.responsible?.charAt(0).toUpperCase() || '-'}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{mission.responsible || '-'}</span>
                      </div>

                      {/* Actions */}
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === mission.id ? null : mission.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        <AnimatePresence>
                          {actionMenuId === mission.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-8 z-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 w-40"
                            >
                              <button onClick={() => handleEdit(mission)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 w-full text-left">
                                <Pencil size={13} /> Modifier
                              </button>
                              <button onClick={() => handleDelete(mission.id)} className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full text-left">
                                <Trash2 size={13} /> Supprimer
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                            {mission.client_name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{mission.client_name}</p>
                            <p className="text-xs text-gray-400">{getMissionTypeLabel(mission.mission_type)}</p>
                          </div>
                        </div>
                        <div className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0', statusConf.bg, statusConf.color)}>
                          <StatusIcon size={11} />
                          {statusConf.label}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Calendar size={11} />
                          <span>{formatDateShort(mission.start_date)} - {formatDateShort(mission.end_date)}</span>
                          {expiringSoon && <AlertTriangle size={11} className="text-amber-500" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Euro size={11} />
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {mission.monthly_fees > 0 ? formatCurrency(mission.monthly_fees) : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <User size={11} />
                          <span>{mission.responsible || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {mission.auto_renew ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Repeat size={11} /> Auto-renouvellement
                            </span>
                          ) : (
                            <span className="text-gray-400">Pas de renouvellement</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                        <button onClick={() => handleEdit(mission)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors" title="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(mission.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                          <Trash2 size={14} />
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

      {/* Add / Edit Mission Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setShowForm(false); setEditingId(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingId ? 'Modifier la mission' : 'Nouvelle lettre de mission'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Renseignez les informations de la mission</p>
                </div>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form body */}
              <div className="px-6 py-5 space-y-5">
                {/* Client name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Client *</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.client_name}
                      onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                      placeholder="Nom du client"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Mission type + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Type de mission *</label>
                    <select
                      value={form.mission_type}
                      onChange={(e) => setForm({ ...form, mission_type: e.target.value as MissionType })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none"
                    >
                      {MISSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Statut</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as MissionStatus })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none"
                    >
                      {MISSION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date de début *</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date de fin *</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Fees + Responsible */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Honoraires/mois (€)</label>
                    <div className="relative">
                      <Euro size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={form.monthly_fees || ''}
                        onChange={(e) => setForm({ ...form, monthly_fees: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        min={0}
                        step={50}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Responsable</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={form.responsible}
                        onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                        placeholder="Nom du responsable"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto renew */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, auto_renew: !form.auto_renew })}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      form.auto_renew ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                        form.auto_renew ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Reconduction automatique</span>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Description de la mission..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {editingId ? 'Enregistrer' : 'Créer la mission'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

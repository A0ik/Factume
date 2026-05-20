'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Loader2, Search, Filter, Scale,
  CheckCircle2, Clock, FileText, X, RefreshCw,
  ChevronDown, Calendar, User, MoreHorizontal, Pencil,
  Trash2, Building2, Crown, FileCheck, FilePlus2,
  ListChecks, BookOpen, AlertTriangle, Users, Euro,
  Download, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LegalAct {
  id: string;
  client_name: string;
  act_type: ActType;
  act_date: string;
  description: string;
  status: ActStatus;
  responsible: string;
  created_at: string;
}

interface CompanyCreation {
  id: string;
  denomination: string;
  legal_form: LegalForm;
  capital: number;
  registered_office: string;
  corporate_purpose: string;
  manager: string;
  naf_code: string;
  constitution_date: string;
  associates: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
}

type ActType = 'pv_ag' | 'modification_statuts' | 'nomination' | 'radiation' | 'transfert_siege' | 'variation_capital' | 'dissolution' | 'autre';
type ActStatus = 'en_attente' | 'en_cours' | 'traite' | 'depose';
type LegalForm = 'SAS' | 'SASU' | 'SARL' | 'EURL' | 'SA' | 'SNC' | 'SCI' | 'SELARL';
type TabKey = 'actes' | 'statuts' | 'registres' | 'echeances' | 'creation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACT_TYPES: { value: ActType; label: string }[] = [
  { value: 'pv_ag', label: 'PV AG' },
  { value: 'modification_statuts', label: 'Modification statuts' },
  { value: 'nomination', label: 'Nomination' },
  { value: 'radiation', label: 'Radiation' },
  { value: 'transfert_siege', label: 'Transfert siège' },
  { value: 'variation_capital', label: 'Variation capital' },
  { value: 'dissolution', label: 'Dissolution' },
  { value: 'autre', label: 'Autre' },
];

const ACT_STATUSES: { value: ActStatus; label: string; icon: any; color: string; bg: string }[] = [
  { value: 'en_attente', label: 'En attente', icon: Clock, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'en_cours', label: 'En cours', icon: RefreshCw, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'traite', label: 'Traité', icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'depose', label: 'Déposé', icon: FileCheck, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
];

const LEGAL_FORMS: { value: LegalForm; label: string }[] = [
  { value: 'SAS', label: 'SAS' },
  { value: 'SASU', label: 'SASU' },
  { value: 'SARL', label: 'SARL' },
  { value: 'EURL', label: 'EURL' },
  { value: 'SA', label: 'SA' },
  { value: 'SNC', label: 'SNC' },
  { value: 'SCI', label: 'SCI' },
  { value: 'SELARL', label: 'SELARL' },
];

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'actes', label: 'Actes & AG', icon: Scale },
  { key: 'statuts', label: 'Statuts & Modifications', icon: FileText },
  { key: 'registres', label: 'Registres', icon: BookOpen },
  { key: 'echeances', label: 'Échéances', icon: Calendar },
  { key: 'creation', label: 'Création société', icon: Building2 },
];

const CREATION_CHECKLIST = [
  { id: 'denomination', label: 'Vérification dénomination (INPI)' },
  { id: 'statuts', label: 'Rédaction des statuts' },
  { id: 'capital', label: 'Constitution du capital' },
  { id: 'kbis', label: 'Immatriculation (Kbis)' },
  { id: 'siret', label: 'Obtention SIRET/SIREN' },
  { id: 'naf', label: 'Code NAF/APE' },
  { id: 'vat', label: 'Déclaration TVA' },
  { id: 'rcs', label: 'Inscription RCS' },
  { id: 'bank', label: 'Ouverture compte bancaire' },
  { id: 'cfp', label: 'Déclaration CFP (urssaf)' },
  { id: 'employeur', label: 'Déclaration d\'employeur (si applicable)' },
  { id: 'statuts_file', label: 'Dépôt des statuts au greffe' },
];

const REGISTRES = [
  {
    id: 'associates',
    title: 'Registre des associés',
    description: 'Liste des associés avec leurs parts sociales, entrées et sorties.',
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
  },
  {
    id: 'pv_ag',
    title: 'PV d\'assemblées générales',
    description: 'Procès-verbaux des assemblées générales ordinaires et extraordinaires.',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  {
    id: 'motions',
    title: 'Registre des motions',
    description: 'Registre des décisions et résolutions prises en assemblée.',
    icon: BookOpen,
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-400',
  },
];

const EMPTY_ACT: Omit<LegalAct, 'id' | 'created_at'> = {
  client_name: '',
  act_type: 'pv_ag',
  act_date: '',
  description: '',
  status: 'en_attente',
  responsible: '',
};

const EMPTY_COMPANY: Omit<CompanyCreation, 'id' | 'created_at' | 'status'> = {
  denomination: '',
  legal_form: 'SAS',
  capital: 0,
  registered_office: '',
  corporate_purpose: '',
  manager: '',
  naf_code: '',
  constitution_date: '',
  associates: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActTypeLabel(type: ActType): string {
  return ACT_TYPES.find((t) => t.value === type)?.label ?? type;
}

function getActStatusConfig(status: ActStatus) {
  return ACT_STATUSES.find((s) => s.value === status) ?? ACT_STATUSES[0];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CabinetJuridiquePage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();

  // Data
  const [acts, setActs] = useState<LegalAct[]>([]);
  const [companies, setCompanies] = useState<CompanyCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI
  const [activeTab, setActiveTab] = useState<TabKey>('actes');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ActType | 'all'>('all');
  const [showActForm, setShowActForm] = useState(false);
  const [actForm, setActForm] = useState(EMPTY_ACT);
  const [savingAct, setSavingAct] = useState(false);
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Company creation form
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY);
  const [savingCompany, setSavingCompany] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Load data
  useEffect(() => { if (profile) loadData(); }, [profile]);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }

      const cabRes = await fetch('/api/cabinet/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!cabRes.ok) throw new Error('Erreur de chargement du cabinet');
      const cabData = await cabRes.json();
      const cabinetId = cabData.cabinet?.id;
      if (!cabinetId) { setLoading(false); return; }

      const [actsRes, companiesRes] = await Promise.all([
        supabase.from('legal_acts').select('*').eq('cabinet_id', cabinetId).order('created_at', { ascending: false }),
        supabase.from('company_creations').select('*').eq('cabinet_id', cabinetId).order('created_at', { ascending: false }),
      ]);

      setActs((actsRes.data || []) as LegalAct[]);
      setCompanies((companiesRes.data || []) as CompanyCreation[]);
    } catch (err: any) {
      console.error('[loadData]', err);
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Derived
  const filteredActs = useMemo(() => {
    let result = [...acts];
    if (filterType !== 'all') result = result.filter((a) => a.act_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.client_name?.toLowerCase().includes(q) ||
          a.responsible?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          getActTypeLabel(a.act_type).toLowerCase().includes(q)
      );
    }
    return result;
  }, [acts, filterType, search]);

  const actStats = useMemo(() => ({
    total: acts.length,
    enAttente: acts.filter((a) => a.status === 'en_attente').length,
    enCours: acts.filter((a) => a.status === 'en_cours').length,
    traite: acts.filter((a) => a.status === 'traite').length,
    depose: acts.filter((a) => a.status === 'depose').length,
  }), [acts]);

  const checklistProgress = useMemo(() => {
    const total = CREATION_CHECKLIST.length;
    const done = Object.values(checklist).filter(Boolean).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [checklist]);

  // Act CRUD
  const handleSaveAct = async () => {
    if (!actForm.client_name.trim()) { toast.error('Le nom du client est requis'); return; }
    if (!actForm.act_date) { toast.error('La date est requise'); return; }

    setSavingAct(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }

      const cabRes = await fetch('/api/cabinet/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const cabData = await cabRes.json();
      const cabinetId = cabData.cabinet?.id;
      if (!cabinetId) { toast.error('Cabinet non trouvé'); return; }

      const payload = {
        cabinet_id: cabinetId,
        client_name: actForm.client_name.trim(),
        act_type: actForm.act_type,
        act_date: actForm.act_date,
        description: actForm.description?.trim() || null,
        status: actForm.status,
        responsible: actForm.responsible?.trim() || null,
      };

      if (editingActId) {
        const { error } = await supabase.from('legal_acts').update(payload).eq('id', editingActId);
        if (error) throw error;
        toast.success('Acte mis à jour');
      } else {
        const { error } = await supabase.from('legal_acts').insert(payload);
        if (error) throw error;
        toast.success('Acte créé');
      }

      setShowActForm(false);
      setEditingActId(null);
      setActForm(EMPTY_ACT);
      await loadData(true);
    } catch (err: any) {
      console.error('[handleSaveAct]', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingAct(false);
    }
  };

  const handleDeleteAct = async (id: string) => {
    if (!confirm('Supprimer cet acte ?')) return;
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { error } = await supabase.from('legal_acts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Acte supprimé');
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
    setActionMenuId(null);
  };

  const handleEditAct = (act: LegalAct) => {
    setActForm({
      client_name: act.client_name,
      act_type: act.act_type,
      act_date: act.act_date,
      description: act.description || '',
      status: act.status,
      responsible: act.responsible || '',
    });
    setEditingActId(act.id);
    setShowActForm(true);
    setActionMenuId(null);
  };

  // Company CRUD
  const handleSaveCompany = async () => {
    if (!companyForm.denomination.trim()) { toast.error('La dénomination est requise'); return; }

    setSavingCompany(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }

      const cabRes = await fetch('/api/cabinet/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const cabData = await cabRes.json();
      const cabinetId = cabData.cabinet?.id;
      if (!cabinetId) { toast.error('Cabinet non trouvé'); return; }

      const payload = {
        cabinet_id: cabinetId,
        denomination: companyForm.denomination.trim(),
        legal_form: companyForm.legal_form,
        capital: companyForm.capital,
        registered_office: companyForm.registered_office?.trim() || null,
        corporate_purpose: companyForm.corporate_purpose?.trim() || null,
        manager: companyForm.manager?.trim() || null,
        naf_code: companyForm.naf_code?.trim() || null,
        constitution_date: companyForm.constitution_date || null,
        associates: companyForm.associates?.trim() || null,
      };

      if (editingCompanyId) {
        const { error } = await supabase.from('company_creations').update(payload).eq('id', editingCompanyId);
        if (error) throw error;
        toast.success('Société mise à jour');
      } else {
        const { error } = await supabase.from('company_creations').insert({ ...payload, status: 'draft' });
        if (error) throw error;
        toast.success('Société créée');
      }

      setShowCompanyForm(false);
      setEditingCompanyId(null);
      setCompanyForm(EMPTY_COMPANY);
      await loadData(true);
    } catch (err: any) {
      console.error('[handleSaveCompany]', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleEditCompany = (company: CompanyCreation) => {
    setCompanyForm({
      denomination: company.denomination,
      legal_form: company.legal_form,
      capital: company.capital,
      registered_office: company.registered_office || '',
      corporate_purpose: company.corporate_purpose || '',
      manager: company.manager || '',
      naf_code: company.naf_code || '',
      constitution_date: company.constitution_date || '',
      associates: company.associates || '',
    });
    setEditingCompanyId(company.id);
    setShowCompanyForm(true);
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Supprimer cette société ?')) return;
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { error } = await supabase.from('company_creations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Société supprimée');
      await loadData(true);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleGenerateStatutes = async (company: CompanyCreation) => {
    setGeneratingPdf(true);
    try {
      // Simulate PDF generation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(`Statuts générés pour ${company.denomination}`);
    } catch (err: any) {
      toast.error('Erreur lors de la génération');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const toggleChecklist = (id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Paywall guard
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/20">
            <Scale size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Juridique & Création</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            La gestion des actes juridiques et la création de sociétés sont disponibles avec le plan Business.
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
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Juridique & Création</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Actes, statuts, registres et création de sociétés</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {activeTab === 'actes' && (
            <button
              onClick={() => { setActForm(EMPTY_ACT); setEditingActId(null); setShowActForm(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={15} />
              Nouvel acte
            </button>
          )}
          {activeTab === 'creation' && (
            <button
              onClick={() => { setCompanyForm(EMPTY_COMPANY); setEditingCompanyId(null); setShowCompanyForm(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={15} />
              Nouvelle société
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TABS.map(({ key, label, icon: TabIcon }) => (
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
            <TabIcon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* TAB: Actes & AG                                                     */}
      {/* ================================================================== */}
      {activeTab === 'actes' && (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: actStats.total, icon: Scale, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300' },
              { label: 'En attente', value: actStats.enAttente, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
              { label: 'En cours', value: actStats.enCours, icon: RefreshCw, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
              { label: 'Traités', value: actStats.traite, icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'Déposés', value: actStats.depose, icon: FileCheck, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
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

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un client, acte, responsable..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ActType | 'all')}
                className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer"
              >
                <option value="all">Tous les types</option>
                {ACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Acts table */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
            <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.7fr_1.5fr_0.8fr_0.8fr_0.5fr] gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
              {['Client', 'Type d\'acte', 'Date', 'Description', 'Statut', 'Responsable', 'Actions'].map((h) => (
                <span key={h} className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {filteredActs.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Scale size={28} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucun acte juridique</p>
                <p className="text-sm text-gray-400 mb-5">Créez votre premier acte pour commencer.</p>
                <button
                  onClick={() => { setActForm(EMPTY_ACT); setEditingActId(null); setShowActForm(true); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
                >
                  <Plus size={15} />
                  Nouvel acte
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                <AnimatePresence>
                  {filteredActs.map((act, i) => {
                    const statusConf = getActStatusConfig(act.status);
                    const StatusIcon = statusConf.icon;
                    return (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: i * 0.02 }}
                        className="group"
                      >
                        {/* Desktop */}
                        <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.7fr_1.5fr_0.8fr_0.8fr_0.5fr] gap-3 px-5 py-4 items-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                              {act.client_name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{act.client_name}</span>
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{getActTypeLabel(act.act_type)}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{formatDateShort(act.act_date)}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{act.description || '-'}</span>
                          <div className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold w-fit', statusConf.bg, statusConf.color)}>
                            <StatusIcon size={11} />
                            {statusConf.label}
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                              {act.responsible?.charAt(0).toUpperCase() || '-'}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{act.responsible || '-'}</span>
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === act.id ? null : act.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            <AnimatePresence>
                              {actionMenuId === act.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-8 z-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 w-40"
                                >
                                  <button onClick={() => handleEditAct(act)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 w-full text-left">
                                    <Pencil size={13} /> Modifier
                                  </button>
                                  <button onClick={() => handleDeleteAct(act.id)} className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full text-left">
                                    <Trash2 size={13} /> Supprimer
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Mobile */}
                        <div className="lg:hidden px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                                {act.client_name?.charAt(0).toUpperCase() || 'C'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{act.client_name}</p>
                                <p className="text-xs text-gray-400">{getActTypeLabel(act.act_type)}</p>
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
                              <span>{formatDateShort(act.act_date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <User size={11} />
                              <span>{act.responsible || '-'}</span>
                            </div>
                          </div>
                          {act.description && (
                            <p className="text-xs text-gray-400 mt-2 line-clamp-2">{act.description}</p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                            <button onClick={() => handleEditAct(act)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => handleDeleteAct(act.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* TAB: Statuts & Modifications                                        */}
      {/* ================================================================== */}
      {activeTab === 'statuts' && (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <FileText size={16} className="text-gray-400" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Statuts & Modifications</h3>
          </div>
          {acts.filter((a) => a.act_type === 'modification_statuts').length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucune modification de statuts</p>
              <p className="text-sm text-gray-400 mb-5">Les modifications de statuts apparaîtront ici.</p>
              <button
                onClick={() => { setActForm({ ...EMPTY_ACT, act_type: 'modification_statuts' }); setEditingActId(null); setShowActForm(true); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
              >
                <Plus size={15} />
                Nouvelle modification
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              {acts.filter((a) => a.act_type === 'modification_statuts').map((act) => {
                const statusConf = getActStatusConfig(act.status);
                const StatusIcon = statusConf.icon;
                return (
                  <div key={act.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                      {act.client_name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{act.client_name}</p>
                      <p className="text-xs text-gray-400">{formatDateShort(act.act_date)} · {act.description || 'Aucune description'}</p>
                    </div>
                    <div className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0', statusConf.bg, statusConf.color)}>
                      <StatusIcon size={11} />
                      {statusConf.label}
                    </div>
                    <button onClick={() => handleEditAct(act)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors">
                      <Pencil size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB: Registres                                                      */}
      {/* ================================================================== */}
      {activeTab === 'registres' && (
        <div className="space-y-4">
          {REGISTRES.map(({ id, title, description, icon: RegIcon, color, bg, text }) => (
            <div key={id} className={cn('p-5 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
              <div className="flex items-start gap-4">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', color)}>
                  <RegIcon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn('font-bold text-sm', text)}>{title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                      <Plus size={12} />
                      Ajouter une entrée
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                      <Download size={12} />
                      Exporter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB: Echeances                                                      */}
      {/* ================================================================== */}
      {activeTab === 'echeances' && (
        <div className="space-y-4">
          {/* Upcoming deadlines from acts */}
          {acts.filter((a) => a.status === 'en_attente' || a.status === 'en_cours').length === 0 ? (
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucune échéance</p>
              <p className="text-sm text-gray-400">Les actes en attente ou en cours apparaîtront ici.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/5">
                <Calendar size={16} className="text-gray-400" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Échéances à venir</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {acts
                  .filter((a) => a.status === 'en_attente' || a.status === 'en_cours')
                  .sort((a, b) => new Date(a.act_date).getTime() - new Date(b.act_date).getTime())
                  .map((act) => {
                    const isPast = new Date(act.act_date) < new Date();
                    return (
                      <div key={act.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
                          isPast
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        )}>
                          {formatDateShort(act.act_date).slice(0, 5)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{act.client_name}</p>
                          <p className="text-xs text-gray-400">{getActTypeLabel(act.act_type)}</p>
                        </div>
                        {isPast && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-red-500">
                            <AlertTriangle size={12} />
                            En retard
                          </div>
                        )}
                        <span className="text-xs text-gray-400">{formatDateShort(act.act_date)}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB: Creation societe                                               */}
      {/* ================================================================== */}
      {activeTab === 'creation' && (
        <div className="space-y-6">
          {/* Checklist section */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <ListChecks size={16} className="text-emerald-500" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Checklist de création</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{checklistProgress}%</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              {CREATION_CHECKLIST.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={() => toggleChecklist(item.id)}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      checklist[item.id]
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {checklist[item.id] && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                  <span className={cn(
                    'text-sm transition-colors',
                    checklist[item.id]
                      ? 'text-gray-400 line-through'
                      : 'text-gray-700 dark:text-gray-300'
                  )}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Company list */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <Building2 size={16} className="text-gray-400" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sociétés en cours de création</h3>
              </div>
              <span className="text-xs text-gray-400">{companies.length} société{companies.length !== 1 ? 's' : ''}</span>
            </div>

            {companies.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Building2 size={28} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucune société en cours</p>
                <p className="text-sm text-gray-400 mb-5">Créez une société pour démarrer le processus.</p>
                <button
                  onClick={() => { setCompanyForm(EMPTY_COMPANY); setEditingCompanyId(null); setShowCompanyForm(true); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
                >
                  <Plus size={15} />
                  Nouvelle société
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {companies.map((company) => {
                  const formLabel = LEGAL_FORMS.find((f) => f.value === company.legal_form)?.label || company.legal_form;
                  return (
                    <div key={company.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                            {company.denomination.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{company.denomination}</p>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">{formLabel}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-400">
                              {company.capital > 0 && (
                                <span className="flex items-center gap-1"><Euro size={10} /> Capital : {formatCurrency(company.capital)}</span>
                              )}
                              {company.registered_office && (
                                <span className="flex items-center gap-1 truncate"><Building2 size={10} /> {company.registered_office}</span>
                              )}
                              {company.manager && (
                                <span className="flex items-center gap-1"><User size={10} /> {company.manager}</span>
                              )}
                              {company.naf_code && (
                                <span>NAF : {company.naf_code}</span>
                              )}
                            </div>
                            {company.corporate_purpose && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-1">Objet : {company.corporate_purpose}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleGenerateStatutes(company)}
                            disabled={generatingPdf}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
                          >
                            {generatingPdf ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                            Statuts PDF
                          </button>
                          <button onClick={() => handleEditCompany(company)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteCompany(company.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                          company.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : company.status === 'in_progress'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800/30 text-gray-500'
                        )}>
                          {company.status === 'completed' ? <CheckCircle2 size={9} /> : company.status === 'in_progress' ? <RefreshCw size={9} /> : <Clock size={9} />}
                          {company.status === 'completed' ? 'Terminée' : company.status === 'in_progress' ? 'En cours' : 'Brouillon'}
                        </span>
                        {company.constitution_date && (
                          <span className="text-[10px] text-gray-400">Date prévue : {formatDateShort(company.constitution_date)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: Add/Edit Act                                                 */}
      {/* ================================================================== */}
      <AnimatePresence>
        {showActForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setShowActForm(false); setEditingActId(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingActId ? 'Modifier l\'acte' : 'Nouvel acte juridique'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Renseignez les informations de l'acte</p>
                </div>
                <button onClick={() => { setShowActForm(false); setEditingActId(null); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Client */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Client *</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={actForm.client_name}
                      onChange={(e) => setActForm({ ...actForm, client_name: e.target.value })}
                      placeholder="Nom du client"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Act type + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Type d'acte *</label>
                    <select
                      value={actForm.act_type}
                      onChange={(e) => setActForm({ ...actForm, act_type: e.target.value as ActType })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none"
                    >
                      {ACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Statut</label>
                    <select
                      value={actForm.status}
                      onChange={(e) => setActForm({ ...actForm, status: e.target.value as ActStatus })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none"
                    >
                      {ACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Date + Responsible */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date *</label>
                    <input
                      type="date"
                      value={actForm.act_date}
                      onChange={(e) => setActForm({ ...actForm, act_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Responsable</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={actForm.responsible}
                        onChange={(e) => setActForm({ ...actForm, responsible: e.target.value })}
                        placeholder="Nom du responsable"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <textarea
                    value={actForm.description}
                    onChange={(e) => setActForm({ ...actForm, description: e.target.value })}
                    placeholder="Description de l'acte..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={() => { setShowActForm(false); setEditingActId(null); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveAct}
                  disabled={savingAct}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {savingAct ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {editingActId ? 'Enregistrer' : 'Créer l\'acte'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* MODAL: Add/Edit Company                                             */}
      {/* ================================================================== */}
      <AnimatePresence>
        {showCompanyForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setShowCompanyForm(false); setEditingCompanyId(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingCompanyId ? 'Modifier la société' : 'Nouvelle société'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Renseignez les informations de la société</p>
                </div>
                <button onClick={() => { setShowCompanyForm(false); setEditingCompanyId(null); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Denomination + Legal form */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Dénomination *</label>
                    <input
                      type="text"
                      value={companyForm.denomination}
                      onChange={(e) => setCompanyForm({ ...companyForm, denomination: e.target.value })}
                      placeholder="Nom de la société"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Forme juridique *</label>
                    <select
                      value={companyForm.legal_form}
                      onChange={(e) => setCompanyForm({ ...companyForm, legal_form: e.target.value as LegalForm })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none"
                    >
                      {LEGAL_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Capital + NAF */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Capital (€)</label>
                    <div className="relative">
                      <Euro size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={companyForm.capital || ''}
                        onChange={(e) => setCompanyForm({ ...companyForm, capital: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        min={0}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Code NAF/APE</label>
                    <input
                      type="text"
                      value={companyForm.naf_code}
                      onChange={(e) => setCompanyForm({ ...companyForm, naf_code: e.target.value })}
                      placeholder="Ex: 6920Z"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Siege social */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Siège social</label>
                  <input
                    type="text"
                    value={companyForm.registered_office}
                    onChange={(e) => setCompanyForm({ ...companyForm, registered_office: e.target.value })}
                    placeholder="Adresse du siège social"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Objet social */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Objet social</label>
                  <textarea
                    value={companyForm.corporate_purpose}
                    onChange={(e) => setCompanyForm({ ...companyForm, corporate_purpose: e.target.value })}
                    placeholder="Description de l'objet social..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>

                {/* Gerant + Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Gérant / Président</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={companyForm.manager}
                        onChange={(e) => setCompanyForm({ ...companyForm, manager: e.target.value })}
                        placeholder="Nom du gérant"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date de constitution</label>
                    <input
                      type="date"
                      value={companyForm.constitution_date}
                      onChange={(e) => setCompanyForm({ ...companyForm, constitution_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Associates */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Associés</label>
                  <textarea
                    value={companyForm.associates}
                    onChange={(e) => setCompanyForm({ ...companyForm, associates: e.target.value })}
                    placeholder="Liste des associés et leurs parts (un par ligne)&#10;Ex: Jean Dupont - 60%&#10;Marie Martin - 40%"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={() => { setShowCompanyForm(false); setEditingCompanyId(null); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveCompany}
                  disabled={savingCompany}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {savingCompany ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {editingCompanyId ? 'Enregistrer' : 'Créer la société'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

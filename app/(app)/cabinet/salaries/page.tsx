'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Search, Plus, X, ChevronDown,
  Users, UserPlus, FileText, Clock, Briefcase, Eye, Edit3,
  Trash2, Filter, Crown, Shield, Building2, Download, Upload,
  ChevronRight, Euro, Calendar, Phone, MapPin, Hash, BadgeCheck,
  AlertCircle, CheckCircle2, Info,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractType = 'CDI' | 'CDD' | 'CDD usage' | 'Interim' | 'Stage' | 'Apprentissage' | 'Professionnalisation';
type EmployeeStatus = 'actif' | 'suspendu' | 'termine';
type TabKey = 'info' | 'documents' | 'historique';
type Civility = 'M.' | 'Mme' | 'Mx';

interface Employee {
  id: string;
  clientId: string;
  clientName: string;
  civilite: Civility;
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  nss: string;
  adresse: string;
  poste: string;
  typeContrat: ContractType;
  salaireBrut: number;
  tauxHoraire: number;
  heuresSemaine: number;
  dateDebut: string;
  dateFin: string | null;
  status: EmployeeStatus;
  createdAt: string;
}

interface EmployeeForm {
  civilite: Civility;
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  nss: string;
  adresse: string;
  poste: string;
  typeContrat: ContractType;
  salaireBrut: string;
  tauxHoraire: string;
  heuresSemaine: string;
  dateDebut: string;
  dateFin: string;
  clientId: string;
}

interface ClientOption {
  id: string;
  name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'CDD usage', label: "CDD d'usage" },
  { value: 'Interim', label: 'Interim' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Apprentissage', label: 'Apprentissage' },
  { value: 'Professionnalisation', label: 'Professionnalisation' },
];

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; bg: string; text: string; dot: string }> = {
  actif:    { label: 'Actif',    bg: 'bg-emerald-100 dark:bg-emerald-900/30',  text: 'text-emerald-700 dark:text-emerald-400',  dot: 'bg-emerald-500' },
  suspendu: { label: 'Suspendu', bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-400',     dot: 'bg-amber-500' },
  termine:  { label: 'Termine',  bg: 'bg-gray-100 dark:bg-gray-800',          text: 'text-gray-500 dark:text-gray-400',       dot: 'bg-gray-400' },
};

const CIVILITIES: { value: Civility; label: string }[] = [
  { value: 'M.', label: 'Monsieur' },
  { value: 'Mme', label: 'Madame' },
  { value: 'Mx', label: 'Autre' },
];

const NATIONALITIES = [
  'Francaise', 'Belge', 'Suisse', 'Allemande', 'Italienne', 'Espagnole',
  'Portugaise', 'Britannique', 'Marocaine', 'Algerienne', 'Tunisienne',
  'Senegalaise', 'Malienne', 'Ivoirienne', 'Camerounaise', 'Autre',
];

const EMPTY_FORM: EmployeeForm = {
  civilite: 'M.',
  nom: '', prenom: '', dateNaissance: '', lieuNaissance: '', nationalite: 'Francaise',
  nss: '', adresse: '', poste: '', typeContrat: 'CDI',
  salaireBrut: '', tauxHoraire: '', heuresSemaine: '35',
  dateDebut: '', dateFin: '', clientId: '',
};

// ─── Mock Data Generator ──────────────────────────────────────────────────────

function generateMockEmployees(): Employee[] {
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Luc', 'Isabelle', 'Thomas', 'Claire', 'Nicolas', 'Anne', 'Ahmed', 'Fatima'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Benali', 'Haddad'];
  const posts = ['Serveur', 'Boulanger', 'Developpeur', 'Comptable', 'Chauffeur', 'Cuisinier', 'Soudeur', 'Secretaire', 'Chef d\'equipe', 'Apprenti'];
  const clients: ClientOption[] = [
    { id: 'cl-0', name: 'Boulangerie Martin' },
    { id: 'cl-1', name: 'Restaurant Le Provencal' },
    { id: 'cl-2', name: 'Auto Ecole Express' },
    { id: 'cl-3', name: 'Plomberie Dubois' },
    { id: 'cl-4', name: 'Informatique Plus' },
  ];
  const statuses: EmployeeStatus[] = ['actif', 'actif', 'actif', 'suspendu', 'termine'];
  const contracts: ContractType[] = ['CDI', 'CDI', 'CDD', 'CDD usage', 'Interim', 'Stage', 'Apprentissage'];

  return Array.from({ length: 18 }, (_, i) => ({
    id: `emp-${i}`,
    clientId: clients[i % clients.length].id,
    clientName: clients[i % clients.length].name,
    civilite: i % 3 === 0 ? 'Mme' : 'M.',
    nom: lastNames[i % lastNames.length],
    prenom: firstNames[i % firstNames.length],
    dateNaissance: `199${i % 10}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    lieuNaissance: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux'][i % 5],
    nationalite: 'Francaise',
    nss: `1${i % 2} ${(10 + i).toString().padStart(2, '0')} ${String((i % 12) + 1).padStart(2, '0')} ${(75 + i).toString().padStart(3, '0')} ${String(100 + i * 13).slice(0, 3)} ${String(10 + i).padStart(2, '0')}`,
    adresse: `${i * 12 + 1} Rue de la Republique, ${75001 + i * 100} Paris`,
    poste: posts[i % posts.length],
    typeContrat: contracts[i % contracts.length],
    salaireBrut: 1800 + Math.floor(Math.random() * 2200),
    tauxHoraire: 12 + Math.floor(Math.random() * 15),
    heuresSemaine: [35, 39, 35, 20, 35, 25, 35][i % 7],
    dateDebut: `202${i % 4}-${String((i % 12) + 1).padStart(2, '0')}-01`,
    dateFin: i % 4 === 2 ? `202${i % 4 + 1}-${String((i % 12) + 1).padStart(2, '0')}-01` : null,
    status: statuses[i % statuses.length],
    createdAt: `2024-${String((i % 12) + 1).padStart(2, '0')}-15`,
  }));
}

// ─── Helper Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function ContractBadge({ type }: { type: ContractType }) {
  const colorMap: Record<ContractType, string> = {
    'CDI': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'CDD': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    'CDD usage': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
    'Interim': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    'Stage': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
    'Apprentissage': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    'Professionnalisation': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  };
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', colorMap[type] ?? 'bg-gray-100 text-gray-600')}>
      {type}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CabinetSalariesPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterContract, setFilterContract] = useState<ContractType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [form, setForm] = useState<EmployeeForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Load data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      // In production, fetch from API:
      // const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      // const { data: { session } } = await supabase.auth.getSession();
      // const res = await fetch('/api/cabinet/salaries', { headers: { Authorization: `Bearer ${session.access_token}` } });

      await new Promise((r) => setTimeout(r, 400));
      setEmployees(generateMockEmployees());
      setClients([
        { id: 'cl-0', name: 'Boulangerie Martin' },
        { id: 'cl-1', name: 'Restaurant Le Provencal' },
        { id: 'cl-2', name: 'Auto Ecole Express' },
        { id: 'cl-3', name: 'Plomberie Dubois' },
        { id: 'cl-4', name: 'Informatique Plus' },
      ]);
    } catch (error: any) {
      console.error('[loadData] Error:', error);
      toast.error(error.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (profile) loadData(); }, [profile, loadData]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) => e.nom.toLowerCase().includes(q) || e.prenom.toLowerCase().includes(q) || e.nss.includes(q) || e.poste.toLowerCase().includes(q)
      );
    }
    if (filterClient !== 'all') {
      result = result.filter((e) => e.clientId === filterClient);
    }
    if (filterContract !== 'all') {
      result = result.filter((e) => e.typeContrat === filterContract);
    }
    if (filterStatus !== 'all') {
      result = result.filter((e) => e.status === filterStatus);
    }
    return result;
  }, [employees, searchQuery, filterClient, filterContract, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const total = employees.length;
    const actifs = employees.filter((e) => e.status === 'actif').length;
    const suspendus = employees.filter((e) => e.status === 'suspendu').length;
    const cdiCount = employees.filter((e) => e.typeContrat === 'CDI').length;
    return { total, actifs, suspendus, cdiCount };
  }, [employees]);

  // Form handlers
  const handleFormChange = (field: keyof EmployeeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEmployee = async () => {
    if (!form.nom.trim() || !form.prenom.trim() || !form.poste.trim() || !form.dateDebut || !form.clientId) {
      toast.error('Veuillez remplir les champs obligatoires (nom, prenom, poste, date debut, client)');
      return;
    }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const client = clients.find((c) => c.id === form.clientId);
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        clientId: form.clientId,
        clientName: client?.name || 'Inconnu',
        civilite: form.civilite,
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        dateNaissance: form.dateNaissance,
        lieuNaissance: form.lieuNaissance,
        nationalite: form.nationalite,
        nss: form.nss,
        adresse: form.adresse,
        poste: form.poste.trim(),
        typeContrat: form.typeContrat,
        salaireBrut: parseFloat(form.salaireBrut) || 0,
        tauxHoraire: parseFloat(form.tauxHoraire) || 0,
        heuresSemaine: parseInt(form.heuresSemaine) || 35,
        dateDebut: form.dateDebut,
        dateFin: form.dateFin || null,
        status: 'actif',
        createdAt: new Date().toISOString(),
      };
      setEmployees((prev) => [newEmployee, ...prev]);
      toast.success('Salarie ajoute avec succes');
      setShowAddModal(false);
      setForm({ ...EMPTY_FORM });
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Supprimer ce salarie ?')) return;
    try {
      await new Promise((r) => setTimeout(r, 300));
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success('Salarie supprime');
      if (selectedEmployee?.id === id) {
        setShowDetailModal(false);
        setSelectedEmployee(null);
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openDetail = (employee: Employee) => {
    setSelectedEmployee(employee);
    setActiveTab('info');
    setShowDetailModal(true);
  };

  // ─── Paywall ──────────────────────────────────────────────────────────────
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-violet-500/20">
            <Users size={40} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Gestion des Salaries</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Gerez les fiches salariess de vos clients, contrats de travail et documents sociaux.
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
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Salaries</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{employees.length} salaries · {clients.length} clients</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Importer</span>
          </button>
          <button
            onClick={() => { setForm({ ...EMPTY_FORM }); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Ajouter</span>
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

      {/* ─── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total salaries', value: String(kpis.total), icon: Users, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Actifs', value: String(kpis.actifs), icon: CheckCircle2, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
          { label: 'Suspendus', value: String(kpis.suspendus), icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
          { label: 'CDI', value: String(kpis.cdiCount), icon: Briefcase, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400' },
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
            placeholder="Rechercher par nom, prenom, NSS, poste..."
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Client filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Client</label>
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {/* Contract type filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type de contrat</label>
                  <select
                    value={filterContract}
                    onChange={(e) => setFilterContract(e.target.value as ContractType | 'all')}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les types</option>
                    {CONTRACT_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>
                {/* Status filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Statut</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as EmployeeStatus | 'all')}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="termine">Termine</option>
                  </select>
                </div>
              </div>
              {/* Reset */}
              {(filterClient !== 'all' || filterContract !== 'all' || filterStatus !== 'all') && (
                <button
                  onClick={() => { setFilterClient('all'); setFilterContract('all'); setFilterStatus('all'); }}
                  className="mt-3 flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  <X size={12} />
                  Reinitialiser les filtres
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Employee Table ────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <Users size={16} className="text-emerald-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
            Liste des salaries ({filteredEmployees.length})
          </h3>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucun salarie trouve</p>
            <p className="text-sm text-gray-400 mb-5">Modifiez vos filtres ou ajoutez un salarie.</p>
            <button
              onClick={() => { setForm({ ...EMPTY_FORM }); setShowAddModal(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm"
            >
              <Plus size={15} />
              Ajouter un salarie
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden lg:grid grid-cols-[2.5fr_1fr_1fr_1fr_1.2fr_1fr_1fr_0.8fr] gap-2 px-5 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Nom / Prenom</span>
              <span className="text-center">NSS</span>
              <span className="text-center">Poste</span>
              <span className="text-center">Contrat</span>
              <span className="text-right">Salaire brut</span>
              <span className="text-center">Statut</span>
              <span>Client</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              <AnimatePresence>
                {filteredEmployees.map((emp, i) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {/* Desktop row */}
                    <div
                      className="hidden lg:grid grid-cols-[2.5fr_1fr_1fr_1fr_1.2fr_1fr_1fr_0.8fr] gap-2 px-5 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer text-sm"
                      onClick={() => openDetail(emp)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                          emp.status === 'actif' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : emp.status === 'suspendu' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        )}>
                          {emp.prenom.charAt(0)}{emp.nom.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{emp.civilite} {emp.prenom} {emp.nom}</p>
                        </div>
                      </div>
                      <span className="text-center text-xs text-gray-400 font-mono truncate">{emp.nss}</span>
                      <span className="text-center text-gray-600 dark:text-gray-400 truncate">{emp.poste}</span>
                      <div className="flex justify-center"><ContractBadge type={emp.typeContrat} /></div>
                      <span className="text-right font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(emp.salaireBrut)}</span>
                      <div className="flex justify-center"><StatusBadge status={emp.status} /></div>
                      <span className="text-xs text-gray-400 truncate">{emp.clientName}</span>
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile row */}
                    <div
                      className="lg:hidden px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openDetail(emp)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                            emp.status === 'actif' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : emp.status === 'suspendu' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          )}>
                            {emp.prenom.charAt(0)}{emp.nom.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{emp.civilite} {emp.prenom} {emp.nom}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.poste} · {emp.clientName}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <ContractBadge type={emp.typeContrat} />
                        <StatusBadge status={emp.status} />
                        <span className="text-xs font-semibold text-gray-500 ml-auto">{formatCurrency(emp.salaireBrut)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ─── Add Employee Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col max-w-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <UserPlus size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ajouter un salarie</h2>
                    <p className="text-xs text-gray-400">Remplissez les informations du salarie</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              {/* Form content */}
              <div className="overflow-y-auto flex-1 p-5 space-y-5">
                {/* Client selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.clientId}
                    onChange={(e) => handleFormChange('clientId', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Selectionner un client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Civilite + Nom + Prenom */}
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Civilite</label>
                    <select
                      value={form.civilite}
                      onChange={(e) => handleFormChange('civilite', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {CIVILITIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2.5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nom <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={(e) => handleFormChange('nom', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Dupont"
                    />
                  </div>
                  <div className="col-span-2.5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Prenom <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.prenom}
                      onChange={(e) => handleFormChange('prenom', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Jean"
                    />
                  </div>
                </div>

                {/* Birth info */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date naissance</label>
                    <input
                      type="date"
                      value={form.dateNaissance}
                      onChange={(e) => handleFormChange('dateNaissance', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Lieu naissance</label>
                    <input
                      type="text"
                      value={form.lieuNaissance}
                      onChange={(e) => handleFormChange('lieuNaissance', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Paris"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nationalite</label>
                    <select
                      value={form.nationalite}
                      onChange={(e) => handleFormChange('nationalite', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {NATIONALITIES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* NSS + Adresse */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">NSS</label>
                    <input
                      type="text"
                      value={form.nss}
                      onChange={(e) => handleFormChange('nss', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="1 84 05 75 103 042 67"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Adresse</label>
                    <input
                      type="text"
                      value={form.adresse}
                      onChange={(e) => handleFormChange('adresse', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="12 Rue de la Republique, 75001 Paris"
                    />
                  </div>
                </div>

                {/* Poste + Contrat */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Poste <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.poste}
                      onChange={(e) => handleFormChange('poste', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Developpeur"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Type contrat</label>
                    <select
                      value={form.typeContrat}
                      onChange={(e) => handleFormChange('typeContrat', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {CONTRACT_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Salary info */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Salaire brut mensuel</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.salaireBrut}
                        onChange={(e) => handleFormChange('salaireBrut', e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="2500"
                      />
                      <Euro size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Taux horaire</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.tauxHoraire}
                        onChange={(e) => handleFormChange('tauxHoraire', e.target.value)}
                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="16.50"
                      />
                      <Euro size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Heures / semaine</label>
                    <input
                      type="number"
                      value={form.heuresSemaine}
                      onChange={(e) => handleFormChange('heuresSemaine', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="35"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date debut <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={form.dateDebut}
                      onChange={(e) => handleFormChange('dateDebut', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date fin (si CDD)</label>
                    <input
                      type="date"
                      value={form.dateFin}
                      onChange={(e) => handleFormChange('dateFin', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEmployee}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg disabled:opacity-60 transition-all flex items-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Employee Detail Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showDetailModal && selectedEmployee && (
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
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black',
                    selectedEmployee.status === 'actif' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : selectedEmployee.status === 'suspendu' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  )}>
                    {selectedEmployee.prenom.charAt(0)}{selectedEmployee.nom.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {selectedEmployee.civilite} {selectedEmployee.prenom} {selectedEmployee.nom}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{selectedEmployee.poste}</span>
                      <span className="text-gray-300 dark:text-gray-600">.</span>
                      <ContractBadge type={selectedEmployee.typeContrat} />
                      <StatusBadge status={selectedEmployee.status} />
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50 flex-shrink-0">
                {([
                  { key: 'info' as TabKey, label: 'Informations', icon: Info },
                  { key: 'documents' as TabKey, label: 'Documents', icon: FileText },
                  { key: 'historique' as TabKey, label: 'Historique', icon: Clock },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
                      activeTab === tab.key
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900/50'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="overflow-y-auto flex-1 p-5">
                <AnimatePresence mode="wait">
                  {/* INFO TAB */}
                  {activeTab === 'info' && (
                    <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                      {/* Client */}
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                        <Building2 size={16} className="text-emerald-500" />
                        <div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Client</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedEmployee.clientName}</p>
                        </div>
                      </div>

                      {/* Personal info */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Etat civil</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Date de naissance', value: selectedEmployee.dateNaissance ? formatDate(selectedEmployee.dateNaissance) : '-', icon: Calendar },
                            { label: 'Lieu de naissance', value: selectedEmployee.lieuNaissance || '-', icon: MapPin },
                            { label: 'Nationalite', value: selectedEmployee.nationalite || '-', icon: BadgeCheck },
                            { label: 'NSS', value: selectedEmployee.nss || '-', icon: Hash },
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

                      {/* Address */}
                      {selectedEmployee.adresse && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Adresse</p>
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedEmployee.adresse}</p>
                          </div>
                        </div>
                      )}

                      {/* Contract info */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contrat</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Poste', value: selectedEmployee.poste, icon: Briefcase },
                            { label: 'Type de contrat', value: selectedEmployee.typeContrat, icon: FileText },
                            { label: 'Salaire brut mensuel', value: formatCurrency(selectedEmployee.salaireBrut), icon: Euro },
                            { label: 'Taux horaire', value: `${selectedEmployee.tauxHoraire} EUR/h`, icon: Euro },
                            { label: 'Heures / semaine', value: `${selectedEmployee.heuresSemaine}h`, icon: Clock },
                            { label: 'Date de debut', value: formatDate(selectedEmployee.dateDebut), icon: Calendar },
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
                        {selectedEmployee.dateFin && (
                          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 mt-3">
                            <Calendar size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Date de fin</p>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{formatDate(selectedEmployee.dateFin)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* DOCUMENTS TAB */}
                  {activeTab === 'documents' && (
                    <motion.div key="documents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {/* Mock document list */}
                      {[
                        { name: 'Contrat de travail', type: 'PDF', date: selectedEmployee.dateDebut, status: 'signe' },
                        { name: 'Bulletin de salaire - Avril 2026', type: 'PDF', date: '2026-04-30', status: 'emis' },
                        { name: 'Bulletin de salaire - Mars 2026', type: 'PDF', date: '2026-03-31', status: 'emis' },
                        { name: 'Avenant temps partiel', type: 'PDF', date: '2026-02-15', status: 'brouillon' },
                      ].map((doc, i) => (
                        <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer">
                          <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400">{doc.type} · {formatDate(doc.date)}</p>
                          </div>
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                            doc.status === 'signe' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : doc.status === 'emis' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          )}>
                            {doc.status === 'signe' ? 'Signe' : doc.status === 'emis' ? 'Emis' : 'Brouillon'}
                          </span>
                        </div>
                      ))}

                      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 hover:text-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                        <Plus size={14} />
                        Ajouter un document
                      </button>
                    </motion.div>
                  )}

                  {/* HISTORIQUE TAB */}
                  {activeTab === 'historique' && (
                    <motion.div key="historique" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {[
                        { event: 'BS avril 2026 emis', date: '2026-04-30', icon: FileText, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
                        { event: 'BS mars 2026 emis', date: '2026-03-31', icon: FileText, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
                        { event: 'Contrat signe', date: selectedEmployee.dateDebut, icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30' },
                        { event: 'DSN mensuelle envoyee', date: '2026-04-15', icon: Shield, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
                        { event: 'Entretien annuel', date: '2026-01-20', icon: Users, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', item.color)}>
                            <item.icon size={14} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.event}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.date)}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                <button
                  onClick={() => handleDeleteEmployee(selectedEmployee.id)}
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

      {/* ─── Import Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[70vh] flex flex-col max-w-md"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Importer des salaries</h2>
                <button onClick={() => setShowImportModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Client source</label>
                  <select className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option value="">Selectionner un client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                  <Upload size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Glissez un fichier CSV ici</p>
                  <p className="text-xs text-gray-400">ou cliquez pour selectionner</p>
                </div>
                <p className="text-xs text-gray-400">
                  Format attendu : CSV avec colonnes Nom, Prenom, NSS, Poste, Type contrat, Salaire brut, Date debut.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-slate-800">
                <button onClick={() => setShowImportModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold">
                  Annuler
                </button>
                <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20">
                  Importer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

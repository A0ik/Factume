'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, X,
  FileText, Briefcase, Calendar, Euro, Clock, Shield,
  Users, Info, AlertCircle, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContractType = 'CDI' | 'CDD' | 'CDD_usage' | 'CDD_reconversion' | 'Interim' | 'Stage' | 'Apprentissage' | 'Professionnalisation';

interface EmployeeOption {
  id: string;
  name: string;
  poste: string;
  typeContrat: string;
}

interface ContractForm {
  employee_id: string;
  type_contrat: ContractType;
  date_debut: string;
  date_fin: string;
  poste: string;
  lieu_travail: string;
  classification: string;
  coef: string;
  convention_collective: string;
  periode_essai_jours: string;
  motif_cdd: string;
  salaire_brut_mensuel: string;
  taux_horaire: string;
  heures_hebdo: string;
  clause_non_concurrence: boolean;
  clause_confidentialite: boolean;
  clause_mobility: boolean;
  clause_non_solicitation: boolean;
  teletravail: boolean;
  notes: string;
}

const EMPTY_FORM: ContractForm = {
  employee_id: '',
  type_contrat: 'CDI',
  date_debut: '',
  date_fin: '',
  poste: '',
  lieu_travail: '',
  classification: '',
  coef: '',
  convention_collective: '',
  periode_essai_jours: '',
  motif_cdd: '',
  salaire_brut_mensuel: '',
  taux_horaire: '',
  heures_hebdo: '35',
  clause_non_concurrence: false,
  clause_confidentialite: false,
  clause_mobility: false,
  clause_non_solicitation: false,
  teletravail: false,
  notes: '',
};

const CONTRACT_TYPES: { value: ContractType; label: string; description: string }[] = [
  { value: 'CDI', label: 'CDI', description: 'Contrat à durée indéterminée' },
  { value: 'CDD', label: 'CDD', description: 'Contrat à durée déterminée' },
  { value: 'CDD_usage', label: "CDD d'usage", description: "CDD d'usage sectoriel" },
  { value: 'CDD_reconversion', label: 'CDD reconversion', description: 'CDD pour reconversion professionnelle' },
  { value: 'Interim', label: 'Intérim', description: 'Contrat de travail temporaire' },
  { value: 'Stage', label: 'Stage', description: 'Convention de stage' },
  { value: 'Apprentissage', label: 'Apprentissage', description: 'Contrat d\'apprentissage' },
  { value: 'Professionnalisation', label: 'Professionnalisation', description: 'Contrat de professionnalisation' },
];

const MOTIFS_CDD = [
  'Accroissement temporaire d\'activité',
  'Usage (secteur)',
  'Remplacement d\'un salarié absent',
  'Remplacement d\'un salarié dont le contrat est suspendu',
  'Attente de l\'entrée en service effective d\'un salarié recruté en CDI',
  'Mission de reconversion',
  'Contrat vendange',
];

const STEPS = [
  { key: 1, label: 'Salarié & Type', icon: Users },
  { key: 2, label: 'Contrat', icon: FileText },
  { key: 3, label: 'Rémunération', icon: Euro },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewContractPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const router = useRouter();
  const { cabinet } = useCabinetStore();

  const [form, setForm] = useState<ContractForm>({ ...EMPTY_FORM });
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Load employees
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/cabinet/employees', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const { employees: apiEmps } = await res.json();
        setEmployees(
          (apiEmps || []).map((e: any) => ({
            id: e.id,
            name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
            poste: e.job_title || '',
            typeContrat: e.contract_type || 'CDI',
          }))
        );
      }
    } catch (error: any) {
      toast.error('Erreur lors du chargement des salariés');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) loadEmployees();
  }, [profile, loadEmployees]);

  const handleFormChange = (field: keyof ContractForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isCDD = ['CDD', 'CDD_usage', 'CDD_reconversion'].includes(form.type_contrat);

  const canProceedStep1 = form.employee_id && form.type_contrat;
  const canProceedStep2 = form.date_debut && form.poste && (!isCDD || form.date_fin);
  const canSubmit = form.salaire_brut_mensuel && parseFloat(form.salaire_brut_mensuel) > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const body: Record<string, any> = {
        employee_id: form.employee_id,
        type_contrat: form.type_contrat,
        date_debut: form.date_debut,
        poste: form.poste,
        status: 'en_attente_signature',
      };

      if (form.date_fin) body.date_fin = form.date_fin;
      if (form.lieu_travail) body.lieu_travail = form.lieu_travail;
      if (form.classification) body.classification = form.classification;
      if (form.coef) body.coef = parseFloat(form.coef);
      if (form.convention_collective) body.convention_collective = form.convention_collective;
      if (form.periode_essai_jours) body.periode_essai_jours = parseInt(form.periode_essai_jours);
      if (form.motif_cdd) body.motif_cdd = form.motif_cdd;
      if (form.salaire_brut_mensuel) body.salaire_brut_mensuel = parseFloat(form.salaire_brut_mensuel);
      if (form.taux_horaire) body.taux_horaire = parseFloat(form.taux_horaire);
      if (form.heures_hebdo) body.heures_hebdo = parseInt(form.heures_hebdo);
      body.clause_non_concurrence = form.clause_non_concurrence;
      body.clause_confidentialite = form.clause_confidentialite;
      body.clause_mobility = form.clause_mobility;
      body.clause_non_solicitation = form.clause_non_solicitation;
      body.teletravail = form.teletravail;
      if (form.notes) body.notes = form.notes;

      const res = await fetch('/api/cabinet/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || 'Erreur lors de la création');
      }

      toast.success('Contrat créé avec succès');
      router.push('/cabinet/contrats');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  // ─── Paywall ──────────────────────────────────────────────────────────────
  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Abonnement Business requis</p>
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href="/cabinet/contrats" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Nouveau contrat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Créez un contrat de travail en 3 étapes</p>
        </div>
      </div>

      {/* ─── Stepper ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => (
          <div key={step.key} className="flex items-center flex-1">
            <button
              onClick={() => {
                if (step.key === 1 || (step.key === 2 && canProceedStep1) || (step.key === 3 && canProceedStep1 && canProceedStep2)) {
                  setCurrentStep(step.key);
                }
              }}
              className={cn(
                'flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                currentStep === step.key
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-300 dark:border-emerald-700'
                  : currentStep > step.key
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-gray-50 dark:bg-white/5 text-gray-400 border border-gray-200 dark:border-gray-700'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                currentStep >= step.key
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              )}>
                {currentStep > step.key ? <Check size={14} /> : step.key}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={cn('w-6 h-0.5 mx-1', currentStep > step.key ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700')} />
            )}
          </div>
        ))}
      </div>

      {/* ─── Form Content ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Employee & Type */}
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Salarié et type de contrat</h3>
                <p className="text-sm text-gray-400">Sélectionnez le salarié et le type de contrat</p>
              </div>

              {/* Employee selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Salarié <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.employee_id}
                  onChange={(e) => handleFormChange('employee_id', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Sélectionner un salarié</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.poste}</option>
                  ))}
                </select>
                {employees.length === 0 && (
                  <p className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Aucun salarié trouvé. Ajoutez d'abord un salarié.
                  </p>
                )}
              </div>

              {/* Contract type grid */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Type de contrat <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CONTRACT_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => handleFormChange('type_contrat', ct.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        form.type_contrat === ct.value
                          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <p className={cn(
                        'text-sm font-bold',
                        form.type_contrat === ct.value ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'
                      )}>
                        {ct.label}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{ct.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contract Details */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Détails du contrat</h3>
                <p className="text-sm text-gray-400">Renseignez les informations du contrat</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_debut}
                    onChange={(e) => handleFormChange('date_debut', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Date de fin {isCDD && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={form.date_fin}
                    onChange={(e) => handleFormChange('date_fin', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Poste / Emploi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.poste}
                    onChange={(e) => handleFormChange('poste', e.target.value)}
                    placeholder="Développeur front-end"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Lieu de travail</label>
                  <input
                    type="text"
                    value={form.lieu_travail}
                    onChange={(e) => handleFormChange('lieu_travail', e.target.value)}
                    placeholder="Paris"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Classification</label>
                  <input
                    type="text"
                    value={form.classification}
                    onChange={(e) => handleFormChange('classification', e.target.value)}
                    placeholder="Cadre"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Coefficient</label>
                  <input
                    type="number"
                    value={form.coef}
                    onChange={(e) => handleFormChange('coef', e.target.value)}
                    placeholder="100"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Période d'essai (jours)</label>
                  <input
                    type="number"
                    value={form.periode_essai_jours}
                    onChange={(e) => handleFormChange('periode_essai_jours', e.target.value)}
                    placeholder="90"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Convention collective</label>
                <input
                  type="text"
                  value={form.convention_collective}
                  onChange={(e) => handleFormChange('convention_collective', e.target.value)}
                  placeholder="Syntec"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Motif CDD */}
              {isCDD && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Motif du CDD</label>
                  <select
                    value={form.motif_cdd}
                    onChange={(e) => handleFormChange('motif_cdd', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Sélectionner un motif</option>
                    {MOTIFS_CDD.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 3: Remuneration & Clauses */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Rémunération et clauses</h3>
                <p className="text-sm text-gray-400">Définissez la rémunération et les clauses optionnelles</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Salaire brut mensuel <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.salaire_brut_mensuel}
                      onChange={(e) => handleFormChange('salaire_brut_mensuel', e.target.value)}
                      placeholder="2500"
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <Euro size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Taux horaire</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={form.taux_horaire}
                      onChange={(e) => handleFormChange('taux_horaire', e.target.value)}
                      placeholder="16.50"
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <Euro size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Heures / semaine</label>
                  <input
                    type="number"
                    value={form.heures_hebdo}
                    onChange={(e) => handleFormChange('heures_hebdo', e.target.value)}
                    placeholder="35"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Clauses */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Clauses optionnelles</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'clause_non_concurrence' as const, label: 'Clause de non-concurrence' },
                    { key: 'clause_confidentialite' as const, label: 'Clause de confidentialité' },
                    { key: 'clause_mobility' as const, label: 'Clause de mobilité' },
                    { key: 'clause_non_solicitation' as const, label: 'Clause de non-solicitation' },
                    { key: 'teletravail' as const, label: 'Accord télétravail' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleFormChange(key, !form[key])}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                        form[key]
                          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center',
                        form[key] ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                      )}>
                        {form[key] && <Check size={12} />}
                      </div>
                      <span className={cn('text-sm font-medium', form[key] ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400')}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Notes complémentaires..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : router.push('/cabinet/contrats')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={14} />
          {currentStep > 1 ? 'Précédent' : 'Annuler'}
        </button>

        {currentStep < 3 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={
              (currentStep === 1 && !canProceedStep1) ||
              (currentStep === 2 && !canProceedStep2)
            }
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Suivant
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {saving ? 'Création...' : 'Créer le contrat'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, X,
  FileText, Building2, Users, Calendar, Euro,
  AlertCircle, CheckCircle2, Info, Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { validateNIR, calculateMinHireDate } from '@/lib/labor-law/dpae';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  social_security_number: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  gender: string | null;
  address: string | null;
  salary_brut_monthly: number;
  hourly_rate: number | null;
  weekly_hours: number;
  contract_type: string;
}

interface DPAEForm {
  // Employeur
  siret: string;
  raison_sociale: string;
  adresse_employeur: string;
  code_ape: string;
  urssaf: string;
  // Salarié
  employee_id: string;
  nir: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  nationalite: string;
  sexe: string;
  adresse_salarie: string;
  // Contrat
  type_contrat: string;
  date_embauche: string;
  poste: string;
  lieu_travail: string;
  salaire_brut: string;
  taux_horaire: string;
  heures_hebdo: string;
  periode_essai: string;
  convention_collective: string;
}

const CONTRACT_TYPES = [
  'CDI', 'CDD', 'CDD_usage', 'CDD_reconversion', 'Interim',
  'Stage', 'Apprentissage', 'Professionnalisation',
];

const STEPS = [
  { key: 1, label: 'Employeur', icon: Building2 },
  { key: 2, label: 'Salarié', icon: Users },
  { key: 3, label: 'Contrat', icon: FileText },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewDPAEPage() {
  const sub = useSubscription();
  const router = useRouter();
  const { cabinet } = useCabinetStore();

  // Fetch employees via the new data hook
  const { data: rawEmployees, loading: employeesLoading } = useCabinetData<EmployeeOption[]>('/api/cabinet/employees');
  const employees = rawEmployees || [];

  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [form, setForm] = useState<DPAEForm>({
    siret: '',
    raison_sociale: '',
    adresse_employeur: '',
    code_ape: '',
    urssaf: '',
    employee_id: '',
    nir: '',
    nom: '',
    prenom: '',
    date_naissance: '',
    lieu_naissance: '',
    nationalite: 'Française',
    sexe: 'M',
    adresse_salarie: '',
    type_contrat: 'CDI',
    date_embauche: '',
    poste: '',
    lieu_travail: '',
    salaire_brut: '',
    taux_horaire: '',
    heures_hebdo: '35',
    periode_essai: '',
    convention_collective: '',
  });

  const [nirValidation, setNirValidation] = useState<{ valid: boolean; error?: string } | null>(null);

  // Pre-fill employer info from cabinet
  useEffect(() => {
    if (cabinet) {
      setForm((prev) => ({
        ...prev,
        siret: cabinet.siret || '',
        raison_sociale: cabinet.name || '',
        adresse_employeur: cabinet.address || '',
        code_ape: '',
        urssaf: cabinet.siret || '',
      }));
    }
  }, [cabinet]);

  const handleFormChange = (field: keyof DPAEForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Real-time NIR validation
    if (field === 'nir') {
      const cleaned = value.replace(/\s/g, '');
      if (cleaned.length === 15) {
        setNirValidation(validateNIR(cleaned));
      } else if (cleaned.length > 0) {
        setNirValidation({ valid: false, error: `${cleaned.length}/15 caractères` });
      } else {
        setNirValidation(null);
      }
    }
  };

  // Auto-fill from selected employee
  const handleEmployeeSelect = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      setForm((prev) => ({
        ...prev,
        employee_id: emp.id,
        nir: emp.social_security_number || '',
        nom: emp.last_name,
        prenom: emp.first_name,
        date_naissance: emp.birth_date || '',
        lieu_naissance: emp.birth_place || '',
        nationalite: emp.nationality || 'Française',
        sexe: emp.gender === 'F' ? 'F' : 'M',
        adresse_salarie: emp.address || '',
        poste: emp.job_title || '',
        salaire_brut: emp.salary_brut_monthly ? String(emp.salary_brut_monthly) : '',
        taux_horaire: emp.hourly_rate ? String(emp.hourly_rate) : '',
        heures_hebdo: emp.weekly_hours ? String(emp.weekly_hours) : '35',
        type_contrat: emp.contract_type || 'CDI',
      }));

      // Validate NIR
      if (emp.social_security_number) {
        setNirValidation(validateNIR(emp.social_security_number));
      }
    }
  };

  const minDate = calculateMinHireDate();
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!form.siret || !form.nir || !form.nom || !form.prenom || !form.date_embauche || !form.type_contrat || !form.poste) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validate NIR
    const nirCheck = validateNIR(form.nir);
    if (!nirCheck.valid) {
      toast.error(nirCheck.error || 'NIR invalide');
      return;
    }

    setSaving(true);
    try {
      const body = {
        employee_id: form.employee_id || undefined,
        siret: form.siret,
        raison_sociale: form.raison_sociale,
        adresse_employeur: form.adresse_employeur,
        code_ape: form.code_ape,
        urssaf: form.urssaf,
        nir: form.nir,
        nom: form.nom,
        prenom: form.prenom,
        date_naissance: form.date_naissance,
        lieu_naissance: form.lieu_naissance,
        nationalite: form.nationalite,
        sexe: form.sexe,
        adresse_salarie: form.adresse_salarie,
        type_contrat: form.type_contrat,
        date_embauche: form.date_embauche,
        poste: form.poste,
        lieu_travail: form.lieu_travail,
        salaire_brut: parseFloat(form.salaire_brut) || 0,
        taux_horaire: parseFloat(form.taux_horaire) || 0,
        heures_hebdo: parseInt(form.heures_hebdo) || 35,
        periode_essai: parseInt(form.periode_essai) || undefined,
        convention_collective: form.convention_collective,
        status: 'en_preparation',
      };

      await cabinetMutation('/api/cabinet/dpae', 'POST', body);

      clearCabinetCache('/api/cabinet/dpae');
      toast.success('DPAE créée avec succès');
      router.push('/cabinet/dpae');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Abonnement Business requis</p>
      </div>
    );
  }

  if (employeesLoading) {
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
        <Link href="/cabinet/dpae" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Nouvelle DPAE</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Déclaration Préalable à l'Embauche</p>
        </div>
      </div>

      {/* ─── Legal info ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 p-4 flex items-start gap-3">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            La DPAE doit être envoyée au plus tard le <strong>jour ouvrable précédant l'embauche</strong>.
            Date minimale d'embauche : <strong>{minDate.toLocaleDateString('fr-FR')}</strong> (aujourd'hui + 2 jours ouvrés).
          </p>
        </div>
      </div>

      {/* ─── Stepper ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => (
          <div key={step.key} className="flex items-center flex-1">
            <button
              onClick={() => { if (step.key <= currentStep) setCurrentStep(step.key); }}
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
                currentStep >= step.key ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
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

      {/* ─── Form ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Employeur */}
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Informations employeur</h3>
                <p className="text-sm text-gray-400">Pré-remplies depuis votre cabinet</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Raison sociale <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.raison_sociale}
                    onChange={(e) => handleFormChange('raison_sociale', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    SIRET <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.siret}
                    onChange={(e) => handleFormChange('siret', e.target.value)}
                    placeholder="14 chiffres"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Code APE</label>
                  <input
                    type="text"
                    value={form.code_ape}
                    onChange={(e) => handleFormChange('code_ape', e.target.value)}
                    placeholder="6202A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Adresse employeur</label>
                  <input
                    type="text"
                    value={form.adresse_employeur}
                    onChange={(e) => handleFormChange('adresse_employeur', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Salarié */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Informations salarié</h3>
                <p className="text-sm text-gray-400">Sélectionnez un salarié existant ou saisissez manuellement</p>
              </div>

              {/* Existing employee selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Salarié existant</label>
                <select
                  value={form.employee_id}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Sélectionner un salarié (ou remplir manuellement)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} — {emp.job_title}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Identité du salarié</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nom <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={(e) => handleFormChange('nom', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Prénom <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.prenom}
                      onChange={(e) => handleFormChange('prenom', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* NIR with real-time validation */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  NIR (n° sécurité sociale) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.nir}
                    onChange={(e) => handleFormChange('nir', e.target.value)}
                    placeholder="1 84 05 75 103 042 67"
                    maxLength={19}
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none focus:ring-2 bg-white dark:bg-slate-800 pr-10',
                      nirValidation === null
                        ? 'border-gray-200 dark:border-gray-700 focus:ring-emerald-500/20'
                        : nirValidation.valid
                          ? 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500/20'
                          : 'border-red-300 dark:border-red-700 focus:ring-red-500/20'
                    )}
                  />
                  {nirValidation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {nirValidation.valid
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <AlertCircle size={16} className="text-red-500" />
                      }
                    </div>
                  )}
                </div>
                {nirValidation && !nirValidation.valid && (
                  <p className="mt-1 text-xs text-red-500">{nirValidation.error}</p>
                )}
                {nirValidation && nirValidation.valid && (
                  <p className="mt-1 text-xs text-emerald-500">NIR valide</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date de naissance</label>
                  <input
                    type="date"
                    value={form.date_naissance}
                    onChange={(e) => handleFormChange('date_naissance', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Lieu de naissance</label>
                  <input
                    type="text"
                    value={form.lieu_naissance}
                    onChange={(e) => handleFormChange('lieu_naissance', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Sexe</label>
                  <select
                    value={form.sexe}
                    onChange={(e) => handleFormChange('sexe', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Contrat */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Contrat de travail</h3>
                <p className="text-sm text-gray-400">Informations sur le contrat et la rémunération</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Date d'embauche <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date_embauche}
                    min={minDateStr}
                    onChange={(e) => handleFormChange('date_embauche', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-400">Minimum : {minDate.toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Type de contrat <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.type_contrat}
                    onChange={(e) => handleFormChange('type_contrat', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
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
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Salaire brut mensuel <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.salaire_brut}
                      onChange={(e) => handleFormChange('salaire_brut', e.target.value)}
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Période d'essai (jours)</label>
                  <input
                    type="number"
                    value={form.periode_essai}
                    onChange={(e) => handleFormChange('periode_essai', e.target.value)}
                    placeholder="90"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : router.push('/cabinet/dpae')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={14} />
          {currentStep > 1 ? 'Précédent' : 'Annuler'}
        </button>

        {currentStep < 3 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
          >
            Suivant
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {saving ? 'Création...' : 'Créer la DPAE'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

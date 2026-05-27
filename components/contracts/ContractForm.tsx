'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Mic, Send, Download, Eye, Loader2, Check, AlertCircle,
  User, Building2, FileCheck, X, Euro, Calendar, Shield, Sparkles, History,
  Calculator, Crown, HelpCircle, Edit3, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useContractStore } from '@/stores/contractStore';
import { useRouter } from 'next/navigation';
import { MagicSelect } from '@/components/ui/MagicSelect';
import { MagnificentDatePicker } from '@/components/ui/MagnificentDatePicker';
import { ContractValidator } from '@/components/labor-law/ContractValidator';
import { ContractSigning } from '@/components/labor-law/SignaturePad';
import { PayslipEditor } from '@/components/labor-law/PayslipEditor';
import { ContractEmailModal } from '@/components/labor-law/ContractEmailModal';
import { ExportFormatModal } from '@/components/labor-law/ExportFormatModal';
import { ContractVersionHistory } from '@/components/labor-law/ContractVersionHistory';
import { AISuggestionsModal } from '@/components/labor-law/AISuggestionsModal';
import { creerBulletinDepuisContrat } from '@/lib/labor-law/bulletin-paie';
import { generateContract as generateTemplate } from '@/lib/labor-law/contract-templates';
import { EmployeeInfoStep } from './EmployeeInfoStep';
import { CompanyInfoStep } from './CompanyInfoStep';
import { CDIFields } from './CDIFields';
import { CDDFields } from './CDDFields';
import { OtherFields } from './OtherFields';
import { BenefitsStep } from './BenefitsStep';
import { ContractFormData, ContractType } from '@/types';

const WORK_SCHEDULE_OPTIONS = [
  { value: '35h hebdomadaires', label: '35h hebdomadaires', description: 'Durée légale du travail' },
  { value: '39h hebdomadaires', label: '39h hebdomadaires', description: 'Avec heures supplémentaires' },
  { value: 'Temps partiel', label: 'Temps partiel', description: 'Moins de 24h par semaine' },
  { value: 'Horaires variables', label: 'Horaires variables', description: 'Horaires aménagés' },
  { value: 'Horaires de nuit', label: 'Horaires de nuit', description: 'Travail de nuit (21h-6h)' },
];

const SALARY_FREQ_OPTIONS = [
  { value: 'monthly', label: 'Mensuel', description: 'Salaire mensuel' },
  { value: 'hourly', label: 'Horaire', description: 'Tarif horaire' },
  { value: 'weekly', label: 'Hebdomadaire', description: 'Salaire hebdomadaire' },
  { value: 'flat_rate', label: 'Forfait', description: 'Rémunération forfaitaire' },
];

const inputClass = 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm';

const TYPE_LABELS: Record<ContractType, string> = {
  cdi: 'CDI (Contrat à Durée Indéterminée)',
  cdd: 'CDD (Contrat à Durée Déterminée)',
  other: 'Autre contrat',
};

interface Props {
  contractType: ContractType;
  mode: 'create' | 'edit';
  initialData?: Partial<ContractFormData>;
  contractId?: string;
  onSaved?: (id: string, number: string) => void;
}

export function ContractForm({ contractType, mode, initialData, contractId, onSaved }: Props) {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { canUseContracts } = useSubscription();
  const { createContract, updateContract } = useContractStore();

  // Vérifier les droits d'accès aux contrats
  useEffect(() => {
    if (!canUseContracts) {
      router.push('/paywall');
    }
  }, [canUseContracts, router]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'edit' | 'preview' | 'success'>(mode === 'edit' ? 'edit' : 'upload');
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contractHtml, setContractHtml] = useState('');
  const [textInput, setTextInput] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [livePreviewHtml, setLivePreviewHtml] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showPayslipEditor, setShowPayslipEditor] = useState(false);
  const [payslipData, setPayslipData] = useState<any>(null);
  const [savedContractId, setSavedContractId] = useState<string | null>(contractId || null);
  const [customClauses, setCustomClauses] = useState<Array<{ title: string; content: string }>>([]);
  const [pendingVoiceResult, setPendingVoiceResult] = useState<{ parsed: any; uncertain_fields: Array<{ field: string; current_value: any; reason: string; suggestion?: any }> } | null>(null);
  const [voiceCorrections, setVoiceCorrections] = useState<Record<string, string>>({});
  const pendingIdRef = useRef<string | null>(null);

  const [formData, setFormData] = useState<ContractFormData>({
    contract_type: contractType,
    contract_category: contractType === 'other' ? 'stage' : undefined,
    employee_first_name: '',
    employee_last_name: '',
    employee_address: '',
    employee_postal_code: '',
    employee_city: '',
    employee_email: '',
    employee_phone: '',
    employee_birth_date: '',
    employee_social_security: '',
    employee_nationality: 'Française',
    employee_qualification: '',
    company_name: '',
    company_address: '',
    company_postal_code: '',
    company_city: '',
    company_siret: '',
    employer_name: '',
    employer_title: '',
    job_title: '',
    work_location: '',
    work_schedule: '35h hebdomadaires',
    salary_amount: '',
    salary_frequency: 'monthly',
    has_transport: false,
    has_meal: false,
    has_health: false,
    has_other: false,
    other_benefits: '',
    contract_start_date: '',
    trial_period_days: '',
    ...initialData,
  });

  useEffect(() => {
    if (!profile) return;
    setFormData(prev => ({
      ...prev,
      company_name: prev.company_name || profile.company_name || '',
      company_address: prev.company_address || profile.address || '',
      company_postal_code: prev.company_postal_code || profile.postal_code || '',
      company_city: prev.company_city || profile.city || '',
      company_siret: prev.company_siret || profile.siret || '',
      employer_name: prev.employer_name || (profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : ''),
    }));
  }, [profile]);

  // Afficher un message si pas accès
  if (!canUseContracts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Fonctionnalite Pro</h2>
          <p className="text-gray-600 mb-6">
            Les contrats de travail avec signatures electroniques sont disponibles avec les abonnements Pro et Business.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => router.push('/paywall')} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
              Voir les offres
            </button>
            <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFormDataChange = (updates: Partial<ContractFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Fields that belong to the user's own company and should NOT be overwritten by document analysis
  const COMPANY_FIELDS = new Set([
    'companyName', 'companyAddress', 'companyPostalCode', 'companyCity',
    'companySiret', 'employerName', 'employerTitle',
  ]);

  // Converts camelCase AI response keys → snake_case form keys
  const mapAIParsed = (parsed: Record<string, unknown>): Partial<ContractFormData> => {
    const keyMap: Record<string, string> = {
      employeeFirstName: 'employee_first_name',
      employeeLastName: 'employee_last_name',
      employeeEmail: 'employee_email',
      employeePhone: 'employee_phone',
      employeeAddress: 'employee_address',
      employeePostalCode: 'employee_postal_code',
      employeeCity: 'employee_city',
      employeeBirthDate: 'employee_birth_date',
      employeeSocialSecurity: 'employee_social_security',
      employeeNationality: 'employee_nationality',
      employeeQualification: 'employee_qualification',
      contractStartDate: 'contract_start_date',
      contractEndDate: 'contract_end_date',
      startDate: 'contract_start_date',
      endDate: 'contract_end_date',
      trialPeriodDays: 'trial_period_days',
      jobTitle: 'job_title',
      workLocation: 'work_location',
      workSchedule: 'work_schedule',
      workingHours: 'working_hours',
      salaryAmount: 'salary_amount',
      salaryFrequency: 'salary_frequency',
      contractReason: 'contract_reason',
      replacedEmployeeName: 'replaced_employee_name',
      contractClassification: 'contract_classification',
      companyName: 'company_name',
      companyAddress: 'company_address',
      companyPostalCode: 'company_postal_code',
      companyCity: 'company_city',
      companySiret: 'company_siret',
      employerName: 'employer_name',
      employerTitle: 'employer_title',
      collectiveAgreement: 'collective_agreement',
      probationClause: 'probation_clause',
      nonCompeteClause: 'non_compete_clause',
      mobilityClause: 'mobility_clause',
      tutorName: 'tutor_name',
      schoolName: 'school_name',
      speciality: 'speciality',
      objectives: 'objectives',
      tasks: 'tasks',
      durationWeeks: 'duration_weeks',
      contractCategory: 'contract_category',
      contractTitle: 'contract_title',
    };
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && value !== undefined && value !== '' && !COMPANY_FIELDS.has(key)) {
        out[keyMap[key] ?? key] = value;
      }
    }
    return out as Partial<ContractFormData>;
  };

  // File upload analysis
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    if (!selected.length) return;
    setAnalyzing(true);
    setError('');
    try {
      const results = await Promise.all(selected.map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/analyze-contract-file', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Erreur analyse');
        return res.json();
      }));
      results.forEach(r => {
        if (r.extractedData) {
          setFormData(prev => ({ ...prev, ...mapAIParsed(r.extractedData) }));
        }
      });
      setStep('edit');
    } catch {
      setError('Erreur lors de l\'analyse des documents');
    } finally {
      setAnalyzing(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        await processVoice(blob, recorder.mimeType);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      setError('Impossible d\'accéder au micro');
    }
  };

  const stopRecording = () => { mediaRecorder?.stop(); setRecording(false); };

  const processVoice = async (blob: Blob, mime?: string) => {
    setProcessingVoice(true);
    setError('');
    try {
      const ext = (mime || blob.type).includes('mp4') ? 'mp4' : (mime || blob.type).includes('ogg') ? 'ogg' : 'webm';
      const fd = new FormData();
      fd.append('audio', blob, `recording.${ext}`);
      fd.append('contract_type', contractType);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      let res: Response;
      try {
        res = await fetch('/api/process-voice-contract', { method: 'POST', body: fd, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur de traitement vocal');
      }
      const result = await res.json();
      if (result.parsed) {
        const uncertain = result.parsed.uncertain_fields;
        if (uncertain && uncertain.length > 0) {
          setPendingVoiceResult({ parsed: result.parsed, uncertain_fields: uncertain });
          setVoiceCorrections({});
        } else {
          setFormData(prev => ({ ...prev, ...mapAIParsed(result.parsed) }));
          setStep('edit');
        }
      }
    } catch {
      setError('Erreur lors du traitement vocal');
    } finally {
      setProcessingVoice(false);
    }
  };

  const confirmVoiceAndApply = () => {
    if (!pendingVoiceResult) return;
    const corrected = { ...pendingVoiceResult.parsed };
    for (const [field, newValue] of Object.entries(voiceCorrections)) {
      if (!newValue) continue;
      (corrected as any)[field] = newValue;
    }
    setFormData(prev => ({ ...prev, ...mapAIParsed(corrected) }));

    // Save corrections for AI learning (non-blocking)
    if (Object.keys(voiceCorrections).length > 0) {
      const saves = Object.entries(voiceCorrections)
        .filter(([, val]) => val && val.trim())
        .map(([field, newValue]) => {
          const uncertain = pendingVoiceResult.uncertain_fields.find(uf => uf.field === field);
          return {
            field,
            original_value: String(uncertain?.current_value ?? ''),
            corrected_value: newValue,
            context: contractType,
          };
        })
        .filter(s => s.original_value && s.corrected_value && s.original_value !== s.corrected_value);

      for (const save of saves) {
        fetch('/api/voice-corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(save),
        }).catch(() => {});
      }
    }

    setPendingVoiceResult(null);
    setVoiceCorrections({});
    setStep('edit');
  };

  const skipVoiceCorrections = () => {
    if (!pendingVoiceResult) return;
    setFormData(prev => ({ ...prev, ...mapAIParsed(pendingVoiceResult.parsed) }));
    setPendingVoiceResult(null);
    setVoiceCorrections({});
    setStep('edit');
  };

  const contractFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      'employeeFirstName': 'Prénom',
      'employeeLastName': 'Nom',
      'employeeEmail': 'Email',
      'employeePhone': 'Téléphone',
      'employeeAddress': 'Adresse',
      'employeePostalCode': 'Code postal',
      'employeeCity': 'Ville',
      'employeeBirthDate': 'Date de naissance',
      'employeeSocialSecurity': 'N° Sécurité sociale',
      'employeeNationality': 'Nationalité',
      'contractStartDate': 'Date de début',
      'contractEndDate': 'Date de fin',
      'trialPeriodDays': 'Période d\'essai (jours)',
      'jobTitle': 'Intitulé du poste',
      'workLocation': 'Lieu de travail',
      'salaryAmount': 'Salaire',
      'salaryFrequency': 'Fréquence',
      'companyName': 'Nom de l\'entreprise',
      'companySiret': 'SIRET',
      'employerName': 'Nom de l\'employeur',
    };
    return labels[field] || field;
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setProcessingVoice(true);
    setError('');
    try {
      const res = await fetch('/api/process-text-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput, contract_type: contractType }),
      });
      if (!res.ok) throw new Error('Erreur texte');
      const result = await res.json();
      if (result.parsed) {
        setFormData(prev => ({ ...prev, ...mapAIParsed(result.parsed) }));
        setTextInput('');
        setStep('edit');
      }
    } catch {
      setError('Erreur lors de l\'analyse du texte');
    } finally {
      setProcessingVoice(false);
    }
  };

  const getTemplateType = () => {
    if (contractType === 'cdi') return 'cdi' as const;
    if (contractType === 'cdd') return 'cdd' as const;
    const cat = formData.contract_category || 'stage';
    return (cat === 'apprentissage' ? 'apprentissage' : cat === 'professionnalisation' ? 'professionnalisation' : cat === 'freelance' ? 'freelance' : cat === 'interim' ? 'interim' : cat === 'portage' ? 'portage' : 'stage') as any;
  };

  const toCamelCase = (data: ContractFormData): any => ({
    contractType: getTemplateType(),
    employeeFirstName: data.employee_first_name,
    employeeLastName: data.employee_last_name,
    employeeAddress: data.employee_address,
    employeePostalCode: data.employee_postal_code,
    employeeCity: data.employee_city,
    employeeEmail: data.employee_email,
    employeePhone: data.employee_phone,
    employeeBirthDate: data.employee_birth_date,
    employeeSocialSecurity: data.employee_social_security,
    employeeNationality: data.employee_nationality || 'Française',
    employeeQualification: data.employee_qualification,
    contractStartDate: data.contract_start_date,
    contractEndDate: data.contract_end_date,
    trialPeriodDays: data.trial_period_days,
    jobTitle: data.job_title,
    workLocation: data.work_location,
    workSchedule: data.work_schedule || '35h hebdomadaires',
    workingHours: data.working_hours,
    salaryAmount: data.salary_amount,
    salaryFrequency: data.salary_frequency || 'monthly',
    contractClassification: data.contract_classification,
    contractReason: data.contract_reason,
    replacedEmployeeName: data.replaced_employee_name,
    companyName: data.company_name,
    companyAddress: data.company_address,
    companyPostalCode: data.company_postal_code,
    companyCity: data.company_city,
    companySiret: data.company_siret,
    employerName: data.employer_name,
    employerTitle: data.employer_title || 'Gérant',
    collectiveAgreement: data.collective_agreement,
    hasTransport: data.has_transport,
    hasMeal: data.has_meal,
    hasHealth: data.has_health,
    hasOther: data.has_other,
    otherBenefits: data.other_benefits,
    probationClause: data.probation_clause,
    nonCompeteClause: data.non_compete_clause,
    nonCompeteArea: data.non_compete_area,
    nonCompeteDuration: data.non_compete_duration,
    nonCompeteCompensation: data.non_compete_compensation,
    mobilityClause: data.mobility_clause,
    mobilityArea: data.mobility_area,
    tutorName: data.tutor_name,
    schoolName: data.school_name,
    speciality: data.speciality,
    objectives: data.objectives,
    tasks: data.tasks,
    contractTitle: data.contract_title,
    durationWeeks: data.duration_weeks,
    statut: data.statut,
    employerSignature: data.employer_signature,
    employeeSignature: data.employee_signature,
  });

  // Champs obligatoires par type pour un contrat légal
  const getRequiredFields = (): { key: string; label: string }[] => {
    const base = [
      { key: 'employee_first_name', label: 'Prénom du salarié' },
      { key: 'employee_last_name', label: 'Nom du salarié' },
      { key: 'employee_address', label: 'Adresse du salarié' },
      { key: 'employee_postal_code', label: 'Code postal du salarié' },
      { key: 'employee_city', label: 'Ville du salarié' },
      { key: 'employee_birth_date', label: 'Date de naissance' },
      { key: 'employee_nationality', label: 'Nationalité' },
      { key: 'contract_start_date', label: 'Date de début du contrat' },
      { key: 'job_title', label: 'Intitulé du poste' },
      { key: 'work_location', label: 'Lieu de travail' },
      { key: 'work_schedule', label: 'Horaires de travail' },
      { key: 'salary_amount', label: 'Salaire' },
      { key: 'company_name', label: "Nom de l'entreprise" },
      { key: 'company_address', label: "Adresse de l'entreprise" },
      { key: 'company_postal_code', label: "Code postal de l'entreprise" },
      { key: 'company_city', label: "Ville de l'entreprise" },
      { key: 'company_siret', label: 'SIRET' },
      { key: 'employer_name', label: "Nom de l'employeur" },
      { key: 'employer_title', label: "Titre de l'employeur" },
    ];

    if (contractType === 'cdd') {
      base.push({ key: 'contract_end_date', label: 'Date de fin du contrat' });
      base.push({ key: 'contract_reason', label: 'Motif de recours' });
    }

    if (contractType === 'other') {
      const cat = formData.contract_category || 'stage';
      if (cat === 'stage' || cat === 'apprentissage' || cat === 'professionnalisation') {
        if (formData.tutor_name !== undefined) base.push({ key: 'tutor_name', label: 'Nom du tuteur' });
        if (formData.school_name !== undefined) base.push({ key: 'school_name', label: "Nom de l'école" });
      }
    }

    return base;
  };

  const generateContractHTML = () => {
    // Validation obligatoire avant génération
    const required = getRequiredFields();
    const missing = required.filter(f => {
      const val = (formData as any)[f.key];
      return !val || (typeof val === 'string' && val.trim() === '');
    });

    if (missing.length > 0) {
      const labels = missing.map(f => f.label).join(', ');
      setError(`Champs obligatoires manquants pour un contrat légal : ${labels}`);
      toast.error(`Contrat incomplet — ${missing.length} champ(s) manquant(s)`);
      return;
    }

    setError('');
    const templateData = toCamelCase(formData);
    const html = generateTemplate(templateData);
    setContractHtml(html);
    setStep('preview');
    loadPdfPreview();
  };

  const handleGeneratePayslip = () => {
    // Validation minimale
    if (!formData.salary_amount || !formData.job_title) {
      toast.error('Remplissez au minimum le poste et le salaire pour générer un bulletin');
      return;
    }
    try {
      const now = new Date();
      const periodeDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodeFin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const data = creerBulletinDepuisContrat(toCamelCase(formData), periodeDebut, periodeFin);
      setPayslipData(data);
      setShowPayslipEditor(true);
    } catch (e) {
      console.error('Bulletin error:', e);
      toast.error('Impossible de générer le bulletin — vérifiez les données du contrat');
    }
  };

  const openLivePreview = () => {
    const html = generateTemplate(toCamelCase(formData));
    setLivePreviewHtml(html);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    else toast.error('Autorisez les popups pour prévisualiser');
  };

  const loadPdfPreview = async () => {
    const required = ['employee_first_name', 'employee_last_name', 'contract_start_date', 'job_title', 'salary_amount', 'company_name', 'company_siret', 'employer_name'];
    if (required.some(f => !(formData as any)[f])) return;
    setPdfPreviewLoading(true);
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    try {
      const res = await fetch('/api/contracts/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: toCamelCase(formData) }),
      });
      if (res.ok) setPdfPreviewUrl(URL.createObjectURL(await res.blob()));
    } catch {} finally { setPdfPreviewLoading(false); }
  };

  const validateRequired = () => {
    const fields = [
      { key: 'employee_first_name', label: 'Prénom du salarié' },
      { key: 'employee_last_name', label: 'Nom du salarié' },
      { key: 'employee_address', label: 'Adresse du salarié' },
      { key: 'employee_postal_code', label: 'Code postal du salarié' },
      { key: 'employee_city', label: 'Ville du salarié' },
      { key: 'employee_birth_date', label: 'Date de naissance' },
      { key: 'contract_start_date', label: 'Date de début' },
      { key: 'job_title', label: 'Intitulé du poste' },
      { key: 'work_location', label: 'Lieu de travail' },
      { key: 'salary_amount', label: 'Salaire' },
      { key: 'company_name', label: "Nom de l'entreprise" },
      { key: 'company_siret', label: 'SIRET' },
      { key: 'employer_name', label: "Nom de l'employeur" },
    ];
    const missing = fields.filter(f => !(formData as any)[f.key]?.trim?.());
    if (missing.length) throw new Error(`Champs obligatoires manquants : ${missing.map(f => f.label).join(', ')}`);
  };

  const saveContract = async () => {
    setLoading(true);
    setError('');
    try {
      validateRequired();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('__timeout__')), 30000)
      );

      if (mode === 'edit' && contractId) {
        await Promise.race([
          updateContract(contractId, contractType, formData),
          timeoutPromise,
        ]);

        fetch('/api/contracts/version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId, contractType, contractData: formData, comment: 'Mise à jour' }),
        }).catch((e) => console.warn('[ContractForm] version history failed:', e));

        toast.success('Contrat mis à jour !');
        onSaved?.(contractId, formData.contract_number || '');
      } else {
        if (!pendingIdRef.current) pendingIdRef.current = crypto.randomUUID();

        const result = await Promise.race([
          createContract(formData, profile, pendingIdRef.current),
          timeoutPromise,
        ]) as { id: string; contract_number: string };

        pendingIdRef.current = null;
        setSavedContractId(result.id);

        fetch('/api/contracts/version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId: result.id, contractType, contractData: formData, comment: 'Version initiale' }),
        }).catch((e) => console.warn('[ContractForm] version history failed:', e));

        toast.success('Contrat sauvegardé !');
        setStep('success');
        onSaved?.(result.id, result.contract_number);
      }
    } catch (err) {
      if (err instanceof Error && err.message === '__timeout__') {
        toast.error('Délai dépassé — réessayez');
      } else {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      validateRequired();
      setLoading(true);
      const res = await fetch('/api/contracts/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: toCamelCase(formData) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur génération PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrat_${(formData.contract_type || 'contrat').toUpperCase()}_${formData.employee_last_name || 'salarie'}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF téléchargé !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  const downloadDOCX = async () => {
    try {
      validateRequired();
      setLoading(true);
      const res = await fetch('/api/contracts/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: toCamelCase(formData) }),
      });
      if (!res.ok) throw new Error('Erreur DOCX');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrat_${contractType.toUpperCase()}_${formData.employee_last_name || 'salarie'}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      toast.success('DOCX téléchargé !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  const steps = ['upload', 'edit', 'preview'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {mode === 'edit' ? 'Modifier le' : 'Nouveau'} {TYPE_LABELS[contractType]}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {mode === 'edit' ? 'Modifiez les informations du contrat' : 'Créez un contrat conforme à la législation française 2026'}
        </p>
      </motion.div>

      {/* Progress Steps */}
      {mode === 'create' && (
        <div className="flex items-center justify-center mb-8 gap-2">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <motion.div
                animate={{ scale: step === s ? 1.1 : 1, backgroundColor: step === s ? '#1D9E75' : '#E5E7EB' }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              >
                {i + 1}
              </motion.div>
              {i < 2 && <div className={`w-16 h-1 rounded ${stepIndex > i ? 'bg-primary' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-8">
          <div className="text-center mb-8">
            <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Importez vos documents</h2>
            <p className="text-gray-600 dark:text-gray-400">Carte d&apos;identité, pièces d&apos;entreprise, etc.</p>
          </div>
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-white/10 hover:border-primary/50">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Cliquez ou glissez vos fichiers ici</p>
            <p className="text-sm text-gray-500">PDF, JPG, PNG, DOC, DOCX</p>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                </div>
              ))}
            </div>
          )}
          {analyzing && <div className="mt-6 flex items-center justify-center gap-3 text-primary"><Loader2 className="w-5 h-5 animate-spin" /><span>Analyse en cours...</span></div>}
          {error && <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400"><AlertCircle className="w-5 h-5" /><span>{error}</span></div>}
          <div className="mt-8 flex justify-center">
            <button onClick={() => setStep('edit')} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">Sauter l&apos;import &rarr;</button>
          </div>
        </motion.div>
      )}

      {/* Edit Step */}
      {step === 'edit' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Voice/Text Input */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Mic className="w-5 h-5 text-primary" />Complétez par voix ou par texte</h3>
            <div className="flex gap-3 mb-4">
              <button onClick={recording ? stopRecording : startRecording} disabled={processingVoice} className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${recording ? 'bg-red-500 text-white' : 'bg-primary text-white hover:bg-primary/90'} ${processingVoice ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {recording ? <><X className="w-5 h-5" /> Arrêter</> : processingVoice ? <><Loader2 className="w-5 h-5 animate-spin" /> Traitement...</> : <><Mic className="w-5 h-5" /> Voix</>}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Décrivez le salarié et le contrat en texte libre..." rows={4} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none" />
              <button onClick={handleTextSubmit} disabled={processingVoice || !textInput.trim()} className="self-end flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                {processingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Analyser et remplir
              </button>
            </div>
            {error && <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4" />{error}</div>}
          </div>

          {/* Confirmation popup for uncertain voice fields */}
          <AnimatePresence>
            {pendingVoiceResult && pendingVoiceResult.uncertain_fields.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
              >
                <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 overflow-hidden shadow-lg">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200 dark:border-amber-500/20 bg-amber-100/50 dark:bg-amber-500/10">
                    <div className="w-9 h-9 rounded-xl bg-amber-200 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <HelpCircle size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Vérification requise</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
                        L'IA n'est pas certaine de certaines valeurs. Vérifiez et corrigez si besoin.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                    {pendingVoiceResult.uncertain_fields.map((uf, idx) => (
                      <div key={idx} className="rounded-xl bg-white dark:bg-slate-800/80 border border-amber-100 dark:border-amber-500/10 p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <Edit3 size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{contractFieldLabel(uf.field)}</p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-0.5">{uf.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">IA:</span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 line-through opacity-50">
                            {String(uf.current_value ?? '—')}
                          </span>
                          <input
                            type="text"
                            placeholder={uf.suggestion != null ? String(uf.suggestion) : String(uf.current_value ?? '')}
                            value={voiceCorrections[uf.field] ?? ''}
                            onChange={(e) => setVoiceCorrections(prev => ({ ...prev, [uf.field]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 px-5 py-4 border-t border-amber-200 dark:border-amber-500/20">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={skipVoiceCorrections}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-colors"
                    >
                      Garder tel quel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={confirmVoiceAndApply}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md transition-all"
                    >
                      <CheckCircle size={16} />
                      Confirmer
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <EmployeeInfoStep formData={formData} onChange={handleFormDataChange} showQualification={contractType === 'cdi'} />

            {/* Contract Details */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Détails du contrat</h3>
              <div className="space-y-4">
                <MagnificentDatePicker value={formData.contract_start_date || ''} onChange={(v) => handleFormDataChange({ contract_start_date: v })} placeholder="Date de début" label="Date de début" />
                <input type="number" placeholder="Durée période d'essai (jours)" value={formData.trial_period_days || ''} onChange={(e) => handleFormDataChange({ trial_period_days: e.target.value })} className={inputClass} />
                <input placeholder="Intitulé du poste" value={formData.job_title} onChange={(e) => handleFormDataChange({ job_title: e.target.value })} className={inputClass} />
                <input placeholder="Lieu de travail" value={formData.work_location} onChange={(e) => handleFormDataChange({ work_location: e.target.value })} className={inputClass} />
                <MagicSelect options={WORK_SCHEDULE_OPTIONS} value={formData.work_schedule || '35h hebdomadaires'} onChange={(v) => handleFormDataChange({ work_schedule: v })} placeholder="Horaires" label="Horaires de travail" variant="default" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Salaire" value={formData.salary_amount} onChange={(e) => handleFormDataChange({ salary_amount: e.target.value })} className={inputClass} />
                  <MagicSelect options={SALARY_FREQ_OPTIONS} value={formData.salary_frequency || 'monthly'} onChange={(v) => handleFormDataChange({ salary_frequency: v as any })} placeholder="Fréquence" variant="default" />
                </div>
                {/* Type-specific fields */}
                {contractType === 'cdi' && <CDIFields formData={formData} onChange={handleFormDataChange} />}
                {contractType === 'cdd' && <CDDFields formData={formData} onChange={handleFormDataChange} />}
                {contractType === 'other' && <OtherFields formData={formData} onChange={handleFormDataChange} />}
              </div>
            </div>

            <CompanyInfoStep formData={formData} onChange={handleFormDataChange} />
            <BenefitsStep formData={formData} onChange={handleFormDataChange} />
          </div>

          {/* Validation */}
          <ContractValidator contractType={contractType as any} contractData={toCamelCase(formData)} onValidationChange={() => {}} />

          {/* Error block */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Contrat incomplet</p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            {mode === 'create' && (
              <button onClick={() => setStep('upload')} className="px-6 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">&larr; Retour</button>
            )}
            <button
              onClick={openLivePreview}
              className="px-6 py-3 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-colors flex items-center gap-2"
            >
              <Eye className="w-5 h-5" />Prévisualiser
            </button>
            <button onClick={generateContractHTML} className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
              <FileText className="w-5 h-5" />Générer le contrat
            </button>
          </div>
        </motion.div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Validation */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4"><Shield className="w-6 h-6 text-primary" /><h3 className="text-lg font-bold">Validation légale</h3></div>
            <ContractValidator contractType={contractType as any} contractData={toCamelCase(formData)} compact={false} />
          </div>

          {/* Preview */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Eye className="w-7 h-7 text-primary" />Aperçu du contrat</h2>
            {pdfPreviewLoading && (
              <div className="flex items-center justify-center h-[600px] rounded-2xl border border-gray-100 dark:border-white/10 mb-6 bg-gray-50 dark:bg-slate-800/50">
                <div className="flex flex-col items-center gap-3 text-primary">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm font-medium">Génération de l'aperçu PDF…</span>
                </div>
              </div>
            )}
            {!pdfPreviewLoading && pdfPreviewUrl && (
              <iframe src={pdfPreviewUrl} className="w-full h-[700px] rounded-2xl border border-gray-100 dark:border-white/10 mb-6" />
            )}
            {!pdfPreviewLoading && !pdfPreviewUrl && contractHtml && (
              <iframe srcDoc={contractHtml} className="w-full h-[700px] rounded-2xl border border-gray-100 dark:border-white/10 mb-6 bg-white" />
            )}

            {/* Signatures */}
            <div className="mt-6">
              <ContractSigning
                contractType={contractType}
                contractHtml={contractHtml}
                onSave={(signed) => {
                  if (signed.signatures?.length) {
                    const sigs = signed.signatures;
                    const today = new Date().toISOString().split('T')[0];

                    // Trouver les signatures par nom
                    const employerSig = sigs.find(s => s.name.includes('Employeur'));
                    const employeeSig = sigs.find(s => s.name.includes('Salarie'));

                    // Mettre à jour le formData avec les signatures
                    const updates: Partial<ContractFormData> = {};

                    if (employerSig?.data) {
                      updates.employer_signature = employerSig.data;
                      updates.employer_signature_date = today;
                      toast.success('Signature employeur enregistrée');
                    }

                    if (employeeSig?.data) {
                      updates.employee_signature = employeeSig.data;
                      updates.employee_signature_date = today;
                      toast.success('Signature salarié enregistrée');
                    }

                    if (Object.keys(updates).length > 0) {
                      handleFormDataChange(updates);
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => setStep('edit')} className="px-6 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">&larr; Modifier</button>
            <button onClick={() => setShowExportModal(true)} className="px-6 py-3 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-colors flex items-center gap-2"><Download className="w-5 h-5" />Télécharger</button>
            <button onClick={() => setShowAISuggestions(true)} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"><Sparkles className="w-5 h-5" />Suggestions IA</button>
            {/* Bulletin de paie — temporairement désactivé
            <button onClick={handleGeneratePayslip} className="px-6 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"><Calculator className="w-5 h-5" />Bulletin de paie</button>
            */}
            {savedContractId && (
              <button onClick={() => setShowVersionHistory(true)} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"><History className="w-5 h-5" />Historique</button>
            )}
            <button onClick={saveContract} disabled={loading} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Sauvegarde...</> : <><FileCheck className="w-5 h-5" />Sauvegarder</>}
            </button>
            <button onClick={() => setShowEmailModal(true)} className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2"><Send className="w-5 h-5" />Envoyer par email</button>
          </div>
        </motion.div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Check className="w-10 h-10 text-green-600 dark:text-green-400" /></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Contrat créé avec succès !</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Le contrat a été sauvegardé et est disponible dans vos documents.</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => { setFormData({ ...formData, employee_first_name: '', employee_last_name: '', employee_address: '', employee_postal_code: '', employee_city: '', contract_start_date: '', job_title: '', work_location: '', salary_amount: '' }); setStep('upload'); }} className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">Créer un autre contrat</button>
            <button onClick={() => router.push('/contracts')} className="px-8 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Voir mes contrats</button>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>{showPayslipEditor && payslipData && <PayslipEditor initialData={payslipData} onClose={() => setShowPayslipEditor(false)} />}</AnimatePresence>
      {showEmailModal && <ContractEmailModal contractId={savedContractId || ''} contractType={contractType} employeeName={`${formData.employee_first_name} ${formData.employee_last_name}`} defaultEmail={formData.employee_email} contractHtml={contractHtml} contractData={formData as any} onClose={() => setShowEmailModal(false)} />}
      <ExportFormatModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExportPDF={downloadPDF} onExportDOCX={downloadDOCX} loading={loading} />
      {savedContractId && <ContractVersionHistory isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} contractId={savedContractId} contractType={contractType} />}
      <AISuggestionsModal isOpen={showAISuggestions} onClose={() => setShowAISuggestions(false)} onApplyClause={(clause) => { setCustomClauses(prev => [...prev, { title: clause.title, content: clause.content }]); toast.success(`Clause "${clause.title}" ajoutée !`); }} contractType={contractType} />
    </div>
  );
}

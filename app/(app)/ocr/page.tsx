'use client';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { getSupabaseClient } from '@/lib/supabase';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, FileImage, Sparkles, Check, X, AlertCircle, Zap, Shield, Clock, ChevronDown, Eye, Edit2, Trash2, ArrowRight, Scan, ImagePlus, Loader2, FileText, ChevronRight, Crown, Car, Coffee, Home, Laptop, Briefcase, ShoppingCart, Smartphone, Disc, Package, Inbox, CheckCircle2, CircleDot, Archive, Users, Tag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: 'transport', label: 'Transport', Icon: Car },
  { value: 'meals', label: 'Repas', Icon: Coffee },
  { value: 'accommodation', label: 'Hébergement', Icon: Home },
  { value: 'equipment', label: 'Matériel', Icon: Laptop },
  { value: 'office', label: 'Bureau', Icon: Briefcase },
  { value: 'shopping', label: 'Achats', Icon: ShoppingCart },
  { value: 'telecom', label: 'Télécom', Icon: Smartphone },
  { value: 'insurance', label: 'Assurance', Icon: Shield },
  { value: 'software', label: 'Logiciel', Icon: Disc },
  { value: 'other', label: 'Autre', Icon: Package },
];

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ExtractedData {
  vendor: string;
  amount: number;
  ht_amount: number;
  vat_amount: number;
  date: string;
  description: string;
  category: string;
  confidence: number;
  invoice_number: string;
  currency: string;
  line_items: LineItem[];
  client_name?: string;
  project_code?: string;
  accounting_code?: string;
  is_duplicate?: boolean;
}

interface ScannedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'analyzing' | 'complete' | 'error';
  progress: number;
  result?: {
    extracted: ExtractedData;
    expense?: { id: string;[key: string]: unknown };
    receipt_url?: string;
  };
  error?: string;
}

interface HistoryItem {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  confidence: number;
  thumbnail: string;
  status: 'processed' | 'reviewed' | 'archived';
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getConfidenceColor(confidence: number): { text: string; bg: string; ring: string; label: string } {
  if (confidence >= 0.85) return { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', ring: 'stroke-emerald-500', label: 'Excellent' };
  if (confidence >= 0.65) return { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', ring: 'stroke-amber-500', label: 'Bon' };
  return { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', ring: 'stroke-red-500', label: 'Faible' };
}

function ConfidenceRing({ value, size = 48, strokeWidth = 4 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - value * circumference;
  const color = getConfidenceColor(value);
  const center = size / 2;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
      <motion.circle
        cx={center} cy={center} r={radius} fill="none"
        strokeWidth={strokeWidth} strokeLinecap="round"
        className={color.ring}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = getConfidenceColor(confidence);
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-current/20', color.text, color.bg)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {color.label} {Math.round(confidence * 100)}%
    </span>
  );
}

// ---------- Dext-style status helpers ----------
type DextTab = 'all' | 'processing' | 'to_review' | 'ready' | 'processed';

function getDextStatus(file: ScannedFile): 'processing' | 'to_review' | 'ready' | 'error' {
  if (file.status === 'error') return 'error';
  if (file.status !== 'complete') return 'processing';
  if (!file.result?.extracted) return 'to_review';
  const { confidence, vendor, amount, date } = file.result.extracted;
  if (confidence < 0.65 || !vendor || !amount || !date) return 'to_review';
  return 'ready';
}

// Duplicate detection
function checkDuplicate(file: ScannedFile, allFiles: ScannedFile[], history: HistoryItem[]): boolean {
  if (!file.result?.extracted) return false;
  const { vendor, amount, date } = file.result.extracted;
  if (!vendor || !amount || !date) return false;

  // Check against other completed files
  for (const other of allFiles) {
    if (other.id === file.id || other.status !== 'complete' || !other.result?.extracted) continue;
    const o = other.result.extracted;
    if (o.vendor?.toLowerCase() === vendor.toLowerCase() && Math.abs(o.amount - amount) < 0.01 && o.date === date) return true;
  }

  // Check against history
  for (const h of history) {
    if (h.vendor?.toLowerCase() === vendor.toLowerCase() && Math.abs(h.amount - amount) < 0.01 && h.date === date) return true;
  }
  return false;
}

// PCG accounting codes mapping
const CATEGORY_ACCOUNTING: Record<string, { code: string; label: string }> = {
  transport: { code: '625600', label: 'Transports de personnel' },
  meals: { code: '625700', label: 'Repas' },
  accommodation: { code: '613100', label: 'Locations immobilières' },
  equipment: { code: '604000', label: 'Matériel et fournitures' },
  office: { code: '606400', label: 'Fournitures de bureau' },
  shopping: { code: '607000', label: 'Achats de marchandises' },
  telecom: { code: '626000', label: 'Communications' },
  insurance: { code: '616000', label: "Primes d'assurance" },
  software: { code: '618300', label: 'Logiciels' },
  other: { code: '613200', label: 'Autres charges locatives' },
};

const DEXT_TABS: { key: DextTab; label: string; icon: typeof Inbox }[] = [
  { key: 'all', label: 'Tous', icon: Inbox },
  { key: 'processing', label: 'En cours', icon: Loader2 },
  { key: 'to_review', label: 'À vérifier', icon: Eye },
  { key: 'ready', label: 'Prêts', icon: CheckCircle2 },
  { key: 'processed', label: 'Traités', icon: Archive },
];

// ---------- Paywall for non-Business users ----------
function PaywallSection() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-lg w-full"
      >
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-[2rem] blur-2xl" />

        <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden">
          {/* Gradient header bar */}
          <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

          <div className="p-8 md:p-10 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30"
            >
              <Scan size={44} className="text-white" />
            </motion.div>

            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-3">
              Scan intelligent
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Analysez vos justificatifs en un clic avec l'IA
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/30 dark:to-fuchsia-900/30 border border-violet-200 dark:border-violet-800 mb-8">
              <Sparkles size={14} className="text-violet-500" />
              <span className="text-sm font-bold text-violet-700 dark:text-violet-300">Propulsé par Gemini 2.0</span>
            </div>

            {/* Features list */}
            <div className="space-y-3 text-left mb-8">
              {[
                'Scan multi-fichiers en un clic',
                'Extraction automatique des montants, TVA, dates',
                'Catégorisation intelligente par IA',
                'Lignes détaillées détectées automatiquement',
                'Création directe de notes de frais',
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <Link href="/paywall?plan=business">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white font-bold text-base shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/40 transition-shadow"
              >
                <Crown size={20} />
                Passer au plan Business
                <ArrowRight size={18} />
              </motion.button>
            </Link>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Essai gratuit de 14 jours inclus
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---------- Main Page ----------
export default function OCRPage() {
  const { profile, user } = useAuthStore();
  const router = useRouter();
  const isBusiness = profile?.subscription_tier === 'business' || profile?.is_trial_active;

  // File state
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<DextTab>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke all Object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      setFiles(prev => {
        prev.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
        return prev;
      });
    };
  }, []);

  // Review state
  const [reviewingFile, setReviewingFile] = useState<ScannedFile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ExtractedData | null>(null);
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projectCode, setProjectCode] = useState<string>('');

  // Clients from dataStore
  const { clients } = useDataStore();

  // Keep a stable ref to history for use inside setFiles callbacks (avoids stale closure)
  const historyRef = useRef<HistoryItem[]>([]);

  // Vendor learning: load rules from Supabase
  const [vendorRules, setVendorRules] = useState<Record<string, { category: string; accounting_code: string }>>({});

  useEffect(() => {
    if (!user) return;
    getSupabaseClient()
      .from('expenses')
      .select('vendor, category, account_code')
      .eq('user_id', user.id)
      .not('vendor', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) return;
        const rules: Record<string, { category: string; accounting_code: string }> = {};
        for (const row of data) {
          const key = (row.vendor || '').toLowerCase().trim();
          if (key && !rules[key]) {
            rules[key] = { category: row.category, accounting_code: row.account_code || '' };
          }
        }
        setVendorRules(rules);
      });
  }, [user]);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(() => { historyRef.current = history; }, [history]);

  // Stats
  const scannedToday = files.filter(f => f.status === 'complete').length + history.length;
  const totalDetected = files.filter(f => f.status === 'complete' && f.result)
    .reduce((sum, f) => sum + (f.result?.extracted.amount || 0), 0)
    + history.reduce((sum, h) => sum + h.amount, 0);
  const completedFiles = files.filter(f => f.status === 'complete' && f.result);
  const avgConfidence = completedFiles.length > 0
    ? completedFiles.reduce((sum, f) => sum + (f.result?.extracted.confidence || 0), 0) / completedFiles.length
    : 0;
  const pendingReview = completedFiles.length;

  // Dext-style tab counts
  const tabCounts = useMemo(() => ({
    all: files.length,
    processing: files.filter(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'analyzing').length,
    to_review: files.filter(f => getDextStatus(f) === 'to_review').length,
    ready: files.filter(f => getDextStatus(f) === 'ready').length,
    processed: history.length,
  }), [files, history]);

  const filteredFiles = useMemo(() => {
    if (activeTab === 'all') return files;
    if (activeTab === 'processing') return files.filter(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'analyzing');
    if (activeTab === 'to_review') return files.filter(f => getDextStatus(f) === 'to_review');
    if (activeTab === 'ready') return files.filter(f => getDextStatus(f) === 'ready');
    if (activeTab === 'processed') return []; // history is rendered separately below
    return files;
  }, [files, activeTab]);

  // ---------- File handling ----------
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    const arr = Array.from(newFiles);

    const validFiles = arr.filter(f => {
      if (!acceptedTypes.includes(f.type) && !f.name.endsWith('.heic')) {
        toast.error(`"${f.name}" n'est pas supporté. Utilisez JPG, PNG, WEBP, HEIC ou PDF.`);
        return false;
      }
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`"${f.name}" dépasse 20 Mo.`);
        return false;
      }
      return true;
    });

    const mapped: ScannedFile[] = validFiles.map(file => ({
      id: generateId(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...mapped]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter(x => x.id !== id);
    });
    if (reviewingFile?.id === id) {
      setReviewingFile(null);
      setEditMode(false);
    }
  }, [reviewingFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // ---------- Processing ----------
  const updateFile = useCallback((id: string, updates: Partial<ScannedFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const processFile = useCallback(async (scannedFile: ScannedFile) => {
    updateFile(scannedFile.id, { status: 'uploading', progress: 10 });

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id !== scannedFile.id) return f;
          const newProgress = Math.min(f.progress + 8, 45);
          return { ...f, progress: newProgress };
        }));
      }, 200);

      const formData = new FormData();
      formData.append('file', scannedFile.file);

      updateFile(scannedFile.id, { status: 'uploading', progress: 30 });

      const response = await fetch('/api/ai/ocr-receipt', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error((data as { error?: string } | null)?.error || 'Erreur lors de l\'analyse');
      }

      // 207 = extraction OK but DB save failed — show warning, still display results
      if (response.status === 207) {
        toast.warning('Extraction réussie mais sauvegarde partielle. Vérifiez vos dépenses.');
      }

      updateFile(scannedFile.id, { status: 'analyzing', progress: 70 });

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 400));

      // Mark complete then recalculate is_duplicate for all completed files
      setFiles(prev => {
        const updated = prev.map(f =>
          f.id === scannedFile.id
            ? { ...f, status: 'complete' as const, progress: 100, result: data }
            : f
        );
        return updated.map(f => {
          if (f.status !== 'complete' || !f.result?.extracted) return f;
          const isDup = checkDuplicate(f, updated, historyRef.current);
          if (isDup === f.result.extracted.is_duplicate) return f;
          return { ...f, result: { ...f.result, extracted: { ...f.result.extracted, is_duplicate: isDup } } };
        });
      });

      toast.success(`"${scannedFile.file.name}" analysé avec succès`);
    } catch (err: any) {
      updateFile(scannedFile.id, {
        status: 'error',
        progress: 0,
        error: err.message || 'Erreur inconnue',
      });
      toast.error(`Erreur: ${scannedFile.file.name} - ${err.message || 'analyse échouée'}`);
    }
  }, [updateFile]);

  const processAllFiles = useCallback(async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) {
      toast.info('Ajoutez des fichiers à scanner');
      return;
    }

    setIsProcessing(true);

    try {
      // Process files sequentially to avoid API overload
      for (const file of pending) {
        await processFile(file);
      }
      toast.success('Analyse terminée !');
    } finally {
      setIsProcessing(false);
    }
  }, [files, processFile]);

  // ---------- Save expense ----------
  const saveExpense = useCallback(async (scannedFile: ScannedFile) => {
    if (!scannedFile.result?.expense?.id) {
      toast.error('Aucune dépense à sauvegarder');
      return;
    }
    const expenseId = scannedFile.result.expense.id;

    // Persist client assignment if selected
    if (selectedClientId) {
      try {
        const res = await fetch(`/api/expenses/${expenseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: selectedClientId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          toast.error(`Erreur lors de l'affectation client : ${errData.error || 'inconnue'}`);
          return;
        }
      } catch {
        toast.error("Impossible de contacter le serveur pour l'affectation client.");
        return;
      }
    }

    const extracted = scannedFile.result.extracted;
    setHistory(prev => [{
      id: expenseId,
      vendor: extracted.vendor,
      amount: extracted.amount,
      date: extracted.date,
      category: extracted.category,
      confidence: extracted.confidence,
      thumbnail: scannedFile.preview,
      status: 'processed',
    }, ...prev]);

    removeFile(scannedFile.id);
    setReviewingFile(null);
    setEditMode(false);
    toast.success('Dépense créée avec succès !');
  }, [removeFile, selectedClientId]);

  const saveWithEdits = useCallback(async (scannedFile: ScannedFile) => {
    if (!editData) return;

    const expenseId = scannedFile.result?.expense?.id;

    // If the expense exists in DB, persist the corrections via PATCH
    if (expenseId) {
      try {
        const res = await fetch(`/api/expenses/${expenseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor: editData.vendor,
            amount: editData.amount,
            vat_amount: editData.vat_amount,
            date: editData.date,
            category: editData.category,
            description: editData.description,
            ...(selectedClientId && { client_id: selectedClientId }),
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          toast.error(`Erreur lors de la sauvegarde : ${errData.error || 'inconnue'}`);
          return;
        }
      } catch {
        toast.error('Impossible de contacter le serveur pour sauvegarder les corrections.');
        return;
      }
    }

    setHistory(prev => [{
      id: expenseId || generateId(),
      vendor: editData.vendor,
      amount: editData.amount,
      date: editData.date,
      category: editData.category,
      confidence: editData.confidence,
      thumbnail: scannedFile.preview,
      status: 'processed',
    }, ...prev]);

    removeFile(scannedFile.id);
    setReviewingFile(null);
    setEditMode(false);
    toast.success('Dépense corrigée et sauvegardée !');
  }, [editData, removeFile, selectedClientId]);

  // ---------- Paywall guard ----------
  if (!isBusiness) {
    return <PaywallSection />;
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6 lg:p-8">
      {/* ===== Header ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 mb-8 overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-fuchsia-500/10 to-transparent rounded-tr-full" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                Scan intelligent
              </h1>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold shadow-lg shadow-violet-500/20"
              >
                <Sparkles size={12} />
                Propulsé par Gemini
              </motion.span>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Analysez vos justificatifs en un clic avec l'IA
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/expenses">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                <Eye size={16} />
                Mes dépenses
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ===== Quick Stats Bar ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Scannés aujourd\'hui', value: String(scannedToday), icon: Scan, color: 'from-violet-500 to-purple-600' },
          { label: 'Montant détecté', value: formatCurrency(totalDetected), icon: Zap, color: 'from-amber-500 to-orange-500' },
          { label: 'Confiance moyenne', value: avgConfidence > 0 ? `${Math.round(avgConfidence * 100)}%` : '-', icon: Shield, color: 'from-emerald-500 to-teal-500' },
          { label: 'À vérifier', value: String(tabCounts.to_review), icon: Eye, color: 'from-amber-500 to-orange-500' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className="relative group"
          >
            <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-5 overflow-hidden">
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', color)} />
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />
              <div className="relative">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg', color)}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-xl font-black text-gray-900 dark:text-white group-hover:text-white transition-colors">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/70 transition-colors mt-1">{label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ===== Main Content Grid ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ===== Left: Upload Zone + File Queue ===== */}
        <div className="xl:col-span-2 space-y-6">
          {/* Upload Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative cursor-pointer group rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden',
                isDragging
                  ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-900/20 scale-[1.01]'
                  : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/30 dark:hover:bg-violet-900/10',
                'bg-white/50 dark:bg-slate-800/50'
              )}
              style={{ minHeight: '280px' }}
            >
              {/* Animated gradient border glow */}
              <div className={cn(
                'absolute inset-0 rounded-3xl transition-opacity duration-500',
                isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-fuchsia-500/5" />
              </div>

              {/* Animated dashed border pulse */}
              <div className={cn(
                'absolute inset-0 rounded-3xl pointer-events-none transition-all',
                isDragging && 'animate-pulse'
              )} />

              <div className="relative flex flex-col items-center justify-center py-12 px-6">
                {/* Upload icon with animation */}
                <motion.div
                  animate={isDragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mb-6 shadow-xl shadow-violet-500/20 group-hover:shadow-2xl group-hover:shadow-violet-500/30 transition-shadow"
                >
                  {isDragging ? (
                    <ImagePlus size={36} className="text-white" />
                  ) : (
                    <Camera size={36} className="text-white" />
                  )}
                </motion.div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {isDragging ? 'Déposez vos fichiers ici' : 'Glissez vos justificatifs ici'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  ou <span className="text-violet-600 dark:text-violet-400 font-semibold">cliquez pour parcourir</span>
                </p>

                {/* File type badges */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {['JPG', 'PNG', 'WEBP', 'HEIC', 'PDF'].map(type => (
                    <span key={type} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {type}
                    </span>
                  ))}
                  <span className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                    Max 20 Mo
                  </span>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.heic"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
          </motion.div>

          {/* File Queue + Scan Button */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Scan All button */}
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={processAllFiles}
                    disabled={isProcessing || files.filter(f => f.status === 'pending').length === 0}
                    className={cn(
                      'flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                      'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40'
                    )}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        Scanner tout ({files.filter(f => f.status === 'pending').length})
                      </>
                    )}
                  </motion.button>

                  <span className="text-sm text-gray-400">
                    {files.length} fichier{files.length > 1 ? 's' : ''} en file
                  </span>
                </div>

                {/* Dext-style Tabs */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
                  {DEXT_TABS.map(tab => {
                    const count = tabCounts[tab.key];
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                          isActive
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        )}
                      >
                        <tab.icon size={13} className={cn(tab.key === 'processing' && count > 0 && 'animate-spin')} />
                        {tab.label}
                        {count > 0 && (
                          <span className={cn(
                            'ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black',
                            isActive ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                          )}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* File cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredFiles.map((scannedFile) => {
                      const dextStatus = getDextStatus(scannedFile);
                      return (
                      <motion.div
                        key={scannedFile.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          'relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border shadow-lg overflow-hidden',
                          dextStatus === 'to_review' ? 'border-amber-300/60 dark:border-amber-700/60' :
                          dextStatus === 'ready' ? 'border-emerald-300/60 dark:border-emerald-700/60' :
                          dextStatus === 'error' ? 'border-red-300/60 dark:border-red-700/60' :
                          'border-white/50 dark:border-white/10'
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {scannedFile.preview ? (
                                <img src={scannedFile.preview} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <FileText size={24} className="text-gray-400" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {scannedFile.file.name}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {(scannedFile.file.size / 1024).toFixed(0)} Ko
                              </p>

                              {/* Status */}
                              <div className="mt-2">
                                {scannedFile.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                                    <Clock size={12} />
                                    En attente
                                  </span>
                                )}
                                {scannedFile.status === 'uploading' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                                    <Loader2 size={12} className="animate-spin" />
                                    Upload...
                                  </span>
                                )}
                                {scannedFile.status === 'analyzing' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
                                    <Sparkles size={12} className="animate-pulse" />
                                    Analyse IA...
                                  </span>
                                )}
                                {scannedFile.status === 'complete' && dextStatus === 'to_review' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                    <Eye size={12} />
                                    À vérifier
                                    {scannedFile.result?.extracted && (
                                      <span className="ml-1 text-amber-500">- {formatCurrency(scannedFile.result.extracted.amount)}</span>
                                    )}
                                  </span>
                                )}
                                {scannedFile.status === 'complete' && dextStatus === 'ready' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={12} />
                                    Prêt
                                    {scannedFile.result?.extracted && (
                                      <span className="ml-1 text-emerald-500">- {formatCurrency(scannedFile.result.extracted.amount)}</span>
                                    )}
                                  </span>
                                )}
                                {scannedFile.status === 'error' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
                                    <AlertCircle size={12} />
                                    Erreur
                                  </span>
                                )}
                              </div>

                              {/* Progress bar */}
                              {(scannedFile.status === 'uploading' || scannedFile.status === 'analyzing') && (
                                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${scannedFile.progress}%` }}
                                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                                    transition={{ duration: 0.3 }}
                                  />
                                </div>
                              )}

                              {/* Complete: confidence + duplicate badge */}
                              {scannedFile.status === 'complete' && scannedFile.result?.extracted && (
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  <ConfidenceBadge confidence={scannedFile.result.extracted.confidence} />
                                  {scannedFile.result.extracted.is_duplicate && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                      <AlertCircle size={10} />
                                      Doublon
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1">
                              {scannedFile.status === 'complete' && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    setReviewingFile(scannedFile);
                                    setEditData(scannedFile.result?.extracted || null);
                                    setEditMode(false);
                                    setSelectedClientId('');
                                    setProjectCode('');
                                  }}
                                  className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                                >
                                  <Eye size={14} />
                                </motion.button>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeFile(scannedFile.id)}
                                className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </motion.button>
                            </div>
                          </div>
                        </div>

                        {/* Error message */}
                        {scannedFile.status === 'error' && scannedFile.error && (
                          <div className="px-4 pb-3">
                            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                              {scannedFile.error}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state when no files */}
          {files.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center py-4"
            >
              <p className="text-sm text-gray-400">
                Ajoutez des factures, reçus ou justificatifs pour commencer
              </p>
            </motion.div>
          )}
        </div>

        {/* ===== Right: Review Panel ===== */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {reviewingFile && reviewingFile.result?.extracted ? (
              <motion.div
                key={reviewingFile.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden"
              >
                {/* Review header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Résultat de l'analyse
                    </h3>
                    <motion.button
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setReviewingFile(null); setEditMode(false); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                  {/* Thumbnail preview */}
                  {reviewingFile.preview && (
                    <div className="mt-3 h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
                      <img src={reviewingFile.preview} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Extracted data */}
                <div className="p-5 space-y-4">
                  {/* Confidence Ring */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <ConfidenceRing value={reviewingFile.result.extracted.confidence} size={56} strokeWidth={5} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black text-gray-900 dark:text-white">
                          {Math.round(reviewingFile.result.extracted.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Confiance</p>
                      <ConfidenceBadge confidence={reviewingFile.result.extracted.confidence} />
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-700" />

                  {/* Vendor */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fournisseur</label>
                    {editMode ? (
                      <input
                        value={editData?.vendor || ''}
                        onChange={(e) => setEditData(prev => prev ? { ...prev, vendor: e.target.value } : null)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                    ) : (
                      <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                        {reviewingFile.result.extracted.vendor || 'Non détecté'}
                      </p>
                    )}
                  </div>

                  {/* Amount + VAT */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Montant TTC</label>
                      {editMode ? (
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editData?.amount ?? ''}
                            onChange={(e) => setEditData(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
                            className="w-full pl-7 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                          />
                        </div>
                      ) : (
                        <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                          {formatCurrency(reviewingFile.result.extracted.amount)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TVA</label>
                      {editMode ? (
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editData?.vat_amount ?? ''}
                            onChange={(e) => setEditData(prev => prev ? { ...prev, vat_amount: parseFloat(e.target.value) || 0 } : null)}
                            className="w-full pl-7 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                          />
                        </div>
                      ) : (
                        <p className="text-base font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                          {reviewingFile.result.extracted.vat_amount > 0
                            ? formatCurrency(reviewingFile.result.extracted.vat_amount)
                            : 'Non détecté'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</label>
                    {editMode ? (
                      <input
                        type="date"
                        value={editData?.date || ''}
                        onChange={(e) => setEditData(prev => prev ? { ...prev, date: e.target.value } : null)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                        {reviewingFile.result.extracted.date
                          ? new Date(reviewingFile.result.extracted.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'Non détecté'}
                      </p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catégorie</label>
                    {editMode ? (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => setEditData(prev => prev ? { ...prev, category: cat.value } : null)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                              editData?.category === cat.value
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                            )}
                          >
                            <cat.Icon size={14} />
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-0.5">
                        {(() => {
                          const cat = CATEGORIES.find(c => c.value === reviewingFile.result!.extracted.category);
                          return cat ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-sm font-bold text-gray-900 dark:text-white">
                              <cat.Icon size={14} />
                              {cat.label}
                            </span>
                          ) : (
                            <p className="text-sm text-gray-500">Non catégorisé</p>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* HT Amount */}
                  {(reviewingFile.result.extracted.ht_amount ?? 0) > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Montant HT</label>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                        {formatCurrency(reviewingFile.result.extracted.ht_amount)}
                      </p>
                    </div>
                  )}

                  {/* Accounting code suggestion */}
                  {reviewingFile.result.extracted.category && CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category] && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Compte comptable suggéré</label>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                        {CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category].code} — {CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category].label}
                      </p>
                    </div>
                  )}

                  {/* Duplicate warning */}
                  {reviewingFile.result.extracted.is_duplicate && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Doublon possible</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Une facture avec le même fournisseur, montant et date existe déjà.</p>
                      </div>
                    </div>
                  )}

                  {/* Invoice number */}
                  {reviewingFile.result.extracted.invoice_number && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">N° Facture</label>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                        {reviewingFile.result.extracted.invoice_number}
                      </p>
                    </div>
                  )}

                  {/* Line items (expandable) */}
                  {reviewingFile.result.extracted.line_items && reviewingFile.result.extracted.line_items.length > 0 && (
                    <div>
                      <button
                        onClick={() => setLineItemsExpanded(!lineItemsExpanded)}
                        className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 transition-colors"
                      >
                        <ChevronDown size={14} className={cn('transition-transform', lineItemsExpanded && 'rotate-180')} />
                        Détail des lignes ({reviewingFile.result.extracted.line_items.length})
                      </button>
                      <AnimatePresence>
                        {lineItemsExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 space-y-2"
                          >
                            {reviewingFile.result.extracted.line_items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-xl text-xs">
                                <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">
                                  {item.description}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white ml-2">
                                  {formatCurrency(item.total)}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Description */}
                  {(editMode || reviewingFile.result.extracted.description) && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                      {editMode ? (
                        <textarea
                          value={editData?.description ?? ''}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, description: e.target.value } : null)}
                          rows={2}
                          placeholder="Ajouter une description..."
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {reviewingFile.result.extracted.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Client & Project Assignment */}
                <div className="px-5 pb-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Users size={10} /> Affectation client
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    >
                      <option value="">Aucun client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Tag size={10} /> Code projet
                    </label>
                    <input
                      type="text"
                      value={projectCode}
                      onChange={(e) => setProjectCode(e.target.value)}
                      placeholder="Ex: PROJ-2024-001"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Vendor Learning Indicator */}
                {reviewingFile.result.extracted.vendor && vendorRules[(reviewingFile.result.extracted.vendor || '').toLowerCase().trim()] && (
                  <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <Sparkles size={12} className="text-blue-500" />
                    <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                      Catégorie auto-apprise de vos factures précédentes de {reviewingFile.result.extracted.vendor}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  {editMode ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => saveWithEdits(reviewingFile)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all"
                      >
                        <Check size={16} />
                        Sauvegarder les corrections
                      </motion.button>
                      <button
                        onClick={() => {
                          setEditData(reviewingFile.result?.extracted || null);
                          setEditMode(false);
                        }}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => saveExpense(reviewingFile)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
                      >
                        <Check size={16} />
                        Valider et traiter
                      </motion.button>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setEditMode(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Edit2 size={14} />
                          Corriger
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => removeFile(reviewingFile.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={14} />
                          Rejeter
                        </motion.button>
                      </div>
                    </>
                  )}

                  <Link href="/expenses">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors py-1"
                    >
                      Voir toutes les dépenses
                      <ArrowRight size={12} />
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* No file selected for review */
              <motion.div
                key="empty-review"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-8 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mx-auto mb-4">
                  <FileImage size={28} className="text-violet-400 dark:text-violet-500" />
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                  Aperçu des résultats
                </h4>
                <p className="text-sm text-gray-400">
                  Scannez un justificatif pour voir les données extraites ici
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== History Section ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-10"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Historique des scans
          </h2>
          {history.length > 0 && (
            <span className="text-sm text-gray-400">
              {history.length} justificatif{history.length > 1 ? 's' : ''} traité{history.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {history.length === 0 ? (
          /* Empty state */
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mx-auto mb-6">
              <Clock size={36} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Aucun scan récent
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Vos justificatifs scannés apparaîtront ici. Commencez par glisser un fichier dans la zone ci-dessus.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-violet-500/20"
            >
              <Upload size={16} />
              Scanner un justificatif
            </motion.button>
          </div>
        ) : (
          /* History list */
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {history.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <FileText size={20} className="text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {item.vendor || 'Fournisseur inconnu'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Category */}
                  {(() => {
                    const cat = CATEGORIES.find(c => c.value === item.category);
                    return cat ? (
                      <cat.Icon size={16} className="text-gray-500 dark:text-gray-400" />
                    ) : null;
                  })()}

                  {/* Amount */}
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(item.amount)}
                  </span>

                  {/* Confidence */}
                  <ConfidenceBadge confidence={item.confidence} />

                  {/* Status */}
                  <span className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold',
                    item.status === 'processed' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                      item.status === 'reviewed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}>
                    {item.status === 'processed' ? 'Traité' : item.status === 'reviewed' ? 'Vérifié' : 'Archivé'}
                  </span>

                  {/* Arrow */}
                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

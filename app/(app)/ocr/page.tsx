'use client';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { getSupabaseClient } from '@/lib/supabase';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, FileImage, Sparkles, Check, X, AlertCircle, Zap, Shield, Clock, ChevronDown, Eye, Edit2, Trash2, ArrowRight, Scan, ImagePlus, Loader2, FileText, ChevronRight, Crown, Car, Coffee, Home, Laptop, Briefcase, ShoppingCart, Smartphone, Disc, Package, Inbox, CheckCircle2, CircleDot, Archive, Users, Tag, Maximize2, Plus, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

// Logging conditionnel (uniquement en développement)
const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[OCR DEBUG]', ...args);
  }
};

const debugWarn = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[OCR DEBUG]', ...args);
  }
};

const debugError = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[OCR DEBUG]', ...args);
  }
};

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
  account_label?: string;
  is_duplicate?: boolean;
}

interface ScannedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'analyzing' | 'segmenting' | 'complete' | 'error';
  progress: number;
  result?: {
    extracted: ExtractedData;
    expense?: { id: string;[key: string]: unknown };
    receipt_url?: string;
  };
  error?: string;
  sourcePdfUrl?: string;
  sourcePdfName?: string;
  segmentPages?: string;
  documentType?: string;
  receiptUrl?: string;
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

interface DbExpense {
  id: string;
  vendor: string;
  amount: number;
  vat_amount: number;
  ht_amount: number;
  date: string;
  category: string;
  description: string;
  receipt_url: string;
  status: string;
  account_code: string;
  account_label: string;
  journal_entry: Record<string, unknown>;
  ocr_confidence: number;
  payment_method: string;
  invoice_number: string;
  client_id: string;
  project_code: string;
  document_type: string;
  created_at: string;
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
      <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-white/[0.08]" />
      <motion.circle
        cx={center} cy={center} r={radius} fill="none"
        strokeWidth={strokeWidth} strokeLinecap="round"
        className={color.ring}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
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

// ---------- Document type badges ----------
const DOCUMENT_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  invoice: { label: 'Facture', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  receipt: { label: 'Reçu', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  credit_note: { label: 'Note de crédit', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
  delivery_note: { label: 'Bon de livraison', color: 'text-gray-700 dark:text-zinc-400', bg: 'bg-gray-50 dark:bg-white/[0.03]' },
  quote: { label: 'Devis', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  expense_report: { label: 'Note de frais', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  purchase_order: { label: 'Bon de commande', color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30' },
};

function DocumentTypeBadge({ type }: { type?: string | null }) {
  if (!type) return null;
  const normalized = type.toLowerCase().replace(/[\s_-]/g, '_');
  const docType = DOCUMENT_TYPES[normalized];
  if (!docType) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-current/10', docType.color, docType.bg)}>
      <FileText size={9} />
      {docType.label}
    </span>
  );
}

// ---------- Dext-style status helpers ----------
type DextTab = 'all' | 'processing' | 'to_review' | 'ready' | 'processed';

function getDextStatus(file: ScannedFile): 'processing' | 'to_review' | 'ready' | 'error' {
  if (file.status === 'error') return 'error';
  if (file.status !== 'complete') return 'processing';
  // WORKFLOW DEXT: TOUS les documents scannés vont dans "À vérifier"
  // Seuls les documents explicitement marqués comme "ready" vont dans "Prêts"
  return 'to_review';
}

// Duplicate detection with ±3 day tolerance (like Dext)
function checkDuplicate(file: ScannedFile, allFiles: ScannedFile[], existingExpenses: DbExpense[]): boolean {
  if (!file.result?.extracted) return false;
  const { vendor, amount, date } = file.result.extracted;
  if (!vendor || !amount || !date) return false;

  const fileDate = new Date(date).getTime();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  // Check against other completed files
  for (const other of allFiles) {
    if (other.id === file.id || other.status !== 'complete' || !other.result?.extracted) continue;
    const o = other.result.extracted;
    if (o.vendor?.toLowerCase() === vendor.toLowerCase() && Math.abs(o.amount - amount) < 0.01 && o.date) {
      const otherDate = new Date(o.date).getTime();
      if (Math.abs(fileDate - otherDate) <= THREE_DAYS_MS) return true;
    }
  }

  // Check against DB expenses
  for (const e of existingExpenses) {
    if (e.vendor?.toLowerCase() === vendor.toLowerCase() && Math.abs(e.amount - amount) < 0.01 && e.date) {
      const expDate = new Date(e.date).getTime();
      if (Math.abs(fileDate - expDate) <= THREE_DAYS_MS) return true;
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#09090B] dark:via-[#0C0C0F] dark:to-[#09090B] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-lg w-full"
      >
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 rounded-[2rem] blur-2xl" />

        <div className="relative bg-white/80 dark:bg-white/[0.05] backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden">
          {/* Gradient header bar */}
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />

          <div className="p-8 md:p-10 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30"
            >
              <Scan size={44} className="text-white" />
            </motion.div>

            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-3">
              Scan intelligent
            </h2>
            <p className="text-gray-500 dark:text-zinc-400 mb-2">
              Analysez vos justificatifs en un clic avec l'IA
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-200 dark:border-emerald-800 mb-8">
              <Sparkles size={14} className="text-emerald-500" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Propulsé par Gemini 2.0</span>
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
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <Link href="/paywall?plan=business">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-bold text-base shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 transition-shadow"
              >
                <Crown size={20} />
                Passer au plan Business
                <ArrowRight size={18} />
              </motion.button>
            </Link>

            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-4">
              Essai gratuit de 7 jours inclus
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
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
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

  // DB-loaded expenses for history
  const [dbExpenses, setDbExpenses] = useState<DbExpense[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewingDbExpense, setReviewingDbExpense] = useState<DbExpense | null>(null);

  // DB expense edit mode (Dext-style workflow)
  const [dbEditMode, setDbEditMode] = useState(false);
  const [dbEditData, setDbEditData] = useState<{
    vendor: string; amount: number; vat_amount: number; ht_amount: number;
    date: string; category: string; description: string;
  } | null>(null);

  // Clients from dataStore
  const { clients } = useDataStore();

  // Segment verification state (multi-page PDF)
  const [pendingSegments, setPendingSegments] = useState<{
    fileId: string;
    file: File;
    segments: Array<{
      startPage: number;
      endPage: number | null;
      vendor: string | null;
      invoiceNumber: string | null;
    }>;
    totalPages: number;
  } | null>(null);

  // Keep a stable ref to dbExpenses for use inside setFiles callbacks
  const dbExpensesRef = useRef<DbExpense[]>([]);

  // Vendor learning: load rules from vendor_mappings table
  const [vendorRules, setVendorRules] = useState<Record<string, { category: string; accounting_code: string }>>({});

  // Image preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);

  const fetchDbExpenses = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data } = await getSupabaseClient()
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .not('vendor', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (data) {
        setDbExpenses(data as DbExpense[]);
        dbExpensesRef.current = data as DbExpense[];
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => { fetchDbExpenses(); }, [fetchDbExpenses]);

  // Separate user-triggered fetch to handle late auth resolution
  useEffect(() => {
    if (user) fetchDbExpenses();
  }, [user]);

  // Load vendor mappings
  useEffect(() => {
    if (!user) return;
    getSupabaseClient()
      .from('vendor_mappings')
      .select('vendor_name_pattern, account_code, account_name, corrected_category')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        const rules: Record<string, { category: string; accounting_code: string }> = {};
        for (const row of data) {
          const key = (row.vendor_name_pattern || '').toLowerCase().trim();
          if (key) {
            rules[key] = {
              category: row.corrected_category || '',
              accounting_code: row.account_code || '',
            };
          }
        }
        setVendorRules(rules);
      });
  }, [user]);

  // Stats
  const scannedToday = files.filter(f => f.status === 'complete').length + dbExpenses.length;
  const totalDetected = files.filter(f => f.status === 'complete' && f.result)
    .reduce((sum, f) => sum + (f.result?.extracted.amount || 0), 0)
    + dbExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const completedFiles = files.filter(f => f.status === 'complete' && f.result);
  const avgConfidence = completedFiles.length > 0
    ? completedFiles.reduce((sum, f) => sum + (f.result?.extracted.confidence || 0), 0) / completedFiles.length
    : 0;
  const pendingReview = completedFiles.length;

  // Dext-style tab counts (combine file queue + DB expenses)
  const tabCounts = useMemo(() => ({
    all: files.length + dbExpenses.filter(e => e.status !== 'pending' || files.every(f => f.result?.expense?.id !== e.id)).length,
    processing: files.filter(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'analyzing').length,
    to_review: files.filter(f => getDextStatus(f) === 'to_review').length + dbExpenses.filter(e => e.status === 'reviewed').length,
    ready: files.filter(f => getDextStatus(f) === 'ready').length + dbExpenses.filter(e => e.status === 'ready').length,
    processed: dbExpenses.filter(e => e.status === 'validated' || e.status === 'exported').length,
  }), [files, dbExpenses]);

  const filteredFiles = useMemo(() => {
    if (activeTab === 'all') return files;
    if (activeTab === 'processing') return files.filter(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'analyzing');
    if (activeTab === 'to_review') return files.filter(f => getDextStatus(f) === 'to_review');
    if (activeTab === 'ready') return files.filter(f => getDextStatus(f) === 'ready');
    if (activeTab === 'processed') return []; // DB expenses rendered separately
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

  // ===========================================================================
  // HELPER: Détecter les segments d'un PDF multi-pages en un seul appel API
  // ===========================================================================

  const detectPdfSegments = useCallback(async (file: File): Promise<{
    isPdf: boolean;
    pageCount: number;
    segments: Array<{
      startPage: number;
      endPage: number | null;
      vendor: string | null;
      invoiceNumber: string | null;
    }>;
    needsManualReview: boolean;
  } | null> => {
    if (file.type !== 'application/pdf') {
      debugLog(`Fichier non-PDF détecté: ${file.name} (${file.type})`);
      return null;
    }

    debugLog(`PDF détecté: ${file.name}, détection des segments...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ai/detect-invoices', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        debugLog(`Segments détectés: ${data.segments?.length || 0}, pages: ${data.totalPages}`);
        return {
          isPdf: true,
          pageCount: data.totalPages || 0,
          segments: data.segments || [],
          needsManualReview: data.needsManualReview || false,
        };
      }

      debugWarn(`Échec détection: ${response.status}`);
      return { isPdf: true, pageCount: 0, segments: [], needsManualReview: false };
    } catch (error) {
      debugError(`Erreur détection PDF:`, error);
      return { isPdf: true, pageCount: 0, segments: [], needsManualReview: false };
    }
  }, []);

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

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id !== scannedFile.id) return f;
          const newProgress = Math.min(f.progress + 8, 45);
          return { ...f, progress: newProgress };
        }));
      }, 200);

      // =========================================================================
      // ÉTAPE 1: Détecter les segments en un seul appel (PDF only)
      // =========================================================================
      const detection = await detectPdfSegments(scannedFile.file);

      // =========================================================================
      // CAS 1: PDF multi-pages avec potentiellement plusieurs factures
      // =========================================================================
      if (detection && detection.isPdf && detection.pageCount > 1) {
        updateFile(scannedFile.id, { status: 'analyzing', progress: 30 });

        console.log(`[OCR DEBUG] PDF multipage détecté: ${detection.pageCount} pages dans "${scannedFile.file.name}"`);

        const detectData = detection;

        console.log(`[OCR DEBUG] Segments détectés: ${detectData.segments.length}`);
        detectData.segments.forEach((seg, i) => {
          console.log(`[OCR DEBUG]    Segment ${i + 1}: pages ${seg.startPage}-${seg.endPage}, vendor: ${seg.vendor || 'N/A'}`);
        });

        // Validation: Si aucun segment détecté, traiter comme PDF simple
        if (detectData.segments.length === 0) {
          console.warn(`[OCR DEBUG] Aucun segment détecté pour "${scannedFile.file.name}"`);
          // Fall through to single-page processing
        } else if (detectData.segments.length === 1 && detectData.segments[0].startPage === 1 && detectData.segments[0].endPage === detection.pageCount) {
          // Single invoice spanning all pages - treat as one file
          console.log(`[OCR DEBUG] PDF contient une seule facture sur ${detection.pageCount} pages`);
          // Fall through to single-page processing below
        } else {
          // Multiple invoices detected - show segment verification UI
          updateFile(scannedFile.id, { status: 'segmenting', progress: 50 });
          setPendingSegments({
            fileId: scannedFile.id,
            file: scannedFile.file,
            segments: detectData.segments,
            totalPages: detection.pageCount,
          });
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
          return;
        }
      }

      // =========================================================================
      // CAS 2: Traitement normal (image, PDF 1 page, ou PDF mono-facture)
      // =========================================================================

      const formData = new FormData();
      formData.append('file', scannedFile.file);

      updateFile(scannedFile.id, { status: 'uploading', progress: 30 });

      const response = await fetch('/api/ai/ocr-receipt', {
        method: 'POST',
        body: formData,
      });

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error((data as { error?: string } | null)?.error || 'Erreur lors de l\'analyse');
      }

      if (response.status === 207) {
        toast.warning('Extraction réussie mais sauvegarde partielle. Vérifiez vos dépenses.');
      }

      updateFile(scannedFile.id, { status: 'analyzing', progress: 70 });

      await new Promise(resolve => setTimeout(resolve, 400));

      const receiptUrl = (data as any)?.receipt_url || '';

      setFiles(prev => {
        const updated = prev.map(f =>
          f.id === scannedFile.id
            ? {
              ...f,
              status: 'complete' as const,
              progress: 100,
              result: data,
              receiptUrl: receiptUrl || undefined,
              documentType: (data as any)?.extracted?.document_type || undefined,
            }
            : f
        );
        return updated.map(f => {
          if (f.status !== 'complete' || !f.result?.extracted) return f;
          const isDup = checkDuplicate(f, updated, dbExpensesRef.current);
          if (isDup === f.result.extracted.is_duplicate) return f;
          return { ...f, result: { ...f.result, extracted: { ...f.result.extracted, is_duplicate: isDup } } };
        });
      });

      const conf = (data as { extracted?: { confidence?: number } } | null)?.extracted?.confidence ?? 1;
      toast.success(`"${scannedFile.file.name}" analysé avec succès`);
    } catch (err: any) {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      updateFile(scannedFile.id, {
        status: 'error',
        progress: 0,
        error: err.message || 'Erreur inconnue',
      });
      toast.error(`Erreur: ${scannedFile.file.name} - ${err.message || 'analyse échouée'}`);
    }
  }, [updateFile, detectPdfSegments]);

  // Process segments after user verification
  const processSegmentsFromPdf = useCallback(async (segmentsData: typeof pendingSegments) => {
    if (!segmentsData) return;
    const { fileId, file, segments } = segmentsData;

    setPendingSegments(null);
    setIsProcessing(true);

    try {
      updateFile(fileId, { status: 'analyzing', progress: 40 });

      toast.info(`Extraction de ${segments.length} facture(s) en cours...`, { duration: 5000 });
      const multiPageFormData = new FormData();
      multiPageFormData.append('file', file);
      multiPageFormData.append('segments', JSON.stringify(segments));

      const ocrResponse = await fetch('/api/ai/ocr-multi-page', {
        method: 'POST',
        body: multiPageFormData,
      });

      if (!ocrResponse.ok) {
        throw new Error('Traitement multi-factures échoué');
      }

      const ocrData = await ocrResponse.json() as {
        results: Array<{
          success: boolean;
          expense?: Record<string, unknown>;
          extracted?: Record<string, unknown>;
          receipt_url?: string;
          receipt_storage_path?: string;
          segment?: { startPage: number; endPage: number };
          error?: string;
        }>;
        summary: { succeeded: number; failed: number };
      };

      const newFiles: ScannedFile[] = [];
      const failedSegments: Array<{ index: number; error?: string; pages?: string }> = [];

      for (let i = 0; i < ocrData.results.length; i++) {
        const result = ocrData.results[i];
        const seg = segments[i];

        if (result.success && result.expense) {
          const extracted = (result.extracted || (result.expense as any).extracted || result.expense) as unknown as ExtractedData;
          const vendor = extracted.vendor || 'Fournisseur inconnu';
          const invoiceNum = extracted.invoice_number || '';
          const date = extracted.date ? new Date(extracted.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '';
          const name = `${vendor}${invoiceNum ? ` - ${invoiceNum}` : ''}${date ? ` (${date})` : ''}`;
          const receiptUrl = result.receipt_url || (result.expense as any)?.receipt_url || '';
          const pages = seg ? `p.${seg.startPage}${seg.endPage && seg.endPage > seg.startPage ? `-${seg.endPage}` : ''}` : undefined;

          newFiles.push({
            id: generateId(),
            file: new File([], name),
            preview: '',
            status: 'complete' as const,
            progress: 100,
            result: {
              extracted,
              expense: result.expense as { id: string; [key: string]: unknown },
              receipt_url: receiptUrl,
            },
            sourcePdfName: file.name,
            segmentPages: pages,
            documentType: (extracted as any).document_type || undefined,
            receiptUrl: receiptUrl || undefined,
          });
        } else {
          const errorMsg = result.error || 'Erreur inconnue';
          const pages = seg ? `p.${seg.startPage}-${seg.endPage || seg.startPage}` : `Segment ${i + 1}`;
          failedSegments.push({ index: i + 1, error: errorMsg, pages });
        }
      }

      if (newFiles.length === 0) {
        const errorDetails = failedSegments.map(f => `${f.pages}: ${f.error}`).join('\n');
        updateFile(fileId, {
          status: 'error',
          error: `Aucune facture extraite.\n${errorDetails}`
        });
        toast.error(`Extraction échouée`, {
          description: errorDetails,
          duration: 12000,
        });
        return;
      }

      // Replace original file with extracted invoices
      setFiles(prev => {
        const target = prev.find(f => f.id === fileId);
        if (target?.preview && target.preview.startsWith('blob:')) {
          URL.revokeObjectURL(target.preview);
        }
        return [...prev.filter(f => f.id !== fileId), ...newFiles];
      });

      // Add error files for failed segments
      if (failedSegments.length > 0) {
        const errorFiles: ScannedFile[] = failedSegments.map(f => ({
          id: generateId(),
          file: new File([], `${file.name} - ${f.pages}`),
          preview: '',
          status: 'error' as const,
          progress: 0,
          error: f.error,
          sourcePdfName: file.name,
          segmentPages: f.pages,
        }));
        setFiles(prev => [...prev, ...errorFiles]);

        toast.warning(`${newFiles.length}/${segments.length} factures extraites`, {
          description: failedSegments.map(f => `${f.pages}: ${f.error}`).join('; '),
          duration: 10000,
        });
      } else {
        const vendors = newFiles.map(f => f.result?.extracted?.vendor).filter(Boolean).join(', ');
        toast.success(`${newFiles.length} facture(s) extraite(s) !`, {
          description: vendors || undefined,
          duration: 6000,
        });
      }

      fetchDbExpenses();
    } catch (err: any) {
      updateFile(fileId, {
        status: 'error',
        progress: 0,
        error: err.message || 'Erreur inconnue',
      });
      toast.error(`Erreur: ${err.message || 'extraction échouée'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [updateFile, fetchDbExpenses]);

  const BATCH_SIZE = 3;

  const processAllFiles = useCallback(async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) {
      toast.info('Ajoutez des fichiers à scanner');
      return;
    }

    setIsProcessing(true);
    setBatchProgress({ current: 0, total: pending.length });

    try {
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const chunk = pending.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(chunk.map(f => processFile(f)));
        setBatchProgress({ current: Math.min(i + BATCH_SIZE, pending.length), total: pending.length });
      }
      toast.success('Analyse terminée !');
      fetchDbExpenses();
    } finally {
      setIsProcessing(false);
      setBatchProgress(null);
    }
  }, [files, processFile]);

  // NOUVEAU: Traiter les segments après correction manuelle
  // ---------- Verify expense (mark as reviewed) ----------
  const verifyExpense = useCallback(async (scannedFile: ScannedFile) => {
    if (!scannedFile.result?.expense?.id) {
      toast.error('Aucune dépense à sauvegarder');
      return;
    }
    const expenseId = scannedFile.result.expense.id;

    // Persist client assignment + status change
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'reviewed',
          ...(selectedClientId && { client_id: selectedClientId }),
          ...(projectCode && { project_code: projectCode }),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        toast.error(`Erreur : ${errData.error || 'inconnue'}`);
        return;
      }
    } catch {
      toast.error('Impossible de contacter le serveur.');
      return;
    }

    removeFile(scannedFile.id);
    setReviewingFile(null);
    setEditMode(false);
    fetchDbExpenses();
    toast.success('Document vérifié !');
  }, [removeFile, selectedClientId, projectCode, fetchDbExpenses]);

  // ---------- Save with edits (correct + verify) ----------
  const saveWithEdits = useCallback(async (scannedFile: ScannedFile) => {
    if (!editData) return;

    const expenseId = scannedFile.result?.expense?.id;

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
            status: 'reviewed',
            ...(editData.accounting_code && { account_code: editData.accounting_code }),
            ...(editData.account_label && { account_label: editData.account_label }),
            ...(selectedClientId && { client_id: selectedClientId }),
            ...(projectCode && { project_code: projectCode }),
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

      // Save vendor mapping whenever vendor is known (learns category + account code corrections)
      if (editData.vendor) {
        try {
          await getSupabaseClient().from('vendor_mappings').upsert({
            user_id: user?.id,
            vendor_name_pattern: editData.vendor.toLowerCase().trim(),
            raw_vendor: editData.vendor.toLowerCase().trim(),
            account_code: editData.accounting_code || null,
            account_name: editData.account_label || null,
            corrected_vendor: editData.vendor,
            corrected_category: editData.category,
          }, { onConflict: 'user_id,vendor_name_pattern' });
        } catch {
          // Non-critical: vendor mapping save failure shouldn't block the user
        }
      }
    }

    removeFile(scannedFile.id);
    setReviewingFile(null);
    setEditMode(false);
    fetchDbExpenses();
    toast.success('Dépense corrigée et vérifiée !');
  }, [editData, removeFile, selectedClientId, projectCode, user, fetchDbExpenses]);

  // ---------- Update DB expense status ----------
  const updateExpenseStatus = useCallback(async (expenseId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        toast.error(`Erreur : ${errData.error || 'inconnue'}`);
        return;
      }
      fetchDbExpenses();
      toast.success('Statut mis à jour !');
    } catch {
      toast.error('Impossible de mettre à jour le statut.');
    }
  }, [fetchDbExpenses]);

  // ---------- Save DB expense edits (Dext-style workflow) ----------
  const saveDbEdits = useCallback(async () => {
    if (!dbEditData || !reviewingDbExpense) return;

    try {
      const res = await fetch(`/api/expenses/${reviewingDbExpense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: dbEditData.vendor,
          amount: dbEditData.amount,
          vat_amount: dbEditData.vat_amount,
          ht_amount: dbEditData.ht_amount,
          date: dbEditData.date,
          category: dbEditData.category,
          description: dbEditData.description,
          status: 'reviewed',
          ...(selectedClientId && { client_id: selectedClientId }),
          ...(projectCode && { project_code: projectCode }),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        toast.error(`Erreur : ${errData.error || 'inconnue'}`);
        return;
      }

      // Update vendor mapping for auto-learning
      if (dbEditData.vendor) {
        try {
          await getSupabaseClient().from('vendor_mappings').upsert({
            user_id: user?.id,
            vendor_name_pattern: dbEditData.vendor.toLowerCase().trim(),
            raw_vendor: dbEditData.vendor.toLowerCase().trim(),
            corrected_vendor: dbEditData.vendor,
            corrected_category: dbEditData.category,
          }, { onConflict: 'user_id,vendor_name_pattern' });
        } catch { /* non-critical */ }
      }

      setDbEditMode(false);
      fetchDbExpenses();
      toast.success('Dépense corrigée et vérifiée !');
    } catch {
      toast.error('Impossible de sauvegarder les corrections.');
    }
  }, [dbEditData, reviewingDbExpense, selectedClientId, projectCode, user, fetchDbExpenses]);

  // ---------- Load DB expense for review ----------
  const loadExpenseForReview = useCallback(async (expenseId: string) => {
    const expense = dbExpenses.find(e => e.id === expenseId);
    if (!expense) return;
    setReviewingDbExpense(expense);
    setSelectedClientId(expense.client_id || '');
    setProjectCode(expense.project_code || '');
    setEditMode(false);
    setDbEditMode(false);
    setDbEditData({
      vendor: expense.vendor || '',
      amount: expense.amount || 0,
      vat_amount: expense.vat_amount || 0,
      ht_amount: expense.ht_amount || 0,
      date: expense.date || '',
      category: expense.category || '',
      description: expense.description || '',
    });
  }, [dbExpenses]);

  // ---------- Paywall guard ----------
  if (!isBusiness) {
    return <PaywallSection />;
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#09090B] dark:via-[#0C0C0F] dark:to-[#09090B] p-4 md:p-6 lg:p-8">
      {/* ===== Header ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 mb-8 overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-green-500/10 to-transparent rounded-tr-full" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                Scan intelligent
              </h1>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
              >
                <Sparkles size={12} />
                Propulsé par Gemini
              </motion.span>
            </div>
            <p className="text-gray-500 dark:text-zinc-400">
              Analysez vos justificatifs en un clic avec l'IA
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/expenses">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-white/[0.06] text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
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
          { label: 'Scannés aujourd\'hui', value: String(scannedToday), icon: Scan, color: 'from-emerald-500 to-green-600' },
          { label: 'Montant détecté', value: formatCurrency(totalDetected), icon: Zap, color: 'from-blue-500 to-indigo-600' },
          { label: 'Confiance moyenne', value: avgConfidence > 0 ? `${Math.round(avgConfidence * 100)}%` : '-', icon: Shield, color: 'from-teal-500 to-cyan-600' },
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
            <div className="relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-5 overflow-hidden">
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', color)} />
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />
              <div className="relative">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg', color)}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-xl font-black text-gray-900 dark:text-white group-hover:text-white transition-colors">{value}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 group-hover:text-white/70 transition-colors mt-1">{label}</p>
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
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 scale-[1.01]'
                  : 'border-gray-300 dark:border-white/[0.08] hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10',
                'bg-white/50 dark:bg-white/[0.03]'
              )}
              style={{ minHeight: '280px' }}
            >
              {/* Animated gradient border glow */}
              <div className={cn(
                'absolute inset-0 rounded-3xl transition-opacity duration-500',
                isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-green-500/5 to-teal-500/5" />
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
                  className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 group-hover:shadow-2xl group-hover:shadow-emerald-500/30 transition-shadow"
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
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">
                  ou <span className="text-emerald-600 dark:text-emerald-400 font-semibold">cliquez pour parcourir</span>
                </p>

                {/* File type badges */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {['JPG', 'PNG', 'WEBP', 'HEIC', 'PDF'].map(type => (
                    <span key={type} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.04] text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      {type}
                    </span>
                  ))}
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
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
                      'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40'
                    )}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {batchProgress
                          ? `${batchProgress.current}/${batchProgress.total} traités...`
                          : 'Analyse en cours...'}
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
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/[0.06] rounded-2xl overflow-x-auto">
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
                            ? 'bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-gray-300'
                        )}
                      >
                        <tab.icon size={13} className={cn(tab.key === 'processing' && count > 0 && 'animate-spin')} />
                        {tab.label}
                        {count > 0 && (
                          <span className={cn(
                            'ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black',
                            isActive ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-gray-200 dark:bg-white/[0.04] text-gray-500 dark:text-zinc-400'
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
                          'relative bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border shadow-lg overflow-hidden',
                          dextStatus === 'to_review' ? 'border-amber-300/60 dark:border-amber-700/60' :
                          dextStatus === 'ready' ? 'border-emerald-300/60 dark:border-emerald-700/60' :
                          dextStatus === 'error' ? 'border-red-300/60 dark:border-red-700/60' :
                          'border-white/50 dark:border-white/10'
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                              {scannedFile.preview ? (
                                <img src={scannedFile.preview} alt="" className="w-full h-full object-cover" />
                              ) : scannedFile.receiptUrl || scannedFile.result?.receipt_url ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: scannedFile.receiptUrl || scannedFile.result?.receipt_url || '', title: scannedFile.result?.extracted?.vendor || scannedFile.file.name }); }}
                                  className="w-full h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                  <FileText size={24} className="text-blue-500" />
                                </button>
                              ) : (
                                <FileText size={24} className="text-gray-400" />
                              )}
                              {/* Segment page indicator */}
                              {scannedFile.segmentPages && (
                                <span className="absolute -bottom-0.5 -right-0.5 px-1 py-0.5 rounded-md bg-blue-500 text-white text-[8px] font-black leading-none">
                                  {scannedFile.segmentPages}
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {scannedFile.file.name}
                              </p>
                              {/* Document type + segment badges */}
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <DocumentTypeBadge type={scannedFile.documentType || (scannedFile.result?.extracted as any)?.document_type} />
                                {scannedFile.sourcePdfName && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-zinc-400">
                                    <FileText size={8} />
                                    {scannedFile.sourcePdfName.length > 20 ? scannedFile.sourcePdfName.substring(0, 17) + '...' : scannedFile.sourcePdfName}
                                  </span>
                                )}
                              </div>
                              {/* Montant et date pour factures complètes */}
                              {scannedFile.status === 'complete' && scannedFile.result?.extracted && (
                                <div className="mt-1 flex flex-wrap items-center gap-x-2">
                                  <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                                    {formatCurrency(scannedFile.result.extracted.amount || 0)}
                                  </span>
                                  {scannedFile.result.extracted.date && (
                                    <span className="text-xs text-gray-400">
                                      {new Date(scannedFile.result.extracted.date).toLocaleDateString('fr-FR')}
                                    </span>
                                  )}
                                </div>
                              )}
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
                                {scannedFile.status === 'segmenting' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                                    <Scan size={12} className="animate-pulse" />
                                    Détection des factures...
                                  </span>
                                )}
                                {scannedFile.status === 'complete' && dextStatus === 'to_review' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                    <Eye size={12} />
                                    À vérifier
                                    {scannedFile.result?.extracted && (
                                      <span className="ml-1 text-amber-500">
                                        - {formatCurrency(scannedFile.result.extracted.amount, scannedFile.result.extracted.currency || 'EUR')}
                                        {scannedFile.result.extracted.currency && scannedFile.result.extracted.currency !== 'EUR' && (
                                          <span className="ml-1 text-[10px] font-bold opacity-70">{scannedFile.result.extracted.currency}</span>
                                        )}
                                      </span>
                                    )}
                                  </span>
                                )}
                                {scannedFile.status === 'complete' && dextStatus === 'ready' && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={12} />
                                    Prêt
                                    {scannedFile.result?.extracted && (
                                      <span className="ml-1 text-emerald-500">
                                        - {formatCurrency(scannedFile.result.extracted.amount, scannedFile.result.extracted.currency || 'EUR')}
                                        {scannedFile.result.extracted.currency && scannedFile.result.extracted.currency !== 'EUR' && (
                                          <span className="ml-1 text-[10px] font-bold opacity-70">{scannedFile.result.extracted.currency}</span>
                                        )}
                                      </span>
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
                              {(scannedFile.status === 'uploading' || scannedFile.status === 'analyzing' || scannedFile.status === 'segmenting') && (
                                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-white/[0.04] rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${scannedFile.progress}%` }}
                                    className={cn(
                                      'h-full rounded-full transition-colors',
                                      scannedFile.status === 'segmenting'
                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                        : 'bg-gradient-to-r from-emerald-500 to-green-500'
                                    )}
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
                                  className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                >
                                  <Eye size={14} />
                                </motion.button>
                              )}
                              {(scannedFile.receiptUrl || scannedFile.result?.receipt_url) && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: scannedFile.receiptUrl || scannedFile.result?.receipt_url || '', title: scannedFile.result?.extracted?.vendor || 'Document' }); }}
                                  className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  title="Voir le justificatif"
                                >
                                  <FileText size={14} />
                                </motion.button>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeFile(scannedFile.id)}
                                className="p-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </motion.button>
                            </div>
                          </div>
                        </div>

                        {/* Error message + retry */}
                        {scannedFile.status === 'error' && scannedFile.error && (
                          <div className="px-4 pb-3">
                            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                              <p className="text-xs text-red-500 dark:text-red-400 flex-1">
                                {scannedFile.error}
                              </p>
                              {scannedFile.sourcePdfName && (
                                <span className="text-[9px] text-red-400 font-semibold shrink-0">
                                  {scannedFile.segmentPages}
                                </span>
                              )}
                            </div>
                            {/* Retry button for errors */}
                            <button
                              onClick={(e) => { e.stopPropagation(); updateFile(scannedFile.id, { status: 'pending', progress: 0, error: undefined }); }}
                              className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            >
                              <RefreshCw size={10} />
                              Réessayer
                            </button>
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
                className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden"
              >
                {/* Review header */}
                <div className="p-5 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Résultat de l'analyse
                      </h3>
                      <DocumentTypeBadge type={reviewingFile.documentType || (reviewingFile.result?.extracted as any)?.document_type} />
                    </div>
                    <motion.button
                      data-action="close-panel"
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setReviewingFile(null); setEditMode(false); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                  {/* Thumbnail preview */}
                  {(reviewingFile.preview || reviewingFile.receiptUrl || reviewingFile.result?.receipt_url) && (
                    <div
                      className="mt-3 h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.04] cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all relative group"
                      onClick={() => setPreviewImage({
                        url: reviewingFile.preview || reviewingFile.receiptUrl || reviewingFile.result?.receipt_url || '',
                        title: reviewingFile.result?.extracted?.vendor || reviewingFile.sourcePdfName || 'Document'
                      })}
                    >
                      {reviewingFile.preview ? (
                        <img src={reviewingFile.preview} alt={`Aperçu du justificatif: ${reviewingFile.result?.extracted?.vendor || 'Document'}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-blue-50 dark:bg-blue-900/20">
                          <FileText size={28} className="text-blue-500" />
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {reviewingFile.sourcePdfName ? `${reviewingFile.segmentPages || 'PDF'}` : 'Voir le justificatif'}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <Maximize2 size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                  {/* Segment source info */}
                  {reviewingFile.sourcePdfName && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
                      <FileText size={10} />
                      <span className="truncate">{reviewingFile.sourcePdfName}</span>
                      {reviewingFile.segmentPages && (
                        <span className="font-bold text-blue-500">{reviewingFile.segmentPages}</span>
                      )}
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

                  {/* Low confidence warning banner */}
                  {reviewingFile.result.extracted.confidence < 0.65 && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                      <AlertCircle size={14} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                        Données peu fiables — vérifiez chaque champ avant de valider
                      </p>
                    </div>
                  )}

                  <div className="h-px bg-gray-100 dark:bg-white/[0.04]" />

                  {/* Vendor */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fournisseur</label>
                    {editMode ? (
                      <input
                        value={editData?.vendor || ''}
                        onChange={(e) => setEditData(prev => prev ? { ...prev, vendor: e.target.value } : null)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                    ) : (
                      <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                        {reviewingFile.result.extracted.vendor || 'Non détecté'}
                      </p>
                    )}
                  </div>

                  {/* Amount + VAT */}
                  {reviewingFile.result.extracted.currency && reviewingFile.result.extracted.currency !== 'EUR' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                      <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        Devise étrangère ({reviewingFile.result.extracted.currency}) — vérifiez la conversion en EUR
                      </p>
                    </div>
                  )}
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
                            className="w-full pl-7 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                          />
                        </div>
                      ) : (
                        <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                          {formatCurrency(reviewingFile.result.extracted.amount, reviewingFile.result.extracted.currency || 'EUR')}
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
                            className="w-full pl-7 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                          />
                        </div>
                      ) : (
                        <p className="text-base font-bold text-gray-700 dark:text-zinc-300 mt-0.5">
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
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm font-semibold focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
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
                                : 'border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-zinc-400 hover:border-gray-300'
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
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-sm font-bold text-gray-900 dark:text-white">
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
                      <p className="text-sm font-bold text-gray-700 dark:text-zinc-300 mt-0.5">
                        {formatCurrency(reviewingFile.result.extracted.ht_amount)}
                      </p>
                    </div>
                  )}

                  {/* Accounting code - editable */}
                  <div className="p-3 bg-amber-50/80 dark:bg-amber-900/20 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                    <label className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <Sparkles size={10} /> Compte de charge
                    </label>
                    {editMode ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editData?.accounting_code || ''}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, accounting_code: e.target.value } : null)}
                          placeholder="Code PCG (ex: 606400)"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                        <input
                          type="text"
                          value={editData?.account_label || ''}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, account_label: e.target.value } : null)}
                          placeholder="Libellé du compte"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                      </div>
                    ) : (
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {editData?.accounting_code || CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category]?.code || 'Non assigné'}
                        {((editData?.account_label || CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category]?.label)) && (
                          <span className="font-normal text-gray-500 dark:text-zinc-400 ml-1">
                            — {editData?.account_label || CATEGORY_ACCOUNTING[reviewingFile.result.extracted.category]?.label}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

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
                              <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/[0.02] rounded-xl text-xs">
                                <span className="text-gray-700 dark:text-zinc-300 flex-1 truncate">
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
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-zinc-400 mt-0.5">
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
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
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
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
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
                <div className="p-5 border-t border-gray-100 dark:border-white/[0.06] space-y-3">
                  {editMode ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => saveWithEdits(reviewingFile)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
                      >
                        <Check size={16} />
                        Sauvegarder les corrections
                      </motion.button>
                      <button
                        onClick={() => {
                          setEditData(reviewingFile.result?.extracted || null);
                          setEditMode(false);
                        }}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-gray-300 transition-colors"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        data-action="verify-expense"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => verifyExpense(reviewingFile)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all"
                      >
                        <Check size={16} />
                        Vérifier
                      </motion.button>
                      <div className="flex gap-2">
                        <motion.button
                          data-action="edit-expense"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setEditMode(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.06] text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Edit2 size={14} />
                          Corriger
                        </motion.button>
                        <motion.button
                          data-action="delete-expense"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => removeFile(reviewingFile.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.06] text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
            ) : reviewingDbExpense ? (
              /* DB Expense Review Panel */
              <motion.div
                key={reviewingDbExpense.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden"
              >
                <div className="p-5 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Détail de la dépense</h3>
                    <motion.button
                      data-action="close-panel"
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setReviewingDbExpense(null)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                  {reviewingDbExpense.receipt_url && (
                    <div
                      className="mt-3 h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/[0.04] cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all relative group"
                      onClick={() => setPreviewImage({ url: reviewingDbExpense.receipt_url!, title: reviewingDbExpense.vendor || 'Document' })}
                    >
                      <img src={reviewingDbExpense.receipt_url} alt={`Justificatif: ${reviewingDbExpense.vendor || 'Document'}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <Maximize2 size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-4">
                  <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold',
                    reviewingDbExpense.status === 'reviewed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                    reviewingDbExpense.status === 'ready' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                    reviewingDbExpense.status === 'validated' || reviewingDbExpense.status === 'exported' ? 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-400' :
                    'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  )}>
                    {reviewingDbExpense.status === 'reviewed' ? 'Vérifié' :
                     reviewingDbExpense.status === 'ready' ? 'Prêt' :
                     reviewingDbExpense.status === 'validated' || reviewingDbExpense.status === 'exported' ? 'Traité' : 'En attente'}
                  </span>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fournisseur</label>
                    <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{reviewingDbExpense.vendor || 'Non détecté'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Montant TTC</label>
                      <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{formatCurrency(reviewingDbExpense.amount)}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TVA</label>
                      <p className="text-base font-bold text-gray-700 dark:text-zinc-300 mt-0.5">{reviewingDbExpense.vat_amount > 0 ? formatCurrency(reviewingDbExpense.vat_amount) : 'Non détecté'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</label>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{reviewingDbExpense.date ? new Date(reviewingDbExpense.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non détecté'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Catégorie</label>
                    <div className="mt-0.5">{(() => { const cat = CATEGORIES.find(c => c.value === reviewingDbExpense.category); return cat ? (<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-sm font-bold text-gray-900 dark:text-white"><cat.Icon size={14} />{cat.label}</span>) : (<p className="text-sm text-gray-500">Non catégorisé</p>); })()}</div>
                  </div>
                  <div className="p-3 bg-amber-50/80 dark:bg-amber-900/20 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                    <label className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1 mb-1"><Sparkles size={10} /> Compte de charge</label>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {reviewingDbExpense.account_code || 'Non assigné'}
                      {reviewingDbExpense.account_label && (<span className="font-normal text-gray-500 dark:text-zinc-400 ml-1">— {reviewingDbExpense.account_label}</span>)}
                    </p>
                  </div>
                  {reviewingDbExpense.description && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                      <p className="text-sm text-gray-600 dark:text-zinc-400 mt-0.5">{reviewingDbExpense.description}</p>
                    </div>
                  )}
                </div>
                <div className="p-5 border-t border-gray-100 dark:border-white/[0.06] space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Workflow</p>
                    <div className="flex gap-2">
                      {[
                        { key: 'pending', label: 'Attente' },
                        { key: 'reviewed', label: 'Vérifié' },
                        { key: 'ready', label: 'Prêt' },
                        { key: 'validated', label: 'Traité' },
                      ].map(s => (
                        <button key={s.key} onClick={() => updateExpenseStatus(reviewingDbExpense.id, s.key)}
                          className={cn('flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors',
                            reviewingDbExpense.status === s.key ? 'bg-gray-900 dark:bg-white text-white dark:text-white' : 'bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                          )}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Link href="/expenses">
                    <motion.button whileHover={{ scale: 1.01 }} className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors py-1">
                      Voir toutes les dépenses <ArrowRight size={12} />
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
                className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-8 text-center"
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

      {/* ===== History Section (DB-loaded) ===== */}
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
          {dbExpenses.length > 0 && (
            <span className="text-sm text-gray-400">
              {dbExpenses.length} justificatif{dbExpenses.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-violet-500" />
          </div>
        ) : dbExpenses.length === 0 ? (
          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#0C0C0F] dark:to-white/[0.04] flex items-center justify-center mx-auto mb-6">
              <Clock size={36} className="text-gray-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Aucun scan récent</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Vos justificatifs scannés apparaîtront ici. Commencez par glisser un fichier dans la zone ci-dessus.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20"
            >
              <Upload size={16} />
              Scanner un justificatif
            </motion.button>
          </div>
        ) : (
          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {dbExpenses.slice(0, 30).map((expense, idx) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                  onClick={() => loadExpenseForReview(expense.id)}
                  className={cn(
                    'flex items-center gap-4 p-4 transition-colors cursor-pointer',
                    reviewingDbExpense?.id === expense.id
                      ? 'bg-violet-50/50 dark:bg-violet-900/20'
                      : 'hover:bg-gray-50/50 dark:hover:bg-slate-700/30'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {expense.receipt_url ? (
                      <img src={expense.receipt_url} alt={`Miniature: ${expense.vendor || 'Document'}`} className="w-full h-full object-cover" />
                    ) : (
                      <FileText size={20} className="text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {expense.vendor || 'Fournisseur inconnu'}
                      </p>
                      <DocumentTypeBadge type={expense.document_type} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {expense.date
                          ? new Date(expense.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Date inconnue'}
                      </p>
                      {expense.receipt_url && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: expense.receipt_url, title: expense.vendor || 'Document' }); }}
                          className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5 transition-colors"
                        >
                          <Eye size={9} />
                          Justificatif
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category icon */}
                  {(() => {
                    const cat = CATEGORIES.find(c => c.value === expense.category);
                    return cat ? <cat.Icon size={16} className="text-gray-500 dark:text-zinc-400" /> : null;
                  })()}

                  {/* Amount */}
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(expense.amount)}
                  </span>

                  {/* Account code */}
                  {expense.account_code && (
                    <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      {expense.account_code}
                    </span>
                  )}

                  {/* Status */}
                  <span className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold',
                    expense.status === 'validated' || expense.status === 'exported' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                      expense.status === 'ready' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                      expense.status === 'reviewed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  )}>
                    {expense.status === 'validated' || expense.status === 'exported' ? 'Traité' :
                     expense.status === 'ready' ? 'Prêt' :
                     expense.status === 'reviewed' ? 'Vérifié' : 'Attente'}
                  </span>

                  <ChevronRight size={16} className="text-gray-300 dark:text-zinc-600" />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ===== Segment Verification Dialog ===== */}
      <Dialog open={pendingSegments !== null} onOpenChange={(open) => { if (!open) { setPendingSegments(null); } }}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan size={20} className="text-emerald-500" />
              Vérification des segments
              <span className="text-sm font-normal text-gray-400">
                {pendingSegments?.segments.length || 0} facture(s) détectée(s) dans {pendingSegments?.totalPages || 0} pages
              </span>
            </DialogTitle>
          </DialogHeader>

          {pendingSegments && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                <Eye size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  L'IA a détecté {pendingSegments.segments.length} facture(s) dans ce PDF.
                  Vérifiez les segments ci-dessous et ajustez-les si nécessaire avant l'extraction.
                </p>
              </div>

              {/* Segments list */}
              <div className="space-y-2">
                {pendingSegments.segments.map((seg, idx) => {
                  const segmentColors = [
                    'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20',
                    'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20',
                    'border-violet-400 bg-violet-50/50 dark:bg-violet-900/20',
                    'border-amber-400 bg-amber-50/50 dark:bg-amber-900/20',
                    'border-rose-400 bg-rose-50/50 dark:bg-rose-900/20',
                    'border-teal-400 bg-teal-50/50 dark:bg-teal-900/20',
                  ];
                  const colorClass = segmentColors[idx % segmentColors.length];
                  const endPage = seg.endPage ?? seg.startPage;
                  const pageCount = endPage - seg.startPage + 1;

                  return (
                    <div key={idx} className={cn('rounded-xl border-2 p-4', colorClass)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/[0.06] flex items-center justify-center text-sm font-black text-gray-700 dark:text-zinc-300 shadow-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {seg.vendor || `Facture ${idx + 1}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Pages {seg.startPage}{endPage > seg.startPage ? ` à ${endPage}` : ''} ({pageCount} page{pageCount > 1 ? 's' : ''})
                              {seg.invoiceNumber && ` — N° ${seg.invoiceNumber}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => processSegmentsFromPdf(pendingSegments)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30"
                >
                  <Zap size={16} />
                  Extraire {pendingSegments.segments.length} facture(s)
                </motion.button>
                <button
                  onClick={() => setPendingSegments(null)}
                  className="px-6 py-3 rounded-2xl border border-gray-200 dark:border-white/[0.06] text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Document Preview Dialog ===== */}
      <Dialog open={previewImage !== null} onOpenChange={() => { setPreviewImage(null); setPreviewZoom(1); }}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewImage?.title || 'Aperçu du document'}
            </DialogTitle>
          </DialogHeader>
          {/* Zoom controls */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setPreviewZoom(z => Math.max(0.25, z - 0.25))}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs font-bold text-gray-500 w-12 text-center">{Math.round(previewZoom * 100)}%</span>
            <button
              onClick={() => setPreviewZoom(z => Math.min(3, z + 0.25))}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setPreviewZoom(1)}
              className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-xs font-bold text-gray-500"
            >
              Reset
            </button>
          </div>
          <div className="relative w-full overflow-auto rounded-lg" style={{ maxHeight: '75vh' }}>
            {previewImage?.url && (previewImage.url.includes('.pdf') || previewImage.url.includes('application/pdf')) ? (
              <iframe
                src={previewImage.url}
                className="w-full rounded-lg border-0"
                style={{ height: '75vh', transform: `scale(${previewZoom})`, transformOrigin: 'top left', width: `${100 / previewZoom}%` }}
                title={previewImage.title || 'Aperçu PDF'}
              />
            ) : (
              <img
                src={previewImage?.url}
                alt={previewImage?.title || 'Aperçu du document'}
                className="w-full h-auto object-contain rounded-lg transition-transform"
                style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

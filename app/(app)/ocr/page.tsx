'use client';
/**
 * TITAN — OCR Workspace (refonte Dext.com 2026).
 *
 * Double-écran de validation : rail inbox (gauche) · aperçu du document (centre,
 * posé sur un "bureau" papier) · pièce comptable éditable (droite, esthétique
 * journal avec code PCG en monospace).
 *
 * Le pipeline IA est préservé à l'identique (éprouvé) :
 *   • /api/ai/detect-invoices  → segmentation PDF multi-factures
 *   • /api/ai/ocr-mistral      → extraction hybride Mistral→Gemini (auto-save DB)
 *   • /api/ai/ocr-receipt      → repli Gemini
 *   • /api/ai/ocr-multi-page   → extraction par segment
 *   • PATCH /api/expenses/:id  → corrections + statut reviewed
 * L'IA sauvegarde dès l'extraction ; l'écran de validation sert à vérifier/corriger.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { getSupabaseClient } from '@/lib/supabase';
import { cn, formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Upload, FileImage, Sparkles, Check, X, AlertCircle, Eye, Edit2,
  Scan, Loader2, FileText, Crown, Car, Coffee, Home, Laptop, Briefcase,
  ShoppingCart, Smartphone, Disc, Package, Inbox, Archive,
  Tag, ZoomIn, ZoomOut, RotateCw, ChevronRight, Shield, RefreshCw, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { ReceiptImg } from '@/components/storage/ReceiptImg';
import InboxAddressChip from '@/components/ocr/InboxAddressChip';

// ─── Catégories ────────────────────────────────────────────────────────────
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

// ─── Types ─────────────────────────────────────────────────────────────────
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
    expense?: { id: string; [key: string]: unknown };
    receipt_url?: string;
  };
  error?: string;
  sourcePdfName?: string;
  sourcePdfUrl?: string;
  segmentPages?: string;
  documentType?: string;
  receiptUrl?: string;
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
  currency: string;
  created_at: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// ─── Confiance ─────────────────────────────────────────────────────────────
function getConfidenceColor(c: number): { dot: string; text: string; label: string } {
  if (c >= 0.85) return { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Excellent' };
  if (c >= 0.65) return { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Bon' };
  return { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', label: 'Faible' };
}

// ─── HT fiable (DÉDALOS CIBLE 1a — anti "HT = NaN €") ───────────────────────
// amount = TTC (convention base). Si ht_amount manque ou est incohérent, on dérive
// HT = TTC − TVA, comme la vue accounting_expenses_view et le journal comptable.
function htOf(exp: { ht_amount?: number; amount?: number; vat_amount?: number } | null | undefined): number {
  if (!exp) return 0;
  const ht = Number(exp.ht_amount);
  if (Number.isFinite(ht) && ht > 0) return ht;
  const ttc = Number(exp.amount) || 0;
  const vat = Number(exp.vat_amount) || 0;
  return Math.max(0, ttc - vat);
}

// ─── Codes PCG ─────────────────────────────────────────────────────────────
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

// ─── Détection de doublons (±3 j, façon Dext) ──────────────────────────────
function checkDuplicate(file: ScannedFile, allFiles: ScannedFile[], existing: DbExpense[]): boolean {
  if (!file.result?.extracted) return false;
  const { vendor, amount, date } = file.result.extracted;
  if (!vendor || !amount || !date) return false;
  const fileDate = new Date(date).getTime();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  for (const o of allFiles) {
    if (o.id === file.id || o.status !== 'complete' || !o.result?.extracted) continue;
    const e = o.result.extracted;
    if (e.vendor?.toLowerCase() === vendor.toLowerCase() && Math.abs(e.amount - amount) < 0.01 && e.date) {
      if (Math.abs(fileDate - new Date(e.date).getTime()) <= THREE_DAYS) return true;
    }
  }
  for (const e of existing) {
    if (e.vendor?.toLowerCase() === vendor.toLowerCase() && Math.abs(e.amount - amount) < 0.01 && e.date) {
      if (Math.abs(fileDate - new Date(e.date).getTime()) <= THREE_DAYS) return true;
    }
  }
  return false;
}

// ─── Types de document ─────────────────────────────────────────────────────
const DOCUMENT_TYPES: Record<string, { label: string; cls: string }> = {
  invoice: { label: 'Facture', cls: 'text-emerald-600 dark:text-emerald-400' },
  receipt: { label: 'Reçu', cls: 'text-sky-600 dark:text-sky-400' },
  credit_note: { label: 'Avoir', cls: 'text-rose-600 dark:text-rose-400' },
  quote: { label: 'Devis', cls: 'text-violet-600 dark:text-violet-400' },
};

function docTypeLabel(t?: string | null): string | null {
  if (!t) return null;
  const norm = t.toLowerCase().replace(/[\s_-]/g, '_');
  return DOCUMENT_TYPES[norm]?.label || null;
}

// ─── Paywall Business ──────────────────────────────────────────────────────
function PaywallSection() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#09090B] dark:via-[#0C0C0F] dark:to-[#09090B] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full rounded-3xl border border-gray-200 dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0C0C0F] p-8 text-center shadow-xl shadow-black/5"
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/25">
          <Scan className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Scan intelligent</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
          L'extraction OCR multi-factures par IA est réservée au plan <span className="font-semibold text-gray-700 dark:text-zinc-200">Business</span>.
          Uploadez un PDF, l'IA détache chaque facture et pré-remplit vos notes de frais.
        </p>
        <Link href="/paywall"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-lg">
          <Crown className="w-4 h-4" /> Passer à Business
        </Link>
        <Link href="/expenses" className="mt-3 block text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
          ← Retour aux notes de frais
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Composant champ (esthétique pièce comptable) ──────────────────────────
function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-zinc-500">{label}</span>
        {hint && <span className="text-[10px] text-gray-300 dark:text-zinc-600 font-mono">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-[#F4F4F5] dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition";

// ════════════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function OcrPage() {
  const { profile, user } = useAuthStore();
  // ZEUS (suivi #3) — OCR multi-factures = Business strict. L'essai (Pro) n'y a pas accès.
  const isBusiness = profile?.subscription_tier === 'business';

  // File state
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'review' | 'done'>('inbox');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review state (queue files)
  const [reviewingFile, setReviewingFile] = useState<ScannedFile | null>(null);
  const reviewingFileRef = useRef<ScannedFile | null>(null);
  reviewingFileRef.current = reviewingFile;
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ExtractedData | null>(null);

  // DB expenses (history)
  const [dbExpenses, setDbExpenses] = useState<DbExpense[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewingDbExpense, setReviewingDbExpense] = useState<DbExpense | null>(null);
  const [dbEditMode, setDbEditMode] = useState(false);
  const [dbEditData, setDbEditData] = useState<{
    vendor: string; amount: number; vat_amount: number; ht_amount: number;
    date: string; category: string; description: string;
    invoice_number: string; payment_method: string; currency: string;
    account_code: string; account_label: string;
  } | null>(null);

  const { clients } = useDataStore();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projectCode, setProjectCode] = useState<string>('');

  // Segments (multi-page) — confirmateur inline (remplace l'ancien popup)
  const [pendingSegments, setPendingSegments] = useState<{
    fileId: string;
    file: File;
    segments: Array<{ startPage: number; endPage: number | null; vendor: string | null; invoiceNumber: string | null }>;
    totalPages: number;
  } | null>(null);
  const [editedSegments, setEditedSegments] = useState<Array<{ vendor: string }>>([]);

  // Aperçu
  const [zoom, setZoom] = useState(1);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  const dbExpensesRef = useRef<DbExpense[]>([]);
  dbExpensesRef.current = dbExpenses;

  // ── Revoke object URLs on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      setFiles(prev => {
        prev.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
        return prev;
      });
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch DB expenses ────────────────────────────────────────────────────
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
        .limit(150);
      if (data) setDbExpenses(data as DbExpense[]);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => { fetchDbExpenses(); }, [fetchDbExpenses]);
  useEffect(() => { if (user) fetchDbExpenses(); }, [user]);
  // AXIOM (CIBLE 4) — recharge les dépenses BDD dès qu'une extraction se termine
  // (changement du nombre de fichiers 'complete'), pour que l'onglet « À vérifier »
  // reflète immédiatement la persistance et que la déduplication session↔BDD soit juste.
  const completedFilesCount = files.filter(f => f.status === 'complete').length;
  useEffect(() => {
    if (completedFilesCount > 0) fetchDbExpenses();
  }, [completedFilesCount, fetchDbExpenses]);

  // ── Garder le fichier révisé synchronisé avec files (preview + extraction fraîches) ─
  useEffect(() => {
    if (!reviewingFile) return;
    const fresh = files.find(f => f.id === reviewingFile.id);
    if (!fresh) { setReviewingFile(null); setEditMode(false); return; }
    // ATHÉNA CIBLE 4 — ne remplace reviewingFile que sur un changement signifiant
    // (status/preview/receiptUrl/result), PAS sur les ticks de `progress` (toutes les
    // 200ms). Sinon reviewingFile se recréait → l'effet pdfObjectUrl se déclenchait →
    // l'iframe rechargeait le PDF en boucle (flicker).
    const sig = (f: ScannedFile) => `${f.status}|${f.preview}|${f.receiptUrl}|${!!f.result?.receipt_url}`;
    if (sig(fresh) !== sig(reviewingFile) || fresh.result !== reviewingFile.result) {
      setReviewingFile(fresh);
      if (fresh.status === 'complete' && fresh.result?.extracted && !editMode) {
        setEditData({ ...fresh.result.extracted });
      }
    }
  }, [files, reviewingFile, editMode]);

  // ── PDF source preview URL ───────────────────────────────────────────────
  // ATHÉNA CIBLE 4 — l'URL blob est stable pour un fichier donné (l'objet File ne change
  // pas pendant l'analyse). Keyée sur l'identité du fichier — plus sur l'objet reviewingFile
  // qui se recréait à chaque tick → fin du flicker. previewUrl privilégie de toute façon
  // le receipt_url signé quand il existe, donc on minte le blob local pour tout PDF sélectionné.
  useEffect(() => {
    const f = reviewingFile?.file;
    if (!f || f.type !== 'application/pdf') { setPdfObjectUrl(null); return; }
    const url = URL.createObjectURL(f);
    setPdfObjectUrl(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewingFile?.id, reviewingFile?.file]);

  // ── File handling ────────────────────────────────────────────────────────
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    const valid = Array.from(newFiles).filter(f => {
      if (!accepted.includes(f.type) && !f.name.endsWith('.heic')) {
        toast.error(`« ${f.name} » n'est pas supporté. JPG, PNG, WEBP, HEIC ou PDF.`);
        return false;
      }
      if (f.size > 20 * 1024 * 1024) { toast.error(`« ${f.name} » dépasse 20 Mo.`); return false; }
      return true;
    });
    const mapped: ScannedFile[] = valid.map(file => ({
      id: generateId(), file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      status: 'pending', progress: 0,
    }));
    setFiles(prev => [...prev, ...mapped]);
    // Auto-preview du premier document uploadé si rien n'est en cours de révision
    if (!reviewingFileRef.current && mapped[0]) {
      setReviewingFile(mapped[0]);
    }
    // ATHÉNA CIBLE 4 — thumbnails PDF (rendu de la 1ʳᵉ page via pdfjs) pour la barre
    // latérale : avant, les PDF n'affichaient qu'une icône générique (incohérent vs images).
    mapped.filter((m) => m.file.type === 'application/pdf').forEach((m) => {
      generatePdfThumbnail(m.file).then((dataUrl) => {
        if (!dataUrl) return;
        setFiles((prev) => prev.map((f) => (f.id === m.id ? { ...f, preview: dataUrl } : f)));
        setReviewingFile((prev) => (prev && prev.id === m.id && !prev.preview ? { ...prev, preview: dataUrl } : prev));
      });
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter(x => x.id !== id);
    });
    if (reviewingFile?.id === id) { setReviewingFile(null); setEditMode(false); }
  }, [reviewingFile]);

  const updateFile = useCallback((id: string, updates: Partial<ScannedFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  // ── Détection segments PDF ───────────────────────────────────────────────
  const detectPdfSegments = useCallback(async (file: File): Promise<{
    isPdf: boolean; pageCount: number;
    segments: Array<{ startPage: number; endPage: number | null; vendor: string | null; invoiceNumber: string | null }>;
    needsManualReview: boolean;
  } | null> => {
    if (file.type !== 'application/pdf') return null;
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/ai/detect-invoices', { method: 'POST', body: fd });
      if (res.ok) {
        const d = await res.json();
        return { isPdf: true, pageCount: d.totalPages || 0, segments: d.segments || [], needsManualReview: d.needsManualReview || false };
      }
      return { isPdf: true, pageCount: 0, segments: [], needsManualReview: false };
    } catch {
      return { isPdf: true, pageCount: 0, segments: [], needsManualReview: false };
    }
  }, []);

  // ── Traitement d'un fichier ──────────────────────────────────────────────
  const processFile = useCallback(async (scanned: ScannedFile) => {
    updateFile(scanned.id, { status: 'uploading', progress: 10 });
    let interval: ReturnType<typeof setInterval> | null = null;
    try {
      interval = setInterval(() => {
        setFiles(prev => prev.map(f => f.id !== scanned.id ? f : { ...f, progress: Math.min(f.progress + 8, 45) }));
      }, 200);

      const detection = await detectPdfSegments(scanned.file);

      if (detection && detection.isPdf && detection.pageCount > 1 && detection.segments.length > 0) {
        const single = detection.segments.length === 1 && detection.segments[0].startPage === 1 && detection.segments[0].endPage === detection.pageCount;
        if (!single) {
          updateFile(scanned.id, { status: 'segmenting', progress: 50 });
          setPendingSegments({ fileId: scanned.id, file: scanned.file, segments: detection.segments, totalPages: detection.pageCount });
          setEditedSegments(detection.segments.map(s => ({ vendor: s.vendor || '' })));
          if (interval) { clearInterval(interval); interval = null; }
          return;
        }
      }

      const fd = new FormData(); fd.append('file', scanned.file);
      updateFile(scanned.id, { status: 'uploading', progress: 30 });

      let res = await fetch('/api/ai/ocr-mistral', { method: 'POST', body: fd });
      if (!res.ok && res.status !== 207) {
        const fb = new FormData(); fb.append('file', scanned.file);
        res = await fetch('/api/ai/ocr-receipt', { method: 'POST', body: fb });
      }
      if (interval) { clearInterval(interval); interval = null; }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as { error?: string } | null)?.error || "Erreur lors de l'analyse");
      if (res.status === 207) toast.warning('Extraction OK mais sauvegarde partielle — vérifiez vos dépenses.');

      updateFile(scanned.id, { status: 'analyzing', progress: 70 });
      await new Promise(r => setTimeout(r, 400));

      const receiptUrl = (data as any)?.receipt_url || '';
      setFiles(prev => {
        const updated = prev.map(f => f.id === scanned.id ? {
          ...f, status: 'complete' as const, progress: 100, result: data,
          receiptUrl: receiptUrl || undefined,
          documentType: (data as any)?.extracted?.document_type || undefined,
        } : f);
        return updated.map(f => {
          if (f.status !== 'complete' || !f.result?.extracted) return f;
          const dup = checkDuplicate(f, updated, dbExpensesRef.current);
          if (dup === f.result.extracted.is_duplicate) return f;
          return { ...f, result: { ...f.result, extracted: { ...f.result.extracted, is_duplicate: dup } } };
        });
      });
      toast.success(`« ${scanned.file.name} » analysé`);
    } catch (err: any) {
      if (interval) clearInterval(interval);
      updateFile(scanned.id, { status: 'error', progress: 0, error: err.message || 'Erreur inconnue' });
      toast.error(`${scanned.file.name} — ${err.message || 'échec'}`);
    }
  }, [updateFile, detectPdfSegments]);

  // ── Extraction des segments après confirmation inline ─────────────────────
  const processSegmentsFromPdf = useCallback(async (segData: typeof pendingSegments) => {
    if (!segData) return;
    const { fileId, file, segments } = segData;
    // Applique les vendors édités
    const finalSegments = segments.map((s, i) => ({ ...s, vendor: editedSegments[i]?.vendor ?? s.vendor }));
    setPendingSegments(null);
    setIsProcessing(true);
    try {
      updateFile(fileId, { status: 'analyzing', progress: 40 });
      toast.info(`Extraction de ${segments.length} facture(s)…`, { duration: 5000 });
      const fd = new FormData(); fd.append('file', file); fd.append('segments', JSON.stringify(finalSegments));
      const res = await fetch('/api/ai/ocr-multi-page', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Traitement multi-factures échoué');
      const d = await res.json() as {
        results: Array<{ success: boolean; expense?: Record<string, unknown>; extracted?: Record<string, unknown>; receipt_url?: string; segment?: { startPage: number; endPage: number }; error?: string }>;
        summary: { succeeded: number; failed: number };
      };

      const newFiles: ScannedFile[] = [];
      const failed: Array<{ pages?: string; error?: string }> = [];
      for (let i = 0; i < d.results.length; i++) {
        const r = d.results[i]; const seg = finalSegments[i];
        if (r.success && r.expense) {
          const extracted = (r.extracted || (r.expense as any).extracted || r.expense) as unknown as ExtractedData;
          const vendor = extracted.vendor || 'Fournisseur inconnu';
          const inv = extracted.invoice_number || '';
          const dt = extracted.date ? new Date(extracted.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '';
          const name = `${vendor}${inv ? ` - ${inv}` : ''}${dt ? ` (${dt})` : ''}`;
          const ru = r.receipt_url || (r.expense as any)?.receipt_url || '';
          const pages = seg ? `p.${seg.startPage}${seg.endPage && seg.endPage > seg.startPage ? `-${seg.endPage}` : ''}` : undefined;
          newFiles.push({
            id: generateId(), file: new File([], name), preview: '', status: 'complete', progress: 100,
            result: { extracted, expense: r.expense as { id: string; [key: string]: unknown }, receipt_url: ru },
            sourcePdfName: file.name, segmentPages: pages, documentType: (extracted as any).document_type || undefined, receiptUrl: ru || undefined,
          });
        } else {
          failed.push({ pages: seg ? `p.${seg.startPage}-${seg.endPage || seg.startPage}` : `Segment ${i + 1}`, error: r.error || 'Erreur inconnue' });
        }
      }

      if (newFiles.length === 0) {
        const detail = failed.map(f => `${f.pages}: ${f.error}`).join('\n');
        updateFile(fileId, { status: 'error', error: `Aucune facture extraite.\n${detail}` });
        toast.error('Extraction échouée', { description: detail, duration: 12000 });
        return;
      }
      setFiles(prev => {
        const t = prev.find(f => f.id === fileId);
        if (t?.preview?.startsWith('blob:')) URL.revokeObjectURL(t.preview);
        return [...prev.filter(f => f.id !== fileId), ...newFiles];
      });
      if (failed.length > 0) {
        setFiles(prev => [...prev, ...failed.map(f => ({
          id: generateId(), file: new File([], `${file.name} - ${f.pages}`), preview: '', status: 'error' as const, progress: 0,
          error: f.error, sourcePdfName: file.name, segmentPages: f.pages,
        }))]);
        toast.warning(`${newFiles.length}/${segments.length} factures extraites`, { description: failed.map(f => `${f.pages}: ${f.error}`).join('; '), duration: 10000 });
      } else {
        toast.success(`${newFiles.length} facture(s) extraite(s) !`, { description: newFiles.map(f => f.result?.extracted?.vendor).filter(Boolean).join(', ') || undefined, duration: 6000 });
      }
      fetchDbExpenses();
    } catch (err: any) {
      updateFile(fileId, { status: 'error', progress: 0, error: err.message || 'Erreur inconnue' });
      toast.error(`Erreur : ${err.message || 'extraction échouée'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [updateFile, fetchDbExpenses, editedSegments]);

  const BATCH_SIZE = 3;
  const processAllFiles = useCallback(async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) { toast.info('Ajoutez des fichiers à scanner'); return; }
    setIsProcessing(true);
    setBatchProgress({ current: 0, total: pending.length });
    try {
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        await Promise.allSettled(pending.slice(i, i + BATCH_SIZE).map(f => processFile(f)));
        setBatchProgress({ current: Math.min(i + BATCH_SIZE, pending.length), total: pending.length });
      }
      toast.success('Analyse terminée !');
      fetchDbExpenses();
    } finally {
      setIsProcessing(false);
      setBatchProgress(null);
    }
  }, [files, processFile, fetchDbExpenses]);

  // ── Vérifier (statut reviewed) ───────────────────────────────────────────
  const verifyExpense = useCallback(async (scanned: ScannedFile) => {
    if (!scanned.result?.expense?.id) { toast.error('Aucune dépense à sauvegarder'); return; }
    try {
      const res = await fetch(`/api/expenses/${scanned.result.expense.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reviewed', ...(selectedClientId && { client_id: selectedClientId }), ...(projectCode && { project_code: projectCode }) }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; toast.error(`Erreur : ${e.error || 'inconnue'}`); return; }
    } catch { toast.error('Impossible de contacter le serveur.'); return; }
    removeFile(scanned.id);
    setReviewingFile(null); setEditMode(false);
    fetchDbExpenses();
    toast.success('Document vérifié');
  }, [removeFile, selectedClientId, projectCode, fetchDbExpenses]);

  // ── Corriger + vérifier (file) ───────────────────────────────────────────
  const saveWithEdits = useCallback(async (scanned: ScannedFile) => {
    if (!editData) return;
    const id = scanned.result?.expense?.id;
    if (id) {
      try {
        const res = await fetch(`/api/expenses/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor: editData.vendor, amount: editData.amount, vat_amount: editData.vat_amount,
            date: editData.date, category: editData.category, description: editData.description, status: 'reviewed',
            ...(editData.accounting_code && { account_code: editData.accounting_code }),
            ...(editData.account_label && { account_label: editData.account_label }),
            ...(selectedClientId && { client_id: selectedClientId }), ...(projectCode && { project_code: projectCode }),
          }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; toast.error(`Sauvegarde impossible : ${e.error || 'inconnue'}`); return; }
      } catch { toast.error('Impossible de contacter le serveur.'); return; }
      if (editData.vendor) {
        try {
          await getSupabaseClient().from('vendor_mappings').upsert({
            user_id: user?.id, vendor_name_pattern: editData.vendor.toLowerCase().trim(),
            raw_vendor: editData.vendor.toLowerCase().trim(), account_code: editData.accounting_code || null,
            account_name: editData.account_label || null, corrected_vendor: editData.vendor, corrected_category: editData.category,
          }, { onConflict: 'user_id,vendor_name_pattern' });
        } catch { /* non-critique */ }
      }
    }
    removeFile(scanned.id);
    setReviewingFile(null); setEditMode(false);
    fetchDbExpenses();
    toast.success('Dépense corrigée et vérifiée');
  }, [editData, removeFile, selectedClientId, projectCode, user, fetchDbExpenses]);

  // ── Ouvrir un fichier en révision ────────────────────────────────────────
  const openFileReview = useCallback((f: ScannedFile) => {
    setReviewingDbExpense(null); setDbEditMode(false);
    setReviewingFile(f);
    setEditMode(false);
    setZoom(1);
    if (f.result?.extracted) setEditData({ ...f.result.extracted });
  }, []);

  // ── Ouvrir une dépense DB en révision ────────────────────────────────────
  const loadExpenseForReview = useCallback((e: DbExpense) => {
    setReviewingFile(null); setEditMode(false);
    setReviewingDbExpense(e);
    setSelectedClientId(e.client_id || '');
    setProjectCode(e.project_code || '');
    setDbEditMode(false);
    setZoom(1);
    setDbEditData({
      vendor: e.vendor || '', amount: e.amount || 0, vat_amount: e.vat_amount || 0, ht_amount: htOf(e) || 0,
      date: e.date || '', category: e.category || '', description: e.description || '',
      invoice_number: e.invoice_number || '', payment_method: e.payment_method || '', currency: e.currency || 'EUR',
      account_code: e.account_code || '', account_label: e.account_label || '',
    });
  }, []);

  // ── Sauver les edits DB ──────────────────────────────────────────────────
  const saveDbEdits = useCallback(async () => {
    if (!dbEditData || !reviewingDbExpense) return;
    try {
      const res = await fetch(`/api/expenses/${reviewingDbExpense.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: dbEditData.vendor, amount: dbEditData.amount, vat_amount: dbEditData.vat_amount, ht_amount: dbEditData.ht_amount,
          date: dbEditData.date, category: dbEditData.category, description: dbEditData.description, status: 'reviewed',
          invoice_number: dbEditData.invoice_number, payment_method: dbEditData.payment_method, currency: dbEditData.currency,
          ...(dbEditData.account_code ? { account_code: dbEditData.account_code } : {}),
          ...(dbEditData.account_label ? { account_label: dbEditData.account_label } : {}),
          ...(selectedClientId && { client_id: selectedClientId }), ...(projectCode && { project_code: projectCode }),
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; toast.error(`Erreur : ${e.error || 'inconnue'}`); return; }
      if (dbEditData.vendor) {
        try {
          await getSupabaseClient().from('vendor_mappings').upsert({
            user_id: user?.id, vendor_name_pattern: dbEditData.vendor.toLowerCase().trim(),
            raw_vendor: dbEditData.vendor.toLowerCase().trim(), corrected_vendor: dbEditData.vendor, corrected_category: dbEditData.category,
          }, { onConflict: 'user_id,vendor_name_pattern' });
        } catch { /* non-critique */ }
      }
      setDbEditMode(false);
      fetchDbExpenses();
      toast.success('Dépense corrigée et vérifiée');
    } catch { toast.error('Impossible de sauvegarder les corrections.'); }
  }, [dbEditData, reviewingDbExpense, selectedClientId, projectCode, user, fetchDbExpenses]);

  const updateExpenseStatus = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; toast.error(`Erreur : ${e.error || 'inconnue'}`); return; }
      fetchDbExpenses();
      toast.success('Statut mis à jour');
    } catch { toast.error('Impossible de mettre à jour le statut.'); }
  }, [fetchDbExpenses]);

  // ── Ré-analyser (re-OCR du justificatif stocké) ───────────────────────────
  const reanalyzeDb = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/ai/ocr-reanalyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expense_id: id }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { toast.error(`Ré-analyse impossible : ${data.error || 'inconnue'}`); return; }
      await fetchDbExpenses();
      toast.success('Document ré-analysé');
    } catch { toast.error('Impossible de contacter le serveur.'); }
  }, [fetchDbExpenses]);

  // ── Supprimer (dépense) ───────────────────────────────────────────────────
  const deleteDbExpense = useCallback(async (id: string) => {
    try {
      const { error } = await getSupabaseClient().from('expenses').delete().eq('id', id);
      if (error) { toast.error(`Suppression impossible : ${error.message}`); return; }
      setReviewingDbExpense(null); setDbEditMode(false);
      fetchDbExpenses();
      toast.success('Dépense supprimée');
    } catch { toast.error('Impossible de supprimer.'); }
  }, [fetchDbExpenses]);

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }, [addFiles]);

  // ── Listes par onglet ─────────────────────────────────────────────────────
  const inboxFiles = files; // tous les fichiers de la session
  const reviewableFiles = files.filter(f => f.status === 'complete' && f.result);
  // AXIOM (CIBLE 4) — persistance anti-amnésie : on fusionne les fichiers extraits
  // de la session (state volatile, perdu au refresh) AVEC les dépenses BDD au
  // statut 'pending'. Comme chaque extraction est déjà insérée en base
  // (lib/ocr-core.ts: status 'pending'), les factures « À vérifier » survivent
  // désormais au rafraîchissement. Dédup : une dépense déjà représentée par un
  // fichier de session n'est pas réaffichée en double.
  const sessionExpenseIds = new Set(
    reviewableFiles.map(f => f.result?.expense?.id).filter(Boolean) as string[]
  );
  const pendingDbExpenses = dbExpenses.filter(
    e => e.status === 'pending' && !sessionExpenseIds.has(e.id)
  );
  const doneExpenses = dbExpenses.filter(e => e.status === 'validated' || e.status === 'exported' || e.status === 'reviewed');

  const pendingCount = files.filter(f => f.status === 'pending').length;

  // ── Aperçu actif ──────────────────────────────────────────────────────────
  const previewUrl = reviewingFile
    ? (reviewingFile.receiptUrl || reviewingFile.result?.receipt_url || reviewingFile.preview || pdfObjectUrl || '')
    : (reviewingDbExpense?.receipt_url || '');
  const previewIsPdf = !!(
    previewUrl?.toLowerCase().endsWith('.pdf') ||
    reviewingFile?.file?.type === 'application/pdf'
  );

  // ZEUS (CIBLE 2) — résout le justificatif (bucket privé `receipts`) en URL signée.
  // Les URLs publiques getPublicUrl renvoyaient 404 « Bucket not found » ; on minte
  // ici une URL signée courte durée (les blob/data/`assets` passent tels quels).
  const { url: signedPreviewUrl, loading: previewLoading } = useSignedUrl(previewUrl);

  // ══════════════════════════════════════════════════════════════════════════
  if (!isBusiness) return <PaywallSection />;

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#09090B] text-gray-900 dark:text-zinc-100 overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-white/[0.06] bg-[#FFFFFF] dark:bg-[#0C0C0F] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Scan className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">Scan OCR</h1>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Extraction multi-factures · Mistral + Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InboxAddressChip />
          {pendingCount > 0 && (
            <button onClick={processAllFiles} disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {batchProgress ? `Analyse ${batchProgress.current}/${batchProgress.total}` : `Analyser ${pendingCount} fichier(s)`}
            </button>
          )}
          <Link href="/expenses" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] px-3 py-2 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition">
            Notes de frais <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Body : 3 zones ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* ═══ RAIL INBOX ═══ */}
        <aside className="w-[340px] flex-shrink-0 border-r border-gray-200 dark:border-white/[0.06] bg-[#FFFFFF] dark:bg-[#0C0C0F] flex flex-col min-h-0">
          {/* Dropzone */}
          <div className="p-3">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition",
                isDragging ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-gray-200 dark:border-white/[0.1] hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              )}
            >
              <Upload className={cn("w-6 h-6 mx-auto mb-2 transition", isDragging ? "text-emerald-500" : "text-gray-400 dark:text-zinc-500")} />
              <p className="text-xs font-semibold">Glissez vos factures</p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">PDF multi-pages, JPG, PNG · 20 Mo max</p>
              <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" className="hidden"
                onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 pb-2">
            {([
              { k: 'inbox', label: 'File d\'attente', count: inboxFiles.length },
              { k: 'review', label: 'À vérifier', count: reviewableFiles.length + pendingDbExpenses.length },
              { k: 'done', label: 'Historique', count: doneExpenses.length },
            ] as const).map(t => (
              <button key={t.k} onClick={() => setActiveTab(t.k)}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1.5",
                  activeTab === t.k
                    ? "bg-gray-900 dark:bg-white/[0.08] text-white dark:text-white"
                    : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                )}>
                {t.label}
                {t.count > 0 && <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", activeTab === t.k ? "bg-white/20" : "bg-gray-200 dark:bg-white/[0.08]")}>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 min-h-0">
            {activeTab === 'inbox' && inboxFiles.length === 0 && (
              <EmptyHint icon={Inbox} text="Aucun fichier. Glissez une facture pour commencer." />
            )}
            {activeTab === 'review' && reviewableFiles.length === 0 && pendingDbExpenses.length === 0 && (
              <EmptyHint icon={Eye} text="Les factures extraites apparaissent ici pour vérification." />
            )}
            {activeTab === 'done' && doneExpenses.length === 0 && (
              <EmptyHint icon={Archive} text="Vos dépenses traitées s'afficheront ici." />
            )}

            {activeTab === 'inbox' && inboxFiles.map(f => (
              <FileRow key={f.id} file={f} active={reviewingFile?.id === f.id} onClick={() => openFileReview(f)} onRemove={() => removeFile(f.id)} />
            ))}
            {activeTab === 'review' && reviewableFiles.map(f => (
              <FileRow key={f.id} file={f} active={reviewingFile?.id === f.id} onClick={() => openFileReview(f)} onRemove={() => removeFile(f.id)} />
            ))}
            {activeTab === 'review' && pendingDbExpenses.map(e => (
              <DbRow key={`db-${e.id}`} exp={e} active={reviewingDbExpense?.id === e.id} onClick={() => loadExpenseForReview(e)} />
            ))}
            {activeTab === 'done' && doneExpenses.map(e => (
              <DbRow key={e.id} exp={e} active={reviewingDbExpense?.id === e.id} onClick={() => loadExpenseForReview(e)} />
            ))}
            {loadingHistory && <p className="text-center text-[10px] text-gray-400 py-2">Chargement…</p>}
          </div>
        </aside>

        {/* ═══ ZONE CENTRE + FORME (double-écran) ═══ */}
        <main className="flex-1 flex min-h-0">
          {/* — Confirmateur de segments (inline, remplace le popup) — */}
          {pendingSegments ? (
            <SegmentConfirmer
              pending={pendingSegments}
              edited={editedSegments}
              onEdit={(i, vendor) => setEditedSegments(prev => prev.map((s, idx) => idx === i ? { ...s, vendor } : s))}
              onCancel={() => { setPendingSegments(null); updateFile(pendingSegments.fileId, { status: 'pending', progress: 0 }); }}
              onConfirm={() => processSegmentsFromPdf(pendingSegments)}
              processing={isProcessing}
            />
          ) : !reviewingFile && !reviewingDbExpense ? (
            /* — État vide — */
            <div className="flex-1 flex items-center justify-center p-10">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <FileImage className="w-7 h-7 text-gray-300 dark:text-zinc-600" />
                </div>
                <h2 className="text-lg font-semibold">Sélectionnez un document</h2>
                <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1.5 leading-relaxed">
                  Uploadez une facture puis cliquez dessus pour ouvrir la validation en double-écran : aperçu à gauche, champs à corriger à droite.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ═══ Aperçu document (gauche, "papier sur le bureau") ═══ */}
              <section className="flex-1 min-h-0 bg-[#F4F4F5] dark:bg-[#09090B] flex flex-col">
                <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between border-b border-gray-200 dark:border-white/[0.04]">
                  <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 truncate max-w-[60%]">
                    {reviewingFile ? (reviewingFile.sourcePdfName || reviewingFile.file.name) : (reviewingDbExpense?.vendor || 'Document')}
                    {reviewingFile?.segmentPages && <span className="text-gray-400 dark:text-zinc-600"> · {reviewingFile.segmentPages}</span>}
                  </p>
                  {previewUrl && (
                    <div className="flex items-center gap-1">
                      <IconBtn onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}><ZoomOut className="w-3.5 h-3.5" /></IconBtn>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 w-9 text-center font-mono">{Math.round(zoom * 100)}%</span>
                      <IconBtn onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}><ZoomIn className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn onClick={() => setZoom(1)}><RotateCw className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-auto min-h-0 flex items-start justify-center p-6">
                  {previewUrl ? (
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}
                      className="shadow-2xl shadow-black/20 rounded-lg overflow-hidden bg-white">
                      {previewLoading ? (
                        <div className="w-[480px] h-[680px] flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-zinc-500" />
                        </div>
                      ) : previewIsPdf ? (
                        <iframe src={signedPreviewUrl || ''} title="Aperçu" className="w-[480px] h-[680px] bg-white" />
                      ) : (
                        <img src={signedPreviewUrl || ''} alt="Aperçu" className="w-[480px] max-w-none object-contain" />
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 dark:text-zinc-600 mt-20">
                      <FileImage className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Aucun aperçu disponible</p>
                    </div>
                  )}
                </div>
              </section>

              {/* ═══ Pièce comptable (droite, formulaire de validation) ═══ */}
              <section className="w-[420px] flex-shrink-0 border-l border-gray-200 dark:border-white/[0.06] bg-[#FFFFFF] dark:bg-[#0C0C0F] flex flex-col min-h-0">
                <ReviewForm
                  reviewingFile={reviewingFile}
                  reviewingDbExpense={reviewingDbExpense}
                  editMode={editMode}
                  editData={editData}
                  setEditData={setEditData}
                  dbEditMode={dbEditMode}
                  dbEditData={dbEditData}
                  setDbEditData={setDbEditData}
                  selectedClientId={selectedClientId}
                  setSelectedClientId={setSelectedClientId}
                  projectCode={projectCode}
                  setProjectCode={setProjectCode}
                  clients={clients}
                  onStartEdit={() => setEditMode(true)}
                  onCancelEdit={() => { setEditMode(false); if (reviewingFile?.result?.extracted) setEditData({ ...reviewingFile.result.extracted }); }}
                  onVerifyFile={verifyExpense}
                  onSaveFile={saveWithEdits}
                  onStartDbEdit={() => setDbEditMode(true)}
                  onCancelDbEdit={() => setDbEditMode(false)}
                  onSaveDb={saveDbEdits}
                  onClose={() => { setReviewingFile(null); setReviewingDbExpense(null); setEditMode(false); setDbEditMode(false); }}
                  onArchive={(id) => { updateExpenseStatus(id, 'validated'); setReviewingDbExpense(null); }}
                  onDeleteDb={deleteDbExpense}
                  onReanalyzeDb={reanalyzeDb}
                />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Sous-composants
// ════════════════════════════════════════════════════════════════════════════

function EmptyHint({ icon: Icon, text }: { icon: typeof Inbox; text: string }) {
  return (
    <div className="text-center py-10 px-3">
      <Icon className="w-6 h-6 mx-auto mb-2 text-gray-300 dark:text-zinc-700" />
      <p className="text-[11px] text-gray-400 dark:text-zinc-600 leading-relaxed">{text}</p>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded-md text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-zinc-200 transition">
      {children}
    </button>
  );
}

// ATHÉNA CIBLE 4 — génère un thumbnail (PNG dataURL) de la 1ʳᵉ page d'un PDF via pdfjs,
// pour la barre latérale de l'OCR. Même config worker que PdfPreviewModal (CDN unpkg),
// repli sur le main thread si le worker échoue. Renvoie '' en cas d'erreur (placeholder).
async function generatePdfThumbnail(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    } catch { /* worker indisponible → rendu sur le main thread */ }
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.4 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    await page.render({ canvasContext: ctx, viewport, background: '#ffffff' } as any).promise;
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

function FileRow({ file, active, onClick, onRemove }: {
  file: ScannedFile; active: boolean; onClick?: () => void; onRemove: () => void;
}) {
  const ext = file.result?.extracted;
  const conf = ext ? getConfidenceColor(ext.confidence) : null;
  const isProcessing = file.status === 'uploading' || file.status === 'analyzing' || file.status === 'segmenting';
  const clickable = !!onClick;

  return (
    <div onClick={onClick}
      className={cn(
        "group rounded-lg p-2.5 transition flex items-start gap-2.5",
        clickable && "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]",
        active && "bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30",
        !clickable && !active && "opacity-70"
      )}>
      <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
        {file.preview ? (
          <img src={file.preview} alt="" className="w-full h-full object-cover rounded-md" />
        ) : file.file.type === 'application/pdf' ? (
          <div className="w-full h-full rounded-md bg-rose-500/10 flex items-center justify-center">
            <span className="text-[8px] font-black text-rose-500 tracking-tight">PDF</span>
          </div>
        ) : (
          <FileText className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold truncate flex-1">{ext?.vendor || file.file.name}</p>
          {file.segmentPages && <span className="text-[9px] font-mono text-gray-400 dark:text-zinc-600 flex-shrink-0">{file.segmentPages}</span>}
        </div>
        {ext ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold tabular-nums">{formatCurrency(ext.amount)}</span>
            <span className={cn('w-1.5 h-1.5 rounded-full', conf?.dot)} title={conf?.label} />
            {ext.is_duplicate && <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">DOUBLON</span>}
          </div>
        ) : isProcessing ? (
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Analyse… {file.progress}%</p>
        ) : file.status === 'error' ? (
          <p className="text-[10px] text-rose-500 mt-0.5 truncate">{file.error || 'Erreur'}</p>
        ) : (
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">En attente</p>
        )}
        {isProcessing && (
          <div className="h-0.5 bg-gray-200 dark:bg-white/[0.06] rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${file.progress}%` }} />
          </div>
        )}
      </div>
      {!isProcessing && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-rose-500 transition flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function DbRow({ exp, active, onClick }: { exp: DbExpense; active: boolean; onClick: () => void }) {
  const conf = exp.ocr_confidence ? getConfidenceColor(exp.ocr_confidence) : null;
  return (
    <div onClick={onClick}
      className={cn("rounded-lg p-2.5 cursor-pointer transition flex items-start gap-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.03]",
        active && "bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30")}>
      <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
        {exp.receipt_url ? <ReceiptImg url={exp.receipt_url} className="w-full h-full object-cover rounded-md" loadingClassName="w-3.5 h-3.5 animate-spin text-gray-400 dark:text-zinc-500" /> : <FileText className="w-4 h-4 text-gray-400 dark:text-zinc-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{exp.vendor || 'Fournisseur inconnu'}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs font-bold tabular-nums">{formatCurrency(exp.amount)}</span>
          {conf && <span className={cn('w-1.5 h-1.5 rounded-full', conf.dot)} />}
          <span className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-zinc-600 ml-auto">{exp.status}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Confirmateur de segments (remplace le popup multicolore) ──────────────
function SegmentConfirmer({ pending, edited, onEdit, onCancel, onConfirm, processing }: {
  pending: { file: File; segments: Array<{ startPage: number; endPage: number | null; vendor: string | null }>; totalPages: number };
  edited: Array<{ vendor: string }>;
  onEdit: (i: number, vendor: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  processing: boolean;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="max-w-lg w-full rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0C0C0F] p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h2 className="text-base font-bold">{pending.segments.length} factures détectées</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
          L'IA a segmenté « {pending.file.name} » ({pending.totalPages} pages). Vérifiez les fournisseurs puis lancez l'extraction.
        </p>
        <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
          {pending.segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.08] p-2.5">
              <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 w-12 flex-shrink-0">p.{s.startPage}{s.endPage && s.endPage > s.startPage ? `-${s.endPage}` : ''}</span>
              <input value={edited[i]?.vendor ?? ''} onChange={(e) => onEdit(i, e.target.value)} placeholder="Fournisseur…"
                className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder:text-gray-300 dark:placeholder:text-zinc-600" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition">Annuler</button>
          <button onClick={onConfirm} disabled={processing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition hover:-translate-y-0.5">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Extraire {pending.segments.length} facture(s)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulaire de validation (pièce comptable) ────────────────────────────
function ReviewForm(props: {
  reviewingFile: ScannedFile | null;
  reviewingDbExpense: DbExpense | null;
  editMode: boolean;
  editData: ExtractedData | null;
  setEditData: (d: ExtractedData | null) => void;
  dbEditMode: boolean;
  dbEditData: { vendor: string; amount: number; vat_amount: number; ht_amount: number; date: string; category: string; description: string; invoice_number: string; payment_method: string; currency: string; account_code: string; account_label: string } | null;
  setDbEditData: (d: any) => void;
  selectedClientId: string;
  setSelectedClientId: (s: string) => void;
  projectCode: string;
  setProjectCode: (s: string) => void;
  clients: any[] | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onVerifyFile: (f: ScannedFile) => void;
  onSaveFile: (f: ScannedFile) => void;
  onStartDbEdit: () => void;
  onCancelDbEdit: () => void;
  onSaveDb: () => void;
  onClose: () => void;
  onArchive: (id: string) => void;
  onDeleteDb: (id: string) => void;
  onReanalyzeDb: (id: string) => void;
}) {
  const f = props.reviewingFile;
  const db = props.reviewingDbExpense;

  // Données affichées/éditées
  const ext = f?.result?.extracted;
  const acct = props.editMode && props.editData?.category
    ? CATEGORY_ACCOUNTING[props.editData.category] || CATEGORY_ACCOUNTING.other
    : (ext?.accounting_code ? { code: ext.accounting_code, label: ext.account_label || '' } : (ext?.category ? CATEGORY_ACCOUNTING[ext.category] || CATEGORY_ACCOUNTING.other : null));

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* En-tête formulaire */}
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-[0.14em]">Pièce comptable</h3>
        </div>
        <button onClick={props.onClose} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 min-h-0">
        {f && !ext && !props.editMode && (
          <div className="text-center py-12">
            {f.status === 'error' ? (
              <>
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                <p className="text-sm font-semibold text-rose-500">Échec de l'analyse</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{f.error}</p>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 mx-auto mb-3 text-emerald-500 animate-spin" />
                <p className="text-sm font-semibold">{f.status === 'pending' ? "En attente d'analyse" : 'Analyse en cours…'}</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Lancez l'analyse depuis l'en-tête pour extraire les données.</p>
              </>
            )}
          </div>
        )}
        {f && !props.editMode && ext && (
          <>
            {ext.is_duplicate && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300">Doublon possible — cette facture ressemble à une dépense existante.</p>
              </div>
            )}
            <DetailView label="Fournisseur" value={ext.vendor || '—'} />
            {ext.invoice_number && <DetailView label="N° facture" value={ext.invoice_number} mono />}
            <DetailView label="Date" value={ext.date ? new Date(ext.date).toLocaleDateString('fr-FR') : '—'} />
            <DetailView label="Montant TTC" value={formatCurrency(ext.amount)} strong />
            <div className="grid grid-cols-2 gap-3">
              <DetailView label="HT" value={formatCurrency(htOf(ext))} />
              <DetailView label="TVA" value={formatCurrency(ext.vat_amount)} />
            </div>
            <DetailView label="Catégorie" value={CATEGORIES.find(c => c.value === ext.category)?.label || ext.category || '—'} />
            {ext.description && <DetailView label="Description" value={ext.description} />}
            {acct && (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] px-3 py-2">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{acct.code}</span>
                <span className="text-[11px] text-gray-500 dark:text-zinc-400">{acct.label}</span>
              </div>
            )}
            {ext.line_items && ext.line_items.length > 0 && (
              <details className="rounded-lg border border-gray-200 dark:border-white/[0.08] px-3 py-2">
                <summary className="text-[11px] font-semibold cursor-pointer text-gray-500 dark:text-zinc-400">{ext.line_items.length} ligne(s) détaillée(s)</summary>
                <div className="mt-2 space-y-1">
                  {ext.line_items.map((li, i) => (
                    <div key={i} className="flex justify-between text-[10px] text-gray-500 dark:text-zinc-400">
                      <span className="truncate pr-2">{li.description}</span>
                      <span className="font-mono tabular-nums flex-shrink-0">{formatCurrency(li.total)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {f && props.editMode && props.editData && (
          <EditFields
            vendor={props.editData.vendor} amount={props.editData.amount} ht_amount={props.editData.ht_amount}
            vat_amount={props.editData.vat_amount} date={props.editData.date} category={props.editData.category}
            description={props.editData.description} acctCode={acct?.code} acctLabel={acct?.label}
            onChange={(patch) => props.setEditData({ ...(props.editData as ExtractedData), ...patch })}
            clients={props.clients} selectedClientId={props.selectedClientId} setSelectedClientId={props.setSelectedClientId}
            projectCode={props.projectCode} setProjectCode={props.setProjectCode}
          />
        )}

        {db && !props.dbEditMode && (
          <>
            <DetailView label="Fournisseur" value={db.vendor || '—'} />
            {db.invoice_number && <DetailView label="N° facture" value={db.invoice_number} mono />}
            <DetailView label="Date" value={db.date ? new Date(db.date).toLocaleDateString('fr-FR') : '—'} />
            <DetailView label="Montant TTC" value={formatCurrency(db.amount)} strong />
            <div className="grid grid-cols-2 gap-3">
              <DetailView label="HT" value={formatCurrency(htOf(db))} />
              <DetailView label="TVA" value={formatCurrency(db.vat_amount)} />
            </div>
            <DetailView label="Catégorie" value={CATEGORIES.find(c => c.value === db.category)?.label || db.category || '—'} />
            {db.account_code && (
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] px-3 py-2">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{db.account_code}</span>
                <span className="text-[11px] text-gray-500 dark:text-zinc-400">{db.account_label || ''}</span>
              </div>
            )}
            <DetailView label="Statut" value={db.status} />
          </>
        )}

        {db && props.dbEditMode && props.dbEditData && (
          <EditFields
            vendor={props.dbEditData.vendor} amount={props.dbEditData.amount} ht_amount={props.dbEditData.ht_amount}
            vat_amount={props.dbEditData.vat_amount} date={props.dbEditData.date} category={props.dbEditData.category}
            description={props.dbEditData.description}
            invoiceNumber={props.dbEditData.invoice_number} paymentMethod={props.dbEditData.payment_method}
            currency={props.dbEditData.currency} accountCode={props.dbEditData.account_code} accountLabel={props.dbEditData.account_label}
            onChange={(patch) => props.setDbEditData({ ...props.dbEditData, ...patch })}
            clients={props.clients} selectedClientId={props.selectedClientId} setSelectedClientId={props.setSelectedClientId}
            projectCode={props.projectCode} setProjectCode={props.setProjectCode}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.06] px-5 py-3 flex items-center gap-2">
        {f && !props.editMode && ext && (
          <>
            <button onClick={props.onStartEdit} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.1] py-2.5 text-sm font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition">
              <Edit2 className="w-4 h-4" /> Corriger
            </button>
            <button onClick={() => props.onVerifyFile(f)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5">
              <Check className="w-4 h-4" /> Vérifier
            </button>
          </>
        )}
        {f && props.editMode && (
          <>
            <button onClick={props.onCancelEdit} className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.1] py-2.5 text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition">Annuler</button>
            <button onClick={() => props.onSaveFile(f)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5">
              <Check className="w-4 h-4" /> Enregistrer
            </button>
          </>
        )}
        {db && !props.dbEditMode && (
          <>
            <button onClick={props.onStartDbEdit} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.1] py-2.5 text-sm font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition">
              <Edit2 className="w-4 h-4" /> Corriger
            </button>
            <button onClick={() => props.onArchive(db.id)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5">
              <Archive className="w-4 h-4" /> Valider
            </button>
            <button onClick={() => props.onReanalyzeDb(db.id)} title="Ré-analyser l'extraction" className="inline-flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-500 dark:text-zinc-400 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => { if (confirm('Supprimer cette dépense et son justificatif ?')) props.onDeleteDb(db.id); }} title="Supprimer" className="inline-flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-500 dark:text-zinc-400 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        {db && props.dbEditMode && (
          <>
            <button onClick={props.onCancelDbEdit} className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.1] py-2.5 text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition">Annuler</button>
            <button onClick={props.onSaveDb} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5">
              <Check className="w-4 h-4" /> Enregistrer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DetailView({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 dark:border-white/[0.04] pb-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-zinc-500 flex-shrink-0">{label}</span>
      <span className={cn("text-sm text-right truncate", mono && "font-mono", strong ? "font-bold tabular-nums" : "text-gray-700 dark:text-zinc-200")}>{value}</span>
    </div>
  );
}

function EditFields({ vendor, amount, ht_amount, vat_amount, date, category, description, acctCode, acctLabel, invoiceNumber, paymentMethod, currency, accountCode, accountLabel, onChange, clients, selectedClientId, setSelectedClientId, projectCode, setProjectCode }: {
  vendor: string; amount: number; ht_amount: number; vat_amount: number; date: string; category: string; description: string;
  acctCode?: string; acctLabel?: string;
  invoiceNumber?: string; paymentMethod?: string; currency?: string;
  accountCode?: string; accountLabel?: string;
  onChange: (patch: any) => void;
  clients: any[] | null; selectedClientId: string; setSelectedClientId: (s: string) => void;
  projectCode: string; setProjectCode: (s: string) => void;
}) {
  return (
    <div className="space-y-3.5">
      <Field label="Fournisseur">
        <input className={inputCls} value={vendor} onChange={(e) => onChange({ vendor: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" className={inputCls} value={date ? date.slice(0, 10) : ''} onChange={(e) => onChange({ date: e.target.value })} /></Field>
        <Field label="Catégorie">
          <select className={inputCls} value={category} onChange={(e) => onChange({ category: e.target.value })}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Montant TTC" hint="€"><input type="number" step="0.01" className={cn(inputCls, "tabular-nums")} value={amount} onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="HT" hint="€"><input type="number" step="0.01" className={cn(inputCls, "tabular-nums")} value={ht_amount} onChange={(e) => onChange({ ht_amount: parseFloat(e.target.value) || 0 })} /></Field>
        <Field label="TVA" hint="€"><input type="number" step="0.01" className={cn(inputCls, "tabular-nums")} value={vat_amount} onChange={(e) => onChange({ vat_amount: parseFloat(e.target.value) || 0 })} /></Field>
      </div>
      <Field label="Description"><textarea className={cn(inputCls, "resize-none")} rows={2} value={description} onChange={(e) => onChange({ description: e.target.value })} /></Field>
      {invoiceNumber !== undefined && (
        <Field label="N° facture"><input className={cn(inputCls, "font-mono")} value={invoiceNumber} onChange={(e) => onChange({ invoice_number: e.target.value })} /></Field>
      )}
      {paymentMethod !== undefined && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mode règlement">
            <select className={inputCls} value={paymentMethod} onChange={(e) => onChange({ payment_method: e.target.value })}>
              <option value="">—</option>
              <option value="card">Carte</option>
              <option value="bank_transfer">Virement</option>
              <option value="direct_debit">Prélèvement</option>
              <option value="cash">Espèces</option>
              <option value="check">Chèque</option>
              <option value="other">Autre</option>
            </select>
          </Field>
          <Field label="Devise">
            <select className={inputCls} value={currency} onChange={(e) => onChange({ currency: e.target.value })}>
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
              <option value="GBP">GBP £</option>
              <option value="CHF">CHF</option>
            </select>
          </Field>
        </div>
      )}
      {accountCode !== undefined ? (
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <Field label="Code PCG"><input className={cn(inputCls, "font-mono")} value={accountCode} onChange={(e) => onChange({ account_code: e.target.value })} placeholder="607000" /></Field>
          <Field label="Libellé compte"><input className={inputCls} value={accountLabel} onChange={(e) => onChange({ account_label: e.target.value })} /></Field>
        </div>
      ) : acctCode ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] px-3 py-2">
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{acctCode}</span>
          <span className="text-[11px] text-gray-500 dark:text-zinc-400">{acctLabel || ''}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client">
          <select className={inputCls} value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            <option value="">—</option>
            {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Projet"><input className={inputCls} value={projectCode} onChange={(e) => setProjectCode(e.target.value)} /></Field>
      </div>
    </div>
  );
}

'use client';
import { toast } from 'sonner';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useThemeStore } from '@/stores/themeStore';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Receipt, Plus, Search, Edit2, Trash2, TrendingDown,
  X, Check, Calendar, Upload, FileImage, ExternalLink,
  ShoppingCart, Car, Coffee, Home, Laptop, Briefcase, MoreHorizontal,
  ArrowDownUp, Filter, Sparkles, ChevronDown, Clock,
  MapPin, Gauge, Users, FileText, Download,
  Info, Calculator,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiInvoiceUpload } from '@/components/ui/MultiInvoiceUpload';
import VoiceExpenseButton from '@/components/expenses/VoiceExpenseButton';

interface Expense {
  id: string;
  user_id: string;
  vendor: string;
  amount: number;
  vat_amount: number;
  category: string;
  date: string;
  description: string;
  receipt_url: string | null;
  payment_method: string;
  status: 'pending' | 'validated' | 'rejected';
  created_at: string;
  location_city?: string;
  location_country?: string;
  trip_type?: 'professional' | 'training' | 'client_meeting' | 'other';
  distance_km?: number;
  mileage_rate?: number;
  meal_allowance?: number;
  tax_free_amount?: number;
  client_id?: string;
  project_code?: string;
  is_deductible?: boolean;
}

const CATEGORIES = [
  { value: 'transport', label: 'Transport', icon: Car, dot: 'bg-blue-400' },
  { value: 'meals', label: 'Repas', icon: Coffee, dot: 'bg-amber-400' },
  { value: 'accommodation', label: 'Hebergement', icon: Home, dot: 'bg-green-400' },
  { value: 'equipment', label: 'Materiel', icon: Laptop, dot: 'bg-purple-400' },
  { value: 'office', label: 'Bureau', icon: Briefcase, dot: 'bg-cyan-400' },
  { value: 'shopping', label: 'Achats', icon: ShoppingCart, dot: 'bg-pink-400' },
  { value: 'mileage', label: 'IK', icon: Gauge, dot: 'bg-red-400' },
  { value: 'other', label: 'Autre', icon: MoreHorizontal, dot: 'bg-slate-400' },
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire' },
  { value: 'cash', label: 'Especes' },
  { value: 'transfer', label: 'Virement' },
  { value: 'check', label: 'Cheque' },
];

const MILEAGE_RATES_2024 = {
  3: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  4: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  5: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  6: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  7: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  8: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  9: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  10: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  11: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  12: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  13: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  14: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  15: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  16: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  17: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  18: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  19: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  20: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  21: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  22: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  23: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  24: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
  25: { d: 0.529, cv5_7: 0.595, cv8_10: 0.629, cv11_12: 0.657, cv13: 0.688 },
};

const MEAL_ALLOWANCE_2024 = {
  full_day: 20.20,
  half_day: 9.80,
};

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  pending: { label: 'En attente', dot: 'bg-amber-400' },
  validated: { label: 'Validee', dot: 'bg-emerald-400' },
  rejected: { label: 'Rejetee', dot: 'bg-red-400' },
  reviewed: { label: 'Revue', dot: 'bg-blue-400' },
};

const EMPTY_FORM = {
  vendor: '',
  amount: '',
  vat_amount: '',
  category: 'transport',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  payment_method: 'card',
  location_city: '',
  location_country: 'France',
  trip_type: 'professional' as 'professional' | 'training' | 'client_meeting' | 'other',
  distance_km: '',
  vehicle_cv: '',
  meal_type: 'full_day' as 'full_day' | 'half_day',
  client_id: '',
  project_code: '',
  is_deductible: true,
  tax_free_amount: '',
};

const getCat = (v: string) => CATEGORIES.find((c) => c.value === v) || CATEGORIES[CATEGORIES.length - 1];

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function calculateMileage(distance: number, cv: number): number {
  if (distance <= 0 || cv <= 0) return 0;
  const d = Math.floor(distance);
  let rate = 0;
  if (d <= 5000) {
    if (cv <= 3) rate = 0.529;
    else if (cv <= 7) rate = 0.595;
    else if (cv <= 10) rate = 0.629;
    else if (cv <= 12) rate = 0.657;
    else rate = 0.688;
  } else if (d <= 20000) {
    if (cv <= 3) rate = 0.529;
    else if (cv <= 7) rate = 0.595;
    else if (cv <= 10) rate = 0.629;
    else if (cv <= 12) rate = 0.657;
    else rate = 0.688;
  } else {
    if (cv <= 3) rate = 0.389;
    else if (cv <= 7) rate = 0.448;
    else if (cv <= 10) rate = 0.493;
    else if (cv <= 12) rate = 0.521;
    else rate = 0.548;
  }
  return Math.round(d * rate * 100) / 100;
}

function calculateMealAllowance(amount: number, type: 'full_day' | 'half_day'): { tax_free: number; taxable: number } {
  const allowance = type === 'full_day' ? MEAL_ALLOWANCE_2024.full_day : MEAL_ALLOWANCE_2024.half_day;
  const tax_free = Math.min(amount, allowance);
  const taxable = Math.max(0, amount - tax_free);
  return { tax_free, taxable };
}

// ─── Mobile Expense Card ───────────────────────────────────────────
function MobileExpenseCard({ expense, index, onEdit, onDelete, onValidate, isDark }: {
  expense: Expense;
  index: number;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
  onValidate: (id: string, status: 'validated' | 'rejected') => void;
  isDark: boolean;
}) {
  const cat = getCat(expense.category);
  const Icon = cat.icon;
  const statusCfg = STATUS_CONFIG[expense.status] || STATUS_CONFIG['pending'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease }}
      className={cn(
        "rounded-2xl p-5",
        isDark
          ? "bg-[#111113] border border-white/[0.08]"
          : "bg-white border border-gray-200"
      )}
    >
      {/* Top: category icon + vendor + amount */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          isDark ? "bg-white/[0.06]" : "bg-gray-100"
        )}>
          <Icon size={16} className={isDark ? "text-zinc-300" : "text-gray-600"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn("text-sm font-semibold truncate", isDark ? "text-white" : "text-gray-900")}>{expense.vendor}</p>
            <p className={cn("text-sm font-bold flex-shrink-0", isDark ? "text-white" : "text-gray-900")}>{formatCurrency(expense.amount)}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusCfg.dot)} />
            <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>{statusCfg.label}</span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-400")}>·</span>
            <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-400")}>
              {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap mt-3">
        <span className={cn('w-2 h-2 rounded-full', cat.dot)} />
        <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>{cat.label}</span>
        {expense.location_city && (
          <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>· {expense.location_city}</span>
        )}
        {expense.category === 'mileage' && expense.distance_km && (
          <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>· {expense.distance_km} km</span>
        )}
        {expense.tax_free_amount && expense.tax_free_amount > 0 && (
          <span className="text-xs text-emerald-500">· {formatCurrency(expense.tax_free_amount)} exonere</span>
        )}
      </div>

      {/* Actions */}
      <div className={cn("flex items-center justify-end gap-1 mt-3 pt-3 border-t", isDark ? "border-white/[0.06]" : "border-gray-200")}>
        {expense.receipt_url && (
          <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
            className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.06]" : "text-gray-400 hover:text-gray-900 hover:bg-gray-100")}>
            <FileImage size={14} />
          </a>
        )}
        {expense.status === 'pending' && (
          <button onClick={() => onValidate(expense.id, 'validated')}
            className="p-2 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors">
            <Check size={14} />
          </button>
        )}
        <button onClick={() => onEdit(expense)}
          className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.06]" : "text-gray-400 hover:text-gray-900 hover:bg-gray-100")}>
          <Edit2 size={14} />
        </button>
        <button onClick={() => onDelete(expense.id)}
          className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Desktop Table Row ─────────────────────────────────────────────
function DesktopTableRow({ expense, onEdit, onDelete, onValidate, isDark }: {
  expense: Expense;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
  onValidate: (id: string, status: 'validated' | 'rejected') => void;
  isDark: boolean;
}) {
  const cat = getCat(expense.category);
  const Icon = cat.icon;
  const statusCfg = STATUS_CONFIG[expense.status] || STATUS_CONFIG['pending'];

  return (
    <tr className={cn("group transition-colors", isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50")}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cat.dot)} />
          <span className={cn("text-sm", isDark ? "text-zinc-300" : "text-gray-700")}>{expense.vendor}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>{formatCurrency(expense.amount)}</span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon size={14} className={isDark ? "text-zinc-500" : "text-gray-400"} />
          <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>{cat.label}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>
          {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
          <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>{statusCfg.label}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {expense.receipt_url && (
            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
              className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-zinc-500 hover:text-white hover:bg-white/[0.06]" : "text-gray-400 hover:text-gray-900 hover:bg-gray-100")}>
              <FileImage size={13} />
            </a>
          )}
          {expense.status === 'pending' && (
            <button onClick={() => onValidate(expense.id, 'validated')}
              className="p-1.5 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors">
              <Check size={13} />
            </button>
          )}
          <button onClick={() => onEdit(expense)}
            className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-zinc-500 hover:text-white hover:bg-white/[0.06]" : "text-gray-400 hover:text-gray-900 hover:bg-gray-100")}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(expense.id)}
            className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ExpensesPage() {
  const { user } = useAuthStore();
  const { clients, fetchClients } = useDataStore();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMultiInvoiceModal, setShowMultiInvoiceModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [categorizingAI, setCategorizingAI] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) { setExpenses([]); setLoading(false); return; }
      const { error: checkError } = await supabase.from('expenses').select('id').limit(1);
      if (checkError && checkError.code === '42P01') {
        setExpenses([]); setLoading(false); return;
      }
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) { setExpenses([]); } else { setExpenses(data || []); }
    } catch { setExpenses([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
      if (!clients || clients.length === 0) fetchClients();
    }
  }, [user]);

  useEffect(() => {
    if (form.category === 'mileage' && form.distance_km && form.vehicle_cv) {
      const distance = parseFloat(form.distance_km);
      const cv = parseInt(form.vehicle_cv);
      if (distance > 0 && cv > 0) {
        set('amount', String(calculateMileage(distance, cv)));
        set('vat_amount', '0');
      }
    }
  }, [form.distance_km, form.vehicle_cv, form.category]);

  useEffect(() => {
    if (form.category === 'meals' && form.amount) {
      const amount = parseFloat(form.amount);
      if (amount > 0) {
        const { tax_free } = calculateMealAllowance(amount, form.meal_type);
        set('tax_free_amount', String(tax_free));
      }
    }
  }, [form.amount, form.meal_type, form.category]);

  const openCreate = () => {
    setForm(EMPTY_FORM); setReceiptUrl(null); setEditingId(null); setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setForm({
      vendor: e.vendor,
      amount: String(e.amount),
      vat_amount: String(e.vat_amount || ''),
      category: e.category,
      date: e.date,
      description: e.description || '',
      payment_method: e.payment_method,
      location_city: e.location_city || '',
      location_country: e.location_country || 'France',
      trip_type: (e.trip_type || 'professional') as 'professional' | 'training' | 'client_meeting' | 'other',
      distance_km: String(e.distance_km || ''),
      vehicle_cv: '',
      meal_type: 'full_day' as 'full_day' | 'half_day',
      client_id: e.client_id || '',
      project_code: e.project_code || '',
      is_deductible: e.is_deductible ?? true,
      tax_free_amount: String(e.tax_free_amount || ''),
    });
    setReceiptUrl(e.receipt_url);
    setEditingId(e.id);
    setShowModal(true);
  };

  const handleReceiptUpload = async (file: File) => {
    if (!user) return;
    setUploadingReceipt(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `receipts/${user.id}/${Date.now()}.${ext}`;
      await getSupabaseClient().storage.from('assets').upload(path, file, { upsert: true });
      const { data } = getSupabaseClient().storage.from('assets').getPublicUrl(path);
      setReceiptUrl(data.publicUrl);
      if (file.type.startsWith('image/')) handleOCR(file);
    } catch (e: any) { toast.error(e.message); } finally { setUploadingReceipt(false); }
  };

  const handleOCR = async (file: File) => {
    setOcrLoading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/ai/ocr-receipt', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { extracted } = data;
      if (extracted?.vendor) set('vendor', extracted.vendor);
      if (extracted?.amount) set('amount', String(extracted.amount));
      if (extracted?.vat_amount) set('vat_amount', String(extracted.vat_amount));
      if (extracted?.date) set('date', extracted.date);
      if (extracted?.description) set('description', extracted.description);
      if (extracted?.category) set('category', extracted.category);
    } catch { } finally { setOcrLoading(false); }
  };

  const handleCategorizeAI = async () => {
    if (!form.vendor && !form.description) return;
    setCategorizingAI(true);
    try {
      const res = await fetch('/api/ai/categorize-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: form.vendor, description: form.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.category) set('category', data.category);
    } catch { } finally { setCategorizingAI(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      let taxFreeAmount = 0;
      if (form.category === 'meals') {
        const amount = parseFloat(form.amount) || 0;
        const result = calculateMealAllowance(amount, form.meal_type);
        taxFreeAmount = result.tax_free;
      }
      const payload = {
        vendor: form.vendor,
        amount: parseFloat(form.amount) || 0,
        vat_amount: parseFloat(form.vat_amount) || 0,
        category: form.category,
        date: form.date,
        description: form.description,
        payment_method: form.payment_method,
        receipt_url: receiptUrl,
        status: 'pending' as const,
        user_id: user.id,
        location_city: form.location_city || null,
        location_country: form.location_country || 'France',
        trip_type: form.trip_type || 'professional',
        distance_km: form.category === 'mileage' ? parseFloat(form.distance_km) || 0 : null,
        mileage_rate: form.category === 'mileage' ? parseFloat(form.amount) / (parseFloat(form.distance_km) || 1) : null,
        meal_allowance: form.category === 'meals' ? MEAL_ALLOWANCE_2024[form.meal_type] : null,
        tax_free_amount: taxFreeAmount,
        client_id: form.client_id || null,
        project_code: form.project_code || null,
        is_deductible: form.is_deductible ?? true,
      };

      if (editingId) {
        const { data, error } = await getSupabaseClient()
          .from('expenses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId).select().single();
        if (error) throw error;
        setExpenses((es) => es.map((ex) => (ex.id === editingId ? data : ex)));
      } else {
        const { data, error } = await getSupabaseClient()
          .from('expenses').insert(payload).select().single();
        if (error) throw error;
        setExpenses((es) => [data, ...es]);
      }
      setShowModal(false);
      toast.success(editingId ? 'Depense mise a jour' : 'Depense ajoutee');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    toast('Supprimer cette note de frais ?', {
      action: {
        label: 'Supprimer',
        onClick: async () => {
          try { await getSupabaseClient().from('expenses').delete().eq('id', id); setExpenses((es) => es.filter((e) => e.id !== id)); toast.success('Depense supprimee'); }
          catch (e: any) { toast.error(e.message); }
        },
      },
    });
  };

  const handleValidate = async (id: string, status: 'validated' | 'rejected') => {
    const { data, error } = await getSupabaseClient()
      .from('expenses').update({ status }).eq('id', id).select().single();
    if (!error) setExpenses((es) => es.map((e) => (e.id === id ? data : e)));
  };

  const handleExportAccounting = async (format: 'csv' | 'fec' | 'pdf') => {
    const validated = expenses.filter(e => e.status === 'validated');
    if (validated.length === 0) { toast.error('Aucune depense validee a exporter'); return; }

    if (format === 'csv') {
      const headers = ['Date', 'Fournisseur', 'Description', 'Categorie', 'Montant TTC', 'TVA', 'Montant HT', 'Pays', 'Ville', 'Client', 'Projet', 'Deductible'];
      const rows = validated.map(e => [
        e.date, e.vendor, e.description || '', getCat(e.category).label,
        e.amount.toFixed(2), (e.vat_amount || 0).toFixed(2),
        ((e.amount || 0) - (e.vat_amount || 0)).toFixed(2),
        e.location_country || '', e.location_city || '',
        e.client_id || '', e.project_code || '',
        e.is_deductible ? 'Oui' : 'Non',
      ]);
      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_comptable_depenses_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV comptable reussi');
    }

    if (format === 'fec') {
      const fecContent = validated.map((e, idx) => {
        const date = e.date.replace(/-/g, '');
        return `${date.padEnd(8, '0')}000000   ${e.category.padEnd(4, '0')}   625000        DEPENSE         ${(e.amount / 100).toFixed(2).padStart(15, ' ')}          ${e.vendor.padEnd(30, ' ')}       ${e.description?.padEnd(30, ' ')}         ${idx + 1}`;
      }).join('\n');
      const blob = new Blob([fecContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FEC_Depenses_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export FEC reussi');
    }

    if (format === 'pdf') { toast.info('Export PDF en cours de developpement...'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter((e) => {
      const matchSearch = !q || e.vendor.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
      const matchCat = !filterCat || e.category === filterCat;
      const matchStatus = !filterStatus || e.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [expenses, search, filterCat, filterStatus]);

  const stats = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const totalMonth = expenses.filter((e) => e.date.startsWith(currentMonthPrefix)).reduce((s, e) => s + e.amount, 0);
    const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
    const totalVat = expenses.reduce((s, e) => s + (e.vat_amount || 0), 0);
    const totalMileage = expenses.filter(e => e.category === 'mileage').reduce((s, e) => s + (e.amount || 0), 0);
    const pending = expenses.filter((e) => e.status === 'pending').length;
    return { totalMonth, totalAll, totalVat, totalMileage, pending };
  }, [expenses]);

  const { totalMonth, totalAll, totalVat, totalMileage, pending } = stats;

  return (
    <div className={cn(
      "min-h-screen p-4 md:p-6 lg:p-8",
      isDark
        ? "bg-[#09090B]"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-50"
    )}>
      {/* ─── Header ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className={cn("text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-gray-900")}>Notes de Frais</h1>
          <p className={cn("mt-1 text-sm", isDark ? "text-zinc-500" : "text-gray-500")}>Legal FR · IK · Plafonds repas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* LOI 5 (SENTINEL) : Input vocal directement sur la page Notes de frais */}
          <VoiceExpenseButton
            onExpenseCreated={(expense) => setExpenses((prev) => [expense, ...prev])}
            variant="inline"
          />
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Nouvelle depense</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
          <button onClick={() => setShowMultiInvoiceModal(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors",
              isDark
                ? "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.12]"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
            )}>
            <Sparkles size={16} />
            <span className="hidden sm:inline">Multi-factures</span>
          </button>
          <Link href="/expenses/analytics"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors",
              isDark
                ? "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.12]"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
            )}>
            <TrendingDown size={16} />
            <span className="hidden sm:inline">Analytics</span>
          </Link>
          <button onClick={() => setShowExportModal(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors",
              isDark
                ? "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.12]"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
            )}>
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </motion.div>

      {/* ─── Stats Pills ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease }}
        className="flex flex-wrap gap-3 mb-6"
      >
        {[
          { label: 'Ce mois', value: formatCurrency(totalMonth), dot: 'bg-rose-400' },
          { label: 'Total', value: formatCurrency(totalAll), dot: 'bg-blue-400' },
          { label: 'TVA', value: formatCurrency(totalVat), dot: 'bg-emerald-400' },
          { label: 'IK', value: formatCurrency(totalMileage), dot: 'bg-amber-400' },
          { label: 'En attente', value: String(pending), dot: 'bg-purple-400' },
        ].map(({ label, value, dot }) => (
          <div key={label} className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5",
            isDark
              ? "bg-white/[0.04] border border-white/[0.08]"
              : "bg-gray-50 border border-gray-200"
          )}>
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
            <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-500")}>{label}</span>
            <span className={cn("text-xs font-semibold", isDark ? "text-white" : "text-gray-900")}>{value}</span>
          </div>
        ))}
      </motion.div>

      {/* ─── Filters ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease }}
        className="space-y-3 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-gray-400")} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un fournisseur, ville..."
              className={cn(
                "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                isDark
                  ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:border-white/[0.15]"
                  : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300"
              )}
            />
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {['', 'pending', 'validated'].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-xs font-medium transition-colors border',
                  filterStatus === s
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : isDark
                      ? 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:border-white/[0.12]'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                )}>
                {s === '' ? 'Tout' : s === 'pending' ? 'En attente' : 'Validees'}
              </button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setFilterCat('')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex-shrink-0',
              filterCat === ''
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : isDark
                  ? 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:border-white/[0.12]'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
            )}>
            Toutes
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button key={cat.value} onClick={() => setFilterCat(cat.value === filterCat ? '' : cat.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex-shrink-0',
                  filterCat === cat.value
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : isDark
                      ? 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:border-white/[0.12]'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                )}>
                <span className={cn('w-2 h-2 rounded-full', cat.dot)} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Content ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease }}
          className="flex flex-col items-center justify-center py-24"
        >
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
            isDark ? "bg-white/[0.04]" : "bg-gray-100"
          )}>
            <Receipt size={28} className={isDark ? "text-zinc-500" : "text-gray-400"} />
          </div>
          <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>Aucune depense trouvee</h3>
          <p className={cn("text-sm mb-6 text-center", isDark ? "text-zinc-400" : "text-gray-500")}>Notes de frais legales francaises avec IK et plafonds repas</p>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Ajouter une depense
          </button>
        </motion.div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((expense, i) => (
              <MobileExpenseCard
                key={expense.id}
                expense={expense}
                index={i}
                onEdit={openEdit}
                onDelete={handleDelete}
                onValidate={handleValidate}
                isDark={isDark}
              />
            ))}
          </div>

          {/* Desktop Table */}
          <div className={cn(
            "hidden md:block rounded-2xl overflow-hidden",
            isDark
              ? "bg-[#111113] border border-white/[0.08]"
              : "bg-white border border-gray-200"
          )}>
            <table className="w-full">
              <thead>
                <tr className={cn("border-b", isDark ? "border-white/[0.06]" : "border-gray-200")}>
                  <th className={cn("px-5 py-3 text-left text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-500" : "text-gray-500")}>Fournisseur</th>
                  <th className={cn("px-5 py-3 text-left text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-500" : "text-gray-500")}>Montant</th>
                  <th className={cn("px-5 py-3 text-left text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-500" : "text-gray-500")}>Categorie</th>
                  <th className={cn("px-5 py-3 text-left text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-500" : "text-gray-500")}>Date</th>
                  <th className={cn("px-5 py-3 text-left text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-500" : "text-gray-500")}>Statut</th>
                  <th className={cn("px-5 py-3 text-right text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-500" : "text-gray-500")}>Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-gray-200")}>
                {filtered.map((expense) => (
                  <DesktopTableRow
                    key={expense.id}
                    expense={expense}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onValidate={handleValidate}
                    isDark={isDark}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── Modal Creation/Edition ────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ duration: 0.3, ease }}
              className={cn(
                "w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden",
                isDark
                  ? "bg-[#111113] border border-white/[0.08]"
                  : "bg-white border border-gray-200"
              )}
            >
              {/* Modal header */}
              <div className={cn("px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0 border-b", isDark ? "border-white/[0.06]" : "border-gray-200")}>
                <div>
                  <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>{editingId ? 'Modifier la depense' : 'Nouvelle depense'}</h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-500" : "text-gray-500")}>Conforme legislation francaise</p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-white/[0.06] text-zinc-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-900")}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* Category Selection */}
                <div>
                  <label className={cn("text-xs font-medium uppercase tracking-wider block mb-2.5", isDark ? "text-zinc-500" : "text-gray-500")}>Categorie</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button key={cat.value} type="button" onClick={() => set('category', cat.value)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-colors',
                            form.category === cat.value
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : isDark
                                ? 'border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-300'
                                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          )}>
                          <div className="flex items-center gap-1.5">
                            <span className={cn('w-2 h-2 rounded-full', cat.dot)} />
                            <Icon size={14} />
                          </div>
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* OCR Loading */}
                {ocrLoading && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-purple-300">L'IA analyse votre justificatif...</p>
                  </motion.div>
                )}

                {/* Mileage Section */}
                {form.category === 'mileage' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className={cn(
                      "rounded-xl p-4 space-y-4",
                      isDark
                        ? "bg-white/[0.04] border border-white/[0.08]"
                        : "bg-gray-50 border border-gray-200"
                    )}>
                    <div className={cn("flex items-center gap-2", isDark ? "text-zinc-300" : "text-gray-700")}>
                      <Gauge size={16} />
                      <p className="text-sm font-medium">Indemnites Kilometriques (Bareme URSSAF 2024)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Distance (km)</label>
                        <input type="number" min="0" step="1" value={form.distance_km}
                          onChange={(e) => set('distance_km', e.target.value)} placeholder="Ex: 150"
                          className={cn(
                            "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                            isDark
                              ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-white/[0.15]"
                              : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-gray-300"
                          )} />
                      </div>
                      <div>
                        <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Puissance (CV)</label>
                        <select value={form.vehicle_cv} onChange={(e) => set('vehicle_cv', e.target.value)}
                          className={cn(
                            "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                            isDark
                              ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-white/[0.15]"
                              : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-gray-300"
                          )}>
                          <option value="">Selectionner...</option>
                          {Array.from({ length: 13 }, (_, i) => i + 1).map(cv => (
                            <option key={cv} value={cv}>{cv} CV</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {form.distance_km && form.vehicle_cv && (
                      <div className={cn("rounded-lg p-3", isDark ? "bg-white/[0.02]" : "bg-gray-100")}>
                        <Calculator size={14} className="text-emerald-400" />
                        <p className={cn("text-sm", isDark ? "text-zinc-300" : "text-gray-700")}>
                          <span className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>{formatCurrency(parseFloat(form.amount) || 0)}</span>
                          {' = '}{form.distance_km} km x {(parseFloat(form.amount) / (parseFloat(form.distance_km) || 1)).toFixed(3)} EUR/km
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Meals Section */}
                {form.category === 'meals' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className={cn(
                      "rounded-xl p-4 space-y-4",
                      isDark
                        ? "bg-white/[0.04] border border-white/[0.08]"
                        : "bg-gray-50 border border-gray-200"
                    )}>
                    <div className={cn("flex items-center gap-2", isDark ? "text-zinc-300" : "text-gray-700")}>
                      <Coffee size={16} />
                      <p className="text-sm font-medium">Frais de Repas (Plafond exoneration 2024)</p>
                    </div>
                    <div>
                      <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Type de repas</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'full_day', label: 'Journee complete', allowance: MEAL_ALLOWANCE_2024.full_day },
                          { value: 'half_day', label: 'Demi-journee', allowance: MEAL_ALLOWANCE_2024.half_day },
                        ].map((type) => (
                          <button key={type.value} type="button" onClick={() => set('meal_type', type.value)}
                            className={cn('p-3 rounded-xl border text-sm font-medium text-left transition-colors',
                              form.meal_type === type.value
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                : isDark
                                  ? 'border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:border-white/[0.12]'
                                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                            )}>
                            <p className="font-medium">{type.label}</p>
                            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-500" : "text-gray-500")}>Exonere jusqu'a {formatCurrency(type.allowance * 100)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    {form.amount && (
                      <div className={cn("rounded-lg p-3 space-y-2", isDark ? "bg-white/[0.02]" : "bg-gray-100")}>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>Montant total</span>
                          <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>{formatCurrency(parseFloat(form.amount))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>Part exoneree</span>
                          <span className="text-sm font-medium text-emerald-400">{formatCurrency(form.tax_free_amount ? parseFloat(form.tax_free_amount) : 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>Part imposable</span>
                          <span className="text-sm font-medium text-red-400">{formatCurrency(parseFloat(form.amount) - (form.tax_free_amount ? parseFloat(form.tax_free_amount) : 0))}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Vendor + AI Categorize */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={cn("text-xs font-medium uppercase tracking-wider", isDark ? "text-zinc-500" : "text-gray-500")}>Fournisseur *</label>
                    {(form.vendor || form.description) && form.category !== 'mileage' && (
                      <button type="button" onClick={handleCategorizeAI} disabled={categorizingAI}
                        className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        {categorizingAI ? <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={11} />}
                        Catégoriser
                      </button>
                    )}
                  </div>
                  <input required={form.category !== 'mileage'} disabled={form.category === 'mileage'}
                    value={form.vendor} onChange={(e) => set('vendor', e.target.value)}
                    placeholder={form.category === 'mileage' ? 'Indemnites kilometriques' : 'Ex : SNCF, Amazon, Leroy Merlin...'}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                      isDark
                        ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:border-white/[0.15]"
                        : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300"
                    )} />
                </div>

                {/* Amount + VAT */}
                {form.category !== 'mileage' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Montant TTC *</label>
                      <div className="relative">
                        <span className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 text-sm", isDark ? "text-zinc-500" : "text-gray-400")}>EUR</span>
                        <input required type="number" min="0" step="0.01" value={form.amount}
                          onChange={(e) => set('amount', e.target.value)} placeholder="0.00"
                          className={cn(
                            "w-full pl-11 pr-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                            isDark
                              ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-white/[0.15]"
                              : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-gray-300"
                          )} />
                      </div>
                    </div>
                    <div>
                      <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>TVA recuperable</label>
                      <div className="relative">
                        <span className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 text-sm", isDark ? "text-zinc-500" : "text-gray-400")}>EUR</span>
                        <input type="number" min="0" step="0.01" value={form.vat_amount}
                          onChange={(e) => set('vat_amount', e.target.value)} placeholder="0.00"
                          className={cn(
                            "w-full pl-11 pr-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                            isDark
                              ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-white/[0.15]"
                              : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-gray-300"
                          )} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Ville *</label>
                    <div className="relative">
                      <MapPin size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-gray-400")} />
                      <input required value={form.location_city} onChange={(e) => set('location_city', e.target.value)}
                        placeholder="Ex: Paris, Lyon..."
                        className={cn(
                          "w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                          isDark
                            ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:border-white/[0.15]"
                            : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300"
                        )} />
                    </div>
                  </div>
                  <div>
                    <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Pays</label>
                    <input value={form.location_country} onChange={(e) => set('location_country', e.target.value)}
                      placeholder="Ex: France"
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                        isDark
                          ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:border-white/[0.15]"
                          : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300"
                      )} />
                  </div>
                </div>

                {/* Trip Type */}
                {['transport', 'accommodation', 'meals', 'mileage'].includes(form.category) && (
                  <div>
                    <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Type de deplacement</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'professional', label: 'Professionnel', icon: Briefcase },
                        { value: 'training', label: 'Formation', icon: FileText },
                        { value: 'client_meeting', label: 'Reunion client', icon: Users },
                        { value: 'other', label: 'Autre', icon: MoreHorizontal },
                      ].map((type) => {
                        const Icon = type.icon;
                        return (
                          <button key={type.value} type="button" onClick={() => set('trip_type', type.value)}
                            className={cn('flex items-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-colors',
                              form.trip_type === type.value
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : isDark
                                  ? 'border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:border-white/[0.12]'
                                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                            )}>
                            <Icon size={14} />
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Date + Payment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Date *</label>
                    <input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                        isDark
                          ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-white/[0.15]"
                          : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-gray-300"
                      )} />
                  </div>
                  <div>
                    <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Paiement</label>
                    <select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                        isDark
                          ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-white/[0.15]"
                          : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-gray-300"
                      )}>
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Client / Project */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Client</label>
                    <select value={form.client_id} onChange={(e) => set('client_id', e.target.value)}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                        isDark
                          ? "bg-white/[0.04] border border-white/[0.08] text-white focus:border-white/[0.15]"
                          : "bg-gray-100 border border-gray-200 text-gray-900 focus:border-gray-300"
                      )}>
                      <option value="">Sans client</option>
                      {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Code projet</label>
                    <input value={form.project_code} onChange={(e) => set('project_code', e.target.value)}
                      placeholder="Ex: PROJ-2024-001"
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors",
                        isDark
                          ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:border-white/[0.15]"
                          : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300"
                      )} />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Description</label>
                  <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                    placeholder="Objet de la depense..." rows={2}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-sm resize-none focus:outline-none transition-colors",
                      isDark
                        ? "bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:border-white/[0.15]"
                        : "bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300"
                    )} />
                </div>

                {/* Deductibility */}
                <div className={cn(
                  "flex items-center gap-3 rounded-xl p-3.5",
                  isDark
                    ? "bg-white/[0.04] border border-white/[0.08]"
                    : "bg-gray-50 border border-gray-200"
                )}>
                  <input type="checkbox" id="is_deductible" checked={form.is_deductible}
                    onChange={(e) => set('is_deductible', e.target.checked)}
                    className={cn(
                      "w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0",
                      isDark ? "border-zinc-600 bg-white/[0.04]" : "border-gray-300 bg-gray-100"
                    )} />
                  <div className="flex-1">
                    <label htmlFor="is_deductible" className={cn("text-sm font-medium cursor-pointer", isDark ? "text-white" : "text-gray-900")}>Depense deductible fiscalement</label>
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>Cochez si cette depense est professionnelle et deductible</p>
                  </div>
                  <Info size={14} className={isDark ? "text-zinc-500" : "text-gray-400"} />
                </div>

                {/* Receipt Upload */}
                {form.category !== 'mileage' && (
                  <div>
                    <label className={cn("text-xs font-medium uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-500" : "text-gray-500")}>Justificatif</label>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
                    {receiptUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <FileImage size={16} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-sm text-emerald-300 flex-1 truncate">Justificatif ajoute</span>
                        <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                          <ExternalLink size={14} />
                        </a>
                        <button type="button" onClick={() => setReceiptUrl(null)}
                          className="text-emerald-400/60 hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingReceipt}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed text-sm transition-colors",
                          isDark
                            ? "border-white/[0.12] text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5"
                            : "border-gray-300 text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5"
                        )}>
                        {uploadingReceipt ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
                        {uploadingReceipt ? 'Upload en cours...' : 'Ajouter un justificatif (PDF, image)'}
                      </button>
                    )}
                  </div>
                )}
              </form>

              {/* Modal footer */}
              <div className={cn("px-5 py-4 flex gap-3 flex-shrink-0 border-t", isDark ? "border-white/[0.06]" : "border-gray-200")}>
                <button type="button" onClick={() => setShowModal(false)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                    isDark
                      ? "border-white/[0.08] text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}>
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                  {editingId ? 'Enregistrer' : 'Ajouter la depense'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal Export ──────────────────────────────────────── */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ duration: 0.3, ease }}
              className={cn(
                "w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-5",
                isDark
                  ? "bg-[#111113] border border-white/[0.08]"
                  : "bg-white border border-gray-200"
              )}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-900")}>Export Comptable</h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-500" : "text-gray-500")}>Format conforme pour votre comptable</p>
                </div>
                <button onClick={() => setShowExportModal(false)}
                  className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-white/[0.06] text-zinc-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-900")}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <button onClick={() => { handleExportAccounting('csv'); setShowExportModal(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-left",
                    isDark
                      ? "border-white/[0.08] hover:border-white/[0.12] hover:bg-white/[0.04]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-medium text-sm", isDark ? "text-white" : "text-gray-900")}>Export CSV Excel</p>
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>Pour Excel, comptabilite generale</p>
                  </div>
                  <Download size={16} className={isDark ? "text-zinc-500" : "text-gray-400"} />
                </button>

                <button onClick={() => { handleExportAccounting('fec'); setShowExportModal(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-left",
                    isDark
                      ? "border-white/[0.08] hover:border-white/[0.12] hover:bg-white/[0.04]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-medium text-sm", isDark ? "text-white" : "text-gray-900")}>Fichier FEC</p>
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>Format Fichier des Ecritures Comptables</p>
                  </div>
                  <Download size={16} className={isDark ? "text-zinc-500" : "text-gray-400"} />
                </button>

                <button disabled
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl border opacity-40 cursor-not-allowed text-left",
                    isDark ? "border-white/[0.08]" : "border-gray-200"
                  )}>
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-medium text-sm", isDark ? "text-white" : "text-gray-900")}>Export PDF</p>
                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-gray-500")}>Prochainement</p>
                  </div>
                  <Download size={16} className={isDark ? "text-zinc-500" : "text-gray-400"} />
                </button>
              </div>

              <div className={cn(
                "mt-4 p-3 rounded-xl flex items-start gap-2.5",
                isDark
                  ? "bg-white/[0.04] border border-white/[0.08]"
                  : "bg-gray-50 border border-gray-200"
              )}>
                <Info size={14} className={cn("flex-shrink-0 mt-0.5", isDark ? "text-zinc-500" : "text-gray-400")} />
                <div className="text-xs">
                  <p className={cn("font-medium mb-0.5", isDark ? "text-zinc-300" : "text-gray-700")}>Conforme legislation francaise</p>
                  <p className={isDark ? "text-zinc-500" : "text-gray-500"}>Tous les exports incluent les champs legaux: TVA, lieu, client, projet, deductibilite</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal Multi-Factures ──────────────────────────────── */}
      <AnimatePresence>
        {showMultiInvoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) setShowMultiInvoiceModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ duration: 0.3, ease }}
              className={cn(
                "w-full md:max-w-4xl md:rounded-2xl rounded-t-2xl p-5 max-h-[90vh] overflow-hidden flex flex-col",
                isDark
                  ? "bg-[#111113] border border-white/[0.08]"
                  : "bg-white border border-gray-200"
              )}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className={cn("text-lg font-semibold flex items-center gap-2", isDark ? "text-white" : "text-gray-900")}>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Upload Multi-Factures
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-500" : "text-gray-500")}>L'IA detecte automatiquement chaque facture dans votre PDF</p>
                </div>
                <button onClick={() => setShowMultiInvoiceModal(false)}
                  className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-white/[0.06] text-zinc-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-900")}>
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <MultiInvoiceUpload
                  onExtracted={(expenses) => {
                    setExpenses(prev => [...expenses, ...prev]);
                    setShowMultiInvoiceModal(false);
                    toast.success(`${expenses.length} facture(s) extraite(s) avec succes`);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

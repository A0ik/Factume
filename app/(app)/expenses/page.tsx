'use client';
import { toast } from 'sonner';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Receipt, Plus, Search, Edit2, Trash2, TrendingDown,
  X, Check, Calendar, Upload, FileImage, ExternalLink,
  ShoppingCart, Car, Coffee, Home, Laptop, Briefcase, MoreHorizontal,
  ArrowDownUp, Filter, Sparkles, Wand2, ChevronDown, Clock,
  MapPin, Gauge, Train, Plane, Users, FileText, Download,
  Info, AlertCircle, Calculator, Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiInvoiceUpload } from '@/components/ui/MultiInvoiceUpload';

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
  // Nouveaux champs légaux français
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
  { value: 'transport', label: 'Transport', icon: Car, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
  { value: 'meals', label: 'Repas', icon: Coffee, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
  { value: 'accommodation', label: 'Hébergement', icon: Home, color: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
  { value: 'equipment', label: 'Matériel', icon: Laptop, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-600' },
  { value: 'office', label: 'Bureau', icon: Briefcase, color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  { value: 'shopping', label: 'Achats', icon: ShoppingCart, color: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', text: 'text-pink-600' },
  { value: 'mileage', label: 'IK', icon: Gauge, color: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-600' },
  { value: 'other', label: 'Autre', icon: MoreHorizontal, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-600' },
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire', icon: 'credit-card' },
  { value: 'cash', label: 'Espèces', icon: 'banknote' },
  { value: 'transfer', label: 'Virement', icon: 'arrow-right-left' },
  { value: 'check', label: 'Chèque', icon: 'file-text' },
];

// Barème kilométrique 2024 (URSSAF)
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

// Plafonds repas 2024
const MEAL_ALLOWANCE_2024 = {
  full_day: 20.20, // Plafond d'exonération journée complète
  half_day: 9.80,  // Plafond d'exonération demi-journée
};

const STATUS_STYLES: Record<string, { label: string; class: string; icon: any }> = {
  pending: { label: 'En attente', class: 'bg-amber-50/80 text-amber-600 border-amber-200/50', icon: Clock },
  validated: { label: 'Validée', class: 'bg-green-50/80 text-green-600 border-green-200/50', icon: Check },
  rejected: { label: 'Rejetée', class: 'bg-red-50/80 text-red-600 border-red-200/50', icon: X },
};

const EMPTY_FORM: {
  vendor: string;
  amount: string;
  vat_amount: string;
  category: string;
  date: string;
  description: string;
  payment_method: string;
  location_city: string;
  location_country: string;
  trip_type: 'professional' | 'training' | 'client_meeting' | 'other';
  distance_km: string;
  vehicle_cv: string;
  meal_type: 'full_day' | 'half_day';
  client_id: string;
  project_code: string;
  is_deductible: boolean;
  tax_free_amount: string;
} = {
  vendor: '',
  amount: '',
  vat_amount: '',
  category: 'transport',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  payment_method: 'card',
  // Nouveaux champs
  location_city: '',
  location_country: 'France',
  trip_type: 'professional',
  distance_km: '',
  vehicle_cv: '',
  meal_type: 'full_day',
  client_id: '',
  project_code: '',
  is_deductible: true,
  tax_free_amount: '',
};

const getCat = (v: string) => CATEGORIES.find((c) => c.value === v) || CATEGORIES[CATEGORIES.length - 1];

// Calcul indemnités kilométriques
function calculateMileage(distance: number, cv: number): number {
  if (distance <= 0 || cv <= 0) return 0;

  const d = Math.floor(distance);
  let rate = 0;

  if (d <= 5000) {
    if (cv <= 3) rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.d || 0.529;
    else if (cv <= 7) rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.cv5_7 || 0.595;
    else if (cv <= 10) rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.cv8_10 || 0.629;
    else if (cv <= 12) rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.cv11_12 || 0.657;
    else rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.cv13 || 0.688;
  } else if (d <= 20000) {
    if (cv <= 3) rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.d || 0.529;
    else if (cv <= 7) rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.cv5_7 || 0.595;
    else if (cv <= 10) rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.cv8_10 || 0.629;
    else if (cv <= 12) rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.cv11_12 || 0.657;
    else rate = MILEAGE_RATES_2024[3 as keyof typeof MILEAGE_RATES_2024]?.cv13 || 0.688;
  } else {
    if (cv <= 3) rate = 0.389;
    else if (cv <= 7) rate = 0.448;
    else if (cv <= 10) rate = 0.493;
    else if (cv <= 12) rate = 0.521;
    else rate = 0.548;
  }

  return Math.round(d * rate * 100) / 100;
}

// Calcul plafond repas
function calculateMealAllowance(amount: number, type: 'full_day' | 'half_day'): { tax_free: number; taxable: number } {
  const allowance = type === 'full_day' ? MEAL_ALLOWANCE_2024.full_day : MEAL_ALLOWANCE_2024.half_day;
  const tax_free = Math.min(amount, allowance);
  const taxable = Math.max(0, amount - tax_free);
  return { tax_free, taxable };
}

// 3D Card Component amélioré
function Expense3DCard({ expense, onEdit, onDelete, onValidate }: {
  expense: Expense;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
  onValidate: (id: string, status: 'validated' | 'rejected') => void;
}) {
  const cat = getCat(expense.category);
  const Icon = cat.icon;
  const StatusIcon = STATUS_STYLES[expense.status].icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative"
      style={{ perspective: "1000px" }}
    >
      <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', cat.color)} />
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />

        <div className="relative p-5">
          <div className="flex items-start gap-4">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className={cn('relative w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', cat.color)}
            >
              <Icon size={24} className="text-white" strokeWidth={2.5} />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-white transition-colors">{expense.vendor}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{expense.description || cat.label}</p>
                  {/* Nouveau: Lieu */}
                  {(expense.location_city || expense.location_country) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <MapPin size={10} />
                      <span>{expense.location_city}{expense.location_city && expense.location_country && ', '}{expense.location_country}</span>
                    </div>
                  )}
                </div>
                <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm', STATUS_STYLES[expense.status].class)}>
                  <StatusIcon size={12} />
                  {STATUS_STYLES[expense.status].label}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-white transition-colors">{formatCurrency(expense.amount)}</p>
                  {expense.vat_amount > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">TVA {formatCurrency(expense.vat_amount)}</p>
                  )}
                </div>
                {/* Nouveau: Affichage IK ou Tax Free */}
                {expense.category === 'mileage' && (
                  <div className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg">
                    <Gauge size={10} />
                    <span>{expense.distance_km} km</span>
                  </div>
                )}
                {expense.tax_free_amount && expense.tax_free_amount > 0 && (
                  <div className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg">
                    <Check size={10} />
                    <span>{formatCurrency(expense.tax_free_amount)} exonéré</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <Calendar size={12} />
                  {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </div>
              </div>

              {/* Nouveau: Client/Projet */}
              {(expense.client_id || expense.project_code) && (
                <div className="flex items-center gap-2 mt-2">
                  {expense.client_id && (
                    <span className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg">
                      Client
                    </span>
                  )}
                  {expense.project_code && (
                    <span className="text-xs bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-lg">
                      {expense.project_code}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {expense.receipt_url && (
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all"
                  aria-label={`Voir le justificatif pour ${expense.vendor}`}
                >
                  <FileImage size={14} />
                </a>
              )}
              {expense.status === 'pending' && (
                <button onClick={() => onValidate(expense.id, 'validated')} className="p-2 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-400 hover:text-green-500 hover:bg-green-50 transition-all">
                  <Check size={14} />
                </button>
              )}
              <button
                data-action="edit-expense"
                onClick={() => onEdit(expense)}
                className="p-2 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all"
                aria-label={`Modifier la dépense: ${expense.vendor}`}
              >
                <Edit2 size={14} />
              </button>
              <button
                data-action="delete-expense"
                onClick={() => onDelete(expense.id)}
                className="p-2 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                aria-label={`Supprimer la dépense: ${expense.vendor}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Custom Dropdown Component
function CustomDropdown({ label, value, onChange, options, icon: Icon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: any;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">{label}</label>
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-left hover:border-primary/50 transition-all"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={16} className="text-gray-400" />}
          <span className="text-sm font-medium text-gray-900 dark:text-white">{options.find(o => o.value === value)?.label || label}</span>
        </div>
        <ChevronDown size={16} className={cn('text-gray-400 transition-transform duration-200', open && 'rotate-180')} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={cn('w-full px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-slate-700',
                    value === option.value ? 'bg-primary/10 text-primary' : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ExpensesPage() {
  const { user } = useAuthStore();
  const { clients } = useDataStore();
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

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user]);

  // Calcul automatique IK
  useEffect(() => {
    if (form.category === 'mileage' && form.distance_km && form.vehicle_cv) {
      const distance = parseFloat(form.distance_km);
      const cv = parseInt(form.vehicle_cv);
      if (distance > 0 && cv > 0) {
        const amount = calculateMileage(distance, cv);
        set('amount', String(amount));
        set('vat_amount', '0'); // Les IK sont sans TVA
      }
    }
  }, [form.distance_km, form.vehicle_cv, form.category]);

  // Calcul automatique plafond repas
  useEffect(() => {
    if (form.category === 'meals' && form.amount) {
      const amount = parseFloat(form.amount);
      if (amount > 0) {
        const { tax_free } = calculateMealAllowance(amount, form.meal_type);
        set('tax_free_amount', String(tax_free));
      }
    }
  }, [form.amount, form.meal_type, form.category]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      setExpenses(data || []);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setReceiptUrl(null);
    setEditingId(null);
    setShowModal(true);
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
      if (file.type.startsWith('image/')) {
        handleOCR(file);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleOCR = async (file: File) => {
    setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
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
    } catch { }
    finally { setOcrLoading(false); }
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
    } catch { }
    finally { setCategorizingAI(false); }
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
        // Nouveaux champs
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
          .from('expenses')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId)
          .select()
          .single();
        if (error) throw error;
        setExpenses((es) => es.map((ex) => (ex.id === editingId ? data : ex)));
      } else {
        const { data, error } = await getSupabaseClient()
          .from('expenses')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setExpenses((es) => [data, ...es]);
      }
      setShowModal(false);
      toast.success(editingId ? 'Dépense mise à jour' : 'Dépense ajoutée');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast('Supprimer cette note de frais ?', {
      action: {
        label: 'Supprimer',
        onClick: async () => {
          try { await getSupabaseClient().from('expenses').delete().eq('id', id); setExpenses((es) => es.filter((e) => e.id !== id)); toast.success('Dépense supprimée'); }
          catch (e: any) { toast.error(e.message); }
        },
      },
    });
  };

  const handleValidate = async (id: string, status: 'validated' | 'rejected') => {
    const { data, error } = await getSupabaseClient()
      .from('expenses')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (!error) setExpenses((es) => es.map((e) => (e.id === id ? data : e)));
  };

  // Export comptable amélioré
  const handleExportAccounting = async (format: 'csv' | 'fec' | 'pdf') => {
    const validated = expenses.filter(e => e.status === 'validated');
    if (validated.length === 0) {
      toast.error('Aucune dépense validée à exporter');
      return;
    }

    if (format === 'csv') {
      const headers = ['Date', 'Fournisseur', 'Description', 'Catégorie', 'Montant TTC', 'TVA', 'Montant HT', 'Pays', 'Ville', 'Client', 'Projet', 'Déductible'];
      const rows = validated.map(e => [
        e.date,
        e.vendor,
        e.description || '',
        getCat(e.category).label,
        e.amount.toFixed(2),
        (e.vat_amount || 0).toFixed(2),
        ((e.amount || 0) - (e.vat_amount || 0)).toFixed(2),
        e.location_country || '',
        e.location_city || '',
        e.client_id || '',
        e.project_code || '',
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
      toast.success('Export CSV comptable réussi');
    }

    if (format === 'fec') {
      // Format FEC (Fichier des Écritures Comptables) - Simplifié
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
      toast.success('Export FEC réussi');
    }

    if (format === 'pdf') {
      toast.info('Export PDF en cours de développement...');
    }
  };

  // Memoize filtered expenses - O(n) operation
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter((e) => {
      const matchSearch = !q || e.vendor.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
      const matchCat = !filterCat || e.category === filterCat;
      const matchStatus = !filterStatus || e.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [expenses, search, filterCat, filterStatus]);

  // Memoize stats calculations - O(n) operations
  const stats = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const totalMonth = expenses
      .filter((e) => e.date.startsWith(currentMonthPrefix))
      .reduce((s, e) => s + e.amount, 0);
    const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
    const totalVat = expenses.reduce((s, e) => s + (e.vat_amount || 0), 0);
    const totalMileage = expenses.filter(e => e.category === 'mileage').reduce((s, e) => s + (e.amount || 0), 0);
    const pending = expenses.filter((e) => e.status === 'pending').length;
    return { totalMonth, totalAll, totalVat, totalMileage, pending };
  }, [expenses]);

  const { totalMonth, totalAll, totalVat, totalMileage, pending } = stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">Notes de Frais</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">100% Légal FR • Indemnités Kilométriques • Plafonds Repas</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/expenses/analytics" className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-violet-500/20 hover:shadow-xl transition-all hover:scale-105 active:scale-95">
              <TrendingDown size={18} />
              Analytics
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExportModal(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <Download size={18} />
              Export
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openCreate}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
            >
              <Plus size={18} />
              Nouvelle dépense
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMultiInvoiceModal(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
            >
              <Sparkles size={18} />
              Multi-factures
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid amélioré */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Ce mois', value: formatCurrency(totalMonth), sub: 'dépensé', icon: TrendingDown, color: 'from-red-500 to-rose-500' },
          { label: 'Total cumulé', value: formatCurrency(totalAll), sub: 'toutes périodes', icon: Receipt, color: 'from-blue-500 to-indigo-500' },
          { label: 'TVA déductible', value: formatCurrency(totalVat), sub: 'récupérable', icon: ArrowDownUp, color: 'from-green-500 to-emerald-500' },
          { label: 'Indemnités IK', value: formatCurrency(totalMileage), sub: 'remboursées', icon: Gauge, color: 'from-amber-500 to-orange-500' },
          { label: 'En attente', value: String(pending), sub: 'à valider', icon: Filter, color: 'from-purple-500 to-violet-500' },
        ].map(({ label, value, sub, icon: Icon, color }, i) => (
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
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg', color)}>
                  <Icon size={22} className="text-white" />
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-white transition-colors">{value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/70 transition-colors">{sub}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-white/70 transition-colors">{label}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un fournisseur, ville, client..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['', 'pending', 'validated'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn('flex-shrink-0 px-4 py-3 rounded-2xl text-sm font-bold transition-all border', filterStatus === s
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary shadow-lg shadow-primary/30'
                  : 'bg-white/50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300'
                )}
              >
                {s === '' ? 'Tout' : s === 'pending' ? 'En attente' : 'Validées'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills avec IK en plus */}
        <div className="flex gap-2 flex-wrap mt-4">
          <button onClick={() => setFilterCat('')} className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all border', filterCat === ''
            ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary'
            : 'bg-white/50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
          )}>
            Toutes catégories
          </button>
          {CATEGORIES.map((cat) => (
            <button key={cat.value} onClick={() => setFilterCat(cat.value === filterCat ? '' : cat.value)} className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5', filterCat === cat.value
              ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary'
              : 'bg-white/50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
            )}>
              <cat.icon size={12} />
              {cat.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Expenses Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-12 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
            <Receipt size={40} className="text-primary/60" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucune dépense trouvée</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Notes de frais 100% légales françaises avec IK et plafonds repas</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/30"
          >
            <Plus size={18} /> Ajouter une dépense
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((expense) => (
            <Expense3DCard
              key={expense.id}
              expense={expense}
              onEdit={openEdit}
              onDelete={handleDelete}
              onValidate={handleValidate}
            />
          ))}
        </div>
      )}

      {/* Modal Création/Édition améliorée */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/50 dark:border-white/10 max-h-[90vh] flex flex-col"
            >
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">100% conforme à la législation française</p>
                </div>
                <motion.button
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Category Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">Catégorie</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <motion.button
                          key={cat.value}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => set('category', cat.value)}
                          className={cn('relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 text-xs font-bold transition-all overflow-hidden', form.category === cat.value
                            ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white/50 dark:bg-slate-700/50'
                          )}
                        >
                          {form.category === cat.value && (
                            <motion.div
                              layoutId="activeCategory"
                              className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5"
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                          <div className={cn('relative w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center', cat.color)}>
                            <Icon size={16} className="text-white" />
                          </div>
                          <span className="relative">{cat.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* OCR Loading */}
                {ocrLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4"
                  >
                    <div className="w-5 h-5 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">L'IA analyse votre justificatif...</p>
                  </motion.div>
                )}

                {/* Section Indemnités Kilométriques */}
                {form.category === 'mileage' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 space-y-4"
                  >
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <Gauge size={18} />
                      <p className="text-sm font-bold">Indemnités Kilométriques (Barème URSSAF 2024)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Distance (km)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={form.distance_km}
                          onChange={(e) => set('distance_km', e.target.value)}
                          placeholder="Ex: 150"
                          className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Puissance fiscale (CV)</label>
                        <select
                          value={form.vehicle_cv}
                          onChange={(e) => set('vehicle_cv', e.target.value)}
                          className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                        >
                          <option value="">Sélectionner...</option>
                          {Array.from({ length: 13 }, (_, i) => i + 1).map(cv => (
                            <option key={cv} value={cv}>{cv} CV</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {form.distance_km && form.vehicle_cv && (
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-3">
                        <Calculator size={16} className="text-primary" />
                        <p className="text-sm">
                          <span className="font-bold">{formatCurrency(parseFloat(form.amount) || 0)}</span> =
                          {form.distance_km} km × {(parseFloat(form.amount) / (parseFloat(form.distance_km) || 1)).toFixed(3)}€/km
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Section Repas avec plafond */}
                {form.category === 'meals' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-4"
                  >
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <Coffee size={18} />
                      <p className="text-sm font-bold">Frais de Repas (Plafond exonération 2024)</p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Type de repas</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'full_day', label: 'Journée complète', allowance: MEAL_ALLOWANCE_2024.full_day },
                          { value: 'half_day', label: 'Demi-journée', allowance: MEAL_ALLOWANCE_2024.half_day },
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => set('meal_type', type.value)}
                            className={cn('p-3 rounded-xl border-2 text-sm font-bold transition-all text-left', form.meal_type === type.value
                              ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/30'
                              : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-700/50'
                            )}
                          >
                            <p className="font-bold">{type.label}</p>
                            <p className="text-xs text-gray-500">Exonéré jusqu'à {formatCurrency(type.allowance * 100)}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.amount && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Montant total</span>
                          <span className="text-sm font-bold">{formatCurrency(parseFloat(form.amount))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Part exonérée</span>
                          <span className="text-sm font-bold text-green-600">{formatCurrency(form.tax_free_amount ? parseFloat(form.tax_free_amount) : 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Part imposable</span>
                          <span className="text-sm font-bold text-red-600">{formatCurrency(parseFloat(form.amount) - (form.tax_free_amount ? parseFloat(form.tax_free_amount) : 0))}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Vendor + AI Categorize */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fournisseur *</label>
                    {(form.vendor || form.description) && form.category !== 'mileage' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={handleCategorizeAI}
                        disabled={categorizingAI}
                        className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-50 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/20"
                      >
                        {categorizingAI ? <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={12} />}
                        Catégoriser par IA
                      </motion.button>
                    )}
                  </div>
                  <input
                    required={form.category !== 'mileage'}
                    disabled={form.category === 'mileage'}
                    value={form.vendor}
                    onChange={(e) => set('vendor', e.target.value)}
                    placeholder={form.category === 'mileage' ? 'Indemnités kilométriques' : 'Ex : SNCF, Amazon, Leroy Merlin...'}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Amount + VAT (pas pour IK) */}
                {form.category !== 'mileage' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Montant TTC *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.amount}
                          onChange={(e) => set('amount', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">TVA récupérable</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.vat_amount}
                          onChange={(e) => set('vat_amount', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Lieu (NOUVEAU - obligatoire légalement) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Ville *</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        required
                        value={form.location_city}
                        onChange={(e) => set('location_city', e.target.value)}
                        placeholder="Ex: Paris, Lyon..."
                        className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Pays</label>
                    <input
                      value={form.location_country}
                      onChange={(e) => set('location_country', e.target.value)}
                      placeholder="Ex: France"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Type de déplacement (si frais voyage) */}
                {['transport', 'accommodation', 'meals', 'mileage'].includes(form.category) && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Type de déplacement</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'professional', label: 'Déplacement professionnel', icon: Briefcase },
                        { value: 'training', label: 'Formation', icon: FileText },
                        { value: 'client_meeting', label: 'Réunion client', icon: Users },
                        { value: 'other', label: 'Autre', icon: MoreHorizontal },
                      ].map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => set('trip_type', type.value)}
                            className={cn('flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all', form.trip_type === type.value
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-700/50'
                            )}
                          >
                            <Icon size={14} />
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Date + Payment */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Date *</label>
                    <input
                      required
                      type="date"
                      value={form.date}
                      onChange={(e) => set('date', e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                    />
                  </div>
                  <CustomDropdown
                    label="Moyen de paiement"
                    value={form.payment_method}
                    onChange={(v) => set('payment_method', v)}
                    options={PAYMENT_METHODS.map(m => ({ value: m.value, label: m.label }))}
                  />
                </div>

                {/* Rattachement Client/Projet (NOUVEAU) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Client</label>
                    <select
                      value={form.client_id}
                      onChange={(e) => set('client_id', e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                    >
                      <option value="">Sans client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Code projet</label>
                    <input
                      value={form.project_code}
                      onChange={(e) => set('project_code', e.target.value)}
                      placeholder="Ex: PROJ-2024-001"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Objet de la dépense..."
                    rows={2}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm resize-none transition-all"
                  />
                </div>

                {/* Déductibilité fiscale */}
                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                  <input
                    type="checkbox"
                    id="is_deductible"
                    checked={form.is_deductible}
                    onChange={(e) => set('is_deductible', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <label htmlFor="is_deductible" className="text-sm font-bold text-gray-900 dark:text-white cursor-pointer">
                      Dépense déductible fiscalement
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cochez si cette dépense est professionnelle et déductible</p>
                  </div>
                  <Info size={16} className="text-blue-500" />
                </div>

                {/* Receipt Upload */}
                {form.category !== 'mileage' && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Justificatif</label>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
                    {receiptUrl ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50/80 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800">
                        <FileImage size={18} className="text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400 flex-1 truncate">Justificatif ajouté</span>
                        <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
                          <ExternalLink size={16} />
                        </a>
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => setReceiptUrl(null)}
                          className="text-green-400 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </motion.button>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadingReceipt}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        {uploadingReceipt ? <div className="w-5 h-5 border-3 border-primary border-t-transparent rounded-full animate-spin" /> : <Upload size={18} />}
                        {uploadingReceipt ? 'Upload en cours...' : 'Ajouter un justificatif (PDF, image)'}
                      </motion.button>
                    )}
                  </div>
                )}
              </form>

              <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all disabled:opacity-60"
                >
                  {saving ? <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={18} />}
                  {editingId ? 'Enregistrer' : 'Ajouter la dépense'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Export Comptable */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-6 border border-white/50 dark:border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Comptable</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Format conforme pour votre comptable</p>
                </div>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowExportModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { handleExportAccounting('csv'); setShowExportModal(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">Export CSV Excel</p>
                    <p className="text-sm text-gray-500">Pour Excel, comptabilité générale</p>
                  </div>
                  <Download size={20} className="text-gray-400" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { handleExportAccounting('fec'); setShowExportModal(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">Fichier FEC</p>
                    <p className="text-sm text-gray-500">Format Fichier des Écritures Comptables</p>
                  </div>
                  <Download size={20} className="text-gray-400" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { handleExportAccounting('pdf'); setShowExportModal(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 transition-all text-left opacity-60 cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">Export PDF</p>
                    <p className="text-sm text-gray-500">Prochainement</p>
                  </div>
                  <Download size={20} className="text-gray-400" />
                </motion.button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3">
                <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-blue-700 dark:text-blue-300 mb-1">Conforme législation française</p>
                  <p className="text-blue-600/80 dark:text-blue-400/80">Tous les exports incluent les champs légaux: TVA, lieu, client, projet, déductibilité</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Multi-Factures */}
      <AnimatePresence>
        {showMultiInvoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowMultiInvoiceModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl p-6 border border-white/50 dark:border-white/10 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Upload Multi-Factures
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    L'IA détecte automatiquement chaque facture dans votre PDF
                  </p>
                </div>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMultiInvoiceModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <MultiInvoiceUpload
                  onExtracted={(expenses) => {
                    // Add extracted expenses to the list
                    setExpenses(prev => [...expenses, ...prev]);
                    setShowMultiInvoiceModal(false);
                    toast.success(`${expenses.length} facture(s) extraite(s) avec succès`);
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

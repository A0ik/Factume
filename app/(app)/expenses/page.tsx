'use client';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Receipt, Plus, Search, Edit2, Trash2, TrendingDown,
  X, Check, Calendar, Upload, FileImage, ExternalLink,
  ShoppingCart, Car, Coffee, Home, Laptop, Briefcase, MoreHorizontal,
  ArrowDownUp, Filter, Sparkles, Wand2, ChevronDown, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
}

const CATEGORIES = [
  { value: 'transport', label: 'Transport', icon: Car, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
  { value: 'meals', label: 'Repas', icon: Coffee, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
  { value: 'accommodation', label: 'Hébergement', icon: Home, color: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
  { value: 'equipment', label: 'Matériel', icon: Laptop, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-600' },
  { value: 'office', label: 'Bureau', icon: Briefcase, color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  { value: 'shopping', label: 'Achats', icon: ShoppingCart, color: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', text: 'text-pink-600' },
  { value: 'other', label: 'Autre', icon: MoreHorizontal, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-600' },
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire', icon: 'credit-card' },
  { value: 'cash', label: 'Espèces', icon: 'banknote' },
  { value: 'transfer', label: 'Virement', icon: 'arrow-right-left' },
  { value: 'check', label: 'Chèque', icon: 'file-text' },
];

const STATUS_STYLES: Record<string, { label: string; class: string; icon: any }> = {
  pending: { label: 'En attente', class: 'bg-amber-50/80 text-amber-600 border-amber-200/50', icon: Clock },
  validated: { label: 'Validée', class: 'bg-green-50/80 text-green-600 border-green-200/50', icon: Check },
  rejected: { label: 'Rejetée', class: 'bg-red-50/80 text-red-600 border-red-200/50', icon: X },
};

const EMPTY_FORM = {
  vendor: '',
  amount: '',
  vat_amount: '',
  category: 'transport',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  payment_method: 'card',
};

const getCat = (v: string) => CATEGORIES.find((c) => c.value === v) || CATEGORIES[6];

// 3D Card Component
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
      {/* Glassmorphism card with 3D effect */}
      <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
        {/* Gradient overlay */}
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', cat.color)} />
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />

        {/* Content */}
        <div className="relative p-5">
          <div className="flex items-start gap-4">
            {/* Category icon with 3D effect */}
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
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <Calendar size={12} />
                  {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {expense.receipt_url && (
                <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all">
                  <FileImage size={14} />
                </a>
              )}
              {expense.status === 'pending' && (
                <button onClick={() => onValidate(expense.id, 'validated')} className="p-2 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-400 hover:text-green-500 hover:bg-green-50 transition-all">
                  <Check size={14} />
                </button>
              )}
              <button onClick={() => onEdit(expense)} className="p-2 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all">
                <Edit2 size={14} />
              </button>
              <button onClick={() => onDelete(expense.id)} className="p-2 rounded-xl bg-white/80 dark:bg-slate-700/80 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
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
              className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
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

  const filtered = expenses.filter((e) => {
    const matchSearch = !search || e.vendor.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || e.category === filterCat;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const totalMonth = expenses
    .filter((e) => e.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, e) => s + e.amount, 0);
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
  const totalVat = expenses.reduce((s, e) => s + (e.vat_amount || 0), 0);
  const pending = expenses.filter((e) => e.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header with glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">Notes de frais</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Suivez vos dépenses professionnelles intelligemment</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
          >
            <Plus size={18} />
            Nouvelle dépense
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Ce mois', value: formatCurrency(totalMonth), sub: 'dépensé', icon: TrendingDown, color: 'from-red-500 to-rose-500' },
          { label: 'Total cumulé', value: formatCurrency(totalAll), sub: 'toutes périodes', icon: Receipt, color: 'from-blue-500 to-indigo-500' },
          { label: 'TVA déductible', value: formatCurrency(totalVat), sub: 'récupérable', icon: ArrowDownUp, color: 'from-green-500 to-emerald-500' },
          { label: 'En attente', value: String(pending), sub: 'à valider', icon: Filter, color: 'from-amber-500 to-orange-500' },
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
              placeholder="Rechercher un fournisseur ou description..."
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

        {/* Category Pills */}
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
          <p className="text-gray-500 dark:text-gray-400 mb-6">Commencez à suivre vos notes de frais professionnelles</p>
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

      {/* Modal */}
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
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/50 dark:border-white/10"
            >
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Note de frais professionnelle</p>
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

              <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
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

                {/* Vendor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fournisseur *</label>
                    {(form.vendor || form.description) && (
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
                    required
                    value={form.vendor}
                    onChange={(e) => set('vendor', e.target.value)}
                    placeholder="Ex : SNCF, Amazon, Leroy Merlin..."
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                  />
                </div>

                {/* Amount + VAT */}
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

                {/* Receipt Upload */}
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
              </form>

              <div className="px-6 pb-6 flex gap-3">
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
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
    </div>
  );
}

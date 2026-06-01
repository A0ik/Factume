'use client';
import { toast } from 'sonner';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import {
  Package, Plus, Search, Edit2, Trash2, Tag, Layers,
  X, Check, DollarSign, Hash, Percent,
  Archive, ShoppingBag, Wrench, Cpu, FileText,
  Grid3X3, List, ArrowUpDown, SlidersHorizontal,
  TrendingUp, TrendingDown, Star, Zap, Eye,
  Filter, ChevronDown, Info, Copy, MoreHorizontal, Mic,
  Loader2, MicOff, Sparkles, AlertCircle, Wand2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { VoiceAssistant, VoiceAnalysisResult } from '@/components/ui/VoiceAssistant';
import { CustomSelect } from '@/components/ui/CustomSelect';

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  unit_price: number;
  unit: string;
  vat_rate: number;
  category: string;
  reference: string;
  is_active: boolean;
  created_at: string;
}

const UNITS = [
  { value: 'unit', label: 'Unité' },
  { value: 'hour', label: 'Heure' },
  { value: 'day', label: 'Jour' },
  { value: 'month', label: 'Mois' },
  { value: 'kg', label: 'Kilogramme' },
  { value: 'km', label: 'Kilomètre' },
  { value: 'forfait', label: 'Forfait' },
];

const VAT_RATES = [0, 5.5, 10, 20];

const CATEGORIES = [
  { value: 'service', label: 'Service', icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
  { value: 'product', label: 'Produit', icon: ShoppingBag, color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  { value: 'software', label: 'Logiciel', icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10', dot: 'bg-purple-400' },
  { value: 'consulting', label: 'Conseil', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
  { value: 'other', label: 'Autre', icon: Archive, color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-400' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nom A-Z', icon: ArrowUpDown },
  { value: 'name-desc', label: 'Nom Z-A', icon: ArrowUpDown },
  { value: 'price-asc', label: 'Prix croissant', icon: TrendingUp },
  { value: 'price-desc', label: 'Prix décroissant', icon: TrendingDown },
  { value: 'created-desc', label: 'Plus récent', icon: Star },
  { value: 'created-asc', label: 'Plus ancien', icon: Archive },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  unit_price: '',
  unit: 'unit',
  vat_rate: '20',
  category: 'service',
  reference: '',
  is_active: true,
};

const getCategoryStyle = (cat: string) => CATEGORIES.find((c) => c.value === cat) || CATEGORIES[4];

export default function ProductsPage() {
  const { user } = useAuthStore();
  const { canUseVoice } = useSubscription();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPrice, setFilterPrice] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [mode, setMode] = useState<'voice' | 'ai' | 'manual'>('manual');

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [recordTime, setRecordTime] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleVoiceResult = (data: VoiceAnalysisResult) => {
    if (data.name) set('name', data.name);
    if (data.description) set('description', data.description);
    if (data.price) set('unit_price', String(data.price));
    if (data.quantity) setForm((f) => ({ ...f, quantity: data.quantity }));
    if (data.vatRate) set('vat_rate', String(data.vatRate));
    if (data.reference) set('reference', data.reference);
    if (data.unit) {
      const unitOption = UNITS.find(u => u.value === data.unit);
      if (unitOption) {
        set('unit', data.unit);
      } else {
        set('unit', 'unit');
      }
    }
    if (!data.reference && data.name) {
      const ref = data.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 8)
        .toUpperCase();
      set('reference', ref + '-' + Date.now().toString().slice(-4));
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const startRecording = async () => {
    if (!canUseVoice) { toast.error('La reconnaissance vocale est disponible avec les abonnements Pro et Business'); return; }
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); processVoiceBlob(); };
      mediaRecorderRef.current = mr;
      mr.start();
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
      setRecording(true);
    } catch {
      setVoiceError('Accès au micro refusé. Vérifiez les permissions dans votre navigateur.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    setRecordTime(0);
  };

  const processVoiceBlob = async () => {
    setProcessingVoice(true);
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      if (user?.id) fd.append('user_id', user.id);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      let res: Response;
      try {
        res = await fetch('/api/process-voice-product', { method: 'POST', body: fd, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erreur de traitement vocal');
      }
      const result = await res.json();
      setTranscript(result.transcript || '');
      const parsed = result.parsed;

      const updates: any = {};
      if (parsed?.name) updates.name = parsed.name;
      if (parsed?.description) updates.description = parsed.description;
      if (parsed?.unit_price) updates.unit_price = String(parsed.unit_price);
      if (parsed?.quantity) updates.quantity = parsed.quantity;
      if (parsed?.vatRate) updates.vat_rate = String(parsed.vatRate);
      if (parsed?.reference) updates.reference = parsed.reference;
      if (parsed?.unit) {
        const unitOption = UNITS.find(u => u.value === parsed.unit);
        if (unitOption) updates.unit = parsed.unit;
      }
      if (parsed?.category) {
        const categoryMap: Record<string, string> = {
          'service': 'service', 'product': 'product', 'software': 'software',
          'consulting': 'consulting', 'other': 'other',
        };
        if (categoryMap[parsed.category]) updates.category = categoryMap[parsed.category];
      }
      if (!parsed?.reference && parsed?.name) {
        const ref = parsed.name
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 8)
          .toUpperCase();
        updates.reference = ref + '-' + Date.now().toString().slice(-4);
      }

      if (Object.keys(updates).length > 0) {
        setForm({ ...form, ...updates });
      }

      if (result.summary) toast.success(result.summary);
      setMode('manual');
    } catch (e: any) {
      setVoiceError(e.message || 'Erreur lors du traitement vocal');
    } finally {
      setProcessingVoice(false);
    }
  };

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, retryCount]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(c => c + 1), 500);
        } else {
          setProducts([]);
          setLoading(false);
        }
        return;
      }

      const { data: allProducts, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setProducts([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setProducts(allProducts || []);
    } catch (e: any) {
      console.error('Error fetching products:', e);
      if (e.message && !e.message.includes('Failed to fetch')) {
        toast.error('Erreur lors du chargement des produits');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description || '',
      unit_price: String(p.unit_price),
      unit: p.unit,
      vat_rate: String(p.vat_rate),
      category: p.category,
      reference: p.reference || '',
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        unit_price: parseFloat(form.unit_price) || 0,
        unit: form.unit,
        vat_rate: parseFloat(form.vat_rate) || 0,
        category: form.category,
        reference: form.reference,
        is_active: form.is_active,
        user_id: user.id,
      };
      if (editingId) {
        const { data, error } = await getSupabaseClient()
          .from('products')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId)
          .select()
          .single();
        if (error) throw error;
        setProducts((ps) => ps.map((p) => (p.id === editingId ? data : p)));
        toast.success('Produit mis à jour avec succès');
      } else {
        const { data, error } = await getSupabaseClient()
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setProducts((ps) => [...ps, data]);
        toast.success('Produit créé avec succès');
      }
      setShowModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    setDeletingId(id);
    try {
      await getSupabaseClient().from('products').delete().eq('id', id);
      setProducts((ps) => ps.filter((p) => p.id !== id));
      toast.success('Produit supprimé');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (p: Product) => {
    try {
      const { data, error } = await getSupabaseClient()
        .from('products')
        .insert({
          ...p,
          name: `${p.name} (copie)`,
          id: undefined,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();
      if (error) throw error;
      setProducts((ps) => [...ps, data]);
      toast.success('Produit dupliqué');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedProducts.size} produit(s) ?`)) return;
    try {
      await getSupabaseClient().from('products').delete().in('id', Array.from(selectedProducts));
      setProducts((ps) => ps.filter((p) => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      toast.success(`${selectedProducts.size} produit(s) supprimé(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...products];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.reference?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }
    if (filterCat) {
      result = result.filter((p) => p.category === filterCat);
    }
    if (filterPrice.min) {
      result = result.filter((p) => p.unit_price >= parseFloat(filterPrice.min));
    }
    if (filterPrice.max) {
      result = result.filter((p) => p.unit_price <= parseFloat(filterPrice.max));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'price-asc': return a.unit_price - b.unit_price;
        case 'price-desc': return b.unit_price - a.unit_price;
        case 'created-desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created-asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });
    return result;
  }, [products, search, filterCat, filterPrice, sortBy]);

  const totalActive = products.filter((p) => p.is_active).length;
  const totalInactive = products.length - totalActive;
  const avgPrice = products.length ? products.reduce((s, p) => s + p.unit_price, 0) / products.length : 0;

  const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const stats = [
    { label: 'Total', value: products.length, dot: 'bg-white' },
    { label: 'Actifs', value: totalActive, dot: 'bg-emerald-400' },
    { label: 'Prix moy.', value: formatPrice(avgPrice), dot: 'bg-amber-400' },
    { label: 'Inactifs', value: totalInactive, dot: 'bg-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Catalogue produits
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez vos produits et services pour les ajouter rapidement à vos factures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              showFilters
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-gray-100 border border-gray-200 text-slate-400 hover:text-gray-900 hover:border-gray-300'
            )}
          >
            <SlidersHorizontal size={16} />
            Filtres
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <Plus size={16} />
            Nouveau produit
          </button>
        </div>
      </div>

      {/* Stats - Minimal pills */}
      <div className="flex flex-wrap items-center gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full"
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
            <span className="text-xs text-slate-500">{s.label}</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            className="overflow-hidden"
          >
            <div className="bg-gray-100 border border-gray-200 rounded-2xl p-5 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, référence ou description..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Toutes les catégories' },
                      ...CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                        icon: c.icon,
                      }))
                    ]}
                    value={filterCat}
                    onChange={setFilterCat}
                    placeholder="Toutes les catégories"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Prix (HT)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={filterPrice.min}
                      onChange={(e) => setFilterPrice({ ...filterPrice, min: e.target.value })}
                      placeholder="Min"
                      className="flex-1 px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
                    />
                    <span className="text-gray-400 self-center">-</span>
                    <input
                      type="number"
                      value={filterPrice.max}
                      onChange={(e) => setFilterPrice({ ...filterPrice, max: e.target.value })}
                      placeholder="Max"
                      className="flex-1 px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <CustomSelect
                    options={SORT_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      icon: o.icon,
                    }))}
                    value={sortBy}
                    onChange={setSortBy}
                    placeholder="Trier par"
                  />
                </div>
              </div>

              {/* Active Filters Display */}
              {(filterCat || filterPrice.min || filterPrice.max || search) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Filtres actifs :</span>
                  {filterCat && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">
                      {CATEGORIES.find(c => c.value === filterCat)?.label}
                      <button onClick={() => setFilterCat('')}><X size={12} /></button>
                    </span>
                  )}
                  {filterPrice.min && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">
                      Min: {filterPrice.min}€
                      <button onClick={() => setFilterPrice({ ...filterPrice, min: '' })}><X size={12} /></button>
                    </span>
                  )}
                  {filterPrice.max && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">
                      Max: {filterPrice.max}€
                      <button onClick={() => setFilterPrice({ ...filterPrice, max: '' })}><X size={12} /></button>
                    </span>
                  )}
                  {search && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">
                      &ldquo;{search.slice(0, 15)}{search.length > 15 ? '...' : ''}&rdquo;
                      <button onClick={() => setSearch('')}><X size={12} /></button>
                    </span>
                  )}
                  <button
                    onClick={() => { setFilterCat(''); setFilterPrice({ min: '', max: '' }); setSearch(''); }}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold ml-2"
                  >
                    Tout effacer
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            <span className="font-semibold text-gray-900 dark:text-white">{filteredAndSorted.length}</span> produit(s)
          </span>
          {selectedProducts.size > 0 && (
            <>
              <span className="text-slate-700">|</span>
              <span className="text-sm text-emerald-400 font-semibold">{selectedProducts.size} sélectionné(s)</span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={12} />
                Supprimer
              </button>
            </>
          )}
        </div>
        {/* Desktop view toggle */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-xl transition-all',
              viewMode === 'grid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-100 border border-gray-200 text-slate-500 hover:text-gray-900'
            )}
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-xl transition-all',
              viewMode === 'list' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-100 border border-gray-200 text-slate-500 hover:text-gray-900'
            )}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Products Display */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Chargement des produits...</p>
          </div>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        /* Empty state */
        <div className="py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
            {search || filterCat ? 'Aucun résultat' : 'Aucun produit'}
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            {search || filterCat ? 'Modifiez vos filtres pour voir plus de résultats' : 'Créez votre premier produit ou service'}
          </p>
          {!search && !filterCat && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl text-sm font-semibold transition-all"
            >
              <Plus size={18} />
              Créer un produit
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Grid/List */}
          <div className="hidden md:block">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease }}
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200'
                )}
              >
                {filteredAndSorted.map((product, idx) => {
                  const cat = getCategoryStyle(product.category);
                  const Icon = cat.icon;
                  const isSelected = selectedProducts.has(product.id);

                  if (viewMode === 'grid') {
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease, delay: Math.min(idx * 0.03, 0.3) }}
                        className="bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden group hover:border-gray-300 transition-colors"
                      >
                        <div className="relative p-5">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSelect(product.id)}
                            className={cn(
                              'absolute top-4 left-4 w-6 h-6 rounded-lg border flex items-center justify-center transition-all z-10',
                              isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-500/50'
                            )}
                          >
                            {isSelected && <Check size={14} className="text-black" />}
                          </button>

                          {/* Category Badge */}
                          <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            <span className={cn('w-1.5 h-1.5 rounded-full', cat.dot)} />
                            <span className="text-[10px] font-semibold text-slate-400">{cat.label}</span>
                          </div>

                          {/* Icon */}
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 mt-6', cat.bg)}>
                            <Icon size={20} className={cat.color} />
                          </div>

                          {/* Content */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-start gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight flex-1">{product.name}</h3>
                              {!product.is_active && (
                                <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                  Inactif
                                </span>
                              )}
                            </div>
                            {product.reference && (
                              <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                                <Hash size={10} />
                                {product.reference}
                              </p>
                            )}
                            {product.description && (
                              <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                            )}
                          </div>

                          {/* Price & Actions */}
                          <div className="flex items-end justify-between pt-3 border-t border-gray-200">
                            <div>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatPrice(product.unit_price)}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                HT / {UNITS.find((u) => u.value === product.unit)?.label} · TVA {product.vat_rate}%
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(product)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-gray-900 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDuplicate(product)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-emerald-400 transition-colors"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                disabled={deletingId === product.id}
                                className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  } else {
                    /* List view row */
                    return (
                      <div key={product.id} className="flex items-center gap-4 p-4 group hover:bg-gray-100 transition-colors">
                        <button
                          onClick={() => toggleSelect(product.id)}
                          className={cn(
                            'w-6 h-6 rounded-lg border flex items-center justify-center transition-all flex-shrink-0',
                            isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-500/50'
                          )}
                        >
                          {isSelected && <Check size={14} className="text-black" />}
                        </button>

                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', cat.bg)}>
                          <Icon size={18} className={cat.color} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h3>
                            {!product.is_active && (
                              <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">Inactif</span>
                            )}
                          </div>
                          {product.reference && (
                            <p className="text-[11px] text-gray-400 font-mono">#{product.reference}</p>
                          )}
                          {product.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{product.description}</p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(product.unit_price)}</p>
                          <p className="text-[11px] text-gray-400">HT · TVA {product.vat_rate}%</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className={cn('w-1.5 h-1.5 rounded-full', cat.dot)} />
                          <span className="text-[10px] font-semibold text-slate-500 w-16">{cat.label}</span>
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-gray-900 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(product)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-emerald-400 transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                            className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  }
                })}

                {/* Add Card - Grid only */}
                {viewMode === 'grid' && (
                  <button
                    onClick={openCreate}
                    className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group min-h-[220px]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
                      <Plus size={20} className="text-gray-400 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <span className="text-sm font-semibold text-gray-400 group-hover:text-emerald-400 transition-colors">
                      Ajouter un produit
                    </span>
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredAndSorted.map((product, idx) => {
              const cat = getCategoryStyle(product.category);
              const Icon = cat.icon;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease, delay: Math.min(idx * 0.04, 0.4) }}
                  className="bg-gray-100 border border-gray-200 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', cat.bg)}>
                        <Icon size={18} className={cat.color} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h3>
                        {product.reference && (
                          <p className="text-[11px] text-gray-400 font-mono">#{product.reference}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-1.5 h-1.5 rounded-full', cat.dot)} />
                      <span className="text-[10px] font-semibold text-slate-500">{cat.label}</span>
                      {!product.is_active && (
                        <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold ml-1">Inactif</span>
                      )}
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{product.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(product.unit_price)}</p>
                      <p className="text-[11px] text-gray-400">
                        HT / {UNITS.find((u) => u.value === product.unit)?.label} · TVA {product.vat_rate}%
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-gray-900 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(product)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-emerald-400 transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Mobile add button */}
            <button
              onClick={openCreate}
              className="w-full bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 flex items-center justify-center gap-2 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
            >
              <Plus size={16} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-400">Ajouter un produit</span>
            </button>
          </div>
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border border-gray-200"
            >
              {/* Modal header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingId ? 'Modifier' : 'Nouveau produit'}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Ajoutez-le directement à vos factures</p>
                </div>
                <div className="flex items-center gap-2">
                  {canUseVoice && !editingId && (
                    <>
                      <button
                        onClick={() => setMode('voice')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                          mode === 'voice'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-gray-100 text-slate-400 hover:text-gray-900'
                        )}
                      >
                        <Mic size={14} />
                        Voix
                      </button>
                      <button
                        onClick={() => setMode('manual')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                          mode === 'manual'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-gray-100 text-slate-400 hover:text-gray-900'
                        )}
                      >
                        <FileText size={14} />
                        Manuel
                      </button>
                    </>
                  )}
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-slate-500 hover:text-gray-900 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Voice mode */}
              {canUseVoice && !editingId && mode === 'voice' && (
                <div className="px-6 py-4 bg-emerald-500/5 border-b border-emerald-500/10">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {recording && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="absolute inset-0 rounded-full bg-red-500/20"
                        />
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={recording ? stopRecording : startRecording}
                        className={cn(
                          'relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200',
                          recording
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-emerald-500 hover:bg-emerald-400'
                        )}
                      >
                        {recording ? (
                          <MicOff size={24} className="text-gray-900 dark:text-white" />
                        ) : (
                          <Mic size={24} className="text-black" />
                        )}
                      </motion.button>
                    </div>

                    <div className="space-y-1 text-center">
                      {recording && (
                        <motion.p
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="text-lg font-bold text-red-400 tabular-nums"
                        >
                          {formatTime(recordTime)}
                        </motion.p>
                      )}
                      <p className="text-sm text-slate-400 font-medium">
                        {recording
                          ? 'Parlez clairement — cliquez pour arrêter'
                          : 'Cliquez pour commencer la dictée'}
                      </p>
                      {!recording && (
                        <p className="text-xs text-gray-400">
                          Ex: &ldquo;Site web vitrine 850 euros HT&rdquo;
                        </p>
                      )}
                    </div>

                    {transcript && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-left bg-gray-100 rounded-xl p-3 border border-gray-200"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles size={12} className="text-emerald-400" />
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Transcription</p>
                        </div>
                        <p className="text-sm text-slate-300">{transcript}</p>
                      </motion.div>
                    )}

                    {processingVoice && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-left bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <Loader2 size={16} className="text-emerald-400 animate-spin" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Traitement en cours</p>
                            <p className="text-sm text-slate-400">Analyse de votre dictée vocale...</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {voiceError && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
                      >
                        <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-400">{voiceError}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Category selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-3">Catégorie</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = form.category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => set('category', cat.value)}
                          className={cn(
                            'flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold border transition-all',
                            isSelected
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-gray-200 bg-gray-100 text-slate-400 hover:text-gray-900 hover:border-gray-300'
                          )}
                        >
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', cat.bg)}>
                            <Icon size={13} className={isSelected ? cat.color : 'text-slate-500'} />
                          </div>
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Nom *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Ex : Développement web, Formation..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
                  />
                </div>

                {/* Reference */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Référence</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={form.reference}
                      onChange={(e) => set('reference', e.target.value)}
                      placeholder="REF-001"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Description détaillée du produit ou service..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500/30 transition-colors"
                  />
                </div>

                {/* Price + Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Prix HT *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">€</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.unit_price}
                        onChange={(e) => set('unit_price', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Unité *</label>
                    <CustomSelect
                      options={UNITS.map((u) => ({
                        value: u.value,
                        label: u.label,
                      }))}
                      value={form.unit}
                      onChange={(v) => set('unit', v)}
                      placeholder="Sélectionner"
                    />
                  </div>
                </div>

                {/* VAT */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Taux de TVA</label>
                  <div className="flex gap-2">
                    {VAT_RATES.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => set('vat_rate', String(rate))}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                          String(rate) === form.vat_rate
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'border-gray-200 bg-gray-100 text-slate-400 hover:text-gray-900'
                        )}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Produit actif</p>
                    <p className="text-xs text-slate-500">Visible lors de la création de facture</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('is_active', !form.is_active)}
                    className={cn(
                      'w-12 h-7 rounded-full transition-all duration-200 relative flex-shrink-0',
                      form.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-200',
                      form.is_active ? 'left-6' : 'left-1'
                    )} />
                  </button>
                </div>
              </form>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold text-slate-400 hover:text-gray-900 hover:border-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-all disabled:opacity-60"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={18} />
                      {editingId ? 'Enregistrer' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Assistant Modal */}
      <AnimatePresence>
        {showVoiceAssistant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
              <VoiceAssistant
                onResult={(data) => {
                  handleVoiceResult(data);
                  setShowVoiceAssistant(false);
                }}
                onClose={() => setShowVoiceAssistant(false)}
                isPro={canUseVoice}
                mode="product"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

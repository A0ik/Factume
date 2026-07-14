'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Download, Check, X, AlertCircle, ChevronRight, FileText, ExternalLink, Zap, Settings, Key, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

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
  status: 'pending' | 'validated' | 'rejected' | 'approved';
  created_at: string;
  ocr_raw_response?: any;
}

interface ExportRecord {
  id: string;
  software: string;
  count: number;
  date: string;
  total: number;
}

type Software = 'pennylane' | 'sage' | 'cegid' | 'csv_fec';

// ── Software config ──────────────────────────────────────────────────────────

const SOFTWARE_CARDS: {
  key: Software;
  name: string;
  description: string;
  color: string;
  bgGradient: string;
  iconBg: string;
  comingSoon?: boolean;
  needsConfig: 'api_key' | 'oauth' | 'none';
  configLabel: string;
}[] = [
  {
    key: 'pennylane',
    name: 'Pennylane',
    description: 'Leader français SaaS comptabilité',
    color: 'from-emerald-500 to-emerald-600',
    bgGradient: 'from-emerald-500/10 to-emerald-600/10',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    needsConfig: 'api_key',
    configLabel: 'Clé API Pennylane',
  },
  {
    key: 'sage',
    name: 'Sage',
    description: 'Logiciel comptable n°1 en France',
    color: 'from-green-500 to-emerald-600',
    bgGradient: 'from-green-500/10 to-emerald-600/10',
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    needsConfig: 'oauth',
    configLabel: 'Connexion OAuth Sage',
  },
  {
    key: 'cegid',
    name: 'Cegid',
    description: 'Solution comptable entreprise',
    color: 'from-blue-500 to-cyan-600',
    bgGradient: 'from-blue-500/10 to-cyan-600/10',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    comingSoon: true,
    needsConfig: 'none',
    configLabel: '',
  },
  {
    key: 'csv_fec',
    name: 'CSV / FEC',
    description: 'Export universel',
    color: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 to-orange-600/10',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    needsConfig: 'none',
    configLabel: '',
  },
];

// ── Category helpers ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport',
  meals: 'Repas',
  accommodation: 'Hébergement',
  equipment: 'Matériel',
  office: 'Bureau',
  shopping: 'Achats',
  mileage: 'IK',
  other: 'Autre',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ExportComptaPage() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [apiKey, setApiKey] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // ── Fetch validated expenses ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchExpenses();
    loadExportHistory();
  }, [user]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('expenses')
        .select('*')
        .eq('user_id', user!.id)
        .in('status', ['validated', 'approved'])
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (err: any) {
      toast.error('Erreur lors du chargement des dépenses');
    } finally {
      setLoading(false);
    }
  };

  const loadExportHistory = () => {
    try {
      const stored = localStorage.getItem('export_compta_history');
      if (stored) {
        setExportHistory(JSON.parse(stored));
      }
    } catch {}
  };

  const saveExportHistory = (records: ExportRecord[]) => {
    setExportHistory(records);
    try {
      localStorage.setItem('export_compta_history', JSON.stringify(records));
    } catch {}
  };

  // ── Selection helpers ─────────────────────────────────────────────────
  const toggleExpense = (id: string) => {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedExpenseIds.size === expenses.length) {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedExpenseIds(new Set(expenses.map((e) => e.id)));
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────
  const selectedExpenses = expenses.filter((e) => selectedExpenseIds.has(e.id));
  const totalHT = selectedExpenses.reduce((s, e) => s + (e.amount - (e.vat_amount || 0)), 0);
  const totalTVA = selectedExpenses.reduce((s, e) => s + (e.vat_amount || 0), 0);
  const totalTTC = selectedExpenses.reduce((s, e) => s + e.amount, 0);

  // ── Export handler ────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!selectedSoftware) {
      toast.error('Sélectionnez un logiciel comptable');
      return;
    }

    if (selectedExpenseIds.size === 0) {
      toast.error('Sélectionnez au moins une dépense');
      return;
    }

    const softwareConfig = SOFTWARE_CARDS.find((s) => s.key === selectedSoftware);
    if (softwareConfig?.needsConfig === 'api_key' && !apiKey.trim()) {
      toast.error('Entrez votre clé API');
      return;
    }

    if (softwareConfig?.comingSoon) {
      toast.error('Cette intégration arrive bientôt');
      return;
    }

    setExporting(true);

    try {
      const payload: any = {
        software: selectedSoftware,
        expense_ids: Array.from(selectedExpenseIds),
        config: {
          api_key: apiKey || undefined,
          account_code: accountCode || undefined,
        },
      };

      const res = await fetch('/api/expenses/export-compta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Handle FEC file download
      if (res.headers.get('Content-Type')?.includes('text/plain')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'FEC_Export.txt';
        a.click();
        URL.revokeObjectURL(url);

        // Record export
        const record: ExportRecord = {
          id: Date.now().toString(),
          software: selectedSoftware,
          count: selectedExpenseIds.size,
          date: new Date().toISOString(),
          total: totalTTC,
        };
        saveExportHistory([record, ...exportHistory].slice(0, 50));

        toast.success(`${selectedExpenseIds.size} dépense(s) exportée(s) en FEC`);
        setSelectedExpenseIds(new Set());
        setExporting(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          toast.error(data.error || 'Abonnement Business requis');
        } else {
          toast.error(data.error || 'Erreur lors de l\'export');
        }
        setExporting(false);
        return;
      }

      // Record export
      const record: ExportRecord = {
        id: Date.now().toString(),
        software: selectedSoftware,
        count: data.exported || 0,
        date: new Date().toISOString(),
        total: totalTTC,
      };
      saveExportHistory([record, ...exportHistory].slice(0, 50));

      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.exported} exportée(s), ${data.errors.length} erreur(s)`);
        data.errors.forEach((e: string) => toast.error(e));
      } else {
        toast.success(`${data.exported} dépense(s) exportée(s) vers ${softwareConfig?.name}`);
      }

      setSelectedExpenseIds(new Set());
      await fetchExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Erreur réseau');
    } finally {
      setExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 mb-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-emerald-500/5 to-primary/5" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary via-emerald-500 to-primary-dark bg-clip-text text-transparent">
              Export Comptable
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Envoyez vos dépenses vers votre logiciel comptable
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/expenses"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
            >
              <ChevronRight size={16} className="rotate-180" />
              Retour
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Software Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-primary" />
          Choisir le logiciel comptable
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOFTWARE_CARDS.map((sw, i) => (
            <motion.button
              key={sw.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !sw.comingSoon && setSelectedSoftware(sw.key)}
              disabled={sw.comingSoon}
              className={cn(
                'relative group bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border-2 p-6 text-left transition-all overflow-hidden',
                selectedSoftware === sw.key
                  ? 'border-primary shadow-xl shadow-primary/20 ring-2 ring-primary/20'
                  : 'border-white/50 dark:border-white/10 hover:border-primary/30',
                sw.comingSoon && 'opacity-60 cursor-not-allowed'
              )}
            >
              {/* Selected glow */}
              {selectedSoftware === sw.key && (
                <motion.div
                  layoutId="softwareGlow"
                  className={cn('absolute inset-0 bg-gradient-to-br opacity-10', sw.color)}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative">
                {/* Icon */}
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg', sw.iconBg)}>
                  {sw.key === 'csv_fec' ? (
                    <Download size={24} className="text-white" />
                  ) : (
                    <Building2 size={24} className="text-white" />
                  )}
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{sw.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{sw.description}</p>

                {/* Coming soon badge */}
                {sw.comingSoon && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    <Zap size={12} />
                    Bientôt
                  </div>
                )}

                {/* Selected check */}
                {selectedSoftware === sw.key && !sw.comingSoon && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check size={16} className="text-white" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Config Panel (Pennylane API Key / Sage OAuth) */}
      <AnimatePresence>
        {selectedSoftware && SOFTWARE_CARDS.find((s) => s.key === selectedSoftware)?.needsConfig === 'api_key' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Key size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Configuration Pennylane</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Entrez votre clé API pour connecter votre compte</p>
                </div>
                <a
                  href="https://app.pennylane.com/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  Obtenir la clé <ExternalLink size={14} />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                    Clé API Pennylane
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="pk_live_..."
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm font-mono transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                    Compte comptable par défaut
                  </label>
                  <div className="relative">
                    <Settings size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={accountCode}
                      onChange={(e) => setAccountCode(e.target.value)}
                      placeholder="625000"
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm font-mono transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {selectedSoftware === 'sage' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Configuration Sage</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Connectez votre compte Sage Business Cloud</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                    Token OAuth Sage
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Bearer token..."
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm font-mono transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                    Compte comptable par défaut
                  </label>
                  <div className="relative">
                    <Settings size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={accountCode}
                      onChange={(e) => setAccountCode(e.target.value)}
                      placeholder="625000"
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm font-mono transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Dépenses validées
            {!loading && (
              <span className="text-sm font-normal text-gray-400">({expenses.length} disponibles)</span>
            )}
          </h2>
          {expenses.length > 0 && (
            <button
              onClick={selectAll}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold transition-all border',
                selectedExpenseIds.size === expenses.length
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-white/50 dark:bg-slate-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary/30'
              )}
            >
              {selectedExpenseIds.size === expenses.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mx-auto mb-6">
              <FileText size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucune dépense validée</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Validez des notes de frais pour les exporter</p>
            <Link
              href="/expenses"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/30"
            >
              <ArrowRight size={18} />
              Aller aux notes de frais
            </Link>
          </div>
        ) : (
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-700/50 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedExpenseIds.size === expenses.length}
                  onChange={selectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="col-span-3">Fournisseur</div>
              <div className="col-span-2">Catégorie</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-right">HT</div>
              <div className="col-span-1 text-right">TVA</div>
              <div className="col-span-2 text-right">TTC</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50 max-h-[500px] overflow-y-auto">
              {expenses.map((expense) => {
                const isSelected = selectedExpenseIds.has(expense.id);
                const ht = expense.amount - (expense.vat_amount || 0);
                return (
                  <motion.button
                    key={expense.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => toggleExpense(expense.id)}
                    className={cn(
                      'w-full grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 text-left transition-all hover:bg-gray-50/50 dark:hover:bg-slate-700/30',
                      isSelected && 'bg-primary/5 dark:bg-primary/10'
                    )}
                  >
                    {/* Checkbox */}
                    <div className="md:col-span-1 flex items-center gap-3 md:gap-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleExpense(expense.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      {/* Mobile: show vendor inline */}
                      <span className="md:hidden font-bold text-gray-900 dark:text-white">{expense.vendor}</span>
                    </div>

                    {/* Vendor */}
                    <div className="hidden md:flex md:col-span-3 items-center gap-3">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{expense.vendor}</p>
                        {expense.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{expense.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="hidden md:flex md:col-span-2 items-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                        {CATEGORY_LABELS[expense.category] || expense.category}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="hidden md:flex md:col-span-2 items-center text-sm text-gray-600 dark:text-gray-400">
                      {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>

                    {/* HT */}
                    <div className="hidden md:flex md:col-span-1 items-center justify-end text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatCurrency(ht)}
                    </div>

                    {/* TVA */}
                    <div className="hidden md:flex md:col-span-1 items-center justify-end text-sm text-gray-500">
                      {formatCurrency(expense.vat_amount || 0)}
                    </div>

                    {/* TTC */}
                    <div className="hidden md:flex md:col-span-2 items-center justify-end text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Summary & Export Button */}
      <AnimatePresence>
        {selectedExpenseIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-8"
          >
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Summary */}
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sélection</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{selectedExpenseIds.size}</p>
                  </div>
                  <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total HT</p>
                    <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{formatCurrency(totalHT)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">TVA</p>
                    <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{formatCurrency(totalTVA)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wide">Total TTC</p>
                    <p className="text-2xl font-black text-primary">{formatCurrency(totalTTC)}</p>
                  </div>
                </div>

                {/* Export button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExport}
                  disabled={exporting || !selectedSoftware}
                  className={cn(
                    'flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-white text-base font-bold shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                    selectedSoftware
                      ? 'bg-gradient-to-r from-primary to-primary-dark shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40'
                      : 'bg-gray-400'
                  )}
                >
                  {exporting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      Exporter vers {SOFTWARE_CARDS.find((s) => s.key === selectedSoftware)?.name || '...'}
                    </>
                  )}
                </motion.button>
              </div>

              {!selectedSoftware && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-2">
                  <AlertCircle size={14} />
                  Sélectionnez un logiciel comptable ci-dessus pour exporter
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          Historique des exports
        </h2>

        {exportHistory.length === 0 ? (
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 p-8 text-center">
            <p className="text-gray-400 text-sm">Aucun export réalisé pour le moment</p>
          </div>
        ) : (
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl overflow-hidden">
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {exportHistory.map((record) => {
                const swConfig = SOFTWARE_CARDS.find((s) => s.key === record.software);
                return (
                  <div key={record.id} className="flex items-center gap-4 px-6 py-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', swConfig?.iconBg || 'bg-gray-400')}>
                      {record.software === 'csv_fec' ? (
                        <Download size={16} className="text-white" />
                      ) : (
                        <Building2 size={16} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{swConfig?.name || record.software}</p>
                        <span className="text-xs text-gray-400">
                          {record.count} dépense(s)
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(record.date).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{formatCurrency(record.total)}</p>
                    </div>
                    <Check size={16} className="text-green-500 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl p-6 text-left"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings size={20} className="text-primary" />
              Comment configurer votre logiciel comptable ?
            </h2>
            <ChevronRight
              size={20}
              className={cn('text-gray-400 transition-transform duration-300', showHelp && 'rotate-90')}
            />
          </div>
        </button>

        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-b-3xl border border-t-0 border-white/50 dark:border-white/10 shadow-xl p-6 pt-0 space-y-6">
                {/* Pennylane */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">Pennylane</h4>
                    <ol className="text-sm text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Connectez-vous à votre compte Pennylane</li>
                      <li>Allez dans Paramètres &gt; API</li>
                      <li>Créez une clé API avec les permissions "supplier_invoices"</li>
                      <li>Copiez la clé et collez-la dans le champ ci-dessus</li>
                    </ol>
                  </div>
                </div>

                {/* Sage */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">Sage Business Cloud</h4>
                    <ol className="text-sm text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Connectez-vous à Sage Business Cloud</li>
                      <li>Allez dans Paramètres &gt; Intégrations</li>
                      <li>Générez un token d'accès OAuth</li>
                      <li>Collez le token dans le champ de configuration</li>
                    </ol>
                  </div>
                </div>

                {/* FEC */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <Download size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">Export CSV / FEC</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      L'export FEC (Fichier des Écritures Comptables) est un format réglementaire français conforme à la norme DGFiP.
                      Il est compatible avec tous les logiciels comptables et peut être importé directement.
                      Aucune configuration nécessaire.
                    </p>
                  </div>
                </div>

                {/* Info notice */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-blue-700 dark:text-blue-300 mb-1">Sécurité des données</p>
                    <p className="text-blue-600/80 dark:text-blue-400/80">
                      Vos clés API sont utilisées uniquement pour l'export et ne sont jamais stockées sur nos serveurs.
                      L'export FEC est toujours disponible gratuitement et ne nécessite aucune connexion.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

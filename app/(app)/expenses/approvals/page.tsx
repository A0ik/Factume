'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Clock,
  User,
  FileImage,
  AlertCircle,
  ChevronDown,
  Filter,
  CheckCircle,
  XCircle,
  MessageSquare,
  Car, Coffee, Home, Laptop, Briefcase, ShoppingCart, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { ReceiptLink } from '@/components/storage/ReceiptLink';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfileStub {
  first_name: string | null;
  last_name: string | null;
  email: string;
  company_name: string | null;
}

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
  status: string;
  created_at: string;
  profiles: ProfileStub | ProfileStub[] | null;
}

interface Stats {
  pending: number;
  approvedMonth: number;
  rejectedMonth: number;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { value: 'transport', label: 'Transport', Icon: Car },
  { value: 'meals', label: 'Repas', Icon: Coffee },
  { value: 'accommodation', label: 'Hébergement', Icon: Home },
  { value: 'equipment', label: 'Matériel', Icon: Laptop },
  { value: 'office', label: 'Bureau', Icon: Briefcase },
  { value: 'shopping', label: 'Achats', Icon: ShoppingCart },
  { value: 'other', label: 'Autre', Icon: Package },
];

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}

function getSubmitterName(expense: Expense): string {
  if (!expense.profiles) return 'Inconnu';
  const p = Array.isArray(expense.profiles) ? expense.profiles[0] : expense.profiles;
  if (!p) return 'Inconnu';
  if (p.first_name || p.last_name) return `${p.first_name || ''} ${p.last_name || ''}`.trim();
  if (p.company_name) return p.company_name;
  return p.email;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ExpenseApprovalsPage() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approvedMonth: 0, rejectedMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (user) fetchApprovals();
  }, [user]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses/approve');
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.isManager === false) {
          setIsManager(false);
        } else {
          console.error(data.error);
        }
        setExpenses([]);
      } else {
        setIsManager(true);
        setExpenses(data.expenses || []);
        setStats(data.stats || { pending: 0, approvedMonth: 0, rejectedMonth: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const handleAction = async (ids: string[], action: 'approved' | 'rejected', comment?: string) => {
    if (ids.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/expenses/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expense_ids: ids, action, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        action === 'approved'
          ? `${data.updated} dépense(s) approuvée(s)`
          : `${data.updated} dépense(s) rejetée(s)`
      );
      setSelectedIds(new Set());
      setCommentOpenId(null);
      await fetchApprovals();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'action');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = (id: string) => handleAction([id], 'approved');
  const handleReject = (id: string) => {
    const comment = commentMap[id] || undefined;
    handleAction([id], 'rejected', comment);
  };
  const handleBulkApprove = () => handleAction(Array.from(selectedIds), 'approved');
  const handleBulkReject = () => {
    const comments = Array.from(selectedIds)
      .map((id) => commentMap[id])
      .filter(Boolean)
      .join('; ');
    handleAction(Array.from(selectedIds), 'rejected', comments || undefined);
  };

  // -------------------------------------------------------------------------
  // Selection helpers
  // -------------------------------------------------------------------------
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    }
  };

  // -------------------------------------------------------------------------
  // Group by submitter
  // -------------------------------------------------------------------------
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, expense) => {
    const name = getSubmitterName(expense);
    if (!acc[name]) acc[name] = [];
    acc[name].push(expense);
    return acc;
  }, {});

  // -------------------------------------------------------------------------
  // Not a manager
  // -------------------------------------------------------------------------
  if (!loading && !isManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl p-12 text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pas manager</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Vous devez être administrateur d'un workspace pour voir et gérer les approbations de notes de frais.
          </p>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/30"
          >
            Retour aux dépenses
          </Link>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              Approbations
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Validez les notes de frais de votre équipe
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <>
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkApprove}
                  disabled={processing}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-green-500/20 hover:shadow-xl transition-all disabled:opacity-60"
                >
                  <CheckCircle size={16} />
                  Approuver ({selectedIds.size})
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkReject}
                  disabled={processing}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-red-500/20 hover:shadow-xl transition-all disabled:opacity-60"
                >
                  <XCircle size={16} />
                  Rejeter ({selectedIds.size})
                </motion.button>
              </>
            )}
            <Link
              href="/expenses"
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
            >
              Dépenses
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: 'En attente',
            value: stats.pending,
            icon: Clock,
            color: 'from-amber-500 to-orange-500',
          },
          {
            label: 'Approuvées ce mois',
            value: stats.approvedMonth,
            icon: CheckCircle,
            color: 'from-green-500 to-emerald-500',
          },
          {
            label: 'Rejetées ce mois',
            value: stats.rejectedMonth,
            icon: XCircle,
            color: 'from-red-500 to-rose-500',
          },
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
              <div className="relative flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', color)}>
                  <Icon size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-white transition-colors">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/70 transition-colors uppercase tracking-wider font-bold">{label}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-12 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500/60" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tout est à jour</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Aucune note de frais en attente d'approbation pour le moment.
          </p>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/30"
          >
            Voir les dépenses
          </Link>
        </motion.div>
      ) : (
        /* Select all bar */
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-4 mb-6 flex items-center gap-4"
          >
            <button
              onClick={toggleAll}
              className={cn(
                'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
                selectedIds.size === expenses.length
                  ? 'bg-primary border-primary text-white'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
              )}
            >
              {selectedIds.size === expenses.length && <Check size={14} />}
            </button>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Tout sélectionner ({expenses.length} dépense{expenses.length > 1 ? 's' : ''})
            </span>
          </motion.div>

          {/* Grouped expenses */}
          <div className="space-y-8">
            {Object.entries(grouped).map(([submitterName, submitterExpenses]) => (
              <motion.div
                key={submitterName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Submitter header */}
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <User size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{submitterName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {submitterExpenses.length} note{submitterExpenses.length > 1 ? 's' : ''} de frais
                    </p>
                  </div>
                </div>

                {/* Expense cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {submitterExpenses.map((expense) => {
                    const cat = getCategoryMeta(expense.category);
                    const isSelected = selectedIds.has(expense.id);
                    const isCommentOpen = commentOpenId === expense.id;

                    return (
                      <motion.div
                        key={expense.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ y: -2 }}
                        className={cn(
                          'group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden transition-all',
                          isSelected
                            ? 'border-primary/50 ring-2 ring-primary/20'
                            : 'border-white/50 dark:border-white/10'
                        )}
                      >
                        {/* Selection checkbox */}
                        <div className="absolute top-4 left-4 z-10">
                          <button
                            onClick={() => toggleSelect(expense.id)}
                            className={cn(
                              'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all bg-white/80 dark:bg-slate-700/80',
                              isSelected
                                ? 'bg-primary border-primary text-white'
                                : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                            )}
                          >
                            {isSelected && <Check size={14} />}
                          </button>
                        </div>

                        <div className="p-5 pl-14">
                          <div className="flex items-start gap-4">
                            {/* Category icon */}
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                              <cat.Icon size={22} />
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{expense.vendor}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    {expense.description || cat.label}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 mt-3 flex-wrap">
                                <p className="text-xl font-black text-gray-900 dark:text-white">
                                  {formatCurrency(expense.amount)}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                                  <Clock size={10} />
                                  {new Date(expense.date).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                                  {cat.label}
                                </span>
                              </div>

                              {/* Receipt thumbnail */}
                              {expense.receipt_url && (
                                <div className="mt-3">
                                  <ReceiptLink
                                    url={expense.receipt_url}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                                  >
                                    <FileImage size={12} />
                                    Voir le justificatif
                                  </ReceiptLink>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Comment toggle */}
                          <AnimatePresence>
                            {isCommentOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 overflow-hidden"
                              >
                                <textarea
                                  value={commentMap[expense.id] || ''}
                                  onChange={(e) =>
                                    setCommentMap((prev) => ({ ...prev, [expense.id]: e.target.value }))
                                  }
                                  placeholder="Raison du rejet (optionnel)..."
                                  rows={2}
                                  className="w-full px-4 py-3 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-red-400/50 focus:ring-2 focus:ring-red-400/20 text-sm resize-none transition-all"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-4">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleApprove(expense.id)}
                              disabled={processing}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-green-500/20 hover:shadow-xl transition-all disabled:opacity-60"
                            >
                              <Check size={16} />
                              Approuver
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                if (!isCommentOpen) {
                                  setCommentOpenId(expense.id);
                                } else {
                                  handleReject(expense.id);
                                }
                              }}
                              disabled={processing}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:shadow-xl transition-all disabled:opacity-60"
                            >
                              {isCommentOpen ? (
                                <>
                                  <X size={16} />
                                  Confirmer
                                </>
                              ) : (
                                <>
                                  <X size={16} />
                                  Rejeter
                                </>
                              )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                setCommentOpenId(isCommentOpen ? null : expense.id)
                              }
                              className={cn(
                                'p-2.5 rounded-2xl border transition-all',
                                isCommentOpen
                                  ? 'bg-primary/10 border-primary/30 text-primary'
                                  : 'bg-white/50 dark:bg-slate-700/50 border-gray-200 dark:border-gray-600 text-gray-400 hover:text-primary hover:border-primary/50'
                              )}
                              title="Ajouter un commentaire"
                            >
                              <MessageSquare size={16} />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

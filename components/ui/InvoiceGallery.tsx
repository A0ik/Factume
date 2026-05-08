'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  FileText, Search, Filter, Grid3X3, List, Download, Trash2,
  Eye, Calendar, Building2, CreditCard, CheckCircle, Clock, AlertCircle,
  X, ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import { InvoiceViewer } from './InvoiceViewer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Expense {
  id: string;
  vendor: string;
  amount: number;
  vat_amount: number;
  category: string;
  date: string;
  description: string;
  receipt_url: string | null;
  receipt_storage_path: string | null;
  payment_method: string;
  status: 'pending' | 'validated' | 'rejected';
  invoice_number?: string;
  ocr_confidence?: number;
}

interface InvoiceGalleryProps {
  expenses: Expense[];
  onExpenseDeleted?: (id: string) => void;
  onExpenseUpdated?: (id: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceGallery({ expenses, onExpenseDeleted, onExpenseUpdated, className }: InvoiceGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchSearch =
        !search ||
        expense.vendor.toLowerCase().includes(search.toLowerCase()) ||
        expense.description?.toLowerCase().includes(search.toLowerCase()) ||
        expense.invoice_number?.toLowerCase().includes(search.toLowerCase());

      const matchCategory = !filterCategory || expense.category === filterCategory;
      const matchStatus = !filterStatus || expense.status === filterStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [expenses, search, filterCategory, filterStatus]);

  // Thumbnail URL — uses the real /api/thumbnails endpoint (Sharp-generated, 7-day cache)
  const thumbnailSrc = (expense: Expense): string | null => {
    if (!expense.receipt_url) return null;
    return `/api/thumbnails?id=${expense.id}`;
  };

  // View expense
  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
  };

  // Delete expense
  const handleDeleteExpense = (id: string, vendor: string) => {
    toast(`Supprimer la facture "${vendor}" ?`, {
      action: {
        label: 'Supprimer',
        onClick: async () => {
          try {
            const { getSupabaseClient } = await import('@/lib/supabase');
            const supabase = getSupabaseClient();

            const { error } = await supabase.from('expenses').delete().eq('id', id);

            if (error) throw error;

            onExpenseDeleted?.(id);
            toast.success('Facture supprimée');
          } catch (err) {
            console.error('Delete error:', err);
            toast.error('Erreur lors de la suppression');
          }
        },
      },
    });
  };

  // Status badge
  const getStatusBadge = (status: Expense['status']) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      validated: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
    };

    const icons = {
      pending: Clock,
      validated: CheckCircle,
      rejected: AlertCircle,
    };

    const Icon = icons[status];

    return (
      <span className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border', styles[status])}>
        <Icon size={12} />
        {status === 'pending' && 'En attente'}
        {status === 'validated' && 'Validée'}
        {status === 'rejected' && 'Rejetée'}
      </span>
    );
  };

  // Confidence badge
  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;

    const color = confidence >= 0.8 ? 'text-green-500' : confidence >= 0.6 ? 'text-amber-500' : 'text-red-500';
    const icon = confidence >= 0.8 ? CheckCircle : AlertCircle;

    const IconComponent = icon;
    return (
      <span className={cn('flex items-center gap-1 text-xs', color)}>
        <IconComponent size={12} />
        {Math.round(confidence * 100)}%
      </span>
    );
  };

  return (
    <>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gallery de Factures
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {expenses.length} facture(s) • {filteredExpenses.length} affichée(s)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}
            >
              <Grid3X3 size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}
            >
              <List size={20} />
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une facture..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white"
          >
            <option value="">Toutes catégories</option>
            <option value="transport">Transport</option>
            <option value="meals">Repas</option>
            <option value="accommodation">Hébergement</option>
            <option value="equipment">Matériel</option>
            <option value="office">Bureau</option>
            <option value="shopping">Achats</option>
            <option value="other">Autre</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white"
          >
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="validated">Validée</option>
            <option value="rejected">Rejetée</option>
          </select>
        </div>

        {/* Gallery */}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucune facture trouvée
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {search || filterCategory || filterStatus
                ? 'Essayez d\'ajuster vos filtres'
                : 'Commencez par ajouter votre première facture'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredExpenses.map((expense, index) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-900 overflow-hidden">
                      {thumbnailSrc(expense) ? (
                        <img
                          src={thumbnailSrc(expense)!}
                          alt={expense.vendor}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = expense.receipt_url ?? ''; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleViewExpense(expense)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm"
                          >
                            <ZoomIn size={16} />
                            Voir
                          </motion.button>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        {getStatusBadge(expense.status)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {expense.vendor}
                          </h4>
                          {expense.invoice_number && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {expense.invoice_number}
                            </p>
                          )}
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar size={12} />
                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                        {expense.ocr_confidence && (
                          <>
                            <span>•</span>
                            {getConfidenceBadge(expense.ocr_confidence)}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredExpenses.map((expense, index) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:shadow-primary/5 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                      {expense.receipt_url ? (
                        <img
                          src={thumbnailSrc(expense)!}
                          alt={expense.vendor}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = expense.receipt_url ?? ''; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-gray-300 dark:text-gray-700" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {expense.vendor}
                          </h4>
                          {expense.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {expense.description}
                            </p>
                          )}
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(expense.date).toLocaleDateString('fr-FR')}
                        </span>
                        {expense.invoice_number && (
                          <span>• {expense.invoice_number}</span>
                        )}
                        {expense.ocr_confidence && (
                          <span>•</span>
                        )}
                        {getConfidenceBadge(expense.ocr_confidence)}
                        {getStatusBadge(expense.status)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleViewExpense(expense)}
                        className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-primary hover:text-white"
                        title="Voir"
                      >
                        <Eye size={18} />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteExpense(expense.id, expense.vendor)}
                        className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-500 hover:text-white"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Invoice Viewer Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <InvoiceViewer
            expense={selectedExpense}
            onClose={() => setSelectedExpense(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default InvoiceGallery;

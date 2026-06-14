'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, X, Loader2, Plus, Check, ShoppingCart } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'sonner';

const CATEGORY_LABELS: Record<string, string> = {
  service: 'Service',
  product: 'Produit',
  software: 'Logiciel',
  consulting: 'Conseil',
  other: 'Autre',
};

interface ProductCatalogModalProps {
  open: boolean;
  onClose: () => void;
  /** Recoit les produits sélectionnés (1 en mode remplacement, N en mode ajout). */
  onApply: (products: Product[]) => void;
  /** true = sélection unique pour remplplacer une ligne ; false = ajout multiple. */
  replaceMode?: boolean;
  userId?: string;
}

export function ProductCatalogModal({ open, onClose, onApply, replaceMode = false, userId }: ProductCatalogModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!open || fetched || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await getSupabaseClient()
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        if (!cancelled) setProducts((data as Product[]) || []);
      } catch {
        if (!cancelled) toast.error('Erreur lors du chargement du catalogue');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFetched(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [open, fetched, userId]);

  // Reset à chaque ouverture/fermeture
  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveCategory('all');
      setSelected(new Set());
      setFetched(false);
    }
  }, [open]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q)
      );
    });
  }, [products, search, activeCategory]);

  const selectedList = useMemo(
    () => products.filter((p) => selected.has(p.id)),
    [products, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (replaceMode) {
        next.clear();
        if (!prev.has(id)) next.add(id);
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApply = () => {
    if (selectedList.length === 0) {
      toast.error('Sélectionnez au moins un article');
      return;
    }
    onApply(selectedList);
  };

  const totalSel = selectedList.reduce((s, p) => s + (p.unit_price || 0), 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <Package className="text-white" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Catalogue d&apos;articles</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {replaceMode ? 'Choisissez un article à insérer dans la ligne' : 'Sélectionnez les articles à ajouter au document'}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 shrink-0">
                  <X size={20} />
                </button>
              </div>

              {/* Recherche */}
              <div className="relative mt-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher par nom, référence, description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-transparent transition-all"
                />
              </div>

              {/* Filtres catégorie */}
              {categories.length > 2 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                        activeCategory === cat
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-emerald-500/40 hover:text-emerald-600',
                      )}
                    >
                      {cat === 'all' ? 'Tous' : CATEGORY_LABELS[cat] || cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="text-emerald-500 animate-spin" size={32} />
                  <p className="text-sm text-gray-400 dark:text-gray-500">Chargement du catalogue…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                    <Package className="text-gray-300 dark:text-gray-600" size={28} />
                  </div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {search || activeCategory !== 'all' ? 'Aucun article trouvé' : 'Votre catalogue est vide'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
                    {search || activeCategory !== 'all'
                      ? 'Essayez une autre recherche ou catégorie.'
                      : 'Ajoutez vos prestations et produits récurrents pour gagner du temps.'}
                  </p>
                  {!search && activeCategory === 'all' && (
                    <a href="/products" className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                      <Plus size={15} /> Créer mon catalogue
                    </a>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {filtered.map((p) => {
                    const isSel = selected.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={cn(
                          'relative text-left p-4 rounded-2xl border transition-all group',
                          isSel
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-white/5',
                        )}
                      >
                        <span className={cn(
                          'absolute top-3 right-3 w-5 h-5 rounded-md flex items-center justify-center transition-all',
                          isSel
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 dark:bg-white/10 text-transparent border border-gray-200 dark:border-white/15 group-hover:border-emerald-500/50',
                        )}>
                          <Check size={13} strokeWidth={3} />
                        </span>
                        <p className="font-semibold text-gray-900 dark:text-white truncate pr-7">{p.name}</p>
                        {p.reference && (
                          <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-[10px] font-semibold rounded-full mb-1.5 mt-1">
                            {p.reference}
                          </span>
                        )}
                        {p.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{p.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 text-[10px] rounded-md">{p.unit || 'unit'}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">TVA {p.vat_rate}%</span>
                          </div>
                          <p className="text-base font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(p.unit_price)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
              <div className="text-sm">
                {selectedList.length === 0 ? (
                  <span className="text-gray-500 dark:text-gray-400">Aucun article sélectionné</span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-300">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedList.length}</span> article{selectedList.length > 1 ? 's' : ''}
                    {!replaceMode && <span className="text-gray-400 dark:text-gray-500"> · {formatCurrency(totalSel)} HT</span>}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  Annuler
                </button>
                <button
                  onClick={handleApply}
                  disabled={selectedList.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <ShoppingCart size={16} />
                  {replaceMode ? 'Insérer' : `Ajouter${selectedList.length > 0 ? ` (${selectedList.length})` : ''}`}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProductCatalogModal;

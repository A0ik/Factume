'use client';
/**
 * DÉDALOS / Dext-killer — Page Fournisseurs.
 * Onglet 1 « Annuaire » : intelligence consolidée par fournisseur (nombre de
 *   factures, total d'achats, fourchette de montants, catégories typiques,
 *   cadence, dernière vue) — alimentée automatiquement par chaque OCR.
 * Onglet 2 « Règles » : auto-catégorisation par fournisseur (vendor_mappings),
 *   appliquée à chaque nouvelle extraction — l'automatisation phare de Dext.
 */
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Search, Sparkles, Trash2, Plus, RefreshCw, TrendingDown,
  Hash, Loader2, FileText, Shield, Receipt, Layers, Calendar, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useThemeStore } from '@/stores/themeStore';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface VendorIntel {
  id: string;
  vendor_name: string;
  vendor_domain?: string | null;
  typical_categories?: string[];
  typical_amount_range?: { min: number; max: number } | null;
  total_invoices?: number;
  total_purchases?: number | string;
  average_amount?: number | string | null;
  ocr_confidence_avg?: number;
  last_seen?: string;
  payment_terms?: string | null;
  vat_number?: string | null;
}

interface VendorRule {
  id: string;
  vendor_name_pattern: string;
  account_code?: string | null;
  account_name?: string | null;
  corrected_category?: string | null;
}

const RULE_CATEGORIES = [
  { value: 'transport', label: 'Transport' },
  { value: 'meals', label: 'Repas' },
  { value: 'accommodation', label: 'Hébergement' },
  { value: 'equipment', label: 'Matériel' },
  { value: 'office', label: 'Bureau' },
  { value: 'shopping', label: 'Achats' },
  { value: 'telecom', label: 'Télécom' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'software', label: 'Logiciel' },
  { value: 'other', label: 'Autre' },
];

const catLabel = (v?: string | null) =>
  RULE_CATEGORIES.find((c) => c.value === v)?.label || (v || '—');

export default function SuppliersPage() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [tab, setTab] = useState<'directory' | 'rules'>('directory');
  const [vendors, setVendors] = useState<VendorIntel[]>([]);
  const [rules, setRules] = useState<VendorRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');

  // Form état (nouvelle règle)
  const [rVendor, setRVendor] = useState('');
  const [rCategory, setRCategory] = useState('software');
  const [rAccount, setRAccount] = useState('');
  const [savingRule, setSavingRule] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, rRes] = await Promise.all([
        fetch('/api/vendors'),
        fetch('/api/vendor-rules'),
      ]);
      if (vRes.ok) {
        const vd = await vRes.json();
        setVendors(vd.vendors || []);
      }
      if (rRes.ok) {
        const rd = await rRes.json();
        setRules(rd.rules || []);
      }
    } catch {
      toast.error('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/vendors/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Annuaire reconstruit — ${data.learned} dépenses traitées`);
        await load();
      } else {
        toast.error(data.error || 'Erreur lors de la reconstruction');
      }
    } catch {
      toast.error('Erreur lors de la reconstruction');
    } finally {
      setSeeding(false);
    }
  };

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rVendor.trim()) { toast.error('Nom du fournisseur requis'); return; }
    setSavingRule(true);
    try {
      const res = await fetch('/api/vendor-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name_pattern: rVendor.trim(),
          corrected_category: rCategory,
          account_code: rAccount.trim() || null,
          account_name: null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Règle créée — les prochaines factures de ce fournisseur seront auto-classées');
        setRVendor(''); setRAccount('');
        await load();
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return;
    try {
      const res = await fetch('/api/vendor-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Règle supprimée');
        setRules((rs) => rs.filter((r) => r.id !== id));
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredVendors = vendors.filter((v) =>
    !search || v.vendor_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPurchases = vendors.reduce((s, v) => s + Number(v.total_purchases || 0), 0);
  const totalInvoices = vendors.reduce((s, v) => s + Number(v.total_invoices || 0), 0);

  const cardCls = isDark
    ? 'bg-white/[0.04] border border-white/[0.08]'
    : 'bg-white border border-gray-200 shadow-sm';
  const inputCls = isDark
    ? 'bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-600 focus:border-white/[0.15]'
    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:border-gray-300';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Building2 size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Fournisseurs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Annuaire intelligent &amp; règles d&apos;auto-catégorisation
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={seed} disabled={seeding || loading}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors',
              isDark
                ? 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            )}>
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden sm:inline">Reconstruire l&apos;annuaire</span>
            <span className="sm:hidden">Reconstruire</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-white/[0.03] w-full sm:w-auto">
        {([
          { v: 'directory', label: 'Annuaire', Icon: Layers, count: vendors.length },
          { v: 'rules', label: 'Règles', Icon: Sparkles, count: rules.length },
        ] as const).map(({ v, label, Icon, count }) => (
          <button key={v} onClick={() => setTab(v)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              tab === v
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
            )}>
            <Icon size={15} />
            {label}
            <span className={cn(
              'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              tab === v ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-200 dark:bg-white/[0.06] text-gray-500 dark:text-zinc-400'
            )}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'directory' ? (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Fournisseurs', value: String(vendors.length), Icon: Building2 },
              { label: 'Factures traitées', value: String(totalInvoices), Icon: FileText },
              { label: 'Total achats', value: formatCurrency(totalPurchases), Icon: TrendingDown },
            ].map(({ label, value, Icon }) => (
              <div key={label} className={cn('rounded-xl p-3.5', cardCls)}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={13} className="text-emerald-500" />
                  <span className={cn('text-[11px] uppercase tracking-wider font-medium', isDark ? 'text-zinc-500' : 'text-gray-500')}>{label}</span>
                </div>
                <p className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>{value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className={cn('absolute left-3.5 top-1/2 -translate-y-1/2', isDark ? 'text-zinc-500' : 'text-gray-400')} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un fournisseur..."
              className={cn('w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors', inputCls)} />
          </div>

          {/* Vendor grid */}
          {filteredVendors.length === 0 ? (
            <div className={cn('rounded-2xl p-10 text-center', cardCls)}>
              <Building2 size={32} className="mx-auto mb-3 text-gray-300 dark:text-zinc-700" />
              <p className={cn('text-sm font-semibold mb-1', isDark ? 'text-zinc-300' : 'text-gray-700')}>
                {vendors.length === 0 ? 'Annuaire vide' : 'Aucun fournisseur trouvé'}
              </p>
              <p className={cn('text-xs mb-4', isDark ? 'text-zinc-500' : 'text-gray-500')}>
                {vendors.length === 0
                  ? 'Reconstruisez l\'annuaire depuis vos dépenses existantes pour le peupler.'
                  : 'Affinez votre recherche.'}
              </p>
              {vendors.length === 0 && (
                <button onClick={seed} disabled={seeding}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-60">
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Construire l&apos;annuaire
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredVendors.map((v) => (
                <motion.div key={v.id} layout
                  className={cn('rounded-2xl p-4 space-y-3', cardCls)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold truncate', isDark ? 'text-white' : 'text-gray-900')}>{v.vendor_name}</p>
                      {v.vendor_domain && (
                        <p className={cn('text-[11px] truncate', isDark ? 'text-zinc-500' : 'text-gray-400')}>{v.vendor_domain}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {v.total_invoices || 0} {(v.total_invoices || 0) > 1 ? 'factures' : 'facture'}
                      </span>
                      {Number(v.ocr_confidence_avg) > 0 && (
                        <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-gray-400')}>
                          {Math.round(Number(v.ocr_confidence_avg) * 100)}% conf.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className={cn('text-[10px] uppercase tracking-wider mb-0.5', isDark ? 'text-zinc-500' : 'text-gray-400')}>Total achats</p>
                      <p className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-gray-800')}>{formatCurrency(Number(v.total_purchases || 0))}</p>
                    </div>
                    <div>
                      <p className={cn('text-[10px] uppercase tracking-wider mb-0.5', isDark ? 'text-zinc-500' : 'text-gray-400')}>Fourchette</p>
                      <p className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-gray-800')}>
                        {v.typical_amount_range
                          ? `${formatCurrency(Number(v.typical_amount_range.min))} – ${formatCurrency(Number(v.typical_amount_range.max))}`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {v.typical_categories && v.typical_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {v.typical_categories.slice(0, 4).map((c) => (
                        <span key={c} className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-medium',
                          isDark ? 'bg-white/[0.06] text-zinc-300' : 'bg-gray-100 text-gray-600'
                        )}>{catLabel(c)}</span>
                      ))}
                    </div>
                  )}

                  {v.last_seen && (
                    <div className="flex items-center gap-1 pt-1 border-t border-gray-100 dark:border-white/[0.06]">
                      <Calendar size={11} className={isDark ? 'text-zinc-600' : 'text-gray-300'} />
                      <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-gray-400')}>
                        Dernière facture : {new Date(v.last_seen).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}

                  {/* HERMÈS CIBLE 1 — lien direct vers les factures de ce fournisseur */}
                  <Link
                    href={`/expenses?supplier=${v.id}`}
                    className={cn(
                      'flex items-center justify-center gap-1.5 mt-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                      isDark
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    )}
                  >
                    <FileText size={13} />
                    Voir les {v.total_invoices || 0} {(v.total_invoices || 0) > 1 ? 'factures' : 'facture'}
                    <ChevronRight size={13} />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── Règles ─── */
        <div className="space-y-4">
          {/* Explanation */}
          <div className={cn('rounded-2xl p-4 flex items-start gap-3', isDark ? 'bg-emerald-500/[0.07] border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200')}>
            <Sparkles size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-300' : 'text-gray-700')}>
              Les règles <strong>auto-classent</strong> les prochaines factures d&apos;un fournisseur (catégorie + compte de charge PCG).
              Dès qu&apos;une facture correspond au nom, la règle s&apos;applique — comme Dext, mais avec la rigueur du Plan Comptable français.
            </p>
          </div>

          {/* New rule form */}
          <form onSubmit={createRule} className={cn('rounded-2xl p-4 space-y-3', cardCls)}>
            <h3 className={cn('text-sm font-bold flex items-center gap-2', isDark ? 'text-white' : 'text-gray-900')}>
              <Plus size={15} className="text-emerald-500" /> Nouvelle règle
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className={cn('block text-[11px] font-semibold uppercase tracking-wider mb-1.5', isDark ? 'text-zinc-500' : 'text-gray-500')}>Fournisseur</label>
                <input value={rVendor} onChange={(e) => setRVendor(e.target.value)} placeholder="Ex : Orange, SNCF..."
                  className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors', inputCls)} />
              </div>
              <div>
                <label className={cn('block text-[11px] font-semibold uppercase tracking-wider mb-1.5', isDark ? 'text-zinc-500' : 'text-gray-500')}>Catégorie</label>
                <select value={rCategory} onChange={(e) => setRCategory(e.target.value)}
                  className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors', inputCls)}>
                  {RULE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="text-gray-900">{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={cn('block text-[11px] font-semibold uppercase tracking-wider mb-1.5', isDark ? 'text-zinc-500' : 'text-gray-500')}>Compte PCG (option)</label>
                <input value={rAccount} onChange={(e) => setRAccount(e.target.value)} placeholder="626000"
                  className={cn('w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors font-mono', inputCls)} />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingRule}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-60">
                {savingRule ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Créer la règle
              </button>
            </div>
          </form>

          {/* Rules list */}
          {rules.length === 0 ? (
            <div className={cn('rounded-2xl p-10 text-center', cardCls)}>
              <Shield size={32} className="mx-auto mb-3 text-gray-300 dark:text-zinc-700" />
              <p className={cn('text-sm font-semibold mb-1', isDark ? 'text-zinc-300' : 'text-gray-700')}>Aucune règle</p>
              <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-gray-500')}>
                Créez une règle pour qu&apos;un fournisseur soit toujours classé pareil, automatiquement.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className={cn('rounded-xl p-3.5 flex items-center justify-between gap-3', cardCls)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Receipt size={15} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold truncate', isDark ? 'text-white' : 'text-gray-900')}>
                        {r.vendor_name_pattern}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {r.corrected_category && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {catLabel(r.corrected_category)}
                          </span>
                        )}
                        {r.account_code && (
                          <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono', isDark ? 'bg-white/[0.06] text-zinc-400' : 'bg-gray-100 text-gray-500')}>
                            <Hash size={9} />{r.account_code}
                          </span>
                        )}
                        {r.account_name && (
                          <span className={cn('text-[10px] truncate', isDark ? 'text-zinc-500' : 'text-gray-400')}>{r.account_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteRule(r.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Link href="/expenses" className={cn(
            'flex items-center justify-center gap-1.5 text-xs font-medium pt-2',
            'text-gray-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400'
          )}>
            Voir mes dépenses <ChevronRight size={13} />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

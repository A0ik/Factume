'use client';
import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

interface Expense {
  id: string;
  vendor?: string;
  label?: string;
  category?: string;
  amount: number;
  date: string;
  description?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  transport: '🚗', meals: '🍽️', accommodation: '🏨', equipment: '💻',
  office: '📎', shopping: '🛒', telecom: '📱', insurance: '🛡️',
  software: '💾', mileage: '🗺️', other: '📦',
};

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'Transport', meals: 'Repas', accommodation: 'Hébergement',
  equipment: 'Matériel', office: 'Bureau', shopping: 'Achats',
  telecom: 'Télécom', insurance: 'Assurance', software: 'Logiciel',
  mileage: 'Kilométrique', other: 'Autre',
};

export default function CabinetClientExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const supabase = (await import('@/lib/supabase')).getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`/api/cabinet/clients/${id}/data`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setExpenses(json.expenses || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Group by category for summary
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + e.amount;
  });
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/cabinet/clients/${id}`} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Dépenses</h1>
        <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-bold text-gray-500">{expenses.length}</span>
      </div>

      {!loading && expenses.length > 0 && (
        <>
          {/* Total */}
          <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/30">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Total des dépenses</p>
            <p className="text-2xl font-black text-red-700 dark:text-red-300">{formatCurrency(total)}</p>
          </div>

          {/* Category breakdown */}
          {topCategories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {topCategories.map(([cat, amount]) => (
                <div key={cat} className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 text-center">
                  <span className="text-2xl block mb-1">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                  <p className="text-xs text-gray-400 font-medium">{CATEGORY_LABELS[cat] ?? cat}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{formatCurrency(amount)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="text-primary animate-spin" /></div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">Aucune dépense pour ce client</div>
      ) : (
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <span className="text-xl flex-shrink-0">{CATEGORY_ICONS[exp.category ?? ''] ?? '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {exp.vendor || exp.label || 'Dépense'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(exp.date).toLocaleDateString('fr-FR')}
                    {exp.category ? ` · ${CATEGORY_LABELS[exp.category] ?? exp.category}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400 flex-shrink-0">{formatCurrency(exp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

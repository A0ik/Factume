'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Receipt, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function CabinetClientExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { params.then((p) => setId(p.id)); }, []);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/cabinet/clients/${id}/data`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { expenses } = await res.json();
        setExpenses(expenses || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/cabinet/clients/${id}`} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Dépenses</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="text-primary animate-spin" /></div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-10 text-gray-500">Aucune dépense</div>
      ) : (
        <div className="space-y-1">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30">
              <div className="flex items-center gap-3">
                <Receipt size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{exp.label || exp.category || 'Dépense'}</p>
                  <p className="text-xs text-gray-400">{new Date(exp.date).toLocaleDateString('fr-FR')}{exp.category ? ` · ${exp.category}` : ''}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-red-600">{fmtMoney(exp.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

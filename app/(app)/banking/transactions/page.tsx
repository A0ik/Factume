'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Landmark, Filter, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import type { BankTransaction } from '@/types';
import { toast } from 'sonner';

export default function BankTransactionsPage() {
  const { profile } = useAuthStore();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unreconciled' | 'reconciled'>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let query = supabase
        .from('bank_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('transaction_date', { ascending: false })
        .limit(200);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setTransactions(data || []);
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) loadTransactions();
  }, [filter]);

  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const unreconciled = transactions.filter((t) => t.status === 'unreconciled').length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/banking" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Transactions bancaires</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{transactions.length} transactions</p>
          </div>
        </div>
        <button
          onClick={loadTransactions}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-green-50/60 dark:bg-green-900/10 border border-green-200/60 dark:border-green-800/30">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Entrées</p>
          <p className="text-lg font-black text-green-700 dark:text-green-300">{fmtMoney(totalIn)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/30">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">Sorties</p>
          <p className="text-lg font-black text-red-700 dark:text-red-300">{fmtMoney(totalOut)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Non rapprochées</p>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300">{unreconciled}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2">
        {(['all', 'unreconciled', 'reconciled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              filter === f
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            )}
          >
            {f === 'all' ? 'Toutes' : f === 'unreconciled' ? 'Non rapprochées' : 'Rapprochées'}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20">
          <Landmark size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Aucune transaction trouvée</p>
          <Link href="/banking/connect" className="text-primary text-sm font-medium mt-2 inline-block">
            Connecter ma banque
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-white/[0.02]',
                tx.status === 'unreconciled' && 'bg-amber-50/30 dark:bg-amber-900/5'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
                tx.amount >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              )}>
                {tx.amount >= 0 ? '+' : '-'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.label}</p>
                <p className="text-xs text-gray-400">
                  {new Date(tx.transaction_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {tx.source === 'bridge' && ' · Bridge'}
                  {tx.description && ` · ${tx.description}`}
                </p>
              </div>
              <div className="text-right">
                <p className={cn('text-sm font-bold', tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                  {tx.amount >= 0 ? '+' : ''}{fmtMoney(tx.amount)}
                </p>
                <span className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                  tx.status === 'reconciled'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                )}>
                  {tx.status === 'reconciled' ? 'Rapproché' : 'À rapprocher'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

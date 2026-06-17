'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, RefreshCw, Landmark, Link2, Unlink,
  CheckCircle2, XCircle, AlertCircle, ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface MatchSuggestion {
  expenseId: string;
  transactionId: string;
  score: number;
  confidence: string;
  expense: { id: string; vendor: string | null; amount: number; date: string };
  transaction: { id: string; amount: number; transaction_date: string; label: string };
}

export default function BankReconciliationPage() {
  const { profile } = useAuthStore();
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState<string | null>(null);

  useEffect(() => { if (profile) loadData(); }, [profile]);

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }

      // Get auto-matches
      const res = await fetch('/api/expenses/bank-match', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();

      // Fetch expense and transaction details for each match
      const detailedMatches: MatchSuggestion[] = [];
      for (const m of (data.matches || [])) {
        const [expRes, txRes] = await Promise.all([
          supabase.from('expenses').select('id, vendor, amount, date').eq('id', m.expenseId).single(),
          supabase.from('bank_transactions').select('id, amount, transaction_date, label').eq('id', m.transactionId).single(),
        ]);

        if (expRes.data && txRes.data) {
          detailedMatches.push({
            ...m,
            expense: expRes.data,
            transaction: txRes.data,
          });
        }
      }

      setMatches(detailedMatches);
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMatch = async (match: MatchSuggestion) => {
    setMatching(match.expenseId);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Session expirée'); return; }

      const res = await fetch('/api/expenses/bank-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ expenseId: match.expenseId, transactionId: match.transactionId }),
      });

      if (!res.ok) throw new Error('Erreur');

      setMatches(prev => prev.filter(m => m.expenseId !== match.expenseId));
      toast.success('Rapprochement confirmé');
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setMatching(null);
    }
  };

  const handleRejectMatch = async (match: MatchSuggestion) => {
    setMatches(prev => prev.filter(m => m.expenseId !== match.expenseId));
    toast.success('Suggestion ignorée');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Rapprochement bancaire</h1>
            <p className="text-sm text-gray-500">{matches.length} correspondances suggérées</p>
          </div>
        </div>
        <button onClick={() => loadData(true)} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors" title="Actualiser">
          <RefreshCw size={16} />
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Landmark size={28} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-900 dark:text-white font-semibold mb-1">Aucune correspondance</p>
          <p className="text-sm text-gray-400">Toutes les dépenses approuvées sont rapprochées ou aucune transaction bancaire disponible.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match, i) => (
            <motion.div
              key={match.expenseId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 rounded-2xl p-4"
            >
              <div className="flex items-center gap-4">
                {/* Expense */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Dépense</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{match.expense.vendor || 'Inconnu'}</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(match.expense.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(match.expense.date)}</p>
                </div>

                {/* Arrow */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  match.confidence === 'high' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                )}>
                  <ArrowRightLeft size={16} className={match.confidence === 'high' ? 'text-emerald-600' : 'text-amber-600'} />
                </div>

                {/* Transaction */}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs text-gray-500 mb-1">Transaction</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{match.transaction.label || 'Inconnu'}</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(match.transaction.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(match.transaction.transaction_date)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleConfirmMatch(match)}
                    disabled={matching === match.expenseId}
                    className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    title="Confirmer"
                  >
                    {matching === match.expenseId ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  </button>
                  <button
                    onClick={() => handleRejectMatch(match)}
                    className="p-2 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                    title="Ignorer"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className={cn('h-full rounded-full', match.confidence === 'high' ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${match.score}%` }} />
                </div>
                <span className={cn('text-xs font-medium', match.confidence === 'high' ? 'text-emerald-600' : 'text-amber-600')}>
                  {match.score}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

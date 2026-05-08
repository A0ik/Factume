'use client';
import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Loader2, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Info,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HealthIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  detail?: string;
}

interface ScanResult {
  score: number;
  issues: HealthIssue[];
  stats: Record<string, number>;
  scannedAt: string;
}

export default function CabinetClientHealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { runScan(); }, [id]);

  const runScan = async () => {
    setScanning(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/cabinet/clients/${id}/data`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { toast.error('Erreur lors de l\'analyse'); return; }

      const data = await res.json();
      const stats = data.stats || {};
      const issues: HealthIssue[] = [];

      if (stats.overdueInvoices > 0)
        issues.push({ severity: 'error', message: `${stats.overdueInvoices} facture(s) impayée(s) en retard`, detail: 'Des factures non réglées dans les délais peuvent indiquer des problèmes de trésorerie.' });

      if (stats.unreconciledTransactions > 4)
        issues.push({ severity: 'warning', message: `${stats.unreconciledTransactions} transactions non rapprochées`, detail: 'Le rapprochement bancaire doit être effectué régulièrement.' });
      else if (stats.unreconciledTransactions > 0)
        issues.push({ severity: 'info', message: `${stats.unreconciledTransactions} transaction(s) à rapprocher`, detail: 'Vérifiez ces transactions dans la section Banque.' });

      if (stats.pendingInvoices > 10)
        issues.push({ severity: 'warning', message: `${stats.pendingInvoices} factures en attente de paiement`, detail: 'Un grand nombre de factures ouvertes peut indiquer des retards de recouvrement.' });

      const score = Math.max(0, 100
        - (stats.overdueInvoices || 0) * 15
        - (stats.unreconciledTransactions || 0) * 3
        - (stats.pendingInvoices > 10 ? 5 : 0)
      );

      setScan({ score, issues, stats, scannedAt: new Date().toLocaleTimeString('fr-FR') });
      toast.success('Analyse terminée');
    } finally {
      setScanning(false);
    }
  };

  const getScoreLabel = (s: number) =>
    s >= 80 ? 'Excellente santé' : s >= 60 ? 'Bonne santé' : s >= 40 ? 'À améliorer' : 'Attention requise';

  const getScoreColor = (s: number) =>
    s >= 80 ? 'text-emerald-600 dark:text-emerald-400' : s >= 60 ? 'text-blue-600 dark:text-blue-400' : s >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  const getScoreBg = (s: number) =>
    s >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/40'
    : s >= 60 ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/40'
    : s >= 40 ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/40'
    : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/40';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/cabinet/clients/${id}`} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Santé des données</h1>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all disabled:opacity-60"
        >
          <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Analyse...' : 'Relancer'}
        </button>
      </div>

      {scanning && !scan ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <Shield size={48} className="text-gray-300 dark:text-gray-600" />
            <Loader2 size={20} className="text-blue-500 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyse des données en cours…</p>
        </div>
      ) : scan ? (
        <div className="space-y-5">
          {/* Score card */}
          <div className={cn('rounded-2xl border p-6 flex items-center gap-6', getScoreBg(scan.score))}>
            <div className={cn('w-24 h-24 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-black bg-white/60 dark:bg-white/10 shadow-sm')}>
              <span className={cn('text-3xl', getScoreColor(scan.score))}>{scan.score}</span>
              <span className="text-xs text-gray-400 font-normal">/ 100</span>
            </div>
            <div>
              <p className={cn('text-xl font-black', getScoreColor(scan.score))}>{getScoreLabel(scan.score)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {scan.issues.length === 0
                  ? 'Aucun problème détecté — tout est en ordre !'
                  : `${scan.issues.filter(i => i.severity === 'error').length} erreur(s), ${scan.issues.filter(i => i.severity === 'warning').length} avertissement(s)`}
              </p>
              <p className="text-xs text-gray-400 mt-2">Analysé à {scan.scannedAt}</p>
            </div>
          </div>

          {/* Issues */}
          {scan.issues.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Problèmes détectés</h3>
              {scan.issues.map((issue, i) => (
                <div key={i} className={cn(
                  'rounded-xl border p-4',
                  issue.severity === 'error'   ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
                  : issue.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40'
                )}>
                  <div className="flex items-start gap-3">
                    {issue.severity === 'error'   ? <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    : issue.severity === 'warning' ? <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    : <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{issue.message}</p>
                      {issue.detail && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{issue.detail}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
              <CheckCircle2 size={22} className="text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Aucun problème détecté</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">Les données de ce client sont en parfait état.</p>
              </div>
            </div>
          )}

          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Factures en retard', value: scan.stats.overdueInvoices ?? 0, danger: (scan.stats.overdueInvoices ?? 0) > 0 },
              { label: 'En attente paiement', value: scan.stats.pendingInvoices ?? 0, danger: false },
              { label: 'Transactions non rapprochées', value: scan.stats.unreconciledTransactions ?? 0, danger: (scan.stats.unreconciledTransactions ?? 0) > 4 },
            ].map(({ label, value, danger }) => (
              <div key={label} className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/40">
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className={cn('text-xl font-black mt-1', danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white')}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

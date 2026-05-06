'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Download, Shield, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { CHECK_METADATA } from '@/lib/data-health-metadata';
import { toast } from 'sonner';

interface Scan {
  id: string;
  overall_score: number;
  category_scores: Record<string, number>;
  issues: Array<{ category: string; severity: string; message: string; count: number }>;
  suggestions: Array<{ category: string; message: string }>;
  scanned_at: string;
}

const CATEGORY_ICONS: Record<string, string> = {};
CHECK_METADATA.forEach((c) => { CATEGORY_ICONS[c.id] = c.icon; });
const CATEGORY_LABELS: Record<string, string> = {};
CHECK_METADATA.forEach((c) => { CATEGORY_LABELS[c.id] = c.label; });

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function getScoreBg(score: number) {
  if (score >= 80) return 'from-green-400 to-green-600';
  if (score >= 50) return 'from-amber-400 to-amber-600';
  return 'from-red-400 to-red-600';
}

function getScoreRing(score: number) {
  if (score >= 80) return 'stroke-green-500';
  if (score >= 50) return 'stroke-amber-500';
  return 'stroke-red-500';
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'error': return <AlertTriangle size={14} className="text-red-500" />;
    case 'warning': return <AlertTriangle size={14} className="text-amber-500" />;
    default: return <Info size={14} className="text-blue-500" />;
  }
}

export default function DataHealthPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const [scan, setScan] = useState<Scan | null>(null);
  const [history, setHistory] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadHistory();
      runScan();
    }
  }, [profile]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/data-health/history?limit=10', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { history } = await res.json();
        setHistory(history);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const runScan = async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/data-health/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { scan } = await res.json();
        setScan(scan);
        await loadHistory();
        toast.success('Analyse terminée');
      }
    } catch {
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    if (!scan) return;
    const supabase = (await import('@/lib/supabase')).getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/data-health/export?scan_id=${scan.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-health-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!sub.effectiveIsPro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <Shield size={36} className="text-primary" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Santé des données</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Analysez la qualité de vos données comptables. Disponible avec l'abonnement Pro.
        </p>
        <Link href="/paywall?plan=pro" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all">
          Passer à Pro
        </Link>
      </div>
    );
  }

  const score = scan?.overall_score ?? 0;
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Santé des données</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyse de la qualité de vos données comptables</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportReport}
            disabled={!scan}
            className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Download size={15} /> Exporter
          </button>
          <button
            onClick={runScan}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? 'Analyse...' : 'Analyser'}
          </button>
        </div>
      </div>

      {scan ? (
        <>
          {/* Score circulaire */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-6 flex flex-col items-center justify-center">
              <svg width="140" height="140" className="transform -rotate-90">
                <circle cx="70" cy="70" r="60" fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-800" />
                <circle
                  cx="70" cy="70" r="60" fill="none" strokeWidth="10" strokeLinecap="round"
                  className={getScoreRing(score)}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center" style={{ marginTop: '-100px' }}>
                <span className={cn('text-4xl font-black', getScoreColor(score))}>{score}</span>
                <span className="text-xs text-gray-400 font-medium">/ 100</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {score >= 80 ? 'Excellent' : score >= 50 ? 'À améliorer' : 'Attention requise'}
              </p>
              {scan.scanned_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Dernière analyse : {new Date(scan.scanned_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            {/* Catégories */}
            <div className="lg:col-span-2 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm">Détail par catégorie</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(scan.category_scores).map(([key, catScore]) => (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                    <span className="text-lg">{CATEGORY_ICONS[key] || '📊'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{CATEGORY_LABELS[key] || key}</p>
                      <div className="mt-1 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', catScore >= 80 ? 'bg-green-500' : catScore >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${catScore}%` }}
                        />
                      </div>
                    </div>
                    <span className={cn('text-sm font-bold', getScoreColor(catScore))}>{catScore}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Problèmes */}
          {scan.issues.length > 0 && (
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Problèmes détectés ({scan.issues.length})
              </h3>
              <div className="space-y-2">
                {scan.issues.map((issue, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                    {getSeverityIcon(issue.severity)}
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{issue.message}</p>
                    {issue.count > 1 && (
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        x{issue.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {scan.suggestions.length > 0 && (
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                Suggestions d'amélioration
              </h3>
              <div className="space-y-2">
                {scan.suggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-green-50/50 dark:bg-green-900/5 border border-green-100 dark:border-green-800/20">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">{s.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique */}
          {history.length > 1 && (
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm">Historique des analyses</h3>
              <div className="flex items-end gap-2 h-32">
                {history.slice(0, 10).reverse().map((h, i) => (
                  <div key={h.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className={cn('text-[10px] font-bold', getScoreColor(h.overall_score))}>{h.overall_score}</span>
                    <div
                      className={cn('w-full rounded-t-lg transition-all', h.overall_score >= 80 ? 'bg-green-400' : h.overall_score >= 50 ? 'bg-amber-400' : 'bg-red-400')}
                      style={{ height: `${h.overall_score}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                {history.slice(0, 10).reverse().map((h) => (
                  <div key={h.id} className="flex-1 text-center">
                    <span className="text-[9px] text-gray-400">
                      {new Date(h.scanned_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={40} className="text-primary animate-spin mb-4" />
          <p className="text-sm text-gray-500">Analyse en cours...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Cliquez sur "Analyser" pour vérifier la santé de vos données</p>
        </div>
      )}
    </motion.div>
  );
}

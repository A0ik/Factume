'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Loader2, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CabinetClientHealthPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [scan, setScan] = useState<any>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

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
      const res = await fetch(`/api/cabinet/clients/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setClientInfo(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    if (!clientInfo?.client?.client_user_id) return;
    setScanning(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/cabinet/clients/${id}/data`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();

      const stats = data.stats || {};
      const issues = [];
      if (stats.overdueInvoices > 0) issues.push({ severity: 'error', message: `${stats.overdueInvoices} facture(s) impayée(s) en retard` });
      if (stats.unreconciledTransactions > 0) issues.push({ severity: 'warning', message: `${stats.unreconciledTransactions} transaction(s) non rapprochée(s)` });

      const score = Math.max(0, 100 - (stats.overdueInvoices || 0) * 15 - (stats.unreconciledTransactions || 0) * 3);

      setScan({ overall_score: score, issues, stats });
      toast.success('Analyse terminée');
    } finally {
      setScanning(false);
    }
  };

  const getScoreColor = (s: number) => s >= 80 ? 'text-green-500' : s >= 50 ? 'text-amber-500' : 'text-red-500';

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="text-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/cabinet/clients/${id}`} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Santé des données</h1>
        </div>
        <button onClick={runScan} disabled={scanning} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-70">
          {scanning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Analyser
        </button>
      </div>

      {scan ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-6 text-center">
            <Shield size={40} className={cn('mx-auto mb-3', getScoreColor(scan.overall_score))} />
            <p className={cn('text-5xl font-black', getScoreColor(scan.overall_score))}>{scan.overall_score}</p>
            <p className="text-sm text-gray-500 mt-1">/ 100</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
              {scan.overall_score >= 80 ? 'Bonne santé' : scan.overall_score >= 50 ? 'À améliorer' : 'Attention requise'}
            </p>
          </div>

          {scan.issues.length > 0 && (
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/60 dark:border-gray-700/30 p-5">
              <h3 className="font-bold text-sm mb-3">Problèmes détectés</h3>
              <div className="space-y-2">
                {scan.issues.map((issue: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-white/[0.02]">
                    {issue.severity === 'error' ? <AlertTriangle size={14} className="text-red-500" /> : <Info size={14} className="text-amber-500" />}
                    <p className="text-sm text-gray-700 dark:text-gray-300">{issue.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <Shield size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Cliquez sur "Analyser" pour vérifier la santé</p>
        </div>
      )}
    </motion.div>
  );
}

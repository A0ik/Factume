'use client';
import { useEffect, useState, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Receipt, Shield, Loader2, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, XCircle, TrendingUp,
  Euro, Building2, Mail, Info, RefreshCcw,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

type Tab = 'overview' | 'invoices' | 'expenses' | 'health';

interface Invoice {
  id: string;
  number?: string;
  total: number;
  status: string;
  issue_date: string;
  document_type?: string;
}

interface Expense {
  id: string;
  vendor?: string;
  label?: string;
  category?: string;
  amount: number;
  date: string;
}

interface ClientData {
  client?: { id: string; client_user_id: string; status: string };
  profile?: { company_name?: string; first_name?: string; last_name?: string; email?: string; siret?: string };
  invoices?: Invoice[];
  expenses?: Expense[];
  stats?: {
    totalRevenue: number;
    totalExpenses: number;
    netBalance: number;
    pendingInvoices: number;
    overdueInvoices: number;
    unreconciledTransactions: number;
  };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    paid:     { label: 'Payé',       className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    overdue:  { label: 'En retard',  className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    draft:    { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    sent:     { label: 'Envoyé',     className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    pending:  { label: 'En attente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    cancelled:{ label: 'Annulé',     className: 'bg-gray-100 text-gray-500 dark:bg-gray-800' },
  };
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500 dark:bg-gray-800' };
  return <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', s.className)}>{s.label}</span>;
}

function DocTypeBadge({ type }: { type?: string }) {
  const map: Record<string, string> = {
    invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir',
    purchase_order: 'Commande', delivery_note: 'Bon de livraison', deposit: 'Acompte',
  };
  return <span className="text-[10px] text-gray-400">{map[type ?? ''] ?? 'Facture'}</span>;
}

function CategoryIcon({ category }: { category?: string }) {
  const icons: Record<string, string> = {
    transport: '🚗', meals: '🍽️', accommodation: '🏨', equipment: '💻',
    office: '📎', shopping: '🛒', telecom: '📱', insurance: '🛡️',
    software: '💾', mileage: '🗺️', other: '📦',
  };
  return <span className="text-base">{icons[category ?? ''] ?? '📦'}</span>;
}

export default function CabinetClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Health scan state
  const [scan, setScan] = useState<{ score: number; issues: { severity: string; message: string }[] } | null>(null);
  const [scanning, setScanning] = useState(false);

  const loadData = async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [clientRes, dataRes] = await Promise.all([
        fetch(`/api/cabinet/clients/${id}`, { headers }),
        fetch(`/api/cabinet/clients/${id}/data`, { headers }),
      ]);

      const clientInfo: ClientData = clientRes.ok ? await clientRes.json() : {};
      const aggregated: ClientData = dataRes.ok ? await dataRes.json() : {};
      setClientData({ ...clientInfo, ...aggregated });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const runHealthScan = async () => {
    if (!clientData?.stats) return;
    setScanning(true);
    try {
      await loadData(true);
      const stats = clientData.stats;
      const issues: { severity: string; message: string }[] = [];
      if ((stats.overdueInvoices ?? 0) > 0)
        issues.push({ severity: 'error', message: `${stats.overdueInvoices} facture(s) impayée(s) en retard` });
      if ((stats.unreconciledTransactions ?? 0) > 0)
        issues.push({ severity: 'warning', message: `${stats.unreconciledTransactions} transaction(s) non rapprochée(s)` });
      if ((stats.pendingInvoices ?? 0) > 5)
        issues.push({ severity: 'info', message: `${stats.pendingInvoices} factures en attente de paiement` });

      const score = Math.max(0, 100 - (stats.overdueInvoices ?? 0) * 15 - (stats.unreconciledTransactions ?? 0) * 3);
      setScan({ score, issues });
      toast.success('Analyse terminée');
    } finally {
      setScanning(false);
    }
  };

  if (loading || !clientData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  const stats = clientData.stats ?? { totalRevenue: 0, totalExpenses: 0, netBalance: 0, pendingInvoices: 0, overdueInvoices: 0, unreconciledTransactions: 0 };
  const clientName = clientData.profile?.company_name
    || `${clientData.profile?.first_name ?? ''} ${clientData.profile?.last_name ?? ''}`.trim()
    || 'Client';

  const tabs: { key: Tab; label: string; icon: typeof FileText; count?: number }[] = [
    { key: 'overview',  label: 'Aperçu',    icon: TrendingUp },
    { key: 'invoices',  label: 'Factures',  icon: FileText,  count: clientData.invoices?.length },
    { key: 'expenses',  label: 'Dépenses',  icon: Receipt,   count: clientData.expenses?.length },
    { key: 'health',    label: 'Santé',     icon: Shield },
  ];

  const healthScore = scan?.score ?? (
    ((stats.overdueInvoices ?? 0) > 0 || (stats.unreconciledTransactions ?? 0) > 4) ? 65 : 90
  );

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0 mt-1">
          <ArrowLeft size={18} className="text-gray-400" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20 flex-shrink-0">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-gray-900 dark:text-white truncate">{clientName}</h1>
              {clientData.profile?.email && (
                <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <Mail size={12} />
                  {clientData.profile.email}
                </p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors flex-shrink-0"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Chiffre d\'affaires', value: formatCurrency(stats.totalRevenue ?? 0), color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/30' },
          { label: 'Dépenses', value: formatCurrency(stats.totalExpenses ?? 0), color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10 border-red-200/60 dark:border-red-800/30' },
          { label: 'Solde net', value: formatCurrency(stats.netBalance ?? 0), color: (stats.netBalance ?? 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400', bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30' },
          { label: 'En retard', value: String(stats.overdueInvoices ?? 0), color: (stats.overdueInvoices ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400', bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn('p-4 rounded-2xl border', bg)}>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            <p className={cn('text-lg font-black mt-1', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 overflow-hidden shadow-sm">
        {/* Tab navigation */}
        <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900/50'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count != null && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-md text-[10px] font-black',
                  activeTab === tab.key ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'
                )}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          <AnimatePresence mode="wait">

            {/* ===== OVERVIEW ===== */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Recent invoices */}
                {(clientData.invoices?.length ?? 0) > 0 ? (
                  <>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dernières factures</h4>
                    <div className="space-y-1.5">
                      {clientData.invoices!.slice(0, 5).map((inv) => (
                        <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors">
                          <FileText size={15} className="text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate block">{inv.number || inv.id.slice(0, 8)}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <DocTypeBadge type={inv.document_type} />
                              <span className="text-[10px] text-gray-400">{new Date(inv.issue_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</span>
                            <StatusBadge status={inv.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">Aucune facture récente</div>
                )}

                {/* Recent expenses */}
                {(clientData.expenses?.length ?? 0) > 0 && (
                  <>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4">Dernières dépenses</h4>
                    <div className="space-y-1.5">
                      {clientData.expenses!.slice(0, 3).map((exp) => (
                        <div key={exp.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02]">
                          <CategoryIcon category={exp.category} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{exp.vendor || exp.label || 'Dépense'}</p>
                            <p className="text-xs text-gray-400">{new Date(exp.date).toLocaleDateString('fr-FR')}{exp.category ? ` · ${exp.category}` : ''}</p>
                          </div>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400 flex-shrink-0">{formatCurrency(exp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Alerts */}
                {(stats.overdueInvoices ?? 0) > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 mt-4">
                    <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        {stats.overdueInvoices} facture{(stats.overdueInvoices ?? 0) > 1 ? 's' : ''} en retard de paiement
                      </p>
                      <button onClick={() => setActiveTab('invoices')} className="text-xs text-red-600 dark:text-red-400 font-medium hover:underline mt-0.5">
                        Voir les factures →
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== INVOICES ===== */}
            {activeTab === 'invoices' && (
              <motion.div key="invoices" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!clientData.invoices?.length ? (
                  <div className="text-center py-10">
                    <FileText size={36} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Aucune facture pour ce client</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {clientData.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors">
                        <FileText size={15} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{inv.number || inv.id.slice(0, 8)}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <DocTypeBadge type={inv.document_type} />
                            <span className="text-[10px] text-gray-400">{new Date(inv.issue_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</span>
                          <StatusBadge status={inv.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== EXPENSES ===== */}
            {activeTab === 'expenses' && (
              <motion.div key="expenses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!clientData.expenses?.length ? (
                  <div className="text-center py-10">
                    <Receipt size={36} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Aucune dépense pour ce client</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {clientData.expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors">
                        <CategoryIcon category={exp.category} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{exp.vendor || exp.label || 'Dépense'}</p>
                          <p className="text-xs text-gray-400">{new Date(exp.date).toLocaleDateString('fr-FR')}{exp.category ? ` · ${exp.category}` : ''}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 flex-shrink-0">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== HEALTH ===== */}
            {activeTab === 'health' && (
              <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {scan ? (
                  <>
                    {/* Score */}
                    <div className="flex items-center gap-5 p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                      <div className={cn(
                        'w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-2xl',
                        scan.score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : scan.score >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      )}>
                        {scan.score}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">Score de santé / 100</p>
                        <p className={cn(
                          'text-sm font-semibold mt-0.5',
                          scan.score >= 80 ? 'text-emerald-600' : scan.score >= 50 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {scan.score >= 80 ? '✓ Bonne santé financière' : scan.score >= 50 ? '⚠ Des améliorations possibles' : '✗ Attention requise'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Dernière analyse à l'instant</p>
                      </div>
                    </div>

                    {/* Issues */}
                    {scan.issues.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Problèmes détectés</h4>
                        {scan.issues.map((issue, i) => (
                          <div key={i} className={cn(
                            'flex items-start gap-3 p-3.5 rounded-xl border',
                            issue.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
                              : issue.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40'
                          )}>
                            {issue.severity === 'error' ? <XCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                              : issue.severity === 'warning' ? <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                              : <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />}
                            <p className="text-sm text-gray-700 dark:text-gray-300">{issue.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Aucun problème détecté — tout est en ordre !</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10">
                    <Shield size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-900 dark:text-white font-semibold mb-1">Analyse de santé des données</p>
                    <p className="text-sm text-gray-400 mb-5">Vérifiez les factures en retard, transactions non rapprochées et anomalies.</p>
                    <button
                      onClick={runHealthScan}
                      disabled={scanning}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg disabled:opacity-60"
                    >
                      {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                      {scanning ? 'Analyse en cours...' : 'Lancer l\'analyse'}
                    </button>
                  </div>
                )}

                {scan && (
                  <button
                    onClick={runHealthScan}
                    disabled={scanning}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
                    Relancer l&apos;analyse
                  </button>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
    </CabinetGuard>
  );
}

'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency, cn } from '@/lib/utils';
import DocumentTypeSheet from '@/components/invoices/DocumentTypeSheet';
import {
  FileText, Plus, TrendingUp, ArrowUpRight, Clock, AlertTriangle,
  Users, Sparkles, Receipt, Zap,
} from 'lucide-react';

/**
 * Dashboard ZENITH — "Le Chiffre est Roi"
 *
 * Le point focal absolu : "À encaisser" en grand.
 * L'utilisateur ouvre l'app pour UNE question : combien on me doit ?
 * Le reste est secondaire et accessible en scrollant.
 *
 * Gardé : À encaisser (hero) + Documents action + Top clients
 * Supprimé : Chart recharts, Quick actions grid, Stats strip
 */

const springTransition = { type: 'spring' as const, damping: 25, stiffness: 200 };
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { invoices, stats, fetchInvoices } = useDataStore();
  const sub = useSubscription();
  const [showDocTypeSheet, setShowDocTypeSheet] = useState(false);

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir');
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ─── À encaisser ──────────────────────────────────────────────
  const { toCollect, toCollectOverdue, toCollectPending } = useMemo(() => {
    const actualInvoices = invoices.filter(i => !i.document_type || i.document_type === 'invoice');
    const sent = actualInvoices.filter(i => i.status === 'sent' || i.status === 'overdue');
    const overdue = sent.filter(i => i.status === 'overdue');
    const pending = sent.filter(i => i.status === 'sent');
    return {
      toCollect: sent.reduce((s, i) => s + i.total, 0),
      toCollectOverdue: overdue.reduce((s, i) => s + i.total, 0),
      toCollectPending: pending.reduce((s, i) => s + i.total, 0),
    };
  }, [invoices]);

  const overdueCount = useMemo(() => invoices.filter(i => i.status === 'overdue' && (!i.document_type || i.document_type === 'invoice')).length, [invoices]);

  // ─── Documents nécessitant une action ──────────────────────────
  const actionDocs = useMemo(() => {
    return invoices
      .filter(i => (!i.document_type || i.document_type === 'invoice') && (i.status === 'overdue' || i.status === 'sent'))
      .sort((a, b) => {
        // Overdue first
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5);
  }, [invoices]);

  // ─── Top clients ──────────────────────────────────────────────
  const { topClients, maxPaid } = useMemo(() => {
    const clientMap: Record<string, { name: string; id: string; paid: number; count: number }> = {};
    invoices.filter((inv) => inv.status === 'paid').forEach((inv) => {
      const name = inv.client?.name || inv.client_name_override || 'Sans nom';
      const id = inv.client_id || name;
      if (!clientMap[id]) clientMap[id] = { name, id: inv.client_id || '', paid: 0, count: 0 };
      clientMap[id].paid += inv.total;
      clientMap[id].count += 1;
    });
    const sorted = Object.values(clientMap).sort((a, b) => b.paid - a.paid).slice(0, 5);
    return { topClients: sorted, maxPaid: sorted[0]?.paid || 1 };
  }, [invoices]);

  // ─── CA ce mois ───────────────────────────────────────────────
  const monthOverMonthGrowth = useMemo(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 999);
    const lastMRR = invoices.filter((inv) => inv.paid_at && new Date(inv.paid_at) >= start && new Date(inv.paid_at) <= end).reduce((s, i) => s + i.total, 0);
    return lastMRR > 0 ? ((stats?.mrr || 0) - lastMRR) / lastMRR * 100 : 0;
  }, [invoices, stats?.mrr]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
  };

  return (
    <>
      <h1 className="sr-only">Tableau de bord</h1>
      <PullToRefresh onRefresh={fetchInvoices}>
        <main>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">

          {/* ══════════════════════════════════════════════════════════
              HERO — LE CHIFFRE EST ROI (mobile)
              ══════════════════════════════════════════════════════════ */}
          <motion.div variants={itemVariants} className="lg:hidden">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gray-200" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-gray-100" />
              </div>
              <div className="relative">
                <p className="text-emerald-200/80 text-sm font-medium">{greeting}</p>
                <div className="mt-2 mb-1">
                  <p className="text-[10px] font-bold text-emerald-200/60 uppercase tracking-widest mb-0.5">À encaisser</p>
                  <motion.p key={toCollect} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springTransition}
                    className="text-3xl font-bold text-white tracking-tight">
                    {formatCurrency(toCollect)}
                  </motion.p>
                </div>
                {/* Sub-metrics + CA */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[10px] text-emerald-200/50">
                    CA mois : {formatCurrency(stats?.mrr || 0)}
                    {monthOverMonthGrowth !== 0 && (
                      <span className={monthOverMonthGrowth > 0 ? 'text-emerald-200' : 'text-red-200'}> ({monthOverMonthGrowth > 0 ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}%)</span>
                    )}
                  </span>
                  {overdueCount > 0 && (
                    <Link href="/documents?type=invoice" className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse" />
                      <span className="text-[10px] text-emerald-200/70 font-medium">{formatCurrency(toCollectOverdue)} en retard</span>
                    </Link>
                  )}
                  {toCollectPending > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-200/50" />
                      <span className="text-[10px] text-emerald-200/70 font-medium">{formatCurrency(toCollectPending)} en attente</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                    <Link href="/documents/factures/new"
                      className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                      <Plus size={16} strokeWidth={2.5} /> Facturer
                    </Link>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <button onClick={() => setShowDocTypeSheet(true)}
                      className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur text-white transition-colors">
                      <Sparkles size={16} />
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════
              HERO — DESKTOP
              ══════════════════════════════════════════════════════════ */}
          <motion.div variants={itemVariants} className="hidden lg:block">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{greeting}</p>
                <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
                  {profile?.company_name || 'Mon entreprise'}
                </h2>
              </div>
              <Link href="/documents"
                className="group flex-shrink-0 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-95">
                <Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
                Nouveau document
              </Link>
            </div>

            {/* Desktop hero card */}
            <div className="mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gray-200" />
              </div>
              <div className="relative flex items-center gap-8">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-emerald-200/60 uppercase tracking-widest mb-1">À encaisser</p>
                  <motion.p key={toCollect} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springTransition}
                    className="text-4xl font-bold text-white tracking-tight">
                    {formatCurrency(toCollect)}
                  </motion.p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-emerald-200/50">
                      CA ce mois : <span className="font-semibold text-emerald-200/80">{formatCurrency(stats?.mrr || 0)}</span>
                      {monthOverMonthGrowth !== 0 && (
                        <span className={cn('ml-1', monthOverMonthGrowth > 0 ? 'text-emerald-200' : 'text-red-200')}>
                          ({monthOverMonthGrowth > 0 ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                    {overdueCount > 0 && (
                      <Link href="/documents?type=invoice" className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse" />
                        <span className="text-xs text-emerald-200/70 font-medium">{formatCurrency(toCollectOverdue)} en retard</span>
                      </Link>
                    )}
                    {toCollectPending > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-200/50" />
                        <span className="text-xs text-emerald-200/70 font-medium">{formatCurrency(toCollectPending)} en attente</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Paywall hint */}
          {sub.isFree && sub.invoiceCount >= 2 && (
            <motion.div variants={itemVariants}>
              <Link href="/paywall" className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:border-amber-500/30 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-amber-400" />
                </div>
                <p className="text-sm text-amber-300 font-medium flex-1 truncate">
                  {sub.isAtLimit ? 'Limite atteinte' : `${sub.invoiceCount}/3 factures ce mois`}
                </p>
                <ArrowUpRight size={14} className="text-amber-500 flex-shrink-0" />
              </Link>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════
              2 COLONNES : Documents action + Top clients
              ══════════════════════════════════════════════════════════ */}
          <div className="lg:grid lg:grid-cols-2 gap-5 space-y-5 lg:space-y-0">

            {/* Documents nécessitant une action */}
            <motion.div variants={itemVariants} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <AlertTriangle size={14} className={overdueCount > 0 ? 'text-red-400' : 'text-amber-400'} />
                  Action requise
                </h2>
                <Link href="/documents?type=invoice" className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 hover:underline">
                  Tout <ArrowUpRight size={10} />
                </Link>
              </div>

              {actionDocs.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Receipt size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-slate-400">Tout est à jour</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-4">Aucune facture en attente</p>
                  <Link href="/documents/factures/new" className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors active:scale-95">
                    <Plus size={13} /> Créer une facture
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {actionDocs.map((inv, i) => (
                    <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200, delay: i * 0.04 }}>
                      <Link href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-100 transition-colors group">
                        <div className="relative w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <Receipt size={14} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-slate-900 ${
                            inv.status === 'overdue' ? 'bg-red-400' : 'bg-blue-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-emerald-400 transition-colors">
                            {inv.client?.name || inv.client_name_override || 'Sans client'}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{inv.number}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-sm font-bold", inv.status === 'overdue' ? 'text-red-400' : 'text-gray-900 dark:text-white')}>
                            {formatCurrency(inv.total)}
                          </p>
                          <p className={cn("text-[10px] font-medium", inv.status === 'overdue' ? 'text-red-400' : 'text-slate-500')}>
                            {inv.status === 'overdue' ? 'En retard' : 'En attente'}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Top clients */}
            {topClients.length > 0 && (
              <motion.div variants={itemVariants} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Users size={14} className="text-emerald-400" /> Top clients
                  </h2>
                  <Link href="/contacts?tab=clients" className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 hover:underline">
                    Tout <ArrowUpRight size={10} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {topClients.slice(0, 5).map((c, i) => {
                    const initials = c.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                    const pct = Math.round((c.paid / maxPaid) * 100);
                    return (
                      <motion.div key={c.id || c.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: COLORS[i] + '20', color: COLORS[i] }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <div className="h-1 bg-gray-50 rounded-full overflow-hidden mt-1">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} className="h-full rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white flex-shrink-0">{formatCurrency(c.paid)}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

        </motion.div>
      </main>
      </PullToRefresh>

      <DocumentTypeSheet open={showDocTypeSheet} onClose={() => setShowDocTypeSheet(false)} />
    </>
  );
}

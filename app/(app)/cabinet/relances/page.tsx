'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, AlertTriangle, Clock, Send, Mail,
  FileText, Bell, BellRing, ShieldAlert, CheckCircle2,
  X, RefreshCw, ChevronDown, ChevronUp, Euro,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverdueInvoice {
  id: string;
  number: string;
  client_name: string;
  client_email?: string;
  total: number;
  due_date: string;
  issue_date: string;
  days_overdue: number;
  reminder_level: 0 | 1 | 2 | 3;
  last_reminder_date: string | null;
}

interface ReminderData {
  invoices: OverdueInvoice[];
  summary: {
    total_overdue: number;
    total_amount: number;
    level_1_count: number;
    level_2_count: number;
    level_3_count: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_CONFIG: Record<number, { label: string; icon: any; bg: string; text: string; border: string; description: string }> = {
  0: {
    label: 'Aucune relance',
    icon: Clock,
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    description: 'Pas encore relancé',
  },
  1: {
    label: 'Relance 1',
    icon: Bell,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
    description: 'Relance courtoise',
  },
  2: {
    label: 'Relance 2',
    icon: BellRing,
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-500/30',
    description: 'Relance ferme',
  },
  3: {
    label: 'Mise en demeure',
    icon: ShieldAlert,
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30',
    description: 'Mise en demeure formelle',
  },
};

function getUrgencyColor(daysOverdue: number) {
  if (daysOverdue > 30) return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30';
  if (daysOverdue > 15) return 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
  if (daysOverdue > 5)  return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
  return 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
}

function getUrgencyDot(daysOverdue: number) {
  if (daysOverdue > 30) return 'bg-red-500';
  if (daysOverdue > 15) return 'bg-orange-500';
  if (daysOverdue > 5)  return 'bg-amber-500';
  return 'bg-gray-400';
}

function getRecommendedAction(daysOverdue: number, currentLevel: number): string {
  if (currentLevel >= 3) return 'Mise en demeure envoyée. Envisager une procédure contentieuse.';
  if (currentLevel === 2 && daysOverdue > 30) return 'Envoyer une mise en demeure formelle.';
  if (currentLevel === 1 && daysOverdue > 15) return 'Envoyer une relance ferme (niveau 2).';
  if (currentLevel === 0 && daysOverdue > 5) return 'Envoyer une première relance courtoise.';
  return 'Relance non nécessaire pour le moment.';
}

function getNextLevel(currentLevel: number): number {
  return Math.min(currentLevel + 1, 3);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CabinetRelancesPage() {
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const [data, setData] = useState<ReminderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [batchSending, setBatchSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<number | null>(null);

  useEffect(() => { if (profile) loadReminders(); }, [profile]);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadReminders = async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expirée.');
        return;
      }
      const res = await fetch('/api/cabinet/reminders', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(err.error || 'Erreur de chargement');
      }
      setData(await res.json());
    } catch (error: any) {
      console.error('[CabinetRelances] load error:', error);
      toast.error(error.message || 'Erreur de chargement des relances');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleSendReminder = async (invoiceId: string, level: number) => {
    setSendingIds((prev) => new Set(prev).add(invoiceId));
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/cabinet/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ invoiceId, level }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || "Erreur lors de l'envoi de la relance");
      }
      toast.success('Relance envoyée avec succès');
      await loadReminders();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(invoiceId);
        return next;
      });
    }
  };

  const handleBatchSend = async () => {
    if (!data) return;
    const eligible = data.invoices.filter((inv) => inv.days_overdue > 5);
    if (eligible.length === 0) {
      toast.info('Aucune facture à relancer');
      return;
    }
    const confirmed = window.confirm(
      `Envoyer ${eligible.length} relance${eligible.length !== 1 ? 's' : ''} ? Chaque client recevra un email adapté au niveau de retard.`
    );
    if (!confirmed) return;

    setBatchSending(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/cabinet/reminders/batch-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          invoices: eligible.map((inv) => ({
            invoiceId: inv.id,
            level: getNextLevel(inv.reminder_level),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(err.error || 'Erreur lors de l\'envoi groupé');
      }
      const result = await res.json();
      toast.success(`${result.sent || eligible.length} relance${(result.sent || eligible.length) !== 1 ? 's' : ''} envoyée${(result.sent || eligible.length) !== 1 ? 's' : ''}`);
      await loadReminders();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi groupé");
    } finally {
      setBatchSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered list
  // ---------------------------------------------------------------------------

  const filtered = useMemo(() => {
    if (!data?.invoices) return [];
    let items = [...data.invoices];
    if (filterLevel !== null) {
      items = items.filter((inv) => inv.reminder_level === filterLevel);
    }
    return items;
  }, [data?.invoices, filterLevel]);

  // ---------------------------------------------------------------------------
  // Paywall
  // ---------------------------------------------------------------------------

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-amber-500/20">
            <BellRing size={40} className="text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Relances automatiques</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Automatisez vos relances de paiement avec des niveaux de fermeté progressifs et un suivi complet.
          </p>
          <Link href="/paywall?plan=business" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all">
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Bell size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Aucune donnee disponible</p>
        <Link href="/cabinet" className="mt-4 text-sm text-blue-500 hover:text-blue-600">
          Retour au cabinet
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const summary = data.summary;
  const hasEligible = data.invoices.some((inv) => inv.days_overdue > 5);

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Relances</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {summary.total_overdue} facture{summary.total_overdue !== 1 ? 's' : ''} impayee{summary.total_overdue !== 1 ? 's' : ''} &middot; {formatCurrency(summary.total_amount)} TTC
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadReminders}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} />
          </motion.button>
          {hasEligible && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBatchSend}
              disabled={batchSending}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
            >
              {batchSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Envoyer toutes les relances
            </motion.button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total impaye',
            value: formatCurrency(summary.total_amount),
            sub: `${summary.total_overdue} facture${summary.total_overdue !== 1 ? 's' : ''}`,
            icon: Euro,
            gradient: 'from-red-500 to-rose-600',
            bg: 'bg-red-50 dark:bg-red-900/20',
            text: 'text-red-700 dark:text-red-400',
          },
          {
            label: 'Relance 1 (courtoise)',
            value: String(summary.level_1_count),
            sub: '5-15 jours de retard',
            icon: Bell,
            gradient: 'from-amber-500 to-yellow-500',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-700 dark:text-amber-400',
          },
          {
            label: 'Relance 2 (ferme)',
            value: String(summary.level_2_count),
            sub: '15-30 jours de retard',
            icon: BellRing,
            gradient: 'from-orange-500 to-amber-600',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            text: 'text-orange-700 dark:text-orange-400',
          },
          {
            label: 'Mise en demeure',
            value: String(summary.level_3_count),
            sub: '+30 jours de retard',
            icon: ShieldAlert,
            gradient: summary.level_3_count > 0 ? 'from-red-600 to-red-700' : 'from-gray-400 to-gray-500',
            bg: summary.level_3_count > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900/20',
            text: summary.level_3_count > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
          },
        ].map(({ label, value, sub, icon: Icon, gradient, bg, text }) => (
          <div key={label} className={cn('p-5 rounded-2xl border border-gray-200/70 dark:border-gray-700/40', bg)}>
            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', gradient)}>
              <Icon size={16} className="text-white" />
            </div>
            <p className={cn('text-xl font-black', text)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Level filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterLevel(null)}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
            filterLevel === null
              ? 'bg-primary text-white border-primary shadow-md'
              : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700',
          )}
        >
          Tous les niveaux
        </button>
        {[0, 1, 2, 3].map((level) => {
          const cfg = LEVEL_CONFIG[level];
          const count = data.invoices.filter((inv) => inv.reminder_level === level).length;
          if (level === 0 && count === 0) return null;
          return (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
                filterLevel === level
                  ? cn(cfg.bg, cfg.text, cfg.border, 'ring-2 ring-current/20')
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700',
              )}
            >
              {cfg.label}
              {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Reminder list */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 size={28} className="text-emerald-500" />
            </motion.div>
            <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">
              {filterLevel !== null ? 'Aucune facture a ce niveau de relance' : 'Aucune facture impayee'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
              {filterLevel !== null
                ? 'Toutes les factures sont à jour pour ce niveau.'
                : 'Toutes vos factures sont payees. Bravo !'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50/70 dark:bg-white/5">
                    <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">N° Facture</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Echeance</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Retard</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Niveau</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Action recommandee</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {filtered.map((inv, index) => {
                    const levelCfg = LEVEL_CONFIG[inv.reminder_level] || LEVEL_CONFIG[0];
                    const LevelIcon = levelCfg.icon;
                    const urgency = getUrgencyColor(inv.days_overdue);
                    const urgencyDot = getUrgencyDot(inv.days_overdue);
                    const recommended = getRecommendedAction(inv.days_overdue, inv.reminder_level);
                    const nextLevel = getNextLevel(inv.reminder_level);
                    const isExpanded = expandedId === inv.id;
                    const isSending = sendingIds.has(inv.id);

                    return (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          'hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors',
                          inv.days_overdue > 30 && 'bg-red-50/20 dark:bg-red-500/5',
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-bold text-primary">{inv.number}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">
                              {inv.client_name}
                            </p>
                            {inv.client_email && (
                              <p className="text-xs text-gray-400 truncate max-w-[140px]">{inv.client_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                          {formatDateShort(inv.due_date)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(inv.total)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border', urgency)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', urgencyDot)} />
                            {inv.days_overdue}j
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', levelCfg.bg, levelCfg.text)}>
                            <LevelIcon size={12} />
                            {levelCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px]">{recommended}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            {inv.days_overdue > 5 && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleSendReminder(inv.id, nextLevel)}
                                disabled={isSending}
                                className={cn(
                                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50',
                                  nextLevel >= 3
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                                    : nextLevel === 2
                                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
                                )}
                                title={`Envoyer ${LEVEL_CONFIG[nextLevel]?.label || 'relance'}`}
                              >
                                {isSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                {LEVEL_CONFIG[nextLevel]?.label}
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-all"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table footer */}
              {filtered.length > 1 && (
                <div className="border-t border-gray-100 dark:border-white/10 px-5 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {filtered.length} facture{filtered.length !== 1 ? 's' : ''} impayee{filtered.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Total : {formatCurrency(filtered.reduce((s, i) => s + i.total, 0))}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile list */}
            <div className="lg:hidden divide-y divide-gray-50 dark:divide-white/5">
              {filtered.map((inv, index) => {
                const levelCfg = LEVEL_CONFIG[inv.reminder_level] || LEVEL_CONFIG[0];
                const LevelIcon = levelCfg.icon;
                const urgency = getUrgencyColor(inv.days_overdue);
                const urgencyDot = getUrgencyDot(inv.days_overdue);
                const recommended = getRecommendedAction(inv.days_overdue, inv.reminder_level);
                const nextLevel = getNextLevel(inv.reminder_level);
                const isSending = sendingIds.has(inv.id);

                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors',
                      inv.days_overdue > 30 && 'bg-red-50/20 dark:bg-red-500/5',
                    )}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-primary">{inv.number}</span>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border', urgency)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', urgencyDot)} />
                        {inv.days_overdue}j de retard
                      </span>
                    </div>

                    {/* Client & Amount */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{inv.client_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Echeance : {formatDateShort(inv.due_date)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</p>
                    </div>

                    {/* Level badge */}
                    <div className="flex items-center justify-between mt-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', levelCfg.bg, levelCfg.text)}>
                        <LevelIcon size={12} />
                        {levelCfg.label} &mdash; {levelCfg.description}
                      </span>
                    </div>

                    {/* Recommended action */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{recommended}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {inv.days_overdue > 5 && (
                        <button
                          onClick={() => handleSendReminder(inv.id, nextLevel)}
                          disabled={isSending}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50',
                            nextLevel >= 3
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                              : nextLevel === 2
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
                          )}
                        >
                          {isSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          Envoyer {LEVEL_CONFIG[nextLevel]?.label}
                        </button>
                      )}
                      <button
                        onClick={() => toast.info('Fonctionnalité à venir')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                      >
                        <Mail size={12} />
                        Contacter
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
    </CabinetGuard>
  );
}

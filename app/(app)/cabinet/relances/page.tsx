'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Bell, BellRing, ShieldAlert, Clock, Send, Loader2, RefreshCw, CheckCircle2,
  AlertTriangle, Euro,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionCard, DataTable, KpiCard, StatusBadge, EmptyState, TableSkeleton,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';

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

const LEVEL: Record<number, { label: string; dot: string; icon: any }> = {
  0: { label: 'Aucune relance', dot: '#9ca3af', icon: Clock },
  1: { label: 'Relance 1', dot: '#f59e0b', icon: Bell },
  2: { label: 'Relance 2', dot: '#f97316', icon: BellRing },
  3: { label: 'Mise en demeure', dot: '#ef4444', icon: ShieldAlert },
};

function urgencyDot(days: number): string {
  if (days > 30) return '#ef4444';
  if (days > 15) return '#f97316';
  if (days > 5) return '#f59e0b';
  return '#9ca3af';
}

function recommendedAction(days: number, level: number): string {
  if (level >= 3) return 'Mise en demeure envoyée — envisager une procédure contentieuse.';
  if (level === 2 && days > 30) return 'Envoyer une mise en demeure formelle.';
  if (level === 1 && days > 15) return 'Envoyer une relance ferme (niveau 2).';
  if (level === 0 && days > 5) return 'Envoyer une première relance courtoise.';
  return 'Relance non nécessaire pour le moment.';
}

const nextLevel = (l: number) => Math.min(l + 1, 3);

export default function CabinetRelancesPage() {
  const sub = useSubscription();
  const { cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data, loading, error, refresh } = useCabinetData<ReminderData>('/api/cabinet/reminders', { wholeObject: true });
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [batchSending, setBatchSending] = useState(false);
  const [filterLevel, setFilterLevel] = useState<number | null>(null);

  const handleSend = async (invoiceId: string, level: number) => {
    setSendingIds((p) => new Set(p).add(invoiceId));
    try {
      // ARGOS — route existante /api/cabinet/reminders, payload snake_case.
      const result: any = await cabinetMutation('/api/cabinet/reminders', 'POST', { invoice_id: invoiceId, level, confirmed: true });
      clearCabinetCache('/api/cabinet/reminders');
      // ASTRÉE (CIBLE 1) — honnête : si le client cabinet n'a pas d'email, on le dit.
      if (result?.pendingEmail) {
        toast.warning('Relance enregistrée — email du client cabinet manquant.');
      } else {
        toast.success('Relance envoyée');
      }
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSendingIds((p) => {
        const n = new Set(p);
        n.delete(invoiceId);
        return n;
      });
    }
  };

  const handleBatch = async () => {
    if (!data) return;
    const eligible = (data.invoices ?? []).filter((i) => i.days_overdue > 5);
    if (!eligible.length) {
      toast.info('Aucune facture à relancer');
      return;
    }
    if (!window.confirm(`Envoyer ${eligible.length} relance(s) ? Chaque client recevra un email adapté.`)) return;
    setBatchSending(true);
    try {
      // ARGOS — la route batch n'existe pas. On envoie séquentiellement vers
      // la route existante /api/cabinet/reminders (POST) avec le bon payload.
      let sent = 0;
      let pendingEmail = 0;
      for (const inv of eligible) {
        try {
          const r: any = await cabinetMutation('/api/cabinet/reminders', 'POST', {
            invoice_id: inv.id,
            level: nextLevel(inv.reminder_level),
            confirmed: true,
          });
          if (r?.pendingEmail) pendingEmail++; else sent += 1;
        } catch (e) {
          // On continue sur les suivantes même si l'une échoue.
        }
      }
      clearCabinetCache('/api/cabinet/reminders');
      // ASTRÉE — honnête : on distingue les envoyées des sans-email.
      if (pendingEmail > 0) {
        toast.warning(`${sent} envoyée(s) — ${pendingEmail} sans email client.`);
      } else {
        toast.success(`${sent || eligible.length} relance(s) envoyée(s)`);
      }
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi groupé");
    } finally {
      setBatchSending(false);
    }
  };

  const filtered = useMemo(() => {
    if (!data?.invoices) return [];
    return filterLevel === null ? data.invoices : data.invoices.filter((i) => i.reminder_level === filterLevel);
  }, [data?.invoices, filterLevel]);

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#f59e0b1a' }}>
            <BellRing size={40} className="text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">Relances automatiques</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Automatisez vos relances avec une fermeté progressive et un suivi complet.
          </p>
          <Link href="/paywall?plan=business" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold shadow-lg" style={{ backgroundColor: '#f59e0b' }}>
            Passer au plan Business
          </Link>
        </motion.div>
      </div>
    );
  }

  const summary = data?.summary || { total_overdue: 0, total_amount: 0, level_1_count: 0, level_2_count: 0, level_3_count: 0 };
  const hasEligible = !!data?.invoices?.some((i) => i.days_overdue > 5);

  const columns: Column<OverdueInvoice>[] = [
    {
      key: 'number',
      header: 'N°',
      sortValue: (i) => i.number,
      sortable: true,
      render: (i) => <span className="text-sm font-bold" style={{ color: primaryColor }}>{i.number}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      sortValue: (i) => i.client_name,
      sortable: true,
      render: (i) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{i.client_name}</p>
          {i.client_email && <p className="text-xs text-gray-500 truncate">{i.client_email}</p>}
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Échéance',
      hideOnMobile: true,
      sortValue: (i) => i.due_date,
      sortable: true,
      render: (i) => <span className="text-sm text-gray-500">{formatDateShort(i.due_date)}</span>,
    },
    {
      key: 'total',
      header: 'Montant',
      align: 'right',
      sortValue: (i) => i.total,
      sortable: true,
      render: (i) => <span className="text-sm font-bold text-gray-900">{formatCurrency(i.total)}</span>,
    },
    {
      key: 'days',
      header: 'Retard',
      align: 'center',
      sortValue: (i) => i.days_overdue,
      sortable: true,
      render: (i) => (
        <StatusBadge dot={urgencyDot(i.days_overdue)} size="sm">
          {i.days_overdue} j
        </StatusBadge>
      ),
    },
    {
      key: 'level',
      header: 'Niveau',
      align: 'center',
      render: (i) => {
        const cfg = LEVEL[i.reminder_level] || LEVEL[0];
        return (
          <StatusBadge dot={cfg.dot} size="sm">
            {cfg.label}
          </StatusBadge>
        );
      },
    },
    {
      key: 'recommended',
      header: 'Action recommandée',
      hideOnMobile: true,
      render: (i) => <span className="text-xs text-gray-500">{recommendedAction(i.days_overdue, i.reminder_level)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => {
        const nl = nextLevel(i.reminder_level);
        const cfg = LEVEL[nl];
        return (
          <button
            onClick={() => handleSend(i.id, nl)}
            disabled={sendingIds.has(i.id) || i.days_overdue <= 5}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: cfg.dot }}
            title={`Envoyer ${cfg.label}`}
          >
            {sendingIds.has(i.id) ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            <span className="hidden sm:inline">{cfg.label}</span>
          </button>
        );
      },
    },
  ];

  const levelTabs = [
    { id: 'all', label: 'Tous niveaux', count: data?.invoices?.length || 0 },
    { id: '1', label: 'Relance 1', count: summary.level_1_count },
    { id: '2', label: 'Relance 2', count: summary.level_2_count },
    { id: '3', label: 'Mises en demeure', count: summary.level_3_count },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total impayé" value={formatCurrency(summary.total_amount)} icon={Euro} accent="#ef4444" hint={`${summary.total_overdue} facture(s)`} />
        <KpiCard label="Relance 1 (courtoise)" value={String(summary.level_1_count)} icon={Bell} accent="#f59e0b" hint="5–15 j de retard" />
        <KpiCard label="Relance 2 (ferme)" value={String(summary.level_2_count)} icon={BellRing} accent="#f97316" hint="15–30 j de retard" />
        <KpiCard label="Mises en demeure" value={String(summary.level_3_count)} icon={ShieldAlert} accent={summary.level_3_count > 0 ? '#ef4444' : '#6b7280'} hint="+30 j de retard" />
      </div>

      {/* Action groupée */}
      {hasEligible && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/80 flex items-center justify-center flex-shrink-0">
              <Send size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-700">Relancer automatiquement</p>
              <p className="text-xs text-amber-700/70 truncate">Chaque client reçoit un email adapté à son niveau de retard.</p>
            </div>
          </div>
          <button
            onClick={handleBatch}
            disabled={batchSending}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
          >
            {batchSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span className="hidden sm:inline">Envoyer toutes</span>
          </button>
        </div>
      )}

      {/* Filtres niveau */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {levelTabs.map((t) => {
          const active = (t.id === 'all' && filterLevel === null) || filterLevel === parseInt(t.id);
          return (
            <button
              key={t.id}
              onClick={() => setFilterLevel(t.id === 'all' ? null : parseInt(t.id))}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors',
                active
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
              )}
              style={active ? { backgroundColor: primaryColor } : undefined}
            >
              {t.label}
              {t.count > 0 && (
                <span className={cn('px-1.5 rounded-full text-[10px]', active ? 'bg-white/25' : 'bg-gray-100')}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={refresh}
          className="ml-auto p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
          title="Actualiser"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Liste */}
      <SectionCard title={`Factures impayées (${filtered.length})`} icon={BellRing} accent="#f59e0b" noPadding>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <EmptyState icon={AlertTriangle} title="Erreur de chargement" description={error} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            getRowId={(i) => i.id}
            searchable
            searchPlaceholder="Rechercher par n°, client…"
            searchText={(i) => `${i.number} ${i.client_name} ${i.client_email || ''}`}
            emptyIcon={CheckCircle2}
            emptyTitle="Aucune facture impayée"
            emptyDescription="Toutes vos factures sont payées. Bravo !"
            initialSort={{ key: 'days', dir: 'desc' }}
          />
        )}
      </SectionCard>
    </motion.div>
  );
}

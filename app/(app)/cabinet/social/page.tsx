'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Shield, Users, FileCheck, Send, ChevronLeft, ChevronRight, CalendarDays,
  RefreshCw, Loader2, AlertTriangle, Pencil, StickyNote,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionCard, DataTable, KpiCard, StatusBadge, Modal, EmptyState, TableSkeleton,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';

interface SocialRow {
  id: string;
  client_id: string;
  client_name: string;
  nb_employees: number;
  bs_issued: number;
  bs_validated: number;
  dsn_status: 'sent' | 'pending' | 'blocked' | 'na' | null;
  stc_status: any;
  contracts_count: number;
  amendments_count: number;
  at_mp: boolean;
  observations: string | null;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DSN_CFG: Record<string, { label: string; dot: string }> = {
  sent: { label: 'Envoyée', dot: '#10b981' },
  pending: { label: 'En attente', dot: '#f59e0b' },
  blocked: { label: 'Bloquée', dot: '#ef4444' },
  na: { label: 'N/C', dot: '#9ca3af' },
};

export default function CabinetSocialPage() {
  const sub = useSubscription();
  const { cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<SocialRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [dsnFilter, setDsnFilter] = useState<string>('all');

  useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  const ready = year !== null && month !== null;

  const { data: rawTracking, loading, error, refresh } = useCabinetData<SocialRow[]>(
    ready ? '/api/cabinet/social' : null,
    { params: { month: String(month), year: String(year) } },
  );

  const rows = rawTracking || [];

  const kpis = useMemo(() => {
    const totalSalaries = rows.reduce((s, r) => s + (r.nb_employees || 0), 0);
    const bsTraites = rows.reduce((s, r) => s + (r.bs_validated || 0), 0);
    const dsnEnvoyees = rows.filter((r) => r.dsn_status === 'sent').length;
    const dsnEnAttente = rows.filter((r) => r.dsn_status === 'pending').length;
    return { totalSalaries, bsTraites, dsnEnvoyees, dsnEnAttente };
  }, [rows]);

  const filtered = useMemo(() => {
    if (dsnFilter === 'all') return rows;
    return rows.filter((r) => (r.dsn_status || 'na') === dsnFilter);
  }, [rows, dsnFilter]);

  const goPrev = () => {
    if (month === 1) { setMonth(12); setYear((y) => (y || 0) - 1); }
    else setMonth((m) => (m || 1) - 1);
  };
  const goNext = () => {
    if (month === 12) { setMonth(1); setYear((y) => (y || 0) + 1); }
    else setMonth((m) => (m || 1) + 1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await cabinetMutation('/api/cabinet/social', 'PATCH', {
        id: editing.id,
        nb_employees: editing.nb_employees,
        bs_issued: editing.bs_issued,
        bs_validated: editing.bs_validated,
        dsn_status: editing.dsn_status || 'na',
        contracts_count: editing.contracts_count,
        amendments_count: editing.amendments_count,
        at_mp: editing.at_mp,
        observations: editing.observations,
      });
      clearCabinetCache(`/api/cabinet/social?month=${month}&year=${year}`);
      toast.success('Suivi social mis à jour');
      setEditing(null);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#8b5cf61a' }}>
          <Shield size={40} className="text-violet-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Gestion Sociale & Paie</h1>
        <p className="text-gray-500 mb-8">Suivez bulletins, DSN et obligations sociales de vos clients.</p>
        <Link href="/paywall?plan=business" className="px-8 py-4 rounded-2xl text-white font-bold shadow-lg" style={{ backgroundColor: '#8b5cf6' }}>
          Passer au plan Business
        </Link>
      </div>
    );
  }

  const columns: Column<SocialRow>[] = [
    {
      key: 'client',
      header: 'Client',
      sortValue: (r) => r.client_name,
      sortable: true,
      render: (r) => <span className="font-semibold text-gray-900 text-sm truncate">{r.client_name || '—'}</span>,
    },
    { key: 'nb', header: 'Salariés', align: 'center', sortValue: (r) => r.nb_employees, sortable: true, render: (r) => <span className="font-semibold text-gray-700">{r.nb_employees || 0}</span> },
    { key: 'bs_issued', header: 'BS émis', align: 'center', hideOnMobile: true, render: (r) => <span className="text-gray-600">{r.bs_issued || 0}</span> },
    { key: 'bs_val', header: 'BS validés', align: 'center', hideOnMobile: true, render: (r) => <span className="text-gray-600">{r.bs_validated || 0}</span> },
    {
      key: 'dsn',
      header: 'DSN',
      align: 'center',
      render: (r) => {
        const cfg = DSN_CFG[r.dsn_status || 'na'] || DSN_CFG.na;
        return <StatusBadge dot={cfg.dot} size="sm">{cfg.label}</StatusBadge>;
      },
    },
    { key: 'contrats', header: 'Contrats', align: 'center', hideOnMobile: true, render: (r) => <span className="text-gray-600">{r.contracts_count || 0}</span> },
    {
      key: 'atmp',
      header: 'AT/MP',
      align: 'center',
      hideOnMobile: true,
      render: (r) => (
        <span className={cn('text-xs font-semibold', r.at_mp ? 'text-red-600' : 'text-gray-400')}>
          {r.at_mp ? 'Oui' : '—'}
        </span>
      ),
    },
    {
      key: 'obs',
      header: 'Observations',
      hideOnMobile: true,
      render: (r) =>
        r.observations ? (
          <span className="text-xs text-gray-500 truncate inline-flex items-center gap-1">
            <StickyNote size={11} className="text-amber-500 flex-shrink-0" />
            {r.observations}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => setEditing({ ...r })}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Modifier"
        >
          <Pencil size={14} />
        </button>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Sélecteur de période */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm">
            <CalendarDays size={15} style={{ color: primaryColor }} />
            <span className="font-bold text-gray-900 text-sm">
              {month ? MONTHS_FR[month - 1] : ''} {year}
            </span>
          </div>
          <button onClick={goNext} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Actualiser">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total salariés" value={String(kpis.totalSalaries)} icon={Users} accent="#10b981" />
        <KpiCard label="BS validés" value={String(kpis.bsTraites)} icon={FileCheck} accent="#3b82f6" />
        <KpiCard label="DSN envoyées" value={String(kpis.dsnEnvoyees)} icon={Send} accent="#22c55e" hint={`${rows.length} client(s)`} />
        <KpiCard label="DSN en attente" value={String(kpis.dsnEnAttente)} icon={AlertTriangle} accent={kpis.dsnEnAttente > 0 ? '#f59e0b' : '#6b7280'} />
      </div>

      {/* Filtre DSN */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'sent', label: 'Envoyées' },
          { id: 'pending', label: 'En attente' },
          { id: 'blocked', label: 'Bloquées' },
          { id: 'na', label: 'N/C' },
        ].map((f) => {
          const active = dsnFilter === f.id;
          const count = f.id === 'all' ? rows.length : rows.filter((r) => (r.dsn_status || 'na') === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setDsnFilter(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors flex-shrink-0',
                active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
              )}
              style={active ? { backgroundColor: primaryColor } : undefined}
            >
              {f.label}
              <span className={cn('px-1.5 rounded-full text-[10px]', active ? 'bg-white/25' : 'bg-gray-100')}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <SectionCard title={`Suivi social — ${month ? MONTHS_FR[month - 1] : ''} ${year}`} icon={Shield} accent={primaryColor} noPadding>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <EmptyState icon={AlertTriangle} title="Erreur de chargement" description={error} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            getRowId={(r) => r.id}
            searchable
            searchPlaceholder="Rechercher un client…"
            searchText={(r) => r.client_name || ''}
            emptyIcon={Users}
            emptyTitle="Aucun suivi social"
            emptyDescription="Aucune donnée sociale pour ce mois. Ajoutez des salariés pour alimenter le suivi."
          />
        )}
      </SectionCard>

      {/* Modale édition */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.client_name}
        icon={Pencil}
        accent={primaryColor}
        footer={
          <>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
            <button onClick={handleSaveEdit} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Enregistrer
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Nb salariés" value={editing.nb_employees} onChange={(v) => setEditing({ ...editing, nb_employees: v })} />
              <NumField label="BS émis" value={editing.bs_issued} onChange={(v) => setEditing({ ...editing, bs_issued: v })} />
              <NumField label="BS validés" value={editing.bs_validated} onChange={(v) => setEditing({ ...editing, bs_validated: v })} />
              <NumField label="Contrats" value={editing.contracts_count} onChange={(v) => setEditing({ ...editing, contracts_count: v })} />
              <NumField label="Avenants" value={editing.amendments_count} onChange={(v) => setEditing({ ...editing, amendments_count: v })} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Statut DSN</label>
              <select
                value={editing.dsn_status || 'na'}
                onChange={(e) => setEditing({ ...editing, dsn_status: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="sent">Envoyée</option>
                <option value="pending">En attente</option>
                <option value="blocked">Bloquée</option>
                <option value="na">Non concernée</option>
              </select>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!editing.at_mp}
                onChange={(e) => setEditing({ ...editing, at_mp: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500/30"
              />
              <span className="text-sm text-gray-700">Accident du travail / maladie pro à déclarer</span>
            </label>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Observations</label>
              <textarea
                value={editing.observations || ''}
                onChange={(e) => setEditing({ ...editing, observations: e.target.value })}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                placeholder="Notes sur la paie du mois…"
              />
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type="number"
        min={0}
        value={value || 0}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  );
}

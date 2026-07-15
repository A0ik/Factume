'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator, FileSpreadsheet, TrendingUp, TrendingDown, Scale, Download,
  Loader2, FileText, Info,
} from 'lucide-react';
import { useCabinetStore } from '@/stores/cabinetStore';
import { cn, formatCurrency, formatDateShort, downloadXLSX } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionCard, DataTable, KpiCard, EmptyState, TableSkeleton,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';

interface AccountingOp {
  id: string;
  date: string;
  type: string;
  label: string;
  tiers: string;
  account: string;
  debit: number;
  credit: number;
}

interface AccountingData {
  clientName?: string;
  hasTenantData?: boolean;
  period: { from: string; to: string };
  tva: { collectee: number; deductible: number; aPayer: number; credit: number };
  compteResultat: { produits: number; charges: number; resultat: number };
  chargesByCategory: Array<{ category: string; amount: number }>;
  operations: AccountingOp[];
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = d.toISOString().slice(0, 7);
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) };
});

type Tab = 'tva' | 'etats';

export default function CabinetComptabilitePage() {
  const { clients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const [clientId, setClientId] = useState('');
  const [month, setMonth] = useState(MONTHS[0].value);
  const [tab, setTab] = useState<Tab>('tva');
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(false);

  const { from, to } = useMemo(() => {
    const [year, mon] = month.split('-').map(Number);
    return { from: `${month}-01`, to: new Date(year, mon, 0).toISOString().slice(0, 10) };
  }, [month]);

  useEffect(() => {
    // Sélection auto du 1er client lié (tenant) si aucun choisi.
    if (!clientId && clients.length) {
      const firstLinked = (clients as any[]).find((c) => c.client_user_id) || (clients as any[])[0];
      if (firstLinked) setClientId(firstLinked.id);
    }
  }, [clients, clientId]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = (await import('@/lib/supabase')).getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`/api/cabinet/accounting?client_id=${clientId}&from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(json?.error || 'Erreur');
          setData(json);
        }
      } catch (e: any) {
        if (!cancelled) toast.error(e.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, from, to]);

  const clientLabel = (id: string) => {
    const c: any = (clients as any[]).find((cl) => cl.id === id);
    if (!c) return '—';
    return c.client_type === 'manual' ? (c.company_name || 'Client') : (c.profile?.company_name || c.profile?.first_name || 'Client');
  };

  const exportTva = () => {
    if (!data) return;
    downloadXLSX(`tva-${clientId}-${month}.xlsx`, [
      {
        name: 'TVA',
        headers: ['Libellé', 'Montant HT', 'TVA', 'Période'],
        rows: [
          ['TVA collectée (ventes)', '', data.tva.collectee, `${from} → ${to}`],
          ['TVA déductible (achats)', '', data.tva.deductible, `${from} → ${to}`],
          ['TVA à payer', '', data.tva.aPayer, ''],
          ['Crédit à reporter', '', data.tva.credit, ''],
        ],
      },
    ]);
    toast.success('Déclaration TVA exportée');
  };

  const exportGrandLivre = () => {
    if (!data?.operations?.length) return;
    downloadXLSX(`grand-livre-${clientId}-${month}.xlsx`, [
      {
        name: 'Grand livre',
        headers: ['Date', 'Type', 'Libellé', 'Tiers', 'Compte', 'Débit', 'Crédit'],
        rows: data.operations.map((o) => [o.date, o.type, o.label, o.tiers, o.account, o.debit, o.credit]),
      },
    ]);
    toast.success('Grand livre exporté');
  };

  const tva = data?.tva ?? { collectee: 0, deductible: 0, aPayer: 0, credit: 0 };
  const cr = data?.compteResultat ?? { produits: 0, charges: 0, resultat: 0 };
  const noData = data && data.hasTenantData === false;

  const ledgerColumns: Column<AccountingOp>[] = [
    { key: 'date', header: 'Date', sortValue: (o) => o.date, sortable: true, render: (o) => <span className="text-sm text-gray-500">{formatDateShort(o.date)}</span> },
    { key: 'label', header: 'Libellé', render: (o) => (
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{o.label}</p>
        <p className="text-[11px] text-gray-400">{o.tiers || o.account}</p>
      </div>
    ) },
    { key: 'account', header: 'Compte', hideOnMobile: true, render: (o) => <span className="text-sm text-gray-500">{o.account}</span> },
    { key: 'debit', header: 'Débit', align: 'right', hideOnMobile: true, render: (o) => <span className="text-sm text-red-600">{o.debit ? formatCurrency(o.debit) : '—'}</span> },
    { key: 'credit', header: 'Crédit', align: 'right', render: (o) => <span className="text-sm font-semibold text-emerald-600">{o.credit ? formatCurrency(o.credit) : '—'}</span> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Sélecteurs */}
      <SectionCard title="Comptabilité" icon={Calculator} accent={primaryColor}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Sélectionner un client…</option>
              {(clients as any[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_type === 'manual' ? c.company_name : c.profile?.company_name || c.profile?.first_name || 'Client'}
                  {!c.client_user_id ? ' (hors-ligne)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-56">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Période</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mt-4 p-1 bg-gray-100 rounded-xl w-full sm:w-fit">
          {([['tva', 'Déclaration TVA'], ['etats', 'États financiers']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </SectionCard>

      {loading ? (
        <TableSkeleton cols={4} />
      ) : !clientId ? (
        <EmptyState icon={Calculator} title="Sélectionnez un client" description="Choisissez un client pour afficher sa comptabilité." />
      ) : noData ? (
        <EmptyState icon={Info} title="Client hors-ligne" description="Ce client n'a pas de dossier comptable relié (pas de tenant Factu.me). Reliez-le pour accéder à sa comptabilité." />
      ) : tab === 'tva' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="TVA collectée" value={formatCurrency(tva.collectee)} icon={TrendingUp} accent="#10b981" hint="Sur ventes" />
            <KpiCard label="TVA déductible" value={formatCurrency(tva.deductible)} icon={TrendingDown} accent="#3b82f6" hint="Sur achats" />
            <KpiCard label="TVA à payer" value={formatCurrency(tva.aPayer)} icon={Calculator} accent={tva.aPayer > 0 ? '#ef4444' : '#6b7280'} hint="Collectée − déductible" />
            <KpiCard label="Crédit à reporter" value={formatCurrency(tva.credit)} icon={Scale} accent={tva.credit > 0 ? '#22c55e' : '#6b7280'} hint="Si déductible > collectée" />
          </div>

          <SectionCard
            title={`Récapitulatif CA3 — ${clientLabel(clientId)}`}
            icon={FileSpreadsheet}
            accent={primaryColor}
            action={
              <button onClick={exportTva} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold">
                <Download size={14} /> Export
              </button>
            }
          >
            <div className="space-y-2 text-sm">
              <CrRow label="Base hors taxes — ventes" value={formatCurrency((tva.collectee / 0.2) || 0)} />
              <CrRow label="TVA collectée" value={formatCurrency(tva.collectee)} strong />
              <div className="h-px bg-gray-100 my-2" />
              <CrRow label="TVA déductible" value={formatCurrency(tva.deductible)} />
              <div className="h-px bg-gray-100 my-2" />
              {tva.aPayer > 0 ? (
                <CrRow label="TVA à payer (CA3)" value={formatCurrency(tva.aPayer)} strong accent="#ef4444" />
              ) : (
                <CrRow label="Crédit de TVA à reporter" value={formatCurrency(tva.credit)} strong accent="#22c55e" />
              )}
              <p className="text-[11px] text-gray-400 mt-3">
                Calcul indicatif (taux implicite 20 %). Le cabinet doit valider la déclaration officielle sur impots.gouv.fr.
              </p>
            </div>
          </SectionCard>
        </>
      ) : (
        <>
          {/* Compte de résultat */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <KpiCard label="Produits (HT)" value={formatCurrency(cr.produits)} icon={TrendingUp} accent="#10b981" />
            <KpiCard label="Charges (HT)" value={formatCurrency(cr.charges)} icon={TrendingDown} accent="#ef4444" />
            <KpiCard label="Résultat" value={formatCurrency(cr.resultat)} icon={Scale} accent={cr.resultat >= 0 ? '#22c55e' : '#ef4444'} />
          </div>

          <SectionCard title="Compte de résultat" icon={FileText} accent={primaryColor}>
            <div className="space-y-2 text-sm">
              <CrRow label="Produits d'exploitation" value={formatCurrency(cr.produits)} strong accent="#10b981" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">Charges par nature</p>
              {(data?.chargesByCategory || []).length === 0 ? (
                <p className="text-sm text-gray-400">Aucune charge sur la période.</p>
              ) : (
                (data!.chargesByCategory).map((c) => (
                  <CrRow key={c.category} label={c.category} value={formatCurrency(c.amount)} />
                ))
              )}
              <div className="h-px bg-gray-100 my-2" />
              <CrRow label="Résultat de la période" value={formatCurrency(cr.resultat)} strong accent={cr.resultat >= 0 ? '#22c55e' : '#ef4444'} />
            </div>
          </SectionCard>

          {/* Grand livre */}
          <SectionCard
            title={`Grand livre (${data?.operations?.length || 0})`}
            icon={FileSpreadsheet}
            accent={primaryColor}
            noPadding
            action={
              <button onClick={exportGrandLivre} disabled={!data?.operations?.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold disabled:opacity-40">
                <Download size={14} /> Export
              </button>
            }
          >
            <DataTable
              columns={ledgerColumns}
              data={data?.operations || []}
              getRowId={(o) => o.id}
              searchable
              searchPlaceholder="Rechercher une écriture…"
              searchText={(o) => `${o.label} ${o.account} ${o.tiers}`}
              emptyIcon={FileText}
              emptyTitle="Aucune écriture"
              emptyDescription="Pas de mouvement sur cette période."
              initialSort={{ key: 'date', dir: 'desc' }}
            />
          </SectionCard>
        </>
      )}
    </motion.div>
  );
}

function CrRow({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-sm', strong ? 'font-bold text-gray-900' : 'text-gray-500')}>{label}</span>
      <span className={cn('text-sm', strong ? 'font-black' : 'font-semibold')} style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  );
}

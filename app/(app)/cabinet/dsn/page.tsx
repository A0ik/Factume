'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Plus, Loader2, Send, CheckCircle2, AlertCircle, Clock,
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

interface Dsn {
  id: string;
  client_id: string | null;
  type_dsn: string;
  mois: number;
  annee: number;
  nb_salaries: number | null;
  total_brut: number | null;
  total_net: number | null;
  status: 'en_preparation' | 'envoyee' | 'acceptee' | 'rejetee';
  date_echeance: string | null;
  numero_dsn: string | null;
}

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const TYPE_LABEL: Record<string, string> = { mensuelle: 'Mensuelle', arret_maladie: 'Arrêt maladie', reprise_maladie: 'Reprise maladie', fin_contrat: 'Fin de contrat', autre_evenement: 'Autre événement' };
const STATUS_TONE: Record<string, 'neutral' | 'info' | 'good' | 'critical'> = { en_preparation: 'neutral', envoyee: 'info', acceptee: 'good', rejetee: 'critical' };
const STATUS_LABEL: Record<string, string> = { en_preparation: 'En préparation', envoyee: 'Envoyée', acceptee: 'Acceptée', rejetee: 'Rejetée' };
const TYPES = ['mensuelle', 'arret_maladie', 'reprise_maladie', 'fin_contrat', 'autre_evenement'];

const now = new Date();
const EMPTY = { type: 'mensuelle', mois: String(now.getMonth() + 1), annee: String(now.getFullYear()), nbSalaries: '', totalBrut: '', dateEcheance: '' };

export default function CabinetDsnPage() {
  const sub = useSubscription();
  const { cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data: dsn, loading, error, refresh } = useCabinetData<Dsn[]>('/api/cabinet/dsn');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const list = dsn || [];
  const kpis = useMemo(() => ({
    total: list.length,
    prep: list.filter((d) => d.status === 'en_preparation').length,
    envoyees: list.filter((d) => d.status === 'envoyee').length,
    acceptees: list.filter((d) => d.status === 'acceptee').length,
  }), [list]);

  const save = async () => {
    if (!form.type || !form.mois || !form.annee) { toast.error('Type, mois et année requis'); return; }
    setSaving(true);
    try {
      await cabinetMutation('/api/cabinet/dsn', 'POST', {
        type_dsn: form.type, mois: Number(form.mois), annee: Number(form.annee),
        nb_salaries: form.nbSalaries ? Number(form.nbSalaries) : null,
        total_brut: form.totalBrut ? parseFloat(form.totalBrut) : null,
        date_echeance: form.dateEcheance || null,
      });
      clearCabinetCache('/api/cabinet/dsn');
      toast.success('DSN créée');
      setShowAdd(false);
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const mark = async (d: Dsn, status: 'envoyee' | 'acceptee') => {
    try {
      await cabinetMutation('/api/cabinet/dsn', 'PATCH', { id: d.id, status });
      clearCabinetCache('/api/cabinet/dsn');
      toast.success(status === 'envoyee' ? 'DSN envoyée' : 'DSN acceptée');
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}1a` }}><Shield size={40} style={{ color: primaryColor }} /></div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">DSN</h1>
        <p className="text-gray-500 mb-8">Déclarations sociales nominatives.</p>
      </div>
    );
  }

  const columns: Column<Dsn>[] = [
    { key: 'period', header: 'Période', sortValue: (d) => `${d.annee}-${String(d.mois).padStart(2, '0')}`, sortable: true, render: (d) => <span className="font-semibold text-gray-900 text-sm">{MONTHS_FR[d.mois - 1]} {d.annee}</span> },
    { key: 'type', header: 'Type', render: (d) => <StatusBadge tone="info" size="sm">{TYPE_LABEL[d.type_dsn] || d.type_dsn}</StatusBadge> },
    { key: 'sal', header: 'Salariés', align: 'center', hideOnMobile: true, render: (d) => <span className="text-sm text-gray-700">{d.nb_salaries ?? '—'}</span> },
    { key: 'brut', header: 'Total brut', align: 'right', sortValue: (d) => d.total_brut || 0, sortable: true, hideOnMobile: true, render: (d) => <span className="text-sm font-semibold text-gray-700">{d.total_brut ? formatCurrency(d.total_brut) : '—'}</span> },
    { key: 'status', header: 'Statut', render: (d) => <StatusBadge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusBadge> },
    {
      key: 'actions', header: '', align: 'right',
      render: (d) => (
        <div className="flex items-center justify-end gap-0.5">
          {d.status === 'en_preparation' && <button onClick={() => mark(d, 'envoyee')} title="Marquer envoyée" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Send size={14} /></button>}
          {d.status === 'envoyee' && <button onClick={() => mark(d, 'acceptee')} title="Marquer acceptée" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"><CheckCircle2 size={14} /></button>}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="DSN" value={String(kpis.total)} icon={Shield} accent={primaryColor} />
        <KpiCard label="En préparation" value={String(kpis.prep)} icon={Clock} accent={kpis.prep > 0 ? '#f59e0b' : '#6b7280'} />
        <KpiCard label="Envoyées" value={String(kpis.envoyees)} icon={Send} accent="#3b82f6" />
        <KpiCard label="Acceptées" value={String(kpis.acceptees)} icon={CheckCircle2} accent="#22c55e" />
      </div>

      <SectionCard title={`DSN (${list.length})`} icon={Shield} accent={primaryColor} noPadding
        action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Nouvelle</span></button>}
      >
        {loading ? <TableSkeleton cols={4} /> : error ? <EmptyState icon={AlertCircle} title="Erreur" description={error} /> : (
          <DataTable columns={columns} data={list} getRowId={(d) => d.id} searchable searchPlaceholder="Rechercher…" searchText={(d) => `${MONTHS_FR[d.mois - 1]} ${d.annee} ${d.type_dsn}`} emptyIcon={Shield} emptyTitle="Aucune DSN" emptyDescription="Créez les déclarations sociales nominatives." initialSort={{ key: 'period', dir: 'desc' }} />
        )}
      </SectionCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle DSN" icon={Shield} accent={primaryColor}
        footer={<>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{saving ? <Loader2 size={14} className="animate-spin" /> : null} Créer</button>
        </>}
      >
        <div className="space-y-4">
          <div><Lbl>Type *</Lbl><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Mois *</Lbl><select value={form.mois} onChange={(e) => setForm({ ...form, mois: e.target.value })} className={inputCls}>{MONTHS_FR.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}</select></div>
            <div><Lbl>Année *</Lbl><input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Nb salariés</Lbl><input type="number" value={form.nbSalaries} onChange={(e) => setForm({ ...form, nbSalaries: e.target.value })} className={inputCls} placeholder="12" /></div>
            <div><Lbl>Total brut (€)</Lbl><input type="number" value={form.totalBrut} onChange={(e) => setForm({ ...form, totalBrut: e.target.value })} className={inputCls} placeholder="35000" /></div>
          </div>
          <div><Lbl>Date d'échéance</Lbl><input type="date" value={form.dateEcheance} onChange={(e) => setForm({ ...form, dateEcheance: e.target.value })} className={inputCls} /></div>
        </div>
      </Modal>
    </motion.div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
function Lbl({ children }: { children: React.ReactNode }) { return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>; }

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Loader2, FileSignature, Pencil, AlertCircle, CheckCircle2, Clock, Ban,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionCard, DataTable, KpiCard, StatusBadge, Modal, EmptyState, TableSkeleton,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';

interface Contract {
  id: string;
  employee_id: string;
  client_id: string | null;
  type_contrat: string;
  status: 'en_cours' | 'en_attente_signature' | 'signe' | 'suspendu' | 'rompu' | 'termine';
  date_debut: string;
  date_fin: string | null;
  poste: string;
  lieu_travail: string | null;
  salaire_brut_mensuel: number | null;
  periode_essai_jours: number | null;
}

const TYPE_DOT: Record<string, string> = {
  CDI: '#3b82f6', CDD: '#8b5cf6', CDD_usage: '#ec4899', CDD_reconversion: '#f97316',
  Interim: '#f59e0b', Stage: '#14b8a6', Apprentissage: '#6366f1', Professionnalisation: '#10b981',
};
const STATUS_TONE: Record<string, 'good' | 'warning' | 'critical' | 'neutral' | 'info'> = {
  en_cours: 'good', en_attente_signature: 'warning', signe: 'info', suspendu: 'neutral', rompu: 'critical', termine: 'neutral',
};
const STATUS_LABEL: Record<string, string> = {
  en_cours: 'En cours', en_attente_signature: 'À signer', signe: 'Signé', suspendu: 'Suspendu', rompu: 'Rompu', termine: 'Terminé',
};
const TYPES = ['CDI', 'CDD', 'CDD_usage', 'CDD_reconversion', 'Interim', 'Stage', 'Apprentissage', 'Professionnalisation'];

const EMPTY = { employeeId: '', type: 'CDI', dateDebut: '', dateFin: '', poste: '', salaire: '' };

export default function CabinetContratsPage() {
  const sub = useSubscription();
  const { clients: storeClients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data: contracts, loading, error, refresh } = useCabinetData<Contract[]>('/api/cabinet/contracts');
  const { data: employees } = useCabinetData<any[]>('/api/cabinet/employees');

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const empName = useCallback((id: string) => {
    const e: any = (employees || []).find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : '—';
  }, [employees]);

  const list = contracts || [];
  const kpis = useMemo(() => ({
    total: list.length,
    enCours: list.filter((c) => c.status === 'en_cours').length,
    aSigner: list.filter((c) => c.status === 'en_attente_signature').length,
    signes: list.filter((c) => c.status === 'signe').length,
  }), [list]);

  const open = (c?: Contract) => {
    setForm(c ? { employeeId: c.employee_id, type: c.type_contrat, dateDebut: c.date_debut, dateFin: c.date_fin || '', poste: c.poste, salaire: c.salaire_brut_mensuel ? String(c.salaire_brut_mensuel) : '' } : { ...EMPTY });
    setEditing(c || null);
    setShowAdd(true);
  };

  const save = async () => {
    if (!form.employeeId || !form.type || !form.dateDebut || !form.poste) { toast.error('Salarié, type, date de début et poste requis'); return; }
    setSaving(true);
    try {
      const body = { employee_id: form.employeeId, type_contrat: form.type, date_debut: form.dateDebut, date_fin: form.dateFin || null, poste: form.poste, salaire_brut_mensuel: form.salaire ? parseFloat(form.salaire) : null };
      if (editing) await cabinetMutation('/api/cabinet/contracts', 'PATCH', { id: editing.id, ...body });
      else await cabinetMutation('/api/cabinet/contracts', 'POST', body);
      clearCabinetCache('/api/cabinet/contracts');
      toast.success(editing ? 'Contrat mis à jour' : 'Contrat créé');
      setShowAdd(false);
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const markSigned = async (c: Contract) => {
    try {
      await cabinetMutation('/api/cabinet/contracts', 'PATCH', { id: c.id, status: 'signe' });
      clearCabinetCache('/api/cabinet/contracts');
      toast.success('Contrat marqué comme signé');
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); }
  };

  if (!sub.isBusiness && !sub.isTrialActive) return <Paywall accent={primaryColor} />;

  const columns: Column<Contract>[] = [
    { key: 'emp', header: 'Salarié', sortValue: (c) => empName(c.employee_id), sortable: true, render: (c) => <span className="font-semibold text-gray-900 text-sm truncate">{empName(c.employee_id)}</span> },
    { key: 'type', header: 'Type', render: (c) => <StatusBadge dot={TYPE_DOT[c.type_contrat] || '#9ca3af'} size="sm">{c.type_contrat.replace('_', ' ')}</StatusBadge> },
    { key: 'poste', header: 'Poste', hideOnMobile: true, render: (c) => <span className="text-sm text-gray-700 truncate">{c.poste}</span> },
    { key: 'period', header: 'Période', hideOnMobile: true, render: (c) => <span className="text-xs text-gray-500">{formatDateShort(c.date_debut)}{c.date_fin ? ` → ${formatDateShort(c.date_fin)}` : ''}</span> },
    { key: 'salary', header: 'Brut/mois', align: 'right', sortValue: (c) => c.salaire_brut_mensuel || 0, sortable: true, hideOnMobile: true, render: (c) => <span className="text-sm font-semibold text-gray-700">{c.salaire_brut_mensuel ? formatCurrency(c.salaire_brut_mensuel) : '—'}</span> },
    { key: 'status', header: 'Statut', render: (c) => <StatusBadge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</StatusBadge> },
    {
      key: 'actions', header: '', align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-0.5">
          {c.status === 'en_attente_signature' && <button onClick={() => markSigned(c)} title="Marquer signé" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"><FileSignature size={14} /></button>}
          <button onClick={() => open(c)} title="Modifier" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Pencil size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Contrats" value={String(kpis.total)} icon={FileText} accent={primaryColor} />
        <KpiCard label="En cours" value={String(kpis.enCours)} icon={CheckCircle2} accent="#22c55e" />
        <KpiCard label="À signer" value={String(kpis.aSigner)} icon={Clock} accent={kpis.aSigner > 0 ? '#f59e0b' : '#6b7280'} />
        <KpiCard label="Signés" value={String(kpis.signes)} icon={FileSignature} accent="#3b82f6" />
      </div>

      <SectionCard title={`Contrats de travail (${list.length})`} icon={FileText} accent={primaryColor} noPadding
        action={<button onClick={() => open()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Nouveau</span></button>}
      >
        {loading ? <TableSkeleton cols={5} /> : error ? <EmptyState icon={AlertCircle} title="Erreur" description={error} /> : (
          <DataTable columns={columns} data={list} getRowId={(c) => c.id} searchable searchPlaceholder="Rechercher…" searchText={(c) => `${empName(c.employee_id)} ${c.poste}`} emptyIcon={FileText} emptyTitle="Aucun contrat" emptyDescription="Renseignez les contrats de travail de vos salariés." initialSort={{ key: 'emp', dir: 'asc' }} />
        )}
      </SectionCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editing ? 'Modifier le contrat' : 'Nouveau contrat'} icon={FileText} accent={primaryColor}
        footer={<>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{saving ? <Loader2 size={14} className="animate-spin" /> : null} Enregistrer</button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <Lbl>Salarié *</Lbl>
            <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className={inputCls}>
              <option value="">Sélectionner…</option>
              {(employees || []).map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Type *</Lbl><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></div>
            <div><Lbl>Brut/mois (€)</Lbl><input type="number" value={form.salaire} onChange={(e) => setForm({ ...form, salaire: e.target.value })} className={inputCls} placeholder="2500" /></div>
          </div>
          <div><Lbl>Poste *</Lbl><input value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} className={inputCls} placeholder="Maçon" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Début *</Lbl><input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} className={inputCls} /></div>
            <div><Lbl>Fin (si CDD)</Lbl><input type="date" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} className={inputCls} /></div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

function Paywall({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${accent}1a` }}><FileText size={40} style={{ color: accent }} /></div>
      <h1 className="text-3xl font-black text-gray-900 mb-3">Contrats de travail</h1>
      <p className="text-gray-500 mb-8">CDI, CDD et avenants de vos salariés.</p>
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
function Lbl({ children }: { children: React.ReactNode }) { return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>; }

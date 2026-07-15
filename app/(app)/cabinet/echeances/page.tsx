'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock, Plus, Loader2, CheckCircle2, AlertTriangle, Clock as ClockIcon,
  AlertCircle, Pencil,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionCard, DataTable, KpiCard, StatusBadge, DateBlock, Modal, EmptyState, TableSkeleton,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';

interface Deadline {
  id: string;
  client_id: string | null;
  deadline_type: 'bilan' | 'tva' | 'social' | 'fiscal' | 'is' | 'autre';
  description: string;
  deadline_date: string;
  priority: 'urgent' | 'normal' | 'low';
  status: 'pending' | 'done' | 'overdue';
  responsible: string | null;
  notes: string | null;
}

const TYPE_CFG: Record<string, { label: string; dot: string }> = {
  bilan: { label: 'Bilan', dot: '#8b5cf6' },
  tva: { label: 'TVA', dot: '#3b82f6' },
  social: { label: 'Social', dot: '#14b8a6' },
  fiscal: { label: 'Fiscal', dot: '#f59e0b' },
  is: { label: 'IS', dot: '#ec4899' },
  autre: { label: 'Autre', dot: '#9ca3af' },
};
const PRIORITY_DOT: Record<string, string> = { urgent: '#ef4444', normal: '#3b82f6', low: '#9ca3af' };
const PRIORITY_LABEL: Record<string, string> = { urgent: 'Urgent', normal: 'Normal', low: 'Bas' };
const STATUS_TONE: Record<string, 'warning' | 'good' | 'critical'> = { pending: 'warning', done: 'good', overdue: 'critical' };
const STATUS_LABEL: Record<string, string> = { pending: 'À venir', done: 'Traité', overdue: 'En retard' };

const EMPTY = { clientId: '', type: 'tva', date: '', priority: 'normal', description: '', responsible: '' };

export default function CabinetEcheancesPage() {
  const sub = useSubscription();
  const { clients: storeClients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data: deadlines, loading, error, refresh } = useCabinetData<Deadline[]>('/api/cabinet/deadlines');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const clientName = useCallback((id: string | null) => {
    if (!id) return '—';
    const c: any = (storeClients as any[]).find((cl) => cl.id === id);
    if (!c) return '—';
    return c.client_type === 'manual' ? c.company_name || 'Client' : c.profile?.company_name || c.profile?.first_name || 'Client';
  }, [storeClients]);

  const list = deadlines || [];
  const today = new Date().toISOString().slice(0, 10);
  const kpis = useMemo(() => ({
    total: list.length,
    aVenir: list.filter((d) => d.status === 'pending').length,
    enRetard: list.filter((d) => d.status === 'overdue' || (d.status === 'pending' && d.deadline_date < today)).length,
    urgentes: list.filter((d) => d.priority === 'urgent' && d.status !== 'done').length,
  }), [list, today]);

  const open = (d?: Deadline) => {
    setForm(d ? { clientId: d.client_id || '', type: d.deadline_type, date: d.deadline_date, priority: d.priority, description: d.description, responsible: d.responsible || '' } : { ...EMPTY });
    setEditing(d || null);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.type || !form.description || !form.date) {
      toast.error('Type, description et date sont requis');
      return;
    }
    setSaving(true);
    try {
      const body = {
        deadline_type: form.type, description: form.description, deadline_date: form.date,
        priority: form.priority, responsible: form.responsible || null,
        client_id: form.clientId || null,
      };
      if (editing) await cabinetMutation('/api/cabinet/deadlines', 'PATCH', { id: editing.id, ...body });
      else await cabinetMutation('/api/cabinet/deadlines', 'POST', body);
      clearCabinetCache('/api/cabinet/deadlines');
      toast.success(editing ? 'Échéance mise à jour' : 'Échéance créée');
      setShowAdd(false);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (d: Deadline) => {
    try {
      await cabinetMutation('/api/cabinet/deadlines', 'PATCH', { id: d.id, status: 'done' });
      clearCabinetCache('/api/cabinet/deadlines');
      toast.success('Échéance traitée');
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}1a` }}>
          <CalendarClock size={40} style={{ color: primaryColor }} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Échéances fiscales</h1>
        <p className="text-gray-500 mb-8">Pilotez toutes les échéances de vos clients en un coup d&apos;œil.</p>
      </div>
    );
  }

  const columns: Column<Deadline>[] = [
    { key: 'date', header: 'Date', sortValue: (d) => d.deadline_date, sortable: true, render: (d) => <DateBlock date={d.deadline_date} /> },
    { key: 'client', header: 'Client', hideOnMobile: true, sortValue: (d) => clientName(d.client_id), sortable: true, render: (d) => <span className="text-sm text-gray-700 truncate">{clientName(d.client_id)}</span> },
    { key: 'type', header: 'Type', render: (d) => { const cfg = TYPE_CFG[d.deadline_type] || TYPE_CFG.autre; return <StatusBadge dot={cfg.dot} size="sm">{cfg.label}</StatusBadge>; } },
    { key: 'desc', header: 'Description', render: (d) => <span className="text-sm text-gray-900 truncate">{d.description}</span> },
    { key: 'priority', header: 'Priorité', align: 'center', hideOnMobile: true, render: (d) => <StatusBadge dot={PRIORITY_DOT[d.priority]} size="sm">{PRIORITY_LABEL[d.priority]}</StatusBadge> },
    { key: 'status', header: 'Statut', render: (d) => <StatusBadge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusBadge> },
    {
      key: 'actions', header: '', align: 'right',
      render: (d) => (
        <div className="flex items-center justify-end gap-0.5">
          {d.status !== 'done' && (
            <button onClick={() => markDone(d)} title="Marquer traité" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
              <CheckCircle2 size={14} />
            </button>
          )}
          <button onClick={() => open(d)} title="Modifier" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <Pencil size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Échéances" value={String(kpis.total)} icon={CalendarClock} accent={primaryColor} />
        <KpiCard label="À venir" value={String(kpis.aVenir)} icon={ClockIcon} accent="#3b82f6" />
        <KpiCard label="En retard" value={String(kpis.enRetard)} icon={AlertTriangle} accent={kpis.enRetard > 0 ? '#ef4444' : '#6b7280'} />
        <KpiCard label="Urgentes" value={String(kpis.urgentes)} icon={AlertCircle} accent={kpis.urgentes > 0 ? '#f59e0b' : '#6b7280'} />
      </div>

      <SectionCard title={`Échéances fiscales (${list.length})`} icon={CalendarClock} accent={primaryColor} noPadding
        action={<button onClick={() => open()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Nouvelle</span></button>}
      >
        {loading ? <TableSkeleton cols={5} /> : error ? <EmptyState icon={AlertCircle} title="Erreur" description={error} /> : (
          <DataTable
            columns={columns} data={list} getRowId={(d) => d.id}
            searchable searchPlaceholder="Rechercher…"
            searchText={(d) => `${clientName(d.client_id)} ${d.description} ${d.deadline_type}`}
            emptyIcon={CalendarClock} emptyTitle="Aucune échéance" emptyDescription="Ajoutez les échéances fiscales de vos clients."
            initialSort={{ key: 'date', dir: 'asc' }}
          />
        )}
      </SectionCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editing ? 'Modifier l\'échéance' : 'Nouvelle échéance'} icon={CalendarClock} accent={primaryColor}
        footer={<>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{saving ? <Loader2 size={14} className="animate-spin" /> : null} Enregistrer</button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Type *</Lbl><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className={inputCls}>{Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><Lbl>Priorité</Lbl><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className={inputCls}><option value="urgent">Urgent</option><option value="normal">Normal</option><option value="low">Bas</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Date *</Lbl><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></div>
            <div><Lbl>Client</Lbl><select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={inputCls}><option value="">— Cabinet —</option>{(storeClients as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.client_type === 'manual' ? c.company_name : c.profile?.company_name || c.profile?.first_name || 'Client'}</option>)}</select></div>
          </div>
          <div><Lbl>Description *</Lbl><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="TVA CA3 — mai 2026" /></div>
          <div><Lbl>Responsable</Lbl><input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} className={inputCls} placeholder="M. Dupont" /></div>
        </div>
      </Modal>
    </motion.div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
function Lbl({ children }: { children: React.ReactNode }) { return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>; }

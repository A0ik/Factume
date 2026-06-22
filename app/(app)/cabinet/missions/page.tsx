'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Plus, Loader2, FileSignature, Euro, RefreshCw,
  CheckCircle2, AlertCircle, Pencil,
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

interface Mission {
  id: string;
  client_id: string;
  mission_type: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  monthly_fee: number | null;
  status: 'active' | 'signed' | 'expired' | 'to_renew' | 'cancelled';
  responsible: string | null;
}

const TYPE_CFG: Record<string, { label: string; dot: string }> = {
  expertise_comptable: { label: 'Expertise comptable', dot: '#10b981' },
  paie_social: { label: 'Paie & social', dot: '#14b8a6' },
  cac: { label: 'CAC', dot: '#3b82f6' },
  conseil_fiscal: { label: 'Conseil fiscal', dot: '#f59e0b' },
  juridique: { label: 'Juridique', dot: '#8b5cf6' },
  autre: { label: 'Autre', dot: '#9ca3af' },
};
const STATUS_TONE: Record<string, 'good' | 'warning' | 'critical' | 'neutral' | 'info'> = {
  active: 'info', signed: 'good', to_renew: 'warning', expired: 'critical', cancelled: 'neutral',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Active', signed: 'Signée', to_renew: 'À renouveler', expired: 'Expirée', cancelled: 'Annulée',
};

const EMPTY = { clientId: '', type: 'expertise_comptable', startDate: '', endDate: '', monthlyFee: '', responsible: '', description: '' };

export default function CabinetMissionsPage() {
  const sub = useSubscription();
  const { clients: storeClients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data: missions, loading, error, refresh } = useCabinetData<Mission[]>('/api/cabinet/missions');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const clientName = useCallback((id: string) => {
    const c: any = (storeClients as any[]).find((cl) => cl.id === id);
    if (!c) return '—';
    return c.client_type === 'manual' ? c.company_name || 'Client' : c.profile?.company_name || c.profile?.first_name || 'Client';
  }, [storeClients]);

  const list = missions || [];
  const kpis = useMemo(() => ({
    total: list.length,
    actives: list.filter((m) => m.status === 'active' || m.status === 'signed').length,
    toRenew: list.filter((m) => m.status === 'to_renew').length,
    ca: list.reduce((s, m) => s + (m.monthly_fee || 0), 0),
  }), [list]);

  const open = (m?: Mission) => {
    setForm(m ? {
      clientId: m.client_id, type: m.mission_type, startDate: m.start_date,
      endDate: m.end_date || '', monthlyFee: m.monthly_fee ? String(m.monthly_fee) : '',
      responsible: m.responsible || '', description: m.description || '',
    } : { ...EMPTY });
    setEditing(m || null);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.clientId || !form.type || !form.startDate) {
      toast.error('Client, type et date de début sont requis');
      return;
    }
    setSaving(true);
    try {
      const body = {
        client_id: form.clientId, mission_type: form.type, start_date: form.startDate,
        end_date: form.endDate || null, monthly_fee: form.monthlyFee ? parseFloat(form.monthlyFee) : null,
        responsible: form.responsible || null, description: form.description || null,
      };
      if (editing) await cabinetMutation('/api/cabinet/missions', 'PATCH', { id: editing.id, ...body });
      else await cabinetMutation('/api/cabinet/missions', 'POST', body);
      clearCabinetCache('/api/cabinet/missions');
      toast.success(editing ? 'Mission mise à jour' : 'Mission créée');
      setShowAdd(false);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const markSigned = async (m: Mission) => {
    try {
      await cabinetMutation('/api/cabinet/missions', 'PATCH', { id: m.id, status: 'signed', signed_at: new Date().toISOString() });
      clearCabinetCache('/api/cabinet/missions');
      toast.success('Mission marquée comme signée');
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}1a` }}>
          <Target size={40} style={{ color: primaryColor }} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Lettres de mission</h1>
        <p className="text-gray-500 mb-8">Suivez les missions de vos clients et leurs honoraires.</p>
      </div>
    );
  }

  const columns: Column<Mission>[] = [
    { key: 'client', header: 'Client', sortValue: (m) => clientName(m.client_id), sortable: true, render: (m) => <span className="font-semibold text-gray-900 text-sm truncate">{clientName(m.client_id)}</span> },
    { key: 'type', header: 'Type', render: (m) => { const cfg = TYPE_CFG[m.mission_type] || TYPE_CFG.autre; return <StatusBadge dot={cfg.dot} size="sm">{cfg.label}</StatusBadge>; } },
    { key: 'period', header: 'Période', hideOnMobile: true, render: (m) => <span className="text-xs text-gray-500">{formatDateShort(m.start_date)}{m.end_date ? ` → ${formatDateShort(m.end_date)}` : ''}</span> },
    { key: 'fee', header: 'Hono/mois', align: 'right', sortValue: (m) => m.monthly_fee || 0, sortable: true, render: (m) => <span className="text-sm font-bold text-gray-900">{m.monthly_fee ? formatCurrency(m.monthly_fee) : '—'}</span> },
    { key: 'responsible', header: 'Responsable', hideOnMobile: true, render: (m) => <span className="text-xs text-gray-500">{m.responsible || '—'}</span> },
    { key: 'status', header: 'Statut', render: (m) => <StatusBadge tone={STATUS_TONE[m.status] || 'neutral'}>{STATUS_LABEL[m.status] || m.status}</StatusBadge> },
    {
      key: 'actions', header: '', align: 'right',
      render: (m) => (
        <div className="flex items-center justify-end gap-0.5">
          {m.status !== 'signed' && (
            <button onClick={() => markSigned(m)} title="Marquer signée" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
              <FileSignature size={14} />
            </button>
          )}
          <button onClick={() => open(m)} title="Modifier" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <Pencil size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Missions" value={String(kpis.total)} icon={Target} accent={primaryColor} />
        <KpiCard label="Actives / signées" value={String(kpis.actives)} icon={CheckCircle2} accent="#22c55e" />
        <KpiCard label="À renouveler" value={String(kpis.toRenew)} icon={RefreshCw} accent={kpis.toRenew > 0 ? '#f59e0b' : '#6b7280'} />
        <KpiCard label="Honoraires mensuels" value={formatCurrency(kpis.ca)} icon={Euro} accent="#3b82f6" />
      </div>

      <SectionCard title={`Lettres de mission (${list.length})`} icon={Target} accent={primaryColor} noPadding
        action={<button onClick={() => open()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Nouvelle</span></button>}
      >
        {loading ? <TableSkeleton cols={5} /> : error ? <EmptyState icon={AlertCircle} title="Erreur" description={error} /> : (
          <DataTable
            columns={columns} data={list} getRowId={(m) => m.id}
            searchable searchPlaceholder="Rechercher un client…"
            searchText={(m) => `${clientName(m.client_id)} ${m.responsible || ''} ${m.description || ''}`}
            emptyIcon={Target} emptyTitle="Aucune mission" emptyDescription="Renseignez les lettres de mission de vos clients."
            initialSort={{ key: 'fee', dir: 'desc' }}
          />
        )}
      </SectionCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editing ? 'Modifier la mission' : 'Nouvelle mission'} icon={Target} accent={primaryColor}
        footer={<>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{saving ? <Loader2 size={14} className="animate-spin" /> : null} Enregistrer</button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <Lbl>Client *</Lbl>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={inputCls}>
              <option value="">Sélectionner…</option>
              {(storeClients as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.client_type === 'manual' ? c.company_name : c.profile?.company_name || c.profile?.first_name || 'Client'}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Type *</Lbl><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>{Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><Lbl>Honoraires/mois (€)</Lbl><input type="number" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} className={inputCls} placeholder="1500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Début *</Lbl><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} /></div>
            <div><Lbl>Fin</Lbl><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls} /></div>
          </div>
          <div><Lbl>Responsable</Lbl><input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} className={inputCls} placeholder="M. Dupont" /></div>
          <div><Lbl>Description</Lbl><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={cn(inputCls, 'resize-none')} placeholder="Périmètre de la mission…" /></div>
        </div>
      </Modal>
    </motion.div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
function Lbl({ children }: { children: React.ReactNode }) { return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>; }

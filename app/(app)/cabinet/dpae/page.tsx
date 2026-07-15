'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileCheck, Plus, Loader2, Send, CheckCircle2, AlertCircle, Clock, Pencil,
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

interface Dpae {
  id: string;
  client_id: string | null;
  employeur_nom: string;
  employeur_siret: string;
  salarie_nom: string;
  salarie_prenom: string;
  date_embauche: string;
  type_contrat: string;
  poste: string | null;
  salaire_brut: number | null;
  status: 'en_preparation' | 'envoyee' | 'confirmee' | 'rejetee';
}

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'good' | 'critical'> = {
  en_preparation: 'neutral', envoyee: 'info', confirmee: 'good', rejetee: 'critical',
};
const STATUS_LABEL: Record<string, string> = {
  en_preparation: 'En préparation', envoyee: 'Envoyée', confirmee: 'Confirmée', rejetee: 'Rejetée',
};
const TYPES = ['CDI', 'CDD', 'CDD_usage', 'Interim', 'Apprentissage', 'Professionnalisation', 'Stage'];

const EMPTY = { clientId: '', empNom: '', empSiret: '', salNom: '', salPrenom: '', dateEmbauche: '', type: 'CDI', poste: '', salaire: '' };

export default function CabinetDpaePage() {
  const sub = useSubscription();
  const { clients: storeClients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data: dpae, loading, error, refresh } = useCabinetData<Dpae[]>('/api/cabinet/dpae');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const list = dpae || [];
  const kpis = useMemo(() => ({
    total: list.length,
    prep: list.filter((d) => d.status === 'en_preparation').length,
    envoyees: list.filter((d) => d.status === 'envoyee').length,
    confirmees: list.filter((d) => d.status === 'confirmee').length,
  }), [list]);

  const save = async () => {
    if (!form.empNom || !form.empSiret || !form.salNom || !form.salPrenom || !form.dateEmbauche || !form.type) { toast.error('Champs obligatoires manquants'); return; }
    setSaving(true);
    try {
      await cabinetMutation('/api/cabinet/dpae', 'POST', {
        client_id: form.clientId || null, employeur_nom: form.empNom, employeur_siret: form.empSiret,
        salarie_nom: form.salNom, salarie_prenom: form.salPrenom, date_embauche: form.dateEmbauche,
        type_contrat: form.type, poste: form.poste || null, salaire_brut: form.salaire ? parseFloat(form.salaire) : null,
      });
      clearCabinetCache('/api/cabinet/dpae');
      toast.success('DPAE créée');
      setShowAdd(false);
      setForm({ ...EMPTY });
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const mark = async (d: Dpae, status: 'envoyee' | 'confirmee') => {
    try {
      await cabinetMutation('/api/cabinet/dpae', 'PATCH', { id: d.id, status });
      clearCabinetCache('/api/cabinet/dpae');
      toast.success(status === 'envoyee' ? 'DPAE envoyée' : 'DPAE confirmée');
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}1a` }}><FileCheck size={40} style={{ color: primaryColor }} /></div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">DPAE</h1>
        <p className="text-gray-500 mb-8">Déclarations préalables à l&apos;embauche.</p>
      </div>
    );
  }

  const columns: Column<Dpae>[] = [
    { key: 'sal', header: 'Salarié', sortValue: (d) => `${d.salarie_nom} ${d.salarie_prenom}`, sortable: true, render: (d) => <div><p className="font-semibold text-gray-900 text-sm">{d.salarie_prenom} {d.salarie_nom}</p><p className="text-xs text-gray-500">{d.poste || '—'}</p></div> },
    { key: 'emp', header: 'Employeur', hideOnMobile: true, render: (d) => <span className="text-sm text-gray-700 truncate">{d.employeur_nom}</span> },
    { key: 'date', header: 'Embauche', sortValue: (d) => d.date_embauche, sortable: true, render: (d) => <span className="text-sm text-gray-700">{formatDateShort(d.date_embauche)}</span> },
    { key: 'type', header: 'Type', hideOnMobile: true, render: (d) => <StatusBadge tone="info" size="sm">{d.type_contrat.replace('_', ' ')}</StatusBadge> },
    { key: 'status', header: 'Statut', render: (d) => <StatusBadge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</StatusBadge> },
    {
      key: 'actions', header: '', align: 'right',
      render: (d) => (
        <div className="flex items-center justify-end gap-0.5">
          {d.status === 'en_preparation' && <button onClick={() => mark(d, 'envoyee')} title="Marquer envoyée" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Send size={14} /></button>}
          {d.status === 'envoyee' && <button onClick={() => mark(d, 'confirmee')} title="Marquer confirmée" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"><CheckCircle2 size={14} /></button>}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="DPAE" value={String(kpis.total)} icon={FileCheck} accent={primaryColor} />
        <KpiCard label="En préparation" value={String(kpis.prep)} icon={Clock} accent={kpis.prep > 0 ? '#f59e0b' : '#6b7280'} />
        <KpiCard label="Envoyées" value={String(kpis.envoyees)} icon={Send} accent="#3b82f6" />
        <KpiCard label="Confirmées" value={String(kpis.confirmees)} icon={CheckCircle2} accent="#22c55e" />
      </div>

      <SectionCard title={`DPAE (${list.length})`} icon={FileCheck} accent={primaryColor} noPadding
        action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Nouvelle</span></button>}
      >
        {loading ? <TableSkeleton cols={5} /> : error ? <EmptyState icon={AlertCircle} title="Erreur" description={error} /> : (
          <DataTable columns={columns} data={list} getRowId={(d) => d.id} searchable searchPlaceholder="Rechercher…" searchText={(d) => `${d.salarie_nom} ${d.salarie_prenom} ${d.employeur_nom}`} emptyIcon={FileCheck} emptyTitle="Aucune DPAE" emptyDescription="Créez les déclarations préalables à l'embauche." initialSort={{ key: 'date', dir: 'desc' }} />
        )}
      </SectionCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle DPAE" icon={FileCheck} accent={primaryColor} size="lg"
        footer={<>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{saving ? <Loader2 size={14} className="animate-spin" /> : null} Créer</button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Employeur *</Lbl><input value={form.empNom} onChange={(e) => setForm({ ...form, empNom: e.target.value })} className={inputCls} placeholder="Cabinet Dupont" /></div>
            <div><Lbl>SIRET *</Lbl><input value={form.empSiret} onChange={(e) => setForm({ ...form, empSiret: e.target.value })} className={cn(inputCls, 'font-mono')} placeholder="12345678900012" maxLength={14} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Prénom *</Lbl><input value={form.salPrenom} onChange={(e) => setForm({ ...form, salPrenom: e.target.value })} className={inputCls} placeholder="Jean" /></div>
            <div><Lbl>Nom *</Lbl><input value={form.salNom} onChange={(e) => setForm({ ...form, salNom: e.target.value })} className={inputCls} placeholder="Dupont" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Date d'embauche *</Lbl><input type="date" value={form.dateEmbauche} onChange={(e) => setForm({ ...form, dateEmbauche: e.target.value })} className={inputCls} /></div>
            <div><Lbl>Type de contrat *</Lbl><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Poste</Lbl><input value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} className={inputCls} placeholder="Maçon" /></div>
            <div><Lbl>Salaire brut (€)</Lbl><input type="number" value={form.salaire} onChange={(e) => setForm({ ...form, salaire: e.target.value })} className={inputCls} placeholder="2500" /></div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
function Lbl({ children }: { children: React.ReactNode }) { return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>; }

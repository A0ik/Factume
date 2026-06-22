'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Scale, Plus, Loader2, Pencil, Building2, AlertCircle, CheckCircle2, Clock, FileCheck,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionCard, DataTable, KpiCard, StatusBadge, Tabs, Modal, EmptyState, TableSkeleton,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';

interface LegalAct {
  id: string;
  client_id: string | null;
  act_type: string;
  description: string | null;
  act_date: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'filed';
  responsible: string | null;
}

interface Creation {
  id: string;
  company_name: string;
  legal_form: string | null;
  capital: number | null;
  status: 'draft' | 'in_progress' | 'registered' | 'abandoned';
}

const ACT_CFG: Record<string, { label: string; dot: string }> = {
  pv_ag: { label: 'PV d\'AG', dot: '#3b82f6' },
  statuts_modification: { label: 'Modification statuts', dot: '#8b5cf6' },
  nomination: { label: 'Nomination', dot: '#14b8a6' },
  radiation: { label: 'Radiation', dot: '#ef4444' },
  transfert_siege: { label: 'Transfert de siège', dot: '#f59e0b' },
  capital_variation: { label: 'Variation de capital', dot: '#ec4899' },
  dissolution: { label: 'Dissolution', dot: '#6b7280' },
  autre: { label: 'Autre', dot: '#9ca3af' },
};
const ACT_STATUS_TONE: Record<string, 'neutral' | 'info' | 'good' | 'warning'> = {
  pending: 'neutral', in_progress: 'info', done: 'good', filed: 'warning',
};
const ACT_STATUS_LABEL: Record<string, string> = {
  pending: 'À faire', in_progress: 'En cours', done: 'Réalisé', filed: 'Classé',
};
const LEGAL_FORMS = ['SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SNC', 'SCI', 'SELARL'];
const CREATION_STATUS_TONE: Record<string, 'neutral' | 'info' | 'good' | 'critical'> = {
  draft: 'neutral', in_progress: 'info', registered: 'good', abandoned: 'critical',
};
const CREATION_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon', in_progress: 'En cours', registered: 'Immatriculée', abandoned: 'Abandonnée',
};

export default function CabinetJuridiquePage() {
  const sub = useSubscription();
  const { clients: storeClients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const [tab, setTab] = useState<'acts' | 'creations'>('acts');

  const { data: acts, loading: actsLoading, error: actsError, refresh: refreshActs } = useCabinetData<LegalAct[]>(
    tab === 'acts' ? '/api/cabinet/legal' : null,
  );
  const { data: creations, loading: crLoading, error: crError, refresh: refreshCr } = useCabinetData<Creation[]>(
    tab === 'creations' ? '/api/cabinet/legal?tab=creations' : null,
  );

  const [showAddAct, setShowAddAct] = useState(false);
  const [editingAct, setEditingAct] = useState<LegalAct | null>(null);
  const [actForm, setActForm] = useState({ clientId: '', type: 'pv_ag', date: '', description: '', responsible: '' });
  const [savingAct, setSavingAct] = useState(false);

  const [showAddCr, setShowAddCr] = useState(false);
  const [crForm, setCrForm] = useState({ companyName: '', legalForm: 'SAS', capital: '' });
  const [savingCr, setSavingCr] = useState(false);

  const clientName = useCallback((id: string | null) => {
    if (!id) return '— Cabinet —';
    const c: any = (storeClients as any[]).find((cl) => cl.id === id);
    if (!c) return '—';
    return c.client_type === 'manual' ? c.company_name || 'Client' : c.profile?.company_name || c.profile?.first_name || 'Client';
  }, [storeClients]);

  const actsList = acts || [];
  const crList = creations || [];

  const actKpis = useMemo(() => ({
    total: actsList.length,
    enCours: actsList.filter((a) => a.status === 'in_progress').length,
    realises: actsList.filter((a) => a.status === 'done' || a.status === 'filed').length,
    aFaire: actsList.filter((a) => a.status === 'pending').length,
  }), [actsList]);

  const openAct = (a?: LegalAct) => {
    setActForm(a ? { clientId: a.client_id || '', type: a.act_type, date: a.act_date || '', description: a.description || '', responsible: a.responsible || '' } : { clientId: '', type: 'pv_ag', date: '', description: '', responsible: '' });
    setEditingAct(a || null);
    setShowAddAct(true);
  };

  const saveAct = async () => {
    if (!actForm.type) { toast.error('Type requis'); return; }
    setSavingAct(true);
    try {
      const body = { act_type: actForm.type, description: actForm.description || null, act_date: actForm.date || null, responsible: actForm.responsible || null, client_id: actForm.clientId || null };
      if (editingAct) await cabinetMutation('/api/cabinet/legal', 'PATCH', { id: editingAct.id, ...body });
      else await cabinetMutation('/api/cabinet/legal', 'POST', body);
      clearCabinetCache('/api/cabinet/legal');
      toast.success(editingAct ? 'Acte mis à jour' : 'Acte créé');
      setShowAddAct(false);
      await refreshActs();
    } catch (err: any) { toast.error(err.message || 'Erreur'); } finally { setSavingAct(false); }
  };

  const saveCreation = async () => {
    if (!crForm.companyName) { toast.error('Nom de la société requis'); return; }
    setSavingCr(true);
    try {
      await cabinetMutation('/api/cabinet/legal', 'POST', { type: 'creation', company_name: crForm.companyName, legal_form: crForm.legalForm, capital: crForm.capital ? parseFloat(crForm.capital) : null });
      clearCabinetCache('/api/cabinet/legal?tab=creations');
      toast.success('Création ajoutée');
      setShowAddCr(false);
      setCrForm({ companyName: '', legalForm: 'SAS', capital: '' });
      await refreshCr();
    } catch (err: any) { toast.error(err.message || 'Erreur'); } finally { setSavingCr(false); }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}1a` }}>
          <Scale size={40} style={{ color: primaryColor }} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Juridique</h1>
        <p className="text-gray-500 mb-8">Actes, AG, créations de sociétés et registres de vos clients.</p>
      </div>
    );
  }

  const actColumns: Column<LegalAct>[] = [
    { key: 'client', header: 'Client', sortValue: (a) => clientName(a.client_id), sortable: true, hideOnMobile: true, render: (a) => <span className="text-sm text-gray-700 truncate">{clientName(a.client_id)}</span> },
    { key: 'type', header: 'Type', render: (a) => { const cfg = ACT_CFG[a.act_type] || ACT_CFG.autre; return <StatusBadge dot={cfg.dot} size="sm">{cfg.label}</StatusBadge>; } },
    { key: 'date', header: 'Date', sortValue: (a) => a.act_date || '', sortable: true, hideOnMobile: true, render: (a) => <span className="text-xs text-gray-500">{a.act_date ? formatDateShort(a.act_date) : '—'}</span> },
    { key: 'desc', header: 'Description', render: (a) => <span className="text-sm text-gray-900 truncate">{a.description || '—'}</span> },
    { key: 'resp', header: 'Responsable', hideOnMobile: true, render: (a) => <span className="text-xs text-gray-500">{a.responsible || '—'}</span> },
    { key: 'status', header: 'Statut', render: (a) => <StatusBadge tone={ACT_STATUS_TONE[a.status]}>{ACT_STATUS_LABEL[a.status]}</StatusBadge> },
    { key: 'actions', header: '', align: 'right', render: (a) => <button onClick={() => openAct(a)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Pencil size={14} /></button> },
  ];

  const crColumns: Column<Creation>[] = [
    { key: 'name', header: 'Société', sortValue: (c) => c.company_name, sortable: true, render: (c) => <span className="font-semibold text-gray-900 text-sm truncate">{c.company_name}</span> },
    { key: 'form', header: 'Forme', render: (c) => <StatusBadge tone="info" size="sm">{c.legal_form || '—'}</StatusBadge> },
    { key: 'capital', header: 'Capital', align: 'right', hideOnMobile: true, sortValue: (c) => c.capital || 0, sortable: true, render: (c) => <span className="text-sm font-semibold text-gray-700">{c.capital ? formatCurrency(c.capital) : '—'}</span> },
    { key: 'status', header: 'Statut', render: (c) => <StatusBadge tone={CREATION_STATUS_TONE[c.status]}>{CREATION_STATUS_LABEL[c.status]}</StatusBadge> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <Tabs
        active={tab} onChange={(t) => setTab(t as any)} accent={primaryColor}
        tabs={[{ id: 'acts', label: 'Actes & AG', icon: Scale }, { id: 'creations', label: 'Créations', icon: Building2 }]}
      />

      {tab === 'acts' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Actes" value={String(actKpis.total)} icon={Scale} accent={primaryColor} />
            <KpiCard label="À faire" value={String(actKpis.aFaire)} icon={Clock} accent={actKpis.aFaire > 0 ? '#f59e0b' : '#6b7280'} />
            <KpiCard label="En cours" value={String(actKpis.enCours)} icon={AlertCircle} accent="#3b82f6" />
            <KpiCard label="Réalisés" value={String(actKpis.realises)} icon={CheckCircle2} accent="#22c55e" />
          </div>
          <SectionCard title={`Actes & assemblées générales (${actsList.length})`} icon={Scale} accent={primaryColor} noPadding
            action={<button onClick={() => openAct()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Nouvel acte</span></button>}
          >
            {actsLoading ? <TableSkeleton cols={5} /> : actsError ? <EmptyState icon={AlertCircle} title="Erreur" description={actsError} /> : (
              <DataTable columns={actColumns} data={actsList} getRowId={(a) => a.id} searchable searchPlaceholder="Rechercher…" searchText={(a) => `${clientName(a.client_id)} ${a.description || ''} ${a.responsible || ''}`} emptyIcon={Scale} emptyTitle="Aucun acte" emptyDescription="Ajoutez les actes juridiques de vos clients." initialSort={{ key: 'date', dir: 'desc' }} />
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard title={`Créations de sociétés (${crList.length})`} icon={Building2} accent={primaryColor} noPadding
          action={<button onClick={() => setShowAddCr(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Nouvelle</span></button>}
        >
          {crLoading ? <TableSkeleton cols={4} /> : crError ? <EmptyState icon={AlertCircle} title="Erreur" description={crError} /> : (
            <DataTable columns={crColumns} data={crList} getRowId={(c) => c.id} searchable searchPlaceholder="Rechercher…" searchText={(c) => c.company_name} emptyIcon={Building2} emptyTitle="Aucune création" emptyDescription="Suivez les créations de sociétés de vos clients." />
          )}
        </SectionCard>
      )}

      {/* Modale acte */}
      <Modal open={showAddAct} onClose={() => setShowAddAct(false)} title={editingAct ? 'Modifier l\'acte' : 'Nouvel acte'} icon={Scale} accent={primaryColor}
        footer={<>
          <button onClick={() => setShowAddAct(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={saveAct} disabled={savingAct} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{savingAct ? <Loader2 size={14} className="animate-spin" /> : null} Enregistrer</button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Type *</Lbl><select value={actForm.type} onChange={(e) => setActForm({ ...actForm, type: e.target.value })} className={inputCls}>{Object.entries(ACT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><Lbl>Date</Lbl><input type="date" value={actForm.date} onChange={(e) => setActForm({ ...actForm, date: e.target.value })} className={inputCls} /></div>
          </div>
          <div><Lbl>Client</Lbl><select value={actForm.clientId} onChange={(e) => setActForm({ ...actForm, clientId: e.target.value })} className={inputCls}><option value="">— Cabinet —</option>{(storeClients as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.client_type === 'manual' ? c.company_name : c.profile?.company_name || c.profile?.first_name || 'Client'}</option>)}</select></div>
          <div><Lbl>Description</Lbl><textarea value={actForm.description} onChange={(e) => setActForm({ ...actForm, description: e.target.value })} rows={2} className={cn(inputCls, 'resize-none')} placeholder="AGO annuelle, approbation des comptes…" /></div>
          <div><Lbl>Responsable</Lbl><input value={actForm.responsible} onChange={(e) => setActForm({ ...actForm, responsible: e.target.value })} className={inputCls} placeholder="M. Dupont" /></div>
        </div>
      </Modal>

      {/* Modale création */}
      <Modal open={showAddCr} onClose={() => setShowAddCr(false)} title="Nouvelle création de société" icon={Building2} accent={primaryColor}
        footer={<>
          <button onClick={() => setShowAddCr(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={saveCreation} disabled={savingCr} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{savingCr ? <Loader2 size={14} className="animate-spin" /> : null} Créer</button>
        </>}
      >
        <div className="space-y-4">
          <div><Lbl>Nom de la société *</Lbl><input value={crForm.companyName} onChange={(e) => setCrForm({ ...crForm, companyName: e.target.value })} className={inputCls} placeholder="Dupont Consulting SAS" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Forme juridique</Lbl><select value={crForm.legalForm} onChange={(e) => setCrForm({ ...crForm, legalForm: e.target.value })} className={inputCls}>{LEGAL_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
            <div><Lbl>Capital (€)</Lbl><input type="number" value={crForm.capital} onChange={(e) => setCrForm({ ...crForm, capital: e.target.value })} className={inputCls} placeholder="1000" /></div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
function Lbl({ children }: { children: React.ReactNode }) { return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>; }

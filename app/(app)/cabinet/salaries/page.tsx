'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Users, UserPlus, Briefcase, CheckCircle2, Clock, Plus, Loader2, Trash2,
  ChevronRight, FileText, Hash, MapPin, Calendar, Euro, BadgeCheck,
  AlertCircle, Building2,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, formatCurrency, formatDate, downloadXLSX } from '@/lib/utils';
import { toast } from 'sonner';
import {
  SectionCard, DataTable, KpiCard, StatusBadge, Avatar, Modal, EmptyState, TableSkeleton,
} from '@/components/cabinet/ui';
import type { Column } from '@/components/cabinet/ui';

interface Employee {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  gender: 'M.' | 'Mme' | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  social_security_number: string | null;
  address: string | null;
  job_title: string | null;
  contract_type: string;
  salary_brut_monthly: number | null;
  hourly_rate: number | null;
  hours_per_week: number | null;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'suspended' | 'ended';
  notes: string | null;
}

const CONTRACT_TYPES = [
  'CDI', 'CDD', 'CDD_usage', 'Interim', 'Stage', 'Apprentissage', 'Professionnalisation', 'Portage', 'Freelance',
];
const CONTRACT_LABEL: Record<string, string> = {
  CDD_usage: "CDD d'usage", Apprentissage: 'Apprentissage', Professionnalisation: 'Professionnalisation',
};
const CONTRACT_DOT: Record<string, string> = {
  CDI: '#3b82f6', CDD: '#8b5cf6', CDD_usage: '#ec4899', Interim: '#f97316',
  Stage: '#14b8a6', Apprentissage: '#6366f1', Professionnalisation: '#10b981', Portage: '#f59e0b', Freelance: '#6b7280',
};

const NATIONALITIES = ['Française', 'Belge', 'Suisse', 'Allemande', 'Italienne', 'Espagnole', 'Portugaise', 'Britannique', 'Marocaine', 'Algérienne', 'Tunisienne', 'Autre'];

const EMPTY = {
  clientId: '', civilite: 'M.' as 'M.' | 'Mme', nom: '', prenom: '',
  dateNaissance: '', lieuNaissance: '', nationalite: 'Française', nss: '', adresse: '',
  poste: '', typeContrat: 'CDI', salaireBrut: '', tauxHoraire: '', heuresSemaine: '35',
  dateDebut: '', dateFin: '',
};

export default function CabinetSalariesPage() {
  const sub = useSubscription();
  const { clients: storeClients, cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data: employees, loading, error, refresh } = useCabinetData<Employee[]>('/api/cabinet/employees');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Employee | null>(null);

  const clientName = useCallback((id: string) => {
    const c: any = (storeClients as any[]).find((cl) => cl.id === id);
    if (!c) return '—';
    return c.client_type === 'manual' ? c.company_name || 'Client' : c.profile?.company_name || c.profile?.first_name || 'Client';
  }, [storeClients]);

  const list = employees || [];

  const kpis = useMemo(() => ({
    total: list.length,
    actifs: list.filter((e) => e.status === 'active').length,
    suspendus: list.filter((e) => e.status === 'suspended').length,
    cdi: list.filter((e) => e.contract_type === 'CDI').length,
  }), [list]);

  const handleSave = async () => {
    if (!form.clientId || !form.nom.trim() || !form.prenom.trim() || !form.poste.trim() || !form.dateDebut) {
      toast.error('Client, nom, prénom, poste et date de début sont requis');
      return;
    }
    setSaving(true);
    try {
      await cabinetMutation('/api/cabinet/employees', 'POST', {
        client_id: form.clientId,
        first_name: form.prenom.trim(),
        last_name: form.nom.trim(),
        gender: form.civilite,
        birth_date: form.dateNaissance || null,
        birth_place: form.lieuNaissance || null,
        nationality: form.nationalite || null,
        social_security_number: form.nss || null,
        address: form.adresse || null,
        job_title: form.poste.trim(),
        contract_type: form.typeContrat,
        salary_brut_monthly: parseFloat(form.salaireBrut) || null,
        hourly_rate: parseFloat(form.tauxHoraire) || null,
        hours_per_week: parseInt(form.heuresSemaine) || null,
        start_date: form.dateDebut,
        end_date: form.dateFin || null,
      });
      clearCabinetCache('/api/cabinet/employees');
      toast.success('Salarié ajouté');
      setShowAdd(false);
      setForm({ ...EMPTY });
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce salarié ?')) return;
    setDeletingId(id);
    try {
      await cabinetMutation(`/api/cabinet/employees?id=${id}`, 'DELETE');
      clearCabinetCache('/api/cabinet/employees');
      toast.success('Salarié supprimé');
      if (detail?.id === id) setDetail(null);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    if (!list.length) return;
    downloadXLSX(`cabinet-salaries-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: 'Salariés',
        headers: ['Civilité', 'Nom', 'Prénom', 'NSS', 'Poste', 'Contrat', 'Salaire brut', 'Statut', 'Client', 'Début', 'Fin'],
        rows: list.map((e) => [e.gender || '', e.last_name, e.first_name, e.social_security_number || '', e.job_title || '', e.contract_type, e.salary_brut_monthly || 0, e.status, clientName(e.client_id), e.start_date, e.end_date || '']),
      },
    ]);
    toast.success('Export Excel téléchargé');
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#8b5cf61a' }}>
          <Users size={40} className="text-violet-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Dossiers salariés</h1>
        <p className="text-gray-500 mb-8">Gérez les fiches salariés, contrats et documents sociaux de vos clients.</p>
        <Link href="/paywall?plan=business" className="px-8 py-4 rounded-2xl text-white font-bold shadow-lg" style={{ backgroundColor: '#8b5cf6' }}>
          Passer au plan Business
        </Link>
      </div>
    );
  }

  const fullName = (e: Employee) => `${e.first_name} ${e.last_name}`;

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Nom',
      sortValue: (e) => fullName(e),
      sortable: true,
      render: (e) => (
        <button onClick={() => setDetail(e)} className="flex items-center gap-3 text-left min-w-0 group">
          <Avatar name={fullName(e)} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {e.gender ? `${e.gender} ` : ''}{fullName(e)}
            </p>
            <p className="text-xs text-gray-500 truncate">{e.job_title || '—'}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'nss',
      header: 'NSS',
      hideOnMobile: true,
      render: (e) =>
        e.social_security_number ? (
          <span className="text-xs font-mono text-gray-500">{e.social_security_number}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: 'contract',
      header: 'Contrat',
      align: 'center',
      render: (e) => {
        const dot = CONTRACT_DOT[e.contract_type] || '#9ca3af';
        return <StatusBadge dot={dot} size="sm">{CONTRACT_LABEL[e.contract_type] || e.contract_type}</StatusBadge>;
      },
    },
    {
      key: 'salary',
      header: 'Brut/mois',
      align: 'right',
      sortValue: (e) => e.salary_brut_monthly || 0,
      sortable: true,
      hideOnMobile: true,
      render: (e) => <span className="text-sm font-semibold text-gray-700">{e.salary_brut_monthly ? formatCurrency(e.salary_brut_monthly) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (e) => {
        const tone = e.status === 'active' ? 'good' : e.status === 'suspended' ? 'warning' : 'neutral';
        const label = e.status === 'active' ? 'Actif' : e.status === 'suspended' ? 'Suspendu' : 'Terminé';
        return <StatusBadge tone={tone}>{label}</StatusBadge>;
      },
    },
    {
      key: 'client',
      header: 'Client',
      hideOnMobile: true,
      render: (e) => <span className="text-xs text-gray-500 truncate">{clientName(e.client_id)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <div className="flex items-center justify-end gap-0.5">
          <button onClick={() => setDetail(e)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => handleDelete(e.id)} disabled={deletingId === e.id} className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
            {deletingId === e.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total salariés" value={String(kpis.total)} icon={Users} accent="#10b981" />
        <KpiCard label="Actifs" value={String(kpis.actifs)} icon={CheckCircle2} accent="#22c55e" />
        <KpiCard label="Suspendus" value={String(kpis.suspendus)} icon={Clock} accent={kpis.suspendus > 0 ? '#f59e0b' : '#6b7280'} />
        <KpiCard label="En CDI" value={String(kpis.cdi)} icon={Briefcase} accent="#3b82f6" />
      </div>

      <SectionCard
        title={`Salariés (${list.length})`}
        icon={Users}
        accent={primaryColor}
        noPadding
        action={
          <>
            <button onClick={handleExport} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors" title="Exporter Excel">
              <FileText size={16} />
            </button>
            <button onClick={() => { setForm({ ...EMPTY }); setShowAdd(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}>
              <Plus size={14} /><span className="hidden sm:inline">Ajouter</span>
            </button>
          </>
        }
      >
        {loading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Erreur de chargement" description={error} />
        ) : (
          <DataTable
            columns={columns}
            data={list}
            getRowId={(e) => e.id}
            searchable
            searchPlaceholder="Rechercher par nom, prénom, NSS, poste…"
            searchText={(e) => `${e.first_name} ${e.last_name} ${e.social_security_number || ''} ${e.job_title || ''}`}
            emptyIcon={Users}
            emptyTitle="Aucun salarié"
            emptyDescription="Ajoutez les fiches salariés de vos clients pour suivre la paie et les contrats."
            initialSort={{ key: 'name', dir: 'asc' }}
          />
        )}
      </SectionCard>

      {/* Modale ajout */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Ajouter un salarié"
        icon={UserPlus}
        accent={primaryColor}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Enregistrer
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Lbl>Client *</Lbl>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={inputCls}>
              <option value="">Sélectionner un client…</option>
              {(storeClients as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.client_type === 'manual' ? c.company_name : c.profile?.company_name || c.profile?.first_name || 'Client'}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-1">
              <Lbl>Civ.</Lbl>
              <select value={form.civilite} onChange={(e) => setForm({ ...form, civilite: e.target.value as any })} className={inputCls}>
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
              </select>
            </div>
            <div className="col-span-5 sm:col-span-2">
              <Lbl>Nom *</Lbl>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={inputCls} placeholder="Dupont" />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Lbl>Prénom *</Lbl>
              <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className={inputCls} placeholder="Jean" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Lbl>Naissance</Lbl>
              <input type="date" value={form.dateNaissance} onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} className={inputCls} />
            </div>
            <div>
              <Lbl>Lieu</Lbl>
              <input value={form.lieuNaissance} onChange={(e) => setForm({ ...form, lieuNaissance: e.target.value })} className={inputCls} placeholder="Paris" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Lbl>Nationalité</Lbl>
              <select value={form.nationalite} onChange={(e) => setForm({ ...form, nationalite: e.target.value })} className={inputCls}>
                {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Lbl>NSS</Lbl>
              <input value={form.nss} onChange={(e) => setForm({ ...form, nss: e.target.value })} className={cn(inputCls, 'font-mono')} placeholder="1 84 05…" />
            </div>
            <div className="col-span-2">
              <Lbl>Adresse</Lbl>
              <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className={inputCls} placeholder="12 Rue de la République, 75001 Paris" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Lbl>Poste *</Lbl>
              <input value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} className={inputCls} placeholder="Maçon" />
            </div>
            <div>
              <Lbl>Type de contrat</Lbl>
              <select value={form.typeContrat} onChange={(e) => setForm({ ...form, typeContrat: e.target.value })} className={inputCls}>
                {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{CONTRACT_LABEL[c] || c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Lbl>Brut mensuel (€)</Lbl>
              <input type="number" value={form.salaireBrut} onChange={(e) => setForm({ ...form, salaireBrut: e.target.value })} className={inputCls} placeholder="2500" />
            </div>
            <div>
              <Lbl>Taux horaire (€)</Lbl>
              <input type="number" value={form.tauxHoraire} onChange={(e) => setForm({ ...form, tauxHoraire: e.target.value })} className={inputCls} placeholder="16.50" />
            </div>
            <div>
              <Lbl>Heures/sem.</Lbl>
              <input type="number" value={form.heuresSemaine} onChange={(e) => setForm({ ...form, heuresSemaine: e.target.value })} className={inputCls} placeholder="35" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Lbl>Début *</Lbl>
              <input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} className={inputCls} />
            </div>
            <div>
              <Lbl>Fin (si CDD)</Lbl>
              <input type="date" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} className={inputCls} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Modale détail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? fullName(detail) : ''}
        icon={Users}
        accent={primaryColor}
        footer={
          detail && (
            <button onClick={() => handleDelete(detail.id)} className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 mr-auto">
              <Trash2 size={14} /> Supprimer
            </button>
          )
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <Building2 size={16} className="text-gray-400" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client</p>
                <p className="text-sm font-bold text-gray-900">{clientName(detail.client_id)}</p>
              </div>
            </div>
            <InfoBlock title="État civil">
              <Info icon={Calendar} label="Naissance" value={detail.birth_date ? formatDate(detail.birth_date) : '—'} />
              <Info icon={MapPin} label="Lieu" value={detail.birth_place || '—'} />
              <Info icon={BadgeCheck} label="Nationalité" value={detail.nationality || '—'} />
              <Info icon={Hash} label="NSS" value={detail.social_security_number || '—'} mono />
            </InfoBlock>
            {detail.address && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50">
                <MapPin size={14} className="text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-700">{detail.address}</p>
              </div>
            )}
            <InfoBlock title="Contrat">
              <Info icon={Briefcase} label="Poste" value={detail.job_title || '—'} />
              <Info icon={FileText} label="Contrat" value={CONTRACT_LABEL[detail.contract_type] || detail.contract_type} />
              <Info icon={Euro} label="Brut/mois" value={detail.salary_brut_monthly ? formatCurrency(detail.salary_brut_monthly) : '—'} />
              <Info icon={Clock} label="Heures/sem." value={detail.hours_per_week ? `${detail.hours_per_week} h` : '—'} />
              <Info icon={Calendar} label="Début" value={formatDate(detail.start_date)} />
              <Info icon={Calendar} label="Fin" value={detail.end_date ? formatDate(detail.end_date) : '—'} />
            </InfoBlock>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40';

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>;
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Info({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50">
      <Icon size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={cn('text-sm text-gray-900 font-medium truncate', mono && 'font-mono')}>{value}</p>
      </div>
    </div>
  );
}

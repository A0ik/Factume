'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, Plus, Loader2, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, FileCheck, Clock, AlertCircle,
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

interface Bulletin {
  id: string;
  employee_id: string;
  mois: number;
  annee: number;
  salaire_brut: number;
  salaire_net: number | null;
  net_imposable: number | null;
  cout_employeur: number | null;
  status: 'brouillon' | 'valide' | 'paye';
}

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const STATUS_TONE: Record<string, 'neutral' | 'info' | 'good'> = { brouillon: 'neutral', valide: 'info', paye: 'good' };
const STATUS_LABEL: Record<string, string> = { brouillon: 'Brouillon', valide: 'Validé', paye: 'Payé' };

export default function CabinetPaiePage() {
  const sub = useSubscription();
  const { cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  useEffect(() => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth() + 1); }, []);
  const ready = year !== null && month !== null;

  const { data: bulletins, loading, error, refresh } = useCabinetData<Bulletin[]>(
    ready ? '/api/cabinet/payroll' : null,
    { params: { mois: String(month), annee: String(year) } },
  );
  const { data: employees } = useCabinetData<any[]>('/api/cabinet/employees');

  const [showAdd, setShowAdd] = useState(false);
  const [empId, setEmpId] = useState('');
  const [salaire, setSalaire] = useState('');
  const [saving, setSaving] = useState(false);

  const empName = useCallback((id: string) => {
    const e: any = (employees || []).find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : '—';
  }, [employees]);

  const list = bulletins || [];
  const kpis = useMemo(() => ({
    total: list.length,
    brut: list.reduce((s, b) => s + (b.salaire_brut || 0), 0),
    net: list.reduce((s, b) => s + (b.salaire_net || 0), 0),
    cout: list.reduce((s, b) => s + (b.cout_employeur || 0), 0),
  }), [list]);

  const goPrev = () => { if (month === 1) { setMonth(12); setYear((y) => (y || 0) - 1); } else setMonth((m) => (m || 1) - 1); };
  const goNext = () => { if (month === 12) { setMonth(1); setYear((y) => (y || 0) + 1); } else setMonth((m) => (m || 1) + 1); };

  const save = async () => {
    if (!empId || !salaire) { toast.error('Salarié et salaire brut requis'); return; }
    setSaving(true);
    try {
      await cabinetMutation('/api/cabinet/payroll', 'POST', { employee_id: empId, mois: month, annee: year, salaire_brut: parseFloat(salaire) });
      clearCabinetCache(`/api/cabinet/payroll?mois=${month}&annee=${year}`);
      toast.success('Bulletin généré');
      setShowAdd(false);
      setEmpId('');
      setSalaire('');
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const mark = async (b: Bulletin, status: 'valide' | 'paye') => {
    try {
      await cabinetMutation('/api/cabinet/payroll', 'PATCH', { id: b.id, status });
      clearCabinetCache(`/api/cabinet/payroll?mois=${month}&annee=${year}`);
      toast.success(status === 'valide' ? 'Bulletin validé' : 'Bulletin marqué payé');
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}1a` }}><Wallet size={40} style={{ color: primaryColor }} /></div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Paie</h1>
        <p className="text-gray-500 mb-8">Bulletins de salaire de vos clients.</p>
      </div>
    );
  }

  const columns: Column<Bulletin>[] = [
    { key: 'emp', header: 'Salarié', sortValue: (b) => empName(b.employee_id), sortable: true, render: (b) => <span className="font-semibold text-gray-900 text-sm truncate">{empName(b.employee_id)}</span> },
    { key: 'brut', header: 'Brut', align: 'right', sortValue: (b) => b.salaire_brut, sortable: true, render: (b) => <span className="text-sm font-semibold text-gray-900">{formatCurrency(b.salaire_brut)}</span> },
    { key: 'net', header: 'Net', align: 'right', sortValue: (b) => b.salaire_net || 0, sortable: true, hideOnMobile: true, render: (b) => <span className="text-sm text-gray-700">{b.salaire_net ? formatCurrency(b.salaire_net) : '—'}</span> },
    { key: 'cout', header: 'Coût employeur', align: 'right', hideOnMobile: true, render: (b) => <span className="text-sm text-gray-500">{b.cout_employeur ? formatCurrency(b.cout_employeur) : '—'}</span> },
    { key: 'status', header: 'Statut', render: (b) => <StatusBadge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</StatusBadge> },
    {
      key: 'actions', header: '', align: 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-0.5">
          {b.status === 'brouillon' && <button onClick={() => mark(b, 'valide')} title="Valider" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><FileCheck size={14} /></button>}
          {b.status !== 'paye' && <button onClick={() => mark(b, 'paye')} title="Marquer payé" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"><CheckCircle2 size={14} /></button>}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm">
            <CalendarDays size={15} style={{ color: primaryColor }} />
            <span className="font-bold text-gray-900 text-sm">{month ? MONTHS_FR[month - 1] : ''} {year}</span>
          </div>
          <button onClick={goNext} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Bulletins" value={String(kpis.total)} icon={FileCheck} accent={primaryColor} />
        <KpiCard label="Brut total" value={formatCurrency(kpis.brut)} icon={Wallet} accent="#10b981" />
        <KpiCard label="Net total" value={formatCurrency(kpis.net)} icon={Wallet} accent="#3b82f6" />
        <KpiCard label="Coût employeur" value={formatCurrency(kpis.cout)} icon={Wallet} accent="#f59e0b" />
      </div>

      <SectionCard title={`Bulletins de paie — ${month ? MONTHS_FR[month - 1] : ''} ${year}`} icon={Wallet} accent={primaryColor} noPadding
        action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Générer</span></button>}
      >
        {loading ? <TableSkeleton cols={4} /> : error ? <EmptyState icon={AlertCircle} title="Erreur" description={error} /> : (
          <DataTable columns={columns} data={list} getRowId={(b) => b.id} searchable searchPlaceholder="Rechercher…" searchText={(b) => empName(b.employee_id)} emptyIcon={Wallet} emptyTitle="Aucun bulletin" emptyDescription="Générez les bulletins de salaire du mois." />
        )}
      </SectionCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Générer un bulletin" icon={Wallet} accent={primaryColor}
        footer={<>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{saving ? <Loader2 size={14} className="animate-spin" /> : null} Générer</button>
        </>}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Bulletin pour <span className="font-semibold text-gray-900">{month ? MONTHS_FR[month - 1] : ''} {year}</span>. Les cotisations sont calculées automatiquement.</p>
          <div>
            <Lbl>Salarié *</Lbl>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)} className={inputCls}>
              <option value="">Sélectionner…</option>
              {(employees || []).map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div><Lbl>Salaire brut du mois (€) *</Lbl><input type="number" value={salaire} onChange={(e) => setSalaire(e.target.value)} className={inputCls} placeholder="2500" /></div>
        </div>
      </Modal>
    </motion.div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
function Lbl({ children }: { children: React.ReactNode }) { return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>; }

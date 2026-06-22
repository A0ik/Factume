'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, Loader2, Trash2, MapPin, Clock, Tag, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useCabinetData } from '@/hooks/useCabinetData';
import { cabinetMutation, clearCabinetCache } from '@/hooks/useCabinetFetch';
import { cn, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import { SectionCard, KpiCard, StatusBadge, Modal, EmptyState, DateBlock } from '@/components/cabinet/ui';

interface AgendaEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  type: string;
  client_name: string | null;
  location: string | null;
  completed: boolean;
}

const TYPE_CFG: Record<string, { label: string; dot: string }> = {
  rdv_client: { label: 'RDV client', dot: '#14b8a6' },
  reunion: { label: 'Réunion', dot: '#3b82f6' },
  echeance: { label: 'Échéance', dot: '#f59e0b' },
  rappel: { label: 'Rappel', dot: '#ef4444' },
  formation: { label: 'Formation', dot: '#8b5cf6' },
  autre: { label: 'Autre', dot: '#9ca3af' },
};
const TYPES = Object.keys(TYPE_CFG);

const EMPTY = { title: '', date: '', time: '', type: 'rdv_client', clientName: '', location: '', description: '' };

export default function CabinetAgendaPage() {
  const sub = useSubscription();
  const { cabinet } = useCabinetStore();
  const primaryColor = cabinet?.primary_color || '#10b981';

  const { data: events, loading, error, refresh } = useCabinetData<AgendaEvent[]>('/api/cabinet/agenda');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const list = events || [];
  const today = new Date().toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of list) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  const upcoming = grouped.filter(([d]) => d >= today);
  const past = grouped.filter(([d]) => d < today).reverse();

  const kpis = useMemo(() => ({
    total: list.length,
    aVenir: list.filter((e) => !e.completed && e.date >= today).length,
    aujourd: list.filter((e) => e.date === today).length,
    faits: list.filter((e) => e.completed).length,
  }), [list, today]);

  const save = async () => {
    if (!form.title || !form.date) { toast.error('Titre et date requis'); return; }
    setSaving(true);
    try {
      await cabinetMutation('/api/cabinet/agenda', 'POST', { title: form.title, date: form.date, time: form.time || null, type: form.type, clientName: form.clientName || null, location: form.location || null, description: form.description || null });
      clearCabinetCache('/api/cabinet/agenda');
      toast.success('Événement créé');
      setShowAdd(false);
      setForm({ ...EMPTY });
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const toggle = async (e: AgendaEvent) => {
    try {
      await cabinetMutation('/api/cabinet/agenda', 'PUT', { id: e.id, completed: !e.completed });
      clearCabinetCache('/api/cabinet/agenda');
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await cabinetMutation(`/api/cabinet/agenda?id=${id}`, 'DELETE');
      clearCabinetCache('/api/cabinet/agenda');
      toast.success('Événement supprimé');
      await refresh();
    } catch (err: any) { toast.error(err.message || 'Erreur'); } finally { setDeletingId(null); }
  };

  if (!sub.isBusiness && !sub.isTrialActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}1a` }}><Calendar size={40} style={{ color: primaryColor }} /></div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Agenda</h1>
        <p className="text-gray-500 mb-8">Rendez-vous et événements du cabinet.</p>
      </div>
    );
  }

  const renderGroup = ([date, items]: [string, AgendaEvent[]]) => (
    <div key={date} className="space-y-2">
      <div className="flex items-center gap-2 sticky top-16 bg-white/80 backdrop-blur py-1 z-10">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{formatDateShort(date)}</span>
        {date === today && <StatusBadge tone="info" size="sm">Aujourd&apos;hui</StatusBadge>}
      </div>
      <AnimatePresence>
        {items.map((e) => {
          const cfg = TYPE_CFG[e.type] || TYPE_CFG.autre;
          return (
            <motion.div key={e.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={cn('flex items-start gap-3 p-3 rounded-xl border bg-white transition-colors', e.completed ? 'border-gray-100 opacity-60' : 'border-gray-200')}
            >
              <button onClick={() => toggle(e)} className="mt-0.5 flex-shrink-0">
                <CheckCircle2 size={18} className={e.completed ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn('text-sm font-semibold', e.completed ? 'text-gray-400 line-through' : 'text-gray-900')}>{e.title}</p>
                  <StatusBadge dot={cfg.dot} size="sm">{cfg.label}</StatusBadge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  {e.time && <span className="inline-flex items-center gap-1"><Clock size={11} />{e.time.slice(0, 5)}</span>}
                  {e.client_name && <span className="truncate">{e.client_name}</span>}
                  {e.location && <span className="inline-flex items-center gap-1 truncate"><MapPin size={11} />{e.location}</span>}
                </div>
                {e.description && <p className="text-xs text-gray-500 mt-1">{e.description}</p>}
              </div>
              <button onClick={() => remove(e.id)} disabled={deletingId === e.id} className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                {deletingId === e.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Événements" value={String(kpis.total)} icon={Calendar} accent={primaryColor} />
        <KpiCard label="À venir" value={String(kpis.aVenir)} icon={Clock} accent="#3b82f6" />
        <KpiCard label="Aujourd'hui" value={String(kpis.aujourd)} icon={Tag} accent={kpis.aujourd > 0 ? '#f59e0b' : '#6b7280'} />
        <KpiCard label="Terminés" value={String(kpis.faits)} icon={CheckCircle2} accent="#22c55e" />
      </div>

      <SectionCard title="Agenda" icon={Calendar} accent={primaryColor}
        action={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: primaryColor }}><Plus size={14} /><span className="hidden sm:inline">Nouveau</span></button>}
      >
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 size={22} className="text-gray-400 animate-spin" /></div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Erreur" description={error} />
        ) : list.length === 0 ? (
          <EmptyState icon={Calendar} title="Aucun événement" description="Planifiez vos rendez-vous et échéances." />
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && <div className="space-y-3">{upcoming.map(renderGroup)}</div>}
            {past.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs font-bold text-gray-400 uppercase tracking-wider select-none">Passés ({past.length})</summary>
                <div className="space-y-3 mt-3">{past.map(renderGroup)}</div>
              </details>
            )}
          </div>
        )}
      </SectionCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvel événement" icon={Calendar} accent={primaryColor}
        footer={<>
          <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Annuler</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: primaryColor }}>{saving ? <Loader2 size={14} className="animate-spin" /> : null} Créer</button>
        </>}
      >
        <div className="space-y-4">
          <div><Lbl>Titre *</Lbl><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="RDV signature bilan" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Date *</Lbl><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></div>
            <div><Lbl>Heure</Lbl><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Type</Lbl><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_CFG[t].label}</option>)}</select></div>
            <div><Lbl>Client</Lbl><input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className={inputCls} placeholder="Nom du client" /></div>
          </div>
          <div><Lbl>Lieu</Lbl><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} placeholder="Cabinet / Visio" /></div>
          <div><Lbl>Description</Lbl><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={cn(inputCls, 'resize-none')} /></div>
        </div>
      </Modal>
    </motion.div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
function Lbl({ children }: { children: React.ReactNode }) { return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>; }

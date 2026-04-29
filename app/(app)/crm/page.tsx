'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useCrmStore, Opportunity, OpportunityInput, OpportunityStage, OpportunityPriority, CrmTask } from '@/stores/crmStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import {
  Plus, Kanban, List, Search, X, Trophy, Target, Percent, Flame,
  GripVertical, CheckSquare, Square, Trash2, ChevronRight, Edit2,
  TrendingUp, Calendar, Mail, Phone, User, Tag, ArrowRight,
  MessageSquare, Clock, Star, Filter, BarChart3, CheckCircle2,
  Circle, AlertCircle, Zap, ExternalLink, MoreHorizontal, ChevronDown,
  LayoutGrid, ArrowUpDown, Download, RefreshCw, Maximize2, Minimize2,
  Video, Link2, FileText, Building2, MapPin, Copy, Eye, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';

// ── Constants ───────────────────────────────────────────────────────────────

const STAGES: {
  key: OpportunityStage; label: string; icon: any;
  color: string; bg: string; border: string; bar: string;
  prob: number;
}[] = [
  { key:'prospect',    label:'Prospect',    icon:Target,     color:'text-slate-600',   bg:'bg-slate-50',   border:'border-slate-200', bar:'bg-slate-400',   prob:10  },
  { key:'qualified',   label:'Qualifié',    icon:CheckCircle2,color:'text-blue-600',    bg:'bg-blue-50',    border:'border-blue-200',  bar:'bg-blue-500',    prob:25  },
  { key:'proposal',    label:'Proposition', icon:FileText,    color:'text-violet-600',  bg:'bg-violet-50',  border:'border-violet-200',bar:'bg-violet-500',  prob:50  },
  { key:'negotiation', label:'Négociation', icon:MessageSquare,color:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200', bar:'bg-amber-500',   prob:75  },
  { key:'won',         label:'Gagné',       icon:Trophy,      color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200',bar:'bg-emerald-500', prob:100 },
  { key:'lost',        label:'Perdu',       icon:X,           color:'text-red-600',     bg:'bg-red-50',     border:'border-red-200',   bar:'bg-red-400',     prob:0   },
];

const PRIORITIES: { key: OpportunityPriority; label: string; color: string; dot: string; icon: any; bg: string }[] = [
  { key:'low',    label:'Faible',  color:'text-gray-400',  dot:'bg-gray-300',  icon:ArrowDown, bg:'bg-gray-50' },
  { key:'medium', label:'Moyen',   color:'text-blue-500',  dot:'bg-blue-400',  icon:Minus,     bg:'bg-blue-50' },
  { key:'high',   label:'Élevé',   color:'text-orange-500',dot:'bg-orange-400',icon:ArrowUp,   bg:'bg-orange-50' },
  { key:'urgent', label:'Urgent',  color:'text-red-500',   dot:'bg-red-500',   icon:Zap,        bg:'bg-red-50' },
];

const SOURCES = ['Inbound', 'Referral', 'LinkedIn', 'Cold outreach', 'Site web', 'Salon', 'Autre'];

const EMPTY_FORM: Partial<OpportunityInput> = {
  client_name:'', title:'', value:0, stage:'prospect', probability:10,
  priority:'medium', notes:'', contact_name:'', contact_email:'',
  contact_phone:'', source:'', expected_close_date:'',
};

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function stageOf(key: OpportunityStage) { return STAGES.find(s => s.key === key)!; }
function priorityOf(key: OpportunityPriority) { return PRIORITIES.find(p => p.key === key)!; }

function PriorityBadge({ priority }: { priority: OpportunityPriority }) {
  const p = priorityOf(priority);
  const Icon = p.icon;
  return (
    <span className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg', p.color, p.bg.replace('bg-', 'bg-opacity-10 '))}>
      <Icon size={10} strokeWidth={2.5} className={p.color} />
      {p.label}
    </span>
  );
}

function ProbBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width:`${value}%` }} />
      </div>
      <span className="text-[10px] font-bold text-gray-400 tabular-nums w-6 text-right">{value}%</span>
    </div>
  );
}

function CloseDateChip({ date }: { date?: string | null }) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const overdue = diff < 0;
  const soon = diff >= 0 && diff <= 7;
  return (
    <span className={cn(
      'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
      overdue ? 'bg-red-50 text-red-600' : soon ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500',
    )}>
      <Calendar size={9} />
      {overdue ? `${Math.abs(diff)}j en retard` : diff === 0 ? "Aujourd'hui" : `${diff}j`}
    </span>
  );
}

// ── Kanban card ───────────────────────────────────────────────────────────────

function KanbanCard({ opp, taskCount, doneCount, onSelect, onDragStart }: {
  opp: Opportunity; taskCount: number; doneCount: number;
  onSelect: () => void; onDragStart: () => void;
}) {
  const s = stageOf(opp.stage);
  const allDone = taskCount > 0 && doneCount === taskCount;
  return (
    <motion.div
      layout
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, scale:0.95 }}
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-white/10 p-4 cursor-pointer hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 group select-none overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={12} className="text-gray-400 flex-shrink-0" />
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">{opp.client_name}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{opp.title}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <GripVertical size={12} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(opp.value)}</p>
          <div className={cn('px-2 py-1 rounded-lg text-[10px] font-bold border', s.bg, s.color, s.border)}>
            {s.prob}%
          </div>
        </div>

        <ProbBar value={opp.probability} color={s.bar} />

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
          <PriorityBadge priority={opp.priority} />
          <CloseDateChip date={opp.expected_close_date} />
        </div>

        {taskCount > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
            {allDone
              ? <CheckCircle2 size={11} className="text-emerald-500" />
              : <Circle size={11} className="text-gray-300 dark:text-gray-600" />
            }
            <span className={cn('text-[10px] font-semibold', allDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500')}>
              {doneCount}/{taskCount} tâches
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Deal detail panel ─────────────────────────────────────────────────────────

function DetailPanel({ opp, onClose, onEdit }: { opp: Opportunity; onClose: () => void; onEdit: () => void }) {
  const { tasks, activities, fetchTasks, fetchActivities, addTask, toggleTask, deleteTask, addActivity, updateOpportunity } = useCrmStore();
  const s = stageOf(opp.stage);
  const oppTasks: CrmTask[]     = tasks[opp.id]      || [];
  const oppActivities           = activities[opp.id] || [];
  const [newTask, setNewTask]   = useState('');
  const [newNote, setNewNote]   = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetchTasks(opp.id);
    fetchActivities(opp.id);
  }, [opp.id]);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    setAddingTask(true);
    try { await addTask(opp.id, newTask.trim()); setNewTask(''); }
    catch (e: any) { toast.error(e.message); }
    finally { setAddingTask(false); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try { await addActivity(opp.id, 'note', newNote.trim()); setNewNote(''); }
    finally { setAddingNote(false); }
  };

  const handleQuickStage = async (stage: OpportunityStage) => {
    const prob = STAGES.find(s => s.key === stage)!.prob;
    const label = stage === 'won' ? 'Marqué comme Gagné' : stage === 'lost' ? 'Marqué comme Perdu' : `→ ${stageOf(stage).label}`;
    await updateOpportunity(opp.id, { stage, probability: prob }, label);
    toast.success(label);
  };

  const doneTasks  = oppTasks.filter(t => t.done).length;
  const taskPct    = oppTasks.length > 0 ? (doneTasks / oppTasks.length) * 100 : 0;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white border-l border-gray-100 shadow-2xl z-40 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/10 flex-shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
        <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', s.bg)}>
          <s.icon size={18} className={s.color} strokeWidth={2.5} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{opp.client_name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{opp.title}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
            <Edit2 size={15} />
          </button>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Value + probability */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 text-white rounded-2xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valeur</p>
            <p className="text-xl font-black">{formatCurrency(opp.value)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Attendue : {formatCurrency(opp.value * opp.probability / 100)}
            </p>
          </div>
          <div className={cn('rounded-2xl p-4', s.bg)}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', s.color)}>Étape</p>
            <p className={cn('text-base font-black flex items-center gap-1.5', s.color)}>
              <s.icon size={16} strokeWidth={2.5} />
              {s.label}
            </p>
            <ProbBar value={opp.probability} color={s.bar} />
          </div>
        </div>

        {/* Quick actions */}
        {opp.stage !== 'won' && opp.stage !== 'lost' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickStage('won')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold transition-colors"
            >
              <Trophy size={14} /> Gagné
            </button>
            <button
              onClick={() => handleQuickStage('lost')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold transition-colors"
            >
              <X size={14} /> Perdu
            </button>
          </div>
        )}

        {/* Stage pipeline */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pipeline</p>
          <div className="flex gap-1">
            {STAGES.filter(s => s.key !== 'lost').map((stage) => {
              const isActive = opp.stage === stage.key;
              const isPast   = STAGES.findIndex(s => s.key === opp.stage) > STAGES.findIndex(s => s.key === stage.key);
              return (
                <button
                  key={stage.key}
                  onClick={() => handleQuickStage(stage.key)}
                  title={stage.label}
                  className={cn(
                    'flex-1 h-2 rounded-full transition-all duration-300',
                    isActive ? stage.bar : isPast ? 'bg-primary/40' : 'bg-gray-100 hover:bg-gray-200',
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2.5">
          {[
            opp.contact_name  && { icon: User,    label: opp.contact_name },
            opp.contact_email && { icon: Mail,    label: opp.contact_email, href: `mailto:${opp.contact_email}` },
            opp.contact_phone && { icon: Phone,   label: opp.contact_phone, href: `tel:${opp.contact_phone}` },
            opp.source        && { icon: Tag,     label: opp.source },
            opp.expected_close_date && { icon: Calendar, label: new Date(opp.expected_close_date).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) },
          ].filter(Boolean).map((item: any, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <item.icon size={13} className="text-gray-400" />
              </span>
              {item.href
                ? <a href={item.href} className="text-sm text-primary hover:underline truncate">{item.label}</a>
                : <span className="text-sm text-gray-700 truncate">{item.label}</span>
              }
            </div>
          ))}
          <div className="flex items-center gap-2">
            <PriorityBadge priority={opp.priority} />
            <CloseDateChip date={opp.expected_close_date} />
          </div>
        </div>

        {opp.notes && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{opp.notes}</p>
          </div>
        )}

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tâches</p>
            {oppTasks.length > 0 && (
              <span className="text-[11px] text-gray-400 font-semibold">{doneTasks}/{oppTasks.length}</span>
            )}
          </div>
          {oppTasks.length > 0 && (
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width:`${taskPct}%` }} />
            </div>
          )}
          <div className="space-y-1.5">
            {oppTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 group transition-colors">
                <button onClick={() => toggleTask(task)} className="flex-shrink-0">
                  {task.done
                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                    : <Circle size={16} className="text-gray-300 hover:text-primary transition-colors" />
                  }
                </button>
                <span className={cn('flex-1 text-sm', task.done && 'line-through text-gray-300')}>{task.title}</span>
                <button onClick={() => deleteTask(task)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
              placeholder="Ajouter une tâche..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTask.trim() || addingTask}
              className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Activity feed */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Activité</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }}
              placeholder="Ajouter une note..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || addingNote}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors disabled:opacity-40"
            >
              <MessageSquare size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {oppActivities.length === 0
              ? <p className="text-sm text-gray-300 text-center py-4">Aucune activité pour l'instant</p>
              : oppActivities.map((act) => (
                <div key={act.id} className="flex gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {act.type === 'note'         ? <MessageSquare size={10} className="text-gray-400" />
                    : act.type === 'stage_change' ? <ArrowRight size={10} className="text-primary" />
                    : act.type === 'task'         ? <CheckSquare size={10} className="text-emerald-500" />
                    : <Mail size={10} className="text-blue-400" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{act.content}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(act.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const { opportunities, tasks, fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchTasks } = useCrmStore();
  const { clients } = useDataStore();
  const { user } = useAuthStore();

  const [view,         setView]        = useState<'kanban'|'list'>('kanban');
  const [search,       setSearch]      = useState('');
  const [filterStage,  setFilterStage] = useState<OpportunityStage|'all'>('all');
  const [showModal,    setShowModal]   = useState(false);
  const [editOpp,      setEditOpp]     = useState<Opportunity|null>(null);
  const [selectedOpp,  setSelectedOpp] = useState<Opportunity|null>(null);
  const [loading,      setLoading]     = useState(false);
  const [dragOverStage,setDragOver]    = useState<OpportunityStage|null>(null);
  const [form,         setForm]        = useState<Partial<OpportunityInput>>(EMPTY_FORM);
  const dragId = useRef<string|null>(null);

  useEffect(() => {
    if (user) {
      fetchOpportunities();
    }
  }, [user]);

  // Pre-fetch tasks for all opportunities
  useEffect(() => {
    opportunities.forEach(o => { if (!tasks[o.id]) fetchTasks(o.id); });
  }, [opportunities]);

  // Refresh selected opp from store
  useEffect(() => {
    if (selectedOpp) {
      const fresh = opportunities.find(o => o.id === selectedOpp.id);
      if (fresh) setSelectedOpp(fresh);
    }
  }, [opportunities]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditOpp(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };
  const openEdit = (opp: Opportunity) => {
    setEditOpp(opp);
    setForm({
      client_name: opp.client_name, title: opp.title, value: opp.value,
      stage: opp.stage, probability: opp.probability, priority: opp.priority,
      notes: opp.notes || '', contact_name: opp.contact_name || '',
      contact_email: opp.contact_email || '', contact_phone: opp.contact_phone || '',
      source: opp.source || '', expected_close_date: opp.expected_close_date || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name?.trim() || !form.title?.trim()) { toast.error('Nom client et titre requis'); return; }
    setLoading(true);
    try {
      if (editOpp) {
        await updateOpportunity(editOpp.id, form as Partial<OpportunityInput>);
        toast.success('Deal mis à jour');
      } else {
        await createOpportunity(form as OpportunityInput);
        toast.success('Deal créé !');
      }
      setShowModal(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleDrop = async (newStage: OpportunityStage) => {
    const id = dragId.current;
    setDragOver(null);
    if (!id) return;
    const opp = opportunities.find(o => o.id === id);
    if (!opp || opp.stage === newStage) return;
    const prob = STAGES.find(s => s.key === newStage)!.prob;
    await updateOpportunity(id, { stage: newStage, probability: prob },
      `→ ${stageOf(newStage).label}`);
    toast.success(`Déplacé vers ${stageOf(newStage).label}`);
  };

  const handleDelete = async (opp: Opportunity) => {
    toast(`Supprimer ce deal ?`, {
      description: `${opp.client_name} — ${opp.title}`,
      action: {
        label: 'Supprimer',
        onClick: async () => {
          try { await deleteOpportunity(opp.id); if (selectedOpp?.id === opp.id) setSelectedOpp(null); toast.success('Deal supprimé'); }
          catch (e: any) { toast.error(e.message); }
        },
      },
    });
  };

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filtered = opportunities.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.client_name.toLowerCase().includes(q) || o.title.toLowerCase().includes(q);
    const matchStage  = filterStage === 'all' || o.stage === filterStage;
    return matchSearch && matchStage;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const pipeline   = opportunities.filter(o => o.stage !== 'lost').reduce((s, o) => s + o.value * o.probability / 100, 0);
  const wonRev     = opportunities.filter(o => o.stage === 'won').reduce((s, o) => s + o.value, 0);
  const wonCount   = opportunities.filter(o => o.stage === 'won').length;
  const lostCount  = opportunities.filter(o => o.stage === 'lost').length;
  const winRate    = wonCount + lostCount > 0 ? Math.round(wonCount / (wonCount + lostCount) * 100) : 0;
  const hotValue   = opportunities.filter(o => o.stage === 'negotiation').reduce((s, o) => s + o.value, 0);
  const hotCount   = opportunities.filter(o => o.stage === 'negotiation').length;
  const avgDeal    = wonCount > 0 ? wonRev / wonCount : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Pipeline CRM</h1>
          <p className="text-sm text-gray-400 mt-1">
            {opportunities.length} deal{opportunities.length !== 1 ? 's' : ''} · {formatCurrency(pipeline)} pipeline pondéré
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => setView('kanban')}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
                view === 'kanban' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900')}
            >
              <Kanban size={14} /> Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
                view === 'list' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900')}
            >
              <List size={14} /> Liste
            </button>
          </div>
          <Button icon={<Plus size={15} />} onClick={openCreate}>Nouveau deal</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Pipeline pondéré', value: formatCurrency(pipeline), sub:`${opportunities.filter(o=>o.stage!=='lost'&&o.stage!=='won').length} actifs`, icon: BarChart3, dark: true },
          { label:'Revenue gagné',    value: formatCurrency(wonRev),   sub:`${wonCount} deal${wonCount!==1?'s':''} closé${wonCount!==1?'s':''}`, icon: Trophy, green: true },
          { label:'Taux de conversion',value:`${winRate}%`,            sub:`${wonCount} gagnés / ${lostCount} perdus`, icon: Percent, bar: winRate },
          { label:'Deals chauds',     value: formatCurrency(hotValue), sub:`${hotCount} en négociation`, icon: Flame, amber: true },
        ].map(({ label, value, sub, icon: Icon, dark, green, amber, bar }) => (
          <div key={label} className={cn('rounded-2xl p-4 border', dark ? 'bg-gray-900 text-white border-gray-800' : green ? 'bg-primary text-white border-primary-dark' : amber ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100')}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', dark ? 'text-gray-400' : green ? 'text-primary-light/70' : amber ? 'text-amber-600' : 'text-gray-400')}>{label}</span>
              <Icon size={14} className={dark ? 'text-gray-600' : green ? 'text-primary-light/60' : amber ? 'text-amber-500' : 'text-gray-300'} />
            </div>
            <p className={cn('text-xl font-black', dark ? 'text-white' : green ? 'text-white' : amber ? 'text-amber-800' : 'text-gray-900')}>{value}</p>
            {bar !== undefined ? (
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width:`${bar}%` }} />
              </div>
            ) : (
              <p className={cn('text-[11px] mt-0.5', dark ? 'text-gray-500' : green ? 'text-primary-light/60' : amber ? 'text-amber-600' : 'text-gray-400')}>{sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Rechercher un client, deal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 text-sm transition-all bg-white"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ key:'all', label:'Tous' }, ...STAGES.map(s => ({ key: s.key, label: s.label }))].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterStage(key as any)}
              className={cn('flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition-all border',
                filterStage === key ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {opportunities.length === 0 ? (
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          className="text-center py-20 bg-white rounded-3xl border border-gray-100"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-5">
            <Target size={36} className="text-primary/40" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Votre pipeline vous attend</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">Commencez à suivre vos opportunités commerciales et closez plus de deals</p>
          <Button icon={<Plus size={15} />} onClick={openCreate}>Créer mon premier deal</Button>
        </motion.div>
      ) : view === 'kanban' ? (
        /* ── KANBAN ──────────────────────────────────────────────────────── */
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => {
              const stageOpps = filtered.filter(o => o.stage === stage.key);
              const stageTotal = stageOpps.reduce((s, o) => s + o.value, 0);
              const isDragOver = dragOverStage === stage.key;
              return (
                <div key={stage.key} className="w-64 flex-shrink-0"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => { e.preventDefault(); handleDrop(stage.key); }}
                >
                  {/* Column header */}
                  <div className={cn('flex items-center justify-between px-4 py-3 rounded-xl border mb-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl', stage.border)}>
                    <div className="flex items-center gap-2">
                      <div className={cn('p-1.5 rounded-lg', stage.bg)}>
                        <stage.icon size={14} className={stage.color} strokeWidth={2.5} />
                      </div>
                      <span className={cn('text-xs font-bold', stage.color)}>{stage.label}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold border', stage.bg, stage.color, stage.border)}>
                        {stageOpps.length}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold tabular-nums">{formatCurrency(stageTotal)}</span>
                  </div>

                  {/* Drop zone */}
                  <div className={cn('space-y-2.5 min-h-24 rounded-2xl transition-all p-1',
                    isDragOver && 'bg-primary/5 ring-2 ring-primary/20 ring-dashed')}
                  >
                    <AnimatePresence>
                      {stageOpps.map((opp) => {
                        const oppTasks = tasks[opp.id] || [];
                        return (
                          <KanbanCard
                            key={opp.id}
                            opp={opp}
                            taskCount={oppTasks.length}
                            doneCount={oppTasks.filter(t => t.done).length}
                            onSelect={() => setSelectedOpp(opp)}
                            onDragStart={() => { dragId.current = opp.id; }}
                          />
                        );
                      })}
                    </AnimatePresence>
                    {stageOpps.length === 0 && (
                      <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-gray-100 text-gray-200 text-xs">
                        Glisser ici
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── LIST VIEW ───────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Client / Deal', 'Valeur', 'Étape', 'Prob.', 'Priorité', 'Échéance', ''].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-300 text-sm">Aucun deal trouvé</td></tr>
              ) : (
                filtered.map((opp) => {
                  const s = stageOf(opp.stage);
                  return (
                    <motion.tr key={opp.id} layout
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                      onClick={() => setSelectedOpp(opp)}
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{opp.client_name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{opp.title}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(opp.value)}</p>
                        <p className="text-[10px] text-gray-400">{formatCurrency(opp.value * opp.probability / 100)} attendu</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', s.bg, s.color, s.border)}>
                          <s.icon size={11} strokeWidth={2.5} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className={cn('h-full rounded-full', s.bar)} style={{ width:`${opp.probability}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-500">{opp.probability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><PriorityBadge priority={opp.priority} /></td>
                      <td className="px-4 py-3.5"><CloseDateChip date={opp.expected_close_date} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(opp); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(opp); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel backdrop */}
      <AnimatePresence>
        {selectedOpp && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
              onClick={() => setSelectedOpp(null)}
            />
            <DetailPanel
              opp={selectedOpp}
              onClose={() => setSelectedOpp(null)}
              onEdit={() => { openEdit(selectedOpp); setSelectedOpp(null); }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Create / Edit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editOpp ? 'Modifier le deal' : 'Nouveau deal'} size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Client *" placeholder="Nom du client / entreprise"
              value={form.client_name||''} onChange={(e) => set('client_name', e.target.value)} required
            />
            <Input label="Titre du deal *" placeholder="Ex: Refonte site, Audit SEO..."
              value={form.title||''} onChange={(e) => set('title', e.target.value)} required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Valeur estimée (€)" type="number" min="0" step="100"
              value={form.value||0} onChange={(e) => set('value', parseFloat(e.target.value)||0)}
            />
            <Select label="Étape"
              value={form.stage||'prospect'}
              onChange={(e) => { const s = e.target.value as OpportunityStage; set('stage', s); set('probability', STAGES.find(st=>st.key===s)!.prob); }}
              options={STAGES.map(s => ({ value:s.key, label:`${s.emoji} ${s.label}` }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Priorité"
              value={form.priority||'medium'}
              onChange={(e) => set('priority', e.target.value)}
              options={PRIORITIES.map(p => ({ value:p.key, label:p.label }))}
            />
            <Input label="Date de clôture prévue" type="date"
              value={form.expected_close_date||''}
              onChange={(e) => set('expected_close_date', e.target.value)}
            />
          </div>

          {/* Probability bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600">Probabilité</label>
              <span className="text-xs font-bold text-primary">{form.probability||0}%</span>
            </div>
            <input type="range" min="0" max="100" step="5"
              value={form.probability||0} onChange={(e) => set('probability', parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-gray-100 cursor-pointer accent-primary"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Valeur attendue : <strong className="text-gray-700">{formatCurrency((form.value||0) * ((form.probability||0)/100))}</strong>
            </p>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Nom du contact" placeholder="Jean Dupont"
                value={form.contact_name||''} onChange={(e) => set('contact_name', e.target.value)}
              />
              <Input label="Email" type="email" placeholder="jean@client.fr"
                value={form.contact_email||''} onChange={(e) => set('contact_email', e.target.value)}
              />
              <Input label="Téléphone" placeholder="+33 6 12 34 56"
                value={form.contact_phone||''} onChange={(e) => set('contact_phone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Source"
              value={form.source||''}
              onChange={(e) => set('source', e.target.value)}
              options={[{ value:'', label:'— Sélectionner —' }, ...SOURCES.map(s => ({ value:s, label:s }))]}
            />
            <Input label="Label / Tag" placeholder="Ex: Prioritaire, Q2..."
              value={form.label||''} onChange={(e) => set('label', e.target.value)}
            />
          </div>

          <Textarea label="Notes" rows={3} placeholder="Contexte, prochaines étapes..."
            value={form.notes||''} onChange={(e) => set('notes', e.target.value)}
          />

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>
              {editOpp ? 'Enregistrer' : 'Créer le deal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

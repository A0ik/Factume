'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useCrmStore, Opportunity, OpportunityInput, OpportunityStage, OpportunityPriority, CrmTask } from '@/stores/crmStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency, cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import {
  Plus, Kanban, List, Search, X, Trophy, Target, Percent, Flame,
  GripVertical, CheckSquare, Square, Trash2, Edit2,
  TrendingUp, Calendar, Mail, Phone, User, Tag, ArrowRight,
  MessageSquare, Clock, Star, Filter, BarChart3, CheckCircle2,
  Circle, AlertCircle, Zap, ChevronDown,
} from 'lucide-react';

// ── Constants ───────────────────────────────────────────────────────────────

const STAGES: {
  key: OpportunityStage; label: string; icon: any;
  color: string; bg: string; border: string; bar: string; gradient: string;
  prob: number;
}[] = [
  { key:'prospect',    label:'Prospect',    icon:Target,      color:'text-slate-600',   bg:'bg-slate-50',   border:'border-slate-200', bar:'bg-slate-400',   gradient:'from-slate-500 to-slate-600',   prob:10  },
  { key:'qualified',   label:'Qualifié',    icon:CheckCircle2,color:'text-blue-600',    bg:'bg-blue-50',    border:'border-blue-200',  bar:'bg-blue-500',    gradient:'from-blue-500 to-blue-600',    prob:25  },
  { key:'proposal',    label:'Proposition', icon:Star,        color:'text-violet-600',  bg:'bg-violet-50',  border:'border-violet-200',bar:'bg-violet-500',  gradient:'from-violet-500 to-violet-600',  prob:50  },
  { key:'negotiation', label:'Négociation', icon:MessageSquare,color:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200', bar:'bg-amber-500',   gradient:'from-amber-500 to-amber-600',   prob:75  },
  { key:'won',         label:'Gagné',       icon:Trophy,      color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200',bar:'bg-emerald-500', gradient:'from-emerald-500 to-emerald-600',prob:100 },
  { key:'lost',        label:'Perdu',       icon:X,           color:'text-red-600',     bg:'bg-red-50',     border:'border-red-200',   bar:'bg-red-400',     gradient:'from-red-500 to-red-600',     prob:0   },
];

const PRIORITIES: { key: OpportunityPriority; label: string; color: string; dot: string; icon: any; bg: string; gradient: string }[] = [
  { key:'low',    label:'Faible',  color:'text-gray-400',  dot:'bg-gray-300',  icon:ArrowRight, bg:'bg-gray-50', gradient:'from-gray-400 to-gray-500' },
  { key:'medium', label:'Moyen',   color:'text-blue-500',  dot:'bg-blue-400',  icon:Circle,     bg:'bg-blue-50', gradient:'from-blue-500 to-blue-600' },
  { key:'high',   label:'Élevé',   color:'text-orange-500',dot:'bg-orange-400',icon:Zap,        bg:'bg-orange-50',gradient:'from-orange-500 to-orange-600' },
  { key:'urgent', label:'Urgent',  color:'text-red-500',   dot:'bg-red-500',   icon:Flame,      bg:'bg-red-50',   gradient:'from-red-500 to-red-600' },
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
    <span className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl', p.color, p.bg)}>
      <Icon size={10} strokeWidth={2.5} />
      {p.label}
    </span>
  );
}

function ProbBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width:`${value}%` }} />
      </div>
      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tabular-nums w-6 text-right">{value}%</span>
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
      'flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full',
      overdue ? 'bg-red-50/80 text-red-600' : soon ? 'bg-amber-50/80 text-amber-700' : 'bg-gray-50/80 text-gray-500',
    )}>
      <Calendar size={9} />
      {overdue ? `${Math.abs(diff)}j en retard` : diff === 0 ? "Aujourd'hui" : `${diff}j`}
    </span>
  );
}

// ── 3D Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ opp, taskCount, doneCount, onSelect, onDragStart }: {
  opp: Opportunity; taskCount: number; doneCount: number;
  onSelect: () => void; onDragStart: () => void;
}) {
  const s = stageOf(opp.stage);
  const allDone = taskCount > 0 && doneCount === taskCount;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity:0, y:8, rotateX: -5 }}
      animate={{ opacity:1, y:0, rotateX: 0 }}
      exit={{ opacity:0, scale:0.95 }}
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative cursor-pointer"
      style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
      whileHover={{ y: -4, scale: 1.02, rotateX: 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Glassmorphism card with 3D depth */}
      <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
        {/* Gradient overlay on hover */}
        <motion.div
          className={cn('absolute inset-0 bg-gradient-to-br opacity-0', s.gradient)}
          animate={{ opacity: isHovered ? 0.15 : 0 }}
          transition={{ duration: 0.3 }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />

        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
          initial={{ x: '-100%' }}
          animate={{ x: isHovered ? '200%' : '-100%' }}
          transition={{ duration: 0.8 }}
        />

        {/* Content */}
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', s.gradient)}>
                  <s.icon size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{opp.client_name}</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{opp.title}</p>
            </div>
            <motion.div
              animate={{ rotate: isHovered ? 360 : 0 }}
              transition={{ duration: 0.6 }}
              className="flex-shrink-0"
            >
              <GripVertical size={12} className="text-gray-300 dark:text-gray-600" />
            </motion.div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(opp.value)}</p>
            <div className={cn('px-3 py-1.5 rounded-xl text-[10px] font-bold border backdrop-blur-sm shadow-sm', s.bg, s.color, s.border)}>
              {s.prob}%
            </div>
          </div>

          <ProbBar value={opp.probability} color={s.bar} />

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <PriorityBadge priority={opp.priority} />
            <CloseDateChip date={opp.expected_close_date} />
          </div>

          {taskCount > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
              {allDone
                ? <CheckCircle2 size={12} className="text-emerald-500" />
                : <Circle size={12} className="text-gray-300 dark:text-gray-600" />
              }
              <span className={cn('text-[10px] font-semibold', allDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500')}>
                {doneCount}/{taskCount} tâches
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Beautiful Stage Dropdown ─────────────────────────────────────────────────────

function StageDropdown({ value, onChange }: { value: OpportunityStage; onChange: (v: OpportunityStage) => void }) {
  const [open, setOpen] = useState(false);
  const current = stageOf(value);

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-left hover:border-primary/50 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', current.gradient)}>
            <current.icon size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{current.label}</span>
        </div>
        <ChevronDown size={16} className={cn('text-gray-400 transition-transform duration-200', open && 'rotate-180')} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            >
              {STAGES.map((stage) => (
                <motion.button
                  key={stage.key}
                  type="button"
                  whileHover={{ x: 4 }}
                  onClick={() => { onChange(stage.key); setOpen(false); }}
                  className={cn('w-full px-4 py-3 text-left flex items-center gap-3 transition-colors', value === stage.key ? 'bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700')}
                >
                  <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', stage.gradient)}>
                    <stage.icon size={14} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className={cn('text-sm font-medium', value === stage.key ? 'text-primary font-bold' : 'text-gray-700 dark:text-gray-300')}>{stage.label}</span>
                  <span className={cn('ml-auto text-[10px] font-bold px-2 py-1 rounded-lg', stage.bg, stage.color)}>{stage.prob}%</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Beautiful Priority Dropdown ───────────────────────────────────────────────────

function PriorityDropdown({ value, onChange }: { value: OpportunityPriority; onChange: (v: OpportunityPriority) => void }) {
  const [open, setOpen] = useState(false);
  const current = priorityOf(value);

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-left hover:border-primary/50 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', current.gradient)}>
            <current.icon size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{current.label}</span>
        </div>
        <ChevronDown size={16} className={cn('text-gray-400 transition-transform duration-200', open && 'rotate-180')} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            >
              {PRIORITIES.map((p) => (
                <motion.button
                  key={p.key}
                  type="button"
                  whileHover={{ x: 4 }}
                  onClick={() => { onChange(p.key); setOpen(false); }}
                  className={cn('w-full px-4 py-3 text-left flex items-center gap-3 transition-colors', value === p.key ? 'bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700')}
                >
                  <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', p.gradient)}>
                    <p.icon size={14} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className={cn('text-sm font-medium', value === p.key ? 'text-primary font-bold' : 'text-gray-700 dark:text-gray-300')}>{p.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Deal Detail Panel (3D Side Panel) ─────────────────────────────────────────────

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
    await updateOpportunity(opp.id, { stage, probability: prob }, `→ ${stageOf(stage).label}`);
    toast.success(`Déplacé vers ${stageOf(stage).label}`);
  };

  const doneTasks  = oppTasks.filter(t => t.done).length;
  const taskPct    = oppTasks.length > 0 ? (doneTasks / oppTasks.length) * 100 : 0;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-white/50 dark:border-white/10 shadow-2xl z-40 flex flex-col overflow-hidden"
    >
      {/* 3D Header */}
      <div className="relative overflow-hidden">
        <div className={cn('absolute inset-0 bg-gradient-to-br', s.gradient)} />
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
        <div className="relative flex items-start gap-4 px-6 pt-6 pb-5">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg"
          >
            <s.icon size={24} className="text-white" strokeWidth={2.5} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-lg truncate drop-shadow-sm">{opp.client_name}</h3>
            <p className="text-sm text-white/80 truncate">{opp.title}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onEdit}
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <Edit2 size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X size={18} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Value + Probability Cards */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl p-5 shadow-xl shadow-gray-900/20"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Valeur</p>
            <p className="text-2xl font-black">{formatCurrency(opp.value)}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Attendue : {formatCurrency(opp.value * opp.probability / 100)}
            </p>
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            className={cn('rounded-3xl p-5 shadow-xl', s.bg)}
          >
            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', s.color)}>Étape</p>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', s.gradient)}>
                <s.icon size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <p className={cn('text-base font-black', s.color)}>{s.label}</p>
            </div>
            <ProbBar value={opp.probability} color={s.bar} />
          </motion.div>
        </div>

        {/* Quick Actions */}
        {opp.stage !== 'won' && opp.stage !== 'lost' && (
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickStage('won')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all"
            >
              <Trophy size={16} /> Gagné
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickStage('lost')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-bold shadow-lg shadow-red-500/30 transition-all"
            >
              <X size={16} /> Perdu
            </motion.button>
          </div>
        )}

        {/* Stage Pipeline */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Pipeline</p>
          <div className="flex gap-1.5">
            {STAGES.filter(s => s.key !== 'lost').map((stage) => {
              const isActive = opp.stage === stage.key;
              const isPast   = STAGES.findIndex(s => s.key === opp.stage) > STAGES.findIndex(s => s.key === stage.key);
              return (
                <motion.button
                  key={stage.key}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleQuickStage(stage.key)}
                  title={stage.label}
                  className={cn('flex-1 h-2.5 rounded-full transition-all duration-300 shadow-sm', isActive ? stage.bar : isPast ? 'bg-primary/40' : 'bg-gray-200 dark:bg-gray-700')}
                />
              );
            })}
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          {[
            opp.contact_name  && { icon: User,    label: opp.contact_name },
            opp.contact_email && { icon: Mail,    label: opp.contact_email, href: `mailto:${opp.contact_email}` },
            opp.contact_phone && { icon: Phone,   label: opp.contact_phone, href: `tel:${opp.contact_phone}` },
            opp.source        && { icon: Tag,     label: opp.source },
            opp.expected_close_date && { icon: Calendar, label: new Date(opp.expected_close_date).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) },
          ].filter(Boolean).map((item: any, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 4 }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <item.icon size={16} className="text-gray-400" />
              </span>
              {item.href
                ? <a href={item.href} className="text-sm text-primary hover:underline truncate font-medium">{item.label}</a>
                : <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">{item.label}</span>
              }
            </motion.div>
          ))}
          <div className="flex items-center gap-2">
            <PriorityBadge priority={opp.priority} />
            <CloseDateChip date={opp.expected_close_date} />
          </div>
        </div>

        {opp.notes && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-slate-800/50 dark:to-slate-900/30 rounded-3xl p-5 border border-gray-200 dark:border-gray-700">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{opp.notes}</p>
          </div>
        )}

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tâches</p>
            {oppTasks.length > 0 && (
              <span className="text-[11px] font-bold text-primary">{doneTasks}/{oppTasks.length}</span>
            )}
          </div>
          {oppTasks.length > 0 && (
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${taskPct}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
              />
            </div>
          )}
          <div className="space-y-2">
            {oppTasks.map((task) => (
              <motion.div
                key={task.id}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => toggleTask(task)}
                  className="flex-shrink-0"
                >
                  {task.done
                    ? <CheckCircle2 size={20} className="text-emerald-500" />
                    : <Circle size={20} className="text-gray-300 hover:text-primary transition-colors" />
                  }
                </motion.button>
                <span className={cn('flex-1 text-sm font-medium', task.done && 'line-through text-gray-400')}>{task.title}</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteTask(task)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </motion.button>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
              placeholder="Ajouter une tâche..."
              className="flex-1 px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all bg-white dark:bg-slate-800"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddTask}
              disabled={!newTask.trim() || addingTask}
              className="px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-40"
            >
              <Plus size={16} />
            </motion.button>
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Activité</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }}
              placeholder="Ajouter une note..."
              className="flex-1 px-4 py-3 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all bg-white dark:bg-slate-800"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddNote}
              disabled={!newNote.trim() || addingNote}
              className="px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-2xl transition-colors disabled:opacity-40"
            >
              <MessageSquare size={16} />
            </motion.button>
          </div>
          <div className="space-y-3">
            {oppActivities.length === 0
              ? <p className="text-sm text-gray-300 text-center py-6">Aucune activité pour l'instant</p>
              : oppActivities.map((act) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {act.type === 'note'         ? <MessageSquare size={14} className="text-gray-400" />
                    : act.type === 'stage_change' ? <ArrowRight size={14} className="text-primary" />
                    : act.type === 'task'         ? <CheckSquare size={14} className="text-emerald-500" />
                    : <Mail size={14} className="text-blue-400" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{act.content}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(act.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))
            }
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const router = useRouter();
  const { opportunities, tasks, fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, fetchTasks } = useCrmStore();
  const { clients } = useDataStore();
  const { user } = useAuthStore();
  const sub = useSubscription(); // Get subscription info

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

  // Check CRM access - Pro/Business only
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if user has access to CRM
      if (!sub.canUseCRM) {
        setAccessDenied(true);
      } else {
        fetchOpportunities();
      }
    }
  }, [user, sub.canUseCRM]);

  useEffect(() => {
    opportunities.forEach(o => { if (!tasks[o.id]) fetchTasks(o.id); });
  }, [opportunities]);

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

  // Memoize filtered opportunities - O(n) operation
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return opportunities.filter(o => {
      const matchSearch = !q || o.client_name.toLowerCase().includes(q) || o.title.toLowerCase().includes(q);
      const matchStage  = filterStage === 'all' || o.stage === filterStage;
      return matchSearch && matchStage;
    });
  }, [opportunities, search, filterStage]);

  // Memoize stats calculations - O(n) operations
  const stats = useMemo(() => {
    const activeOpps = opportunities.filter(o => o.stage !== 'lost');
    const pipeline = activeOpps.reduce((s, o) => s + o.value * o.probability / 100, 0);
    const wonOpps = opportunities.filter(o => o.stage === 'won');
    const wonRev = wonOpps.reduce((s, o) => s + o.value, 0);
    const wonCount = wonOpps.length;
    const lostCount = opportunities.filter(o => o.stage === 'lost').length;
    const winRate = wonCount + lostCount > 0 ? Math.round(wonCount / (wonCount + lostCount) * 100) : 0;
    const hotOpps = opportunities.filter(o => o.stage === 'negotiation');
    const hotValue = hotOpps.reduce((s, o) => s + o.value, 0);
    const hotCount = hotOpps.length;
    return { pipeline, wonRev, wonCount, lostCount, winRate, hotValue, hotCount };
  }, [opportunities]);

  const { pipeline, wonRev, wonCount, lostCount, winRate, hotValue, hotCount } = stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6 lg:p-8">
      {/* Access Denied Banner */}
      {accessDenied && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50 dark:from-purple-500/10 dark:via-violet-500/10 border-2 border-purple-200 dark:border-purple-500/30 rounded-3xl p-8 md:p-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-purple-100 dark:bg-purple-500/20 rounded-2xl">
                <Target size={48} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100 mb-3">
              Pipeline CRM
            </h2>
            <p className="text-lg text-purple-700 dark:text-purple-200 mb-6 max-w-2xl mx-auto leading-relaxed">
              Le Pipeline CRM est une fonctionnalité réservée aux abonnements Pro et Business. Gérez vos opportunités commerciales et suivez votre pipeline de vente avec des outils avancés.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push('/paywall?plan=pro')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 transition-all"
              >
                Découvrir les plans Pro
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-4 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-2xl font-bold transition-all"
              >
                Retour au tableau de bord
              </button>
            </div>
            <p className="mt-6 text-sm text-purple-600 dark:text-purple-300">
              Avec les plans Pro et Business : CRM illimité · Relances automatiques · Export comptable · Signature électronique
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      {!accessDenied && (
      <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">Pipeline CRM</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {opportunities.length} deal{opportunities.length !== 1 ? 's' : ''} · {formatCurrency(pipeline)} pipeline pondéré
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-800/50 p-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('kanban')}
                className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all', view === 'kanban' ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg' : 'text-gray-500 hover:text-gray-900')}
              >
                <Kanban size={16} /> Kanban
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('list')}
                className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all', view === 'list' ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg' : 'text-gray-500 hover:text-gray-900')}
              >
                <List size={16} /> Liste
              </motion.button>
            </div>
            <Button icon={<Plus size={18} />} onClick={openCreate} className="shadow-lg shadow-primary/30">Nouveau deal</Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pipeline pondéré', value: formatCurrency(pipeline), sub: `${opportunities.filter(o=>o.stage!=='lost'&&o.stage!=='won').length} actifs`, icon: BarChart3, gradient: 'from-gray-600 to-gray-700' },
          { label: 'Revenue gagné', value: formatCurrency(wonRev), sub: `${wonCount} closé${wonCount>1?'s':''}`, icon: Trophy, gradient: 'from-emerald-500 to-emerald-600' },
          { label: 'Taux de conversion', value: `${winRate}%`, sub: `${wonCount} gagnés / ${lostCount} perdus`, icon: Percent, gradient: 'from-blue-500 to-indigo-500', bar: winRate },
          { label: 'Deals chauds', value: formatCurrency(hotValue), sub: `${hotCount} en négociation`, icon: Flame, gradient: 'from-amber-500 to-orange-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="relative group"
          >
            <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-5 overflow-hidden">
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', stat.gradient)} />
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />
              <div className="relative">
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg', stat.gradient)}>
                  <stat.icon size={22} className="text-white" />
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-white transition-colors">{stat.value}</p>
                {stat.bar !== undefined ? (
                  <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.bar}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 group-hover:text-white/70 transition-colors">{stat.sub}</p>
                )}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 group-hover:text-white/70 transition-colors">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search + Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-6 mb-8"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Rechercher un client, deal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 text-sm transition-all"
            />
            {search && <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            ><X size={14} /></motion.button>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            {[{ key:'all', label:'Tous' }, ...STAGES.map(s => ({ key: s.key, label: s.label }))].map(({ key, label }) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterStage(key as any)}
                className={cn('flex-shrink-0 px-4 py-3 rounded-2xl text-sm font-bold transition-all border', filterStage === key
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary shadow-lg shadow-primary/30'
                  : 'bg-white/50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300'
                )}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Empty State */}
      {opportunities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 p-12 text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
            <Target size={48} className="text-primary/60" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Votre pipeline vous attend</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">Commencez à suivre vos opportunités commerciales et closez plus de deals avec votre pipeline CRM intelligent</p>
          <Button icon={<Plus size={18} />} onClick={openCreate} size="lg">Créer mon premier deal</Button>
        </motion.div>
      ) : view === 'kanban' ? (
        /* ── KANBAN VIEW ──────────────────────────────────────────────────────── */
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="flex gap-5 min-w-max">
            {STAGES.map((stage, idx) => {
              const stageOpps = filtered.filter(o => o.stage === stage.key);
              const stageTotal = stageOpps.reduce((s, o) => s + o.value, 0);
              const isDragOver = dragOverStage === stage.key;
              return (
                <motion.div
                  key={stage.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="w-72 flex-shrink-0"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => { e.preventDefault(); handleDrop(stage.key); }}
                >
                  {/* 3D Column Header */}
                  <div className="relative mb-4 overflow-hidden rounded-2xl">
                    <div className={cn('absolute inset-0 bg-gradient-to-br', stage.gradient)} />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                    <div className="relative flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
                        >
                          <stage.icon size={18} className="text-white" strokeWidth={2.5} />
                        </motion.div>
                        <div>
                          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">{stage.label}</span>
                          <div className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white mt-0.5 inline-flex', stage.bg)}>
                            {stageOpps.length}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-white drop-shadow-sm">{formatCurrency(stageTotal)}</p>
                        <p className="text-[10px] text-white/70">{stage.prob}% prob.</p>
                      </div>
                    </div>
                  </div>

                  {/* Drop Zone */}
                  <div className={cn('space-y-3 min-h-32 rounded-2xl transition-all p-2', isDragOver && 'bg-primary/5 ring-2 ring-primary/20 ring-dashed')}>
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
                      <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 text-sm">
                        Glisser ici
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── LIST VIEW ───────────────────────────────────────────────────────── */
        <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-slate-700/50">
                  {['Client / Deal', 'Valeur', 'Étape', 'Prob.', 'Priorité', 'Échéance', ''].map((h, i) => (
                    <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Aucun deal trouvé</td></tr>
                ) : (
                  filtered.map((opp, idx) => {
                    const s = stageOf(opp.stage);
                    return (
                      <motion.tr
                        key={opp.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                        onClick={() => setSelectedOpp(opp)}
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{opp.client_name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[180px]">{opp.title}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(opp.value)}</p>
                          <p className="text-[10px] text-gray-400">{formatCurrency(opp.value * opp.probability / 100)} attendu</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border', s.bg, s.color, s.border)}>
                            <s.icon size={12} strokeWidth={2.5} />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div className={cn('h-full rounded-full', s.bar)} style={{ width:`${opp.probability}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{opp.probability}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4"><PriorityBadge priority={opp.priority} /></td>
                        <td className="px-5 py-4"><CloseDateChip date={opp.expected_close_date} /></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.stopPropagation(); openEdit(opp); }}
                              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-primary transition-colors"
                            >
                              <Edit2 size={14} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.stopPropagation(); handleDelete(opp); }}
                              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Panel Backdrop */}
      <AnimatePresence>
        {selectedOpp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editOpp ? 'Modifier le deal' : 'Nouveau deal'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Client *" placeholder="Nom du client / entreprise"
              value={form.client_name||''} onChange={(e) => set('client_name', e.target.value)} required
            />
            <Input label="Titre du deal *" placeholder="Ex: Refonte site, Audit SEO..."
              value={form.title||''} onChange={(e) => set('title', e.target.value)} required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Valeur estimée (€)" type="number" min="0" step="100"
              value={form.value||0} onChange={(e) => set('value', parseFloat(e.target.value)||0)}
            />
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Étape</label>
              <StageDropdown
                value={form.stage || 'prospect'}
                onChange={(v) => {
                  const s = v as OpportunityStage;
                  set('stage', s);
                  set('probability', STAGES.find(st=>st.key===s)!.prob);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Priorité</label>
              <PriorityDropdown
                value={form.priority || 'medium'}
                onChange={(v) => set('priority', v)}
              />
            </div>
            <Input label="Date de clôture prévue" type="date"
              value={form.expected_close_date||''}
              onChange={(e) => set('expected_close_date', e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Probabilité</label>
              <span className="text-xs font-bold text-primary">{form.probability||0}%</span>
            </div>
            <input type="range" min="0" max="100" step="5"
              value={form.probability||0} onChange={(e) => set('probability', parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-gray-200 dark:bg-gray-700 cursor-pointer accent-primary"
            />
            <p className="text-[11px] text-gray-400 mt-2">
              Valeur attendue : <strong className="text-gray-700 dark:text-gray-300">{formatCurrency((form.value||0) * ((form.probability||0)/100))}</strong>
            </p>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>
              {editOpp ? 'Enregistrer' : 'Créer le deal'}
            </Button>
          </div>
        </form>
      </Modal>
      </>)
      }
    </div>
  );
}

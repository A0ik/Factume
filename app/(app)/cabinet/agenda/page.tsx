'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Plus, X, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, Clock, MapPin, Users, FileText,
  Bell, Shield, Building2, Euro, Trash2, Edit3, Search,
  Filter, CheckCircle2, AlertCircle, RefreshCw, Tag,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatDateShort } from '@/lib/utils';
import { toast } from 'sonner';
import CabinetGuard from '@/components/cabinet/CabinetGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'rdv_client' | 'echeance_fiscale' | 'relance' | 'dsn' | 'paie' | 'autre';

interface AgendaEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  type: EventType;
  clientName: string | null;
  location: string | null;
  completed: boolean;
  cabinet_id: string;
  created_at: string;
}

interface EventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  type: EventType;
  clientName: string;
  location: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: any; bg: string; text: string; dot: string }> = {
  rdv_client:       { label: 'RDV client',       icon: Users,       bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-700 dark:text-blue-400',       dot: 'bg-blue-500' },
  echeance_fiscale: { label: 'Echeance fiscale', icon: Bell,        bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-400',     dot: 'bg-amber-500' },
  relance:          { label: 'Relance',           icon: AlertCircle, bg: 'bg-red-100 dark:bg-red-900/30',        text: 'text-red-700 dark:text-red-400',         dot: 'bg-red-500' },
  dsn:              { label: 'DSN',               icon: Shield,      bg: 'bg-purple-100 dark:bg-purple-900/30',   text: 'text-purple-700 dark:text-purple-400',   dot: 'bg-purple-500' },
  paie:             { label: 'Paie',              icon: Euro,        bg: 'bg-emerald-100 dark:bg-emerald-900/30',  text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  autre:            { label: 'Autre',             icon: Tag,         bg: 'bg-gray-100 dark:bg-gray-800',           text: 'text-gray-600 dark:text-gray-400',       dot: 'bg-gray-400' },
};

const EVENT_TYPES: EventType[] = ['rdv_client', 'echeance_fiscale', 'relance', 'dsn', 'paie', 'autre'];

const MONTHS = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const EMPTY_FORM: EventForm = {
  title: '', description: '', date: '', time: '', type: 'rdv_client', clientName: '', location: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // getDay() returns 0=Sun, 1=Mon, ... 6=Sat
  // We want Monday=0, Sunday=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: (Date | null)[] = [];

  // Leading nulls
  for (let i = 0; i < startDow; i++) days.push(null);

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));

  return days;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function today(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CabinetAgendaPage() {
  const { profile, initialized } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AgendaEvent[]>([]);

  // Calendar state
  const currentDate = today();
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [form, setForm] = useState<EventForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Data loading ────────────────────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/cabinet/agenda', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error: any) {
      console.error('[loadEvents]', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized && profile) loadEvents();
  }, [initialized, profile, loadEvents]);

  // ─── Calendar days ───────────────────────────────────────────────────────

  const monthDays = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const ev of events) {
      const key = ev.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const selectedDateKey = toDateKey(selectedDate);
  const todayKey = toDateKey(currentDate);

  const selectedDayEvents = eventsByDay.get(selectedDateKey) || [];

  // ─── Events for sidebar (upcoming, ordered) ──────────────────────────────

  const upcomingEvents = useMemo(() => {
    let result = events.filter((ev) => !ev.completed);
    if (filterType !== 'all') result = result.filter((ev) => ev.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ev) => ev.title.toLowerCase().includes(q) || (ev.clientName || '').toLowerCase().includes(q) || (ev.description || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    return result;
  }, [events, filterType, searchQuery]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const goToToday = () => {
    setViewYear(currentDate.getFullYear());
    setViewMonth(currentDate.getMonth());
    setSelectedDate(currentDate);
  };

  // ─── CRUD ────────────────────────────────────────────────────────────────

  const openCreate = (date?: string) => {
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM, date: date || selectedDateKey });
    setShowModal(true);
  };

  const openEdit = (event: AgendaEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time || '',
      type: event.type,
      clientName: event.clientName || '',
      location: event.location || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (field: keyof EventForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) {
      toast.error('Titre et date sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const method = editingEvent ? 'PUT' : 'POST';
      const body = editingEvent
        ? { id: editingEvent.id, ...form, time: form.time || null }
        : { ...form, time: form.time || null };

      const res = await fetch('/api/cabinet/agenda', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || 'Erreur lors de l\'enregistrement');
      }

      toast.success(editingEvent ? 'Evenement modifie' : 'Evenement cree');
      setShowModal(false);
      setEditingEvent(null);
      setForm({ ...EMPTY_FORM });
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet evenement ?')) return;
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/cabinet/agenda?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');
      toast.success('Evenement supprime');
      loadEvents();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleComplete = async (event: AgendaEvent) => {
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/cabinet/agenda', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: event.id, completed: !event.completed }),
      });

      if (!res.ok) throw new Error('Erreur');
      setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, completed: !e.completed } : e));
    } catch {
      toast.error('Erreur');
    }
  };

  // ─── Count today's events ────────────────────────────────────────────────

  const todayEvents = eventsByDay.get(todayKey) || [];
  const todayIncomplete = todayEvents.filter((e) => !e.completed).length;

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <CabinetGuard>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cabinet" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0">
            <ArrowLeft size={18} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Agenda</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {todayIncomplete > 0
                ? `${todayIncomplete} evenement(s) aujourd'hui`
                : `${events.length} evenements`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-md"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nouvel evenement</span>
          </button>
        </div>
      </div>

      {/* ─── Grid: Calendar + Sidebar ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calendar Card */}
        <div className="lg:col-span-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 shadow-sm overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <button onClick={goToPrevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-black text-gray-900 dark:text-white text-lg">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={goToNextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 text-center border-b border-gray-100 dark:border-white/5">
            {DAYS.map((day) => (
              <div key={day} className="py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {monthDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="aspect-square border border-transparent" />;
              }
              const key = toDateKey(date);
              const dayEvents = eventsByDay.get(key) || [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDateKey;
              const isCurrentMonth = date.getMonth() === viewMonth;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'aspect-square p-1.5 flex flex-col items-center border border-gray-100/60 dark:border-white/[0.03] transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                    isSelected ? 'ring-2 ring-inset ring-primary/40 bg-primary/[0.04]' : '',
                    !isCurrentMonth && 'opacity-30'
                  )}
                >
                  <span className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold',
                    isToday ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300'
                  )}>
                    {date.getDate()}
                  </span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={cn('w-1.5 h-1.5 rounded-full', EVENT_TYPE_CONFIG[ev.type].dot)}
                        title={ev.title}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] font-bold text-gray-400">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected day events list */}
          <div className="border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02]">
              <CalendarIcon size={14} className="text-primary" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <span className="text-xs text-gray-400">({selectedDayEvents.length})</span>
              <div className="flex-1" />
              <button
                onClick={() => openCreate(selectedDateKey)}
                className="flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary-dark transition-colors"
              >
                <Plus size={13} />
                Ajouter
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucun evenement ce jour</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04] max-h-[300px] overflow-y-auto">
                {selectedDayEvents
                  .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'))
                  .map((ev) => {
                    const cfg = EVENT_TYPE_CONFIG[ev.type];
                    const TypeIcon = cfg.icon;
                    return (
                      <div
                        key={ev.id}
                        className={cn(
                          'flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer',
                          ev.completed && 'opacity-50'
                        )}
                        onClick={() => openEdit(ev)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleComplete(ev); }}
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                            ev.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                          )}
                        >
                          {ev.completed && <CheckCircle2 size={12} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold', ev.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white')}>
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {ev.time && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                <Clock size={11} />
                                {ev.time}
                              </span>
                            )}
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.text)}>
                              <TypeIcon size={9} className="inline mr-1" />
                              {cfg.label}
                            </span>
                            {ev.clientName && (
                              <span className="text-[11px] text-gray-400 truncate">· {ev.clientName}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(ev.id); }}
                          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Upcoming Events */}
        <div className="space-y-4">
          {/* Quick search & filter */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 p-4 shadow-sm">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterType('all')}
                className={cn(
                  'text-[10px] font-bold px-2.5 py-1.5 rounded-full transition-colors',
                  filterType === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                )}
              >
                Tous
              </button>
              {EVENT_TYPES.map((type) => {
                const cfg = EVENT_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(filterType === type ? 'all' : type)}
                    className={cn(
                      'text-[10px] font-bold px-2.5 py-1.5 rounded-full transition-colors',
                      filterType === type
                        ? `${cfg.dot.replace('bg-', 'bg-').replace('500', '600')} text-white bg-${cfg.dot.split('-')[1]}-600`
                        : `${cfg.bg} ${cfg.text}`
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming events list */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-gray-200/60 dark:border-gray-700/40 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-white/5">
              <CalendarIcon size={15} className="text-primary" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex-1">
                Prochains evenements
              </h3>
              <span className="text-xs text-gray-400">{upcomingEvents.length}</span>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-10">
                <CalendarIcon size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucun evenement</p>
                <button
                  onClick={() => openCreate()}
                  className="mt-3 text-xs text-primary font-semibold hover:underline"
                >
                  + Creer un evenement
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04] max-h-[500px] overflow-y-auto">
                {upcomingEvents.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.type];
                  const TypeIcon = cfg.icon;
                  const isPast = ev.date < todayKey;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => { setSelectedDate(new Date(ev.date)); openEdit(ev); }}
                      className={cn(
                        'flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer',
                        (ev.completed || isPast) && 'opacity-50'
                      )}
                    >
                      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-semibold truncate',
                          ev.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
                        )}>
                          {ev.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <CalendarIcon size={10} />
                            {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                          {ev.time && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Clock size={10} />
                              {ev.time}
                            </span>
                          )}
                        </div>
                        {ev.clientName && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{ev.clientName}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Event Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col max-w-lg"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                    <CalendarIcon size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {editingEvent ? 'Modifier l\'evenement' : 'Nouvel evenement'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {editingEvent ? 'Modifiez les details' : 'Ajoutez un evenement a l\'agenda'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* Event type */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Type d'evenement
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {EVENT_TYPES.map((type) => {
                      const cfg = EVENT_TYPE_CONFIG[type];
                      const TypeIcon = cfg.icon;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleFormChange('type', type)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors',
                            form.type === type
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                          )}
                        >
                          <TypeIcon size={12} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ex : RDV bilan comptable"
                  />
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Heure
                    </label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => handleFormChange('time', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Client name */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Client
                  </label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(e) => handleFormChange('clientName', e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Nom du client (optionnel)"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Lieu
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => handleFormChange('location', e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Adresse ou visio (optionnel)"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    rows={3}
                    placeholder="Notes, details du RDV..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                {editingEvent ? (
                  <button
                    onClick={() => handleDelete(editingEvent.id)}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-md disabled:opacity-60 transition-all flex items-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {editingEvent ? 'Enregistrer' : 'Creer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
    </CabinetGuard>
  );
}

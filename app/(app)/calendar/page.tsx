'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { toast } from 'sonner';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { getSupabaseClient } from '@/lib/supabase';
import { Appointment, Invoice } from '@/types';

// Calendar sub-components
import {
  MagnificentCalendarHeader,
  MagnificentCalendarGrid,
  MagnificentDayDetailPanel,
  AppointmentModal,
  AppointmentDetailModal,
  AppointmentFormData,
  buildCalendarCells,
} from '@/components/calendar';

// Google Calendar hook
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

// Get today's date for initialization
const today = new Date();

export default function CalendarPage() {
  const { invoices, clients, fetchClients } = useDataStore();
  const { profile } = useAuthStore();

  // Google Calendar integration
  const { connected: googleConnected, syncAppointment } = useGoogleCalendar();

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Build calendar cells
  const cells = useMemo(() => buildCalendarCells(currentYear, currentMonth), [currentYear, currentMonth]);

  // Group appointments by day — parse as local date to avoid UTC shift
  const appointmentsByDay = useMemo(() => {
    const map: Record<number, Appointment[]> = {};
    appointments.forEach((appt) => {
      const [y, m, dd] = appt.appointment_date.split('-').map(Number);
      if (y === currentYear && m - 1 === currentMonth) {
        if (!map[dd]) map[dd] = [];
        map[dd].push(appt);
      }
    });
    return map;
  }, [appointments, currentYear, currentMonth]);

  // Group invoices by day — parse as local date to avoid UTC shift
  const invoicesByDay = useMemo(() => {
    const map: Record<number, Invoice[]> = {};
    invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
      .forEach((inv) => {
        if (!inv.due_date) return;
        const [y, m, dd] = inv.due_date.split('-').map(Number);
        if (y === currentYear && m - 1 === currentMonth) {
          if (!map[dd]) map[dd] = [];
          map[dd].push(inv);
        }
      });
    return map;
  }, [invoices, currentYear, currentMonth]);

  // Get appointments and invoices for selected day
  const dayAppointments = selectedDay !== null ? (appointmentsByDay[selectedDay] || []) : [];
  const dayInvoices = selectedDay !== null ? (invoicesByDay[selectedDay] || []) : [];

  // Fetch appointments for current month
  const fetchAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setAppointments([]);
        setLoadingAppts(false);
        return;
      }

      // Check if table exists
      const { error } = await supabase.from('appointments').select('id').limit(1);

      if (error && error.code === '42P01') {
        setAppointments([]);
        setLoadingAppts(false);
        return;
      }

      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 1).toISOString().split('T')[0];

      const { data } = await supabase
        .from('appointments')
        .select('*, client:clients(*)')
        .gte('appointment_date', startDate)
        .lt('appointment_date', endDate)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      setAppointments(data || []);
    } catch (e) {
      console.error('Failed to fetch appointments', e);
      setAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  }, [currentYear, currentMonth]);

  // Fetch clients on mount
  useEffect(() => {
    if (clients.length === 0) fetchClients();
  }, [clients.length, fetchClients]);

  // Fetch appointments when month changes
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Navigation handlers
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDay(now.getDate());
  };

  const openCreateModal = () => {
    setEditingAppointment(null);
    setShowCreateModal(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  // Save appointment (create or update)
  const handleSaveAppointment = async (data: AppointmentFormData) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('No supabase client');

    if (editingAppointment) {
      // Update existing
      const { error } = await supabase
        .from('appointments')
        .update({
          title: data.title,
          description: data.description,
          location: data.location,
          client_id: data.client_id || null,
          appointment_date: data.appointment_date,
          start_time: data.start_time,
          end_time: data.end_time,
          color: data.color,
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      toast.success('Rendez-vous modifié');

      // Sync with Google if connected and has google_event_id
      if (googleConnected && editingAppointment.google_event_id && data.sync_with_google) {
        await syncAppointment(editingAppointment.id);
      }
    } else {
      // Create new
      const { data: newAppt, error } = await supabase
        .from('appointments')
        .insert({
          user_id: profile?.id,
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          client_id: data.client_id || null,
          appointment_date: data.appointment_date,
          start_time: data.start_time,
          end_time: data.end_time,
          color: data.color,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Rendez-vous créé');

      // Sync with Google if connected and toggle enabled
      if (googleConnected && data.sync_with_google && newAppt) {
        await syncAppointment(newAppt.id);
      }
    }

    await fetchAppointments();
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  // Delete appointment
  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;

    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('No supabase client');

    const { error } = await supabase.from('appointments').delete().eq('id', selectedAppointment.id);

    if (error) throw error;

    toast.success('Rendez-vous supprimé');
    setShowDetailModal(false);
    setSelectedAppointment(null);
    await fetchAppointments();
  };

  // Get selected date as ISO string for modal
  const getSelectedDateISO = () => {
    if (selectedDay === null) return new Date().toISOString().split('T')[0];
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  };

  // Bottom sheet drag controls (handle only — prevents scroll conflict)
  const sheetDragControls = useDragControls();

  // Swipe tracking for month navigation
  const swipeStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx < -60) nextMonth();
    else if (dx > 60) prevMonth();
  };

  return (
    <div className="relative min-h-screen">
      {/* Animated background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-primary/15 via-purple-500/15 to-pink-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-blue-500/15 via-cyan-500/15 to-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1400ms' }} />
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-3 xs:gap-4 lg:gap-4 xl:gap-6 p-2 xs:p-3 sm:p-4 lg:p-4 xl:p-6 overflow-x-hidden">
        {/* Left column: Header + Calendar Grid (swipeable on mobile) */}
        <div
          className="flex-1 flex flex-col gap-3 sm:gap-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <MagnificentCalendarHeader
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onGoToday={goToToday}
            onNewAppointment={openCreateModal}
          />

          <div className="relative">
            <MagnificentCalendarGrid
              cells={cells}
              currentYear={currentYear}
              currentMonth={currentMonth}
              selectedDay={selectedDay}
              appointmentsByDay={appointmentsByDay}
              invoicesByDay={invoicesByDay}
              onSelectDay={setSelectedDay}
            />
            {/* Loading overlay */}
            {loadingAppts && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Right column: Day Detail Panel (desktop only, inline) */}
        <div className="hidden lg:block">
          <MagnificentDayDetailPanel
            selectedDay={selectedDay}
            currentMonth={currentMonth}
            currentYear={currentYear}
            appointments={dayAppointments}
            invoices={dayInvoices}
            onAppointmentClick={(apt: Appointment) => {
              setSelectedAppointment(apt);
              setShowDetailModal(true);
            }}
            onNewAppointment={openCreateModal}
          />
        </div>
      </div>

      {/* Mobile: hint to tap a day */}
      {selectedDay === null && (
        <p className="lg:hidden text-center text-xs text-gray-400 dark:text-gray-500 pb-4 -mt-1 px-4">
          Touchez un jour pour voir vos rendez-vous
        </p>
      )}

      {/* Mobile: Bottom sheet for day detail */}
      <AnimatePresence>
        {selectedDay !== null && (
          <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
            />
            {/* Sheet — drag only from handle via dragControls */}
            <motion.div
              className="relative bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[78vh] flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              drag="y"
              dragControls={sheetDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 80) setSelectedDay(null); }}
            >
              {/* Drag handle — only this area initiates drag */}
              <div
                className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => sheetDragControls.start(e)}
              >
                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              {/* Scrollable content — won't trigger drag */}
              <div className="overflow-y-auto flex-1 overscroll-contain"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
              >
                <MagnificentDayDetailPanel
                  selectedDay={selectedDay}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  appointments={dayAppointments}
                  invoices={dayInvoices}
                  onAppointmentClick={(apt: Appointment) => {
                    setSelectedAppointment(apt);
                    setShowDetailModal(true);
                  }}
                  onNewAppointment={() => {
                    setSelectedDay(null);
                    openCreateModal();
                  }}
                  className="rounded-none border-0 shadow-none bg-transparent backdrop-blur-none"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {/* Create modal */}
      <AppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveAppointment}
        clients={clients}
        selectedDate={getSelectedDateISO()}
        googleConnected={googleConnected}
      />

      {/* Edit modal */}
      <AppointmentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAppointment(null);
        }}
        onSave={handleSaveAppointment}
        editingAppointment={editingAppointment}
        clients={clients}
        googleConnected={googleConnected}
      />

      {/* Detail modal */}
      <AppointmentDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onEdit={() => selectedAppointment && openEditModal(selectedAppointment)}
        onDelete={handleDeleteAppointment}
        onGoogleSync={syncAppointment}
        googleConnected={googleConnected}
        profile={profile}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, User, StickyNote, Loader2, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment, Client } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { APPOINTMENT_COLORS, AppointmentColor, glassTokens } from './constants';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AppointmentFormData) => Promise<void>;
  editingAppointment?: Appointment | null;
  clients: Client[];
  selectedDate?: string;
  googleConnected: boolean;
  className?: string;
}

export interface AppointmentFormData {
  title: string;
  description: string;
  location: string;
  client_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  color: AppointmentColor;
  sync_with_google: boolean;
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  editingAppointment,
  clients,
  selectedDate,
  googleConnected,
  className,
}: AppointmentModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    title: '',
    description: '',
    location: '',
    client_id: '',
    appointment_date: selectedDate || new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    color: 'blue',
    sync_with_google: googleConnected,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingAppointment) {
        setFormData({
          title: editingAppointment.title,
          description: editingAppointment.description || '',
          location: editingAppointment.location || '',
          client_id: editingAppointment.client_id || '',
          appointment_date: editingAppointment.appointment_date,
          start_time: editingAppointment.start_time,
          end_time: editingAppointment.end_time,
          color: editingAppointment.color as AppointmentColor,
          sync_with_google: googleConnected && !!editingAppointment.google_event_id,
        });
      } else {
        setFormData({
          title: '',
          description: '',
          location: '',
          client_id: '',
          appointment_date: selectedDate || new Date().toISOString().split('T')[0],
          start_time: '09:00',
          end_time: '10:00',
          color: 'blue',
          sync_with_google: googleConnected,
        });
      }
    }
  }, [isOpen, editingAppointment, selectedDate, googleConnected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (formData.end_time <= formData.start_time) return;
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Mobile: bottom sheet | Desktop: centered */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className={cn(
                'relative w-full sm:max-w-lg max-h-[94vh] sm:max-h-[90vh] overflow-hidden',
                'bg-white dark:bg-slate-900 sm:bg-white/90 sm:dark:bg-slate-900/90 sm:backdrop-blur-2xl',
                'rounded-t-3xl sm:rounded-3xl',
                'border-0 sm:border border-white/30 dark:border-white/10 shadow-2xl',
                'flex flex-col',
                className
              )}
            >
              {/* Mobile drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              {/* Color bar */}
              <div className={cn('h-1.5 sm:h-2 bg-gradient-to-r flex-shrink-0', getColorConfig(formData.color).gradient)} />

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {editingAppointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Form — scrollable, won't trigger drag */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto overscroll-contain"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                <div className="p-5 space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Titre *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Réunion client"
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl',
                        'bg-gray-50 dark:bg-slate-800',
                        'border border-gray-200 dark:border-white/10',
                        'focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none',
                        'text-gray-900 dark:text-white placeholder-gray-400 text-sm',
                      )}
                      required
                      autoFocus={false}
                    />
                  </div>

                  {/* Client */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />Client
                    </label>
                    <CustomSelect
                      value={formData.client_id}
                      onChange={(value) => setFormData({ ...formData, client_id: value })}
                      options={[
                        { value: '', label: 'Aucun client' },
                        ...clients.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      placeholder="Sélectionner un client"
                      className="w-full"
                    />
                  </div>

                  {/* Date + Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date</label>
                      <input
                        type="date"
                        value={formData.appointment_date}
                        onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                        className={cn(
                          'w-full px-3 py-2.5 rounded-xl text-sm',
                          'bg-gray-50 dark:bg-slate-800',
                          'border border-gray-200 dark:border-white/10',
                          'focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none',
                          'text-gray-900 dark:text-white',
                        )}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Couleur</label>
                      <div className="flex gap-2 flex-wrap pt-1">
                        {APPOINTMENT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: color.value })}
                            className={cn(
                              'w-7 h-7 rounded-full transition-all',
                              color.bg,
                              formData.color === color.value && 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-110'
                            )}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Start + End time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Début</label>
                      <CustomSelect
                        value={formData.start_time}
                        onChange={(value) => setFormData({ ...formData, start_time: value })}
                        options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fin</label>
                      <CustomSelect
                        value={formData.end_time}
                        onChange={(value) => setFormData({ ...formData, end_time: value })}
                        options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  {formData.end_time <= formData.start_time && (
                    <p className="text-xs text-red-500 -mt-2">L'heure de fin doit être après l'heure de début</p>
                  )}

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />Lieu
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ex: 123 Rue Example, Paris"
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl text-sm',
                        'bg-gray-50 dark:bg-slate-800',
                        'border border-gray-200 dark:border-white/10',
                        'focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none',
                        'text-gray-900 dark:text-white placeholder-gray-400',
                      )}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <StickyNote className="w-3.5 h-3.5" />Notes
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Notes ou détails du rendez-vous..."
                      rows={3}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl resize-none text-sm',
                        'bg-gray-50 dark:bg-slate-800',
                        'border border-gray-200 dark:border-white/10',
                        'focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none',
                        'text-gray-900 dark:text-white placeholder-gray-400',
                      )}
                    />
                  </div>

                  {/* Google sync */}
                  {googleConnected && (
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sync_with_google}
                        onChange={(e) => setFormData({ ...formData, sync_with_google: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Cloud className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Synchroniser avec Google Calendar
                      </span>
                    </label>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 dark:border-white/5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn('flex-1 py-3 rounded-xl font-semibold text-sm', glassTokens.btnSecondary)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.title.trim() || formData.end_time <= formData.start_time}
                    className={cn(
                      'flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2',
                      'bg-gradient-to-r from-primary to-emerald-600 text-white',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-all'
                    )}
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement...</>
                    ) : (
                      editingAppointment ? 'Modifier' : 'Créer'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function getColorConfig(color: string) {
  return APPOINTMENT_COLORS.find(c => c.value === color) || APPOINTMENT_COLORS[0];
}

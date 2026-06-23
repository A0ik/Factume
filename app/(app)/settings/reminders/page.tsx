'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Bell,
  Mail,
  Clock,
  Check,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Calendar,
  Send,
  AlertCircle,
} from 'lucide-react';

interface RemindersConfig {
  id: string;
  user_id: string;
  enabled: boolean;
  reminder_1_days: number;
  reminder_2_days: number;
  reminder_3_days: number;
  email_subject: string;
  email_message: string;
}

export default function RemindersSettingsPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [config, setConfig] = useState<RemindersConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ARGOS (P1) — dépend de la session : si elle est null au mount (hydration asynchrone),
  // fetchConfig() retournait tôt et n'était jamais relancé → loader infini. On relance à
  // l'arrivée du token d'accès.
  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const fetchConfig = async () => {
    if (!session) return;

    try {
      const res = await fetch('/api/reminders/config', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error('Erreur lors du chargement');

      const data = await res.json();
      setConfig(data);
    } catch (err) {
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !session) return;

    setSaving(true);
    try {
      const res = await fetch('/api/reminders/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: config.enabled,
          reminder_1_days: config.reminder_1_days,
          reminder_2_days: config.reminder_2_days,
          reminder_3_days: config.reminder_3_days,
          email_subject: config.email_subject,
          email_message: config.email_message,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');

      toast.success('Configuration sauvegardée avec succès !');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Impossible de charger la configuration</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                Relances automatiques
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configurez les relances pour vos factures en retard
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        {/* Activation card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Bell className={`w-5 h-5 ${config.enabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Activer les relances</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Envoyer automatiquement des relances par email
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                config.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                  config.enabled ? 'translate-x-7' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Reminder levels */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Niveaux de relance</h3>
          </div>

          <div className="space-y-4">
            {[
              { key: 'reminder_1_days', label: 'Première relance', icon: Mail, color: 'blue' },
              { key: 'reminder_2_days', label: 'Deuxième relance', icon: RefreshCw, color: 'amber' },
              { key: 'reminder_3_days', label: 'Troisième relance', icon: AlertCircle, color: 'red' },
            ].map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className={`w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-500/10 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {config[key as keyof RemindersConfig] as number} jours après l'échéance
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const value = config[key as keyof RemindersConfig] as number;
                      if (value > 1) {
                        setConfig({ ...config, [key]: value - 1 });
                      }
                    }}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold text-gray-900 dark:text-white">
                    {config[key as keyof RemindersConfig] as number}
                  </span>
                  <button
                    onClick={() => {
                      const value = config[key as keyof RemindersConfig] as number;
                      if (value < 90) {
                        setConfig({ ...config, [key]: value + 1 });
                      }
                    }}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email template */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Template d'email</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sujet de l'email
              </label>
              <input
                type="text"
                value={config.email_subject}
                onChange={(e) => setConfig({ ...config, email_subject: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Rappel: Facture {invoice_number} en retard"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message de l'email
              </label>
              <textarea
                value={config.email_message}
                onChange={(e) => setConfig({ ...config, email_message: e.target.value })}
                rows={8}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                placeholder="Bonjour {client_name},..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Variables disponibles: {'{'}client_name{'}'}, {'{'}invoice_number{'}'}, {'{'}amount{'}'}, {'{'}days_overdue{'}'}, {'{'}company_name{'}'}
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

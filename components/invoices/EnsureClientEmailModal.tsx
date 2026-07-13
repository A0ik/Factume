'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { X, Mail, Loader2, AlertCircle } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { toast } from 'sonner';

interface EnsureClientEmailModalProps {
  client: { id: string; name?: string | null; email?: string | null } | null;
  onResolved: (email: string) => void;
  onCancel: () => void;
}

/**
 * ASTRÉE (CIBLE 1 — Relances amnésiques) — Plus jamais d'impasse « 0 relance envoyée ».
 * Quand on relance un client sans email, ce pop-up capture l'adresse, la persiste dans
 * la fiche client (clients.email via updateClient), puis déclenche la relance.
 *
 * Cohérent avec le langage visuel de RemindersModal (hand-rolled, lucide, sonner,
 * accent émeraude brandé).
 */
export function EnsureClientEmailModal({ client, onResolved, onCancel }: EnsureClientEmailModalProps) {
  const { updateClient, fetchClients } = useDataStore();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!client) return null;

  const isValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!isValid(trimmed)) {
      setError('Adresse email invalide.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateClient(client.id, { email: trimmed });
      await fetchClients();
      toast.success(`Email enregistré pour ${client.name || 'ce client'}.`);
      onResolved(trimmed);
    } catch {
      setError("Impossible d'enregistrer l'email. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#15151a] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Email manquant</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                Relance de {client.name || 'client'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/[0.06] border border-amber-200 dark:border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Aucune adresse email renseignée pour ce client. Saisissez un email pour envoyer la relance : il sera enregistré sur la fiche client pour les prochaines fois.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Email du client
            </label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !saving) handleSubmit(); }}
              placeholder="client@exemple.fr"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
            />
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-white/[0.08] flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !email.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-white/[0.08] disabled:cursor-not-allowed text-white font-medium text-sm flex items-center gap-2 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Enregistrer et relancer
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook partagé — `promptForEmail(client)` renvoie une promesse résolue avec l'email
 * sauvé, ou null si l'utilisateur annule. Rendre `{ modal }` dans le composant hôte.
 */
export function useEnsureClientEmail() {
  const [pending, setPending] = useState<{ client: any; resolve: (v: string | null) => void } | null>(null);

  const promptForEmail = useCallback((client: any) => {
    return new Promise<string | null>((resolve) => {
      setPending({ client, resolve });
    });
  }, []);

  const handleResolved = (email: string) => { pending?.resolve(email); setPending(null); };
  const handleCancel = () => { pending?.resolve(null); setPending(null); };

  const modal: ReactNode = pending ? (
    <EnsureClientEmailModal
      client={pending.client}
      onResolved={handleResolved}
      onCancel={handleCancel}
    />
  ) : null;

  return { promptForEmail, modal };
}

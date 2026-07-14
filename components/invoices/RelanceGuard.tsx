'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { X, UserX, Mail, Loader2, AlertCircle } from 'lucide-react';
import { useEnsureClientEmail } from './EnsureClientEmailModal';
import { useDataStore } from '@/stores/dataStore';
import { toast } from 'sonner';
import { classifyRelanceInvoice, relanceDisplayLabel, normalizeRelanceClient } from '@/lib/relance';

/**
 * ZÉNITH (CIBLE 1) — Pop-up BLOQUANT de capture du destinataire pour une facture
 * envoyée SANS client lié NI email (ex: FACT-019 « Mohamed Ben Laden »).
 *
 * Avant : NoClientRelanceModal renvoyait vers /invoices/[id] pour « relier un
 * client » — sauf que la facture est overdue → verrouillée (Art. L.441-9) → impasse.
 * Désormais on capture l'email ICI, on l'écrit dans le snapshot non-fiscal de la
 * facture (invoices.client_email via /api/invoices/[id]/recipient), puis la relance
 * part (sendReminderEmail recourt à client_email). Aucune modification fiscale.
 *
 * Cohérent visuellement avec EnsureClientEmailModal (hand-rolled, lucide, sonner).
 */
export function CaptureRecipientModal({
  invoice,
  onResolved,
  onCancel,
}: {
  invoice: any;
  onResolved: (email: string) => void;
  onCancel: () => void;
}) {
  const { setInvoiceRecipient } = useDataStore();
  const [name, setName] = useState<string>(invoice?.client_name_override || '');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!isValid(trimmedEmail)) {
      setError('Adresse email invalide.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setInvoiceRecipient(invoice.id, {
        client_email: trimmedEmail,
        client_name_override: trimmedName || undefined,
      });
      toast.success(`Destinataire enregistré pour ${trimmedName || 'cette facture'}.`);
      onResolved(trimmedEmail);
    } catch {
      setError("Impossible d'enregistrer le destinataire. Réessayez.");
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
              <UserX className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Aucun destinataire</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                {relanceDisplayLabel(invoice)} · {invoice?.number || ''}
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
              Cette facture est déjà émise et n&apos;a ni client ni email. Saisissez un destinataire
              pour envoyer la relance — il sera enregistré sur la facture (sans la modifier).
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Nom du destinataire (optionnel)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du client"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Email du destinataire
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
 * Hook unifié de garde relance. `ensureCanSend(invoices)` :
 *  1. pour chaque facture SANS destininaire (ni client, ni email) → pop-up
 *     CaptureRecipientModal : saisie email + écriture dans invoices.client_email
 *     (carve-out non-fiscal). Retourne false si l'utilisateur annule ;
 *  2. pour chaque client lié sans email → pop-up EnsureClientEmailModal (saisie +
 *     persistance dans clients.email via updateClient), séquentiellement ;
 *  3. sinon retourne true (on peut envoyer — client.email ou client_email présent).
 *
 * Le contenu fiscal des factures émises n'est JAMAIS modifié.
 * Renvoie `modal` à rendre dans le composant hôte.
 */
export function useRelanceGuard() {
  const { promptForEmail, modal: emailModal } = useEnsureClientEmail();
  const [pendingRecipient, setPendingRecipient] = useState<{ invoice: any; resolve: (v: string | null) => void } | null>(null);

  const promptForRecipient = useCallback((invoice: any) => {
    return new Promise<string | null>((resolve) => {
      setPendingRecipient({ invoice, resolve });
    });
  }, []);

  const ensureCanSend = useCallback(
    async (invoices: any[]): Promise<boolean> => {
      const list = (invoices || []).filter(Boolean);

      // 1. Aucun destinataire (no-client) : on capture un email inline, un par un.
      const noClient = list.filter((inv) => classifyRelanceInvoice(inv) === 'no-client');
      for (const inv of noClient) {
        // eslint-disable-next-line no-await-in-loop
        const email = await promptForRecipient(inv);
        if (!email) return false; // annulé
        // Renseigne le snapshot en local pour que la re-classification passe à 'ready'.
        inv.client_email = email;
      }

      // 2. Client lié sans email : on capture + persiste dans clients.email.
      const missingEmail = list.filter((inv) => classifyRelanceInvoice(inv) === 'missing-email');
      for (const inv of missingEmail) {
        const client = normalizeRelanceClient(inv);
        // eslint-disable-next-line no-await-in-loop
        const email = await promptForEmail(client);
        if (!email) return false; // annulé
      }

      return true;
    },
    [promptForEmail, promptForRecipient],
  );

  const handleRecipientResolved = (email: string) => { pendingRecipient?.resolve(email); setPendingRecipient(null); };
  const handleRecipientCancel = () => { pendingRecipient?.resolve(null); setPendingRecipient(null); };

  const modal: ReactNode = (
    <>
      {emailModal}
      {pendingRecipient && (
        <CaptureRecipientModal
          invoice={pendingRecipient.invoice}
          onResolved={handleRecipientResolved}
          onCancel={handleRecipientCancel}
        />
      )}
    </>
  );

  return { ensureCanSend, modal };
}


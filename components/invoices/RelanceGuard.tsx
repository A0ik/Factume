'use client';

import { useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { X, UserX, ArrowUpRight, Mail } from 'lucide-react';
import { useEnsureClientEmail } from './EnsureClientEmailModal';
import { classifyRelanceInvoice, relanceDisplayLabel, normalizeRelanceClient } from '@/lib/relance';

/**
 * ZÉNITH (CIBLE 1) — Modal BLOQUANT pour les factures sans client lié.
 * On ne peut pas demander un email : il n'y a personne à qui l'enregistrer.
 * On bloque donc l'envoi et on redirige vers la fiche facture pour relier un client.
 *
 * Cohérent visuellement avec EnsureClientEmailModal (hand-rolled, lucide, accent émeraude).
 */
export function NoClientRelanceModal({ invoices, onClose }: { invoices: any[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#15151a] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Aucun client</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {invoices.length} facture(s) à relier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/[0.06] border border-red-200 dark:border-red-500/20">
            <Mail className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">
              Impossible d&apos;envoyer une relance : ces factures n&apos;ont aucun client lié.
              Ouvrez la facture pour relier un client (et son email), puis relancez.
            </p>
          </div>

          <ul className="space-y-1.5 max-h-56 overflow-y-auto">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {relanceDisplayLabel(inv)}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                    Ouvrir
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-white/[0.08] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook unifié de garde relance. `ensureCanSend(invoices)` :
 *  1. si AU MOINS UNE facture n'a pas de client → ouvre NoClientRelanceModal (bloquant) + retourne false ;
 *  2. sinon, pour chaque client sans email → pop-up EnsureClientEmailModal (saisie +
 *     persistance dans clients.email via updateClient), séquentiellement ;
 *     retourne false si l'utilisateur annule ;
 *  3. sinon retourne true (on peut envoyer).
 *
 * Renvoie `modal` à rendre dans le composant hôte.
 */
export function useRelanceGuard() {
  const { promptForEmail, modal: emailModal } = useEnsureClientEmail();
  const [noClientInvoices, setNoClientInvoices] = useState<any[] | null>(null);

  const ensureCanSend = useCallback(
    async (invoices: any[]): Promise<boolean> => {
      const list = (invoices || []).filter(Boolean);

      // 1. No-client : on bloque tout le lot (envoi fantôme impossible).
      const noClient = list.filter((inv) => classifyRelanceInvoice(inv) === 'no-client');
      if (noClient.length > 0) {
        setNoClientInvoices(noClient);
        return false;
      }

      // 2. Missing-email : on capture + persiste l'email client, un par un.
      const missingEmail = list.filter((inv) => classifyRelanceInvoice(inv) === 'missing-email');
      for (const inv of missingEmail) {
        const client = normalizeRelanceClient(inv);
        // eslint-disable-next-line no-await-in-loop
        const email = await promptForEmail(client);
        if (!email) return false; // annulé
      }

      return true;
    },
    [promptForEmail],
  );

  const modal: ReactNode = (
    <>
      {emailModal}
      {noClientInvoices && (
        <NoClientRelanceModal invoices={noClientInvoices} onClose={() => setNoClientInvoices(null)} />
      )}
    </>
  );

  return { ensureCanSend, modal };
}

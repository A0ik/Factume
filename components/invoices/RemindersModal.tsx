'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Send, Loader2, Mail, AlertCircle, Bell, BellOff, CheckCircle } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'sonner';

interface RemindersModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ARGOS (CIBLE 5 — Relances) — Popup de relance multi-sélection.
 * Bouton « Relancer par mail » de /documents : liste les factures impayées, l'utilisateur
 * sélectionne les destinataires, « Relancer » envoie les emails (batch-send).
 * Contient aussi le toggle d'activation des relances AUTOMATIQUES (reminders_config.enabled)
 * que le cron /api/cron/reminders consomme quotidiennement.
 */
export function RemindersModal({ open, onClose }: RemindersModalProps) {
  const { invoices, fetchInvoices } = useDataStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState<boolean | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Factures impayées éligibles (factures envoyées ou en retard, hors devis/avoirs/commandes).
  const unpaid = useMemo(
    () => invoices.filter(
      (i: any) => i.document_type === 'invoice' && (i.status === 'sent' || i.status === 'overdue'),
    ),
    [invoices],
  );

  const tokenFetcher = async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Chargement de la config (état du toggle auto) à l'ouverture.
  useEffect(() => {
    if (!open) return;
    setLoadingConfig(true);
    (async () => {
      const token = await tokenFetcher();
      if (!token) { setLoadingConfig(false); return; }
      try {
        const res = await fetch('/api/reminders/config', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const cfg = await res.json();
          setAutoEnabled(cfg.enabled === true);
        }
      } catch { /* noop */ }
      setLoadingConfig(false);
    })();
  }, [open]);

  // Reset sélection à l'ouverture.
  useEffect(() => { if (open) setSelected(new Set()); }, [open]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === unpaid.length) setSelected(new Set());
    else setSelected(new Set(unpaid.map((i: any) => i.id)));
  };

  const daysOverdue = (inv: any) => {
    const due = new Date(inv.due_date || inv.issue_date || Date.now());
    return Math.max(0, Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleSend = async () => {
    if (selected.size === 0) {
      toast.error('Sélectionnez au moins une facture à relancer.');
      return;
    }
    setSending(true);
    const token = await tokenFetcher();
    if (!token) { toast.error('Session expirée. Reconnectez-vous.'); setSending(false); return; }
    try {
      const res = await fetch('/api/reminders/batch-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoiceIds: Array.from(selected), confirmed: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l\'envoi');
      toast.success(`${data.sent || 0} relance(s) envoyée(s)${data.failed ? `, ${data.failed} échec(s)` : ''}.`);
      setSelected(new Set());
      await fetchInvoices?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'envoi des relances.');
    } finally {
      setSending(false);
    }
  };

  const toggleAuto = async (enabled: boolean) => {
    setAutoEnabled(enabled);
    const token = await tokenFetcher();
    if (!token) { toast.error('Session expirée.'); return; }
    try {
      // PUT préserve les délais existants (on renvoie les valeurs par défaut, le toggle change enabled).
      const res = await fetch('/api/reminders/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Échec mise à jour');
      toast.success(enabled
        ? 'Relances automatiques activées (J+3 / J+7 / J+15).'
        : 'Relances automatiques désactivées.');
    } catch {
      setAutoEnabled(!enabled); // rollback
      toast.error('Impossible de modifier le réglage.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl bg-white dark:bg-[#15151a] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-white/[0.08] max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Relancer par email</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{unpaid.length} facture(s) impayée(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto toggle */}
        <div className="mx-5 mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            {autoEnabled ? <Bell className="w-4 h-4 text-emerald-600 mt-0.5" /> : <BellOff className="w-4 h-4 text-gray-400 mt-0.5" />}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Relances automatiques</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Envoi auto quotidien à J+3, J+7 puis J+15 (activable manuellement).</p>
            </div>
          </div>
          <button
            disabled={loadingConfig || autoEnabled === null}
            onClick={() => toggleAuto(!autoEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${autoEnabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-white/[0.12]'} disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {unpaid.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">Aucune facture impayée. Tout est à jour 👌</p>
            </div>
          ) : (
            <>
              <button onClick={toggleAll} className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline mb-1">
                {selected.size === unpaid.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              {unpaid.map((inv: any) => {
                const days = daysOverdue(inv);
                const isSel = selected.has(inv.id);
                return (
                  <label
                    key={inv.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSel ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/[0.06]' : 'border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.03]'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(inv.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {inv.client?.name || inv.client_name_override || 'Client'} — n° {inv.number || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(inv.total ?? 0).toFixed(2)} € · échéance {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${days > 0 ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'}`}>
                      {days > 0 ? `${days} j retard` : 'à échéance'}
                    </span>
                  </label>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        {unpaid.length > 0 && (
          <div className="p-5 border-t border-gray-200 dark:border-white/[0.08] flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {selected.size} sélectionnée(s)
            </p>
            <button
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-white/[0.08] disabled:cursor-not-allowed text-white font-medium text-sm flex items-center gap-2 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Relancer {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


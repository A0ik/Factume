'use client';

import { useState } from 'react';
import { Download, Trash2, Mail, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface BulkActionsProps {
  selectedIds: string[];
  onClear: () => void;
  onActionComplete?: () => void;
}

export function BulkActions({ selectedIds, onClear, onActionComplete }: BulkActionsProps) {
  const { session } = useAuthStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleBulkDelete = async () => {
    if (!session) return;

    const confirmed = confirm(`Supprimer ${selectedIds.length} facture(s) ? Cette action est irréversible.`);
    if (!confirmed) return;

    setActionLoading('delete');
    try {
      const promises = selectedIds.map(id =>
        fetch(`/api/invoices/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedIds.length} facture(s) supprimée(s)`);
      onClear();
      onActionComplete?.();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkMarkAsPaid = async () => {
    if (!session) return;

    setActionLoading('mark-paid');
    try {
      const promises = selectedIds.map(id =>
        fetch(`/api/invoices/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'paid' }),
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedIds.length} facture(s) marquée(s) comme payée(s)`);
      onClear();
      onActionComplete?.();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkMarkAsSent = async () => {
    if (!session) return;

    setActionLoading('mark-sent');
    try {
      const promises = selectedIds.map(id =>
        fetch(`/api/invoices/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'sent' }),
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedIds.length} facture(s) marquée(s) comme envoyée(s)`);
      onClear();
      onActionComplete?.();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkExport = async () => {
    setActionLoading('export');
    let ok = 0;
    try {
      // Route d'export authentifiée (GET, cookie-based). Une à la fois pour laisser
      // le navigateur enchaîner les téléchargements sans se saturer.
      for (const id of selectedIds) {
        const res = await fetch(`/api/download/pdf/${id}`);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const disp = res.headers.get('Content-Disposition') || '';
          const m = /filename="?([^"]+)"?/.exec(disp);
          a.download = m?.[1] || `document_${id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          ok++;
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      toast.success(ok > 0 ? `${ok} document(s) exporté(s)` : 'Aucun export possible');
    } catch {
      toast.error('Erreur lors de l\'export');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkSendReminders = async () => {
    if (!session) return;

    setActionLoading('remind');
    try {
      const promises = selectedIds.map(id =>
        fetch('/api/reminders/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invoiceId: id }),
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedIds.length} relance(s) envoyée(s)`);
      onClear();
      onActionComplete?.();
    } catch (err) {
      toast.error('Erreur lors de l\'envoi des relances');
    } finally {
      setActionLoading(null);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4">
        <span className="text-sm font-semibold">
          {selectedIds.length} facture(s) sélectionnée(s)
        </span>

        <div className="h-6 w-px bg-white/20 dark:bg-gray-900/20" />

        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkExport}
            disabled={actionLoading !== null}
            className="p-2 rounded-xl hover:bg-white/10 dark:hover:bg-gray-900/10 transition-colors disabled:opacity-50"
            title="Exporter en PDF"
          >
            {actionLoading === 'export' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
          </button>

          <button
            onClick={handleBulkSendReminders}
            disabled={actionLoading !== null}
            className="p-2 rounded-xl hover:bg-white/10 dark:hover:bg-gray-900/10 transition-colors disabled:opacity-50"
            title="Envoyer relances"
          >
            {actionLoading === 'remind' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Mail size={18} />
            )}
          </button>

          <button
            onClick={handleBulkMarkAsSent}
            disabled={actionLoading !== null}
            className="p-2 rounded-xl hover:bg-white/10 dark:hover:bg-gray-900/10 transition-colors disabled:opacity-50"
            title="Marquer comme envoyé"
          >
            {actionLoading === 'mark-sent' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileText size={18} />
            )}
          </button>

          <button
            onClick={handleBulkMarkAsPaid}
            disabled={actionLoading !== null}
            className="p-2 rounded-xl hover:bg-white/10 dark:hover:bg-gray-900/10 transition-colors disabled:opacity-50"
            title="Marquer comme payé"
          >
            {actionLoading === 'mark-paid' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle size={18} />
            )}
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={actionLoading !== null}
            className="p-2 rounded-xl hover:bg-red-500/20 text-red-400 dark:text-red-500 transition-colors disabled:opacity-50"
            title="Supprimer"
          >
            {actionLoading === 'delete' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>

          <div className="h-6 w-px bg-white/20 dark:bg-gray-900/20 mx-2" />

          <button
            onClick={onClear}
            disabled={actionLoading !== null}
            className="text-sm font-semibold hover:bg-white/10 dark:hover:bg-gray-900/10 px-3 py-1 rounded-lg transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useDocumentSessionStore } from '@/components/canvas-copilot/documentSessionStore';
import CanvasCopilotLayout from '@/components/canvas-copilot/CanvasCopilotLayout';
import { InvoiceItem } from '@/types';
import { toast } from 'sonner';

const IMMUTABLE = ['sent', 'paid', 'overdue', 'cancelled', 'refunded', 'partial', 'delivered', 'rejected'];

/**
 * EditDocumentContent — Contenu de la page d'édition.
 *
 * LOI 2 (Arbiter) — l'édition utilise le MÊME <CanvasCopilotLayout /> que la création.
 * La session est hydratée depuis la facture existante (documentSessionStore.hydrate),
 * et le bouton "Enregistrer" déclenche updateInvoice au lieu de createInvoice.
 *
 * Gardes-fous d'immuabilité (LOI 8) reproduits depuis InvoiceForm.
 */
export default function EditDocumentContent({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { invoices, loading, updateInvoice } = useDataStore();
  const sub = useSubscription();

  const session = useDocumentSessionStore();
  const savingRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  const invoice = invoices.find((i) => i.id === invoiceId) || null;

  // ─── Hydrate la session depuis la facture ─────────────
  useEffect(() => {
    if (invoice && !hydrated) {
      session.hydrate(invoice);
      setHydrated(true);
    }
  }, [invoice, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Gardes-fous immuabilité (LOI 8) ──────────────────
  if (!loading && invoice) {
    if (!sub.canEditInvoice) {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Modification verrouillée</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            La modification est réservée aux abonnés payants. Passez à un plan Pro ou Business pour débloquer cette fonctionnalité.
          </p>
          <button onClick={() => router.push('/trial')} className="px-5 py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-colors inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Voir les plans
          </button>
        </div>
      );
    }
    if (invoice.status === 'accepted' && invoice.signed_at && invoice.document_type === 'quote') {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Devis signé</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Ce devis a été signé par le client et ne peut plus être modifié. La signature électronique a valeur légale.
          </p>
          <button onClick={() => router.push(`/invoices/${invoice.id}`)} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-semibold text-sm hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Retour au devis
          </button>
        </div>
      );
    }
    if (IMMUTABLE.includes(invoice.status)) {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Document non modifiable</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Ce document a le statut « {invoice.status} » et ne peut plus être modifié (Art. L.441-9 du Code de commerce). Créez un avoir si une correction est nécessaire.
          </p>
          <button onClick={() => router.push(`/invoices/${invoice.id}`)} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-semibold text-sm hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      );
    }
  }

  // ─── Chargement ──────────────────────────────────────
  if (loading || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-white/10 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  // ─── Sauvegarde (update) ─────────────────────────────
  const handleSave = useCallback(async () => {
    if (!invoice) return;
    if (savingRef.current) return;

    if (!session.clientName && !session.items[0]?.description) {
      session.setError('Renseignez au moins un client ou une prestation.');
      return;
    }
    if (!session.items.some((i) => i.quantity > 0 && i.unit_price > 0)) {
      session.setError('Ajoutez au moins une prestation avec un montant.');
      return;
    }

    savingRef.current = true;
    session.setSaving(true);
    session.setError('');

    try {
      await Promise.race([
        updateInvoice(invoice.id, {
          client_id: session.clientId || undefined,
          client_name_override: session.clientId ? undefined : session.clientName || undefined,
          document_type: session.documentType,
          issue_date: session.issueDate,
          due_date: session.dueDate || undefined,
          items: session.items as InvoiceItem[],
          notes: session.notes || undefined,
          discount_percent: session.discountPercent > 0 ? session.discountPercent : undefined,
          client_email: session.clientEmail || undefined,
          client_phone: session.clientPhone || undefined,
          client_address: session.clientAddress || undefined,
          client_city: session.clientCity || undefined,
          client_postal_code: session.clientPostalCode || undefined,
          client_siret: session.clientSiret || undefined,
          client_vat_number: session.clientVatNumber || undefined,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('__timeout__')), 7000)),
      ]);
      toast.success('Document modifié avec succès !');
      setTimeout(() => router.push(`/invoices/${invoice.id}`), 400);
    } catch (e: any) {
      if (e?.message === '__timeout__') {
        session.setError('Délai dépassé — réessayez.');
        toast.error('Délai dépassé — réessayez');
      } else {
        session.setError(e?.message || 'Erreur lors de la modification.');
        toast.error(e?.message || 'Erreur lors de la modification');
      }
    } finally {
      savingRef.current = false;
      session.setSaving(false);
    }
  }, [invoice, session, updateInvoice, router]);

  const handleBack = useCallback(() => {
    if (invoice) router.push(`/invoices/${invoice.id}`);
  }, [invoice, router]);

  const handlePaywall = useCallback(() => {
    router.push('/paywall');
  }, [router]);

  return (
    <CanvasCopilotLayout
      profile={profile}
      isPro={sub.canUseVoice}
      onPaywall={handlePaywall}
      onSave={handleSave}
      onBack={handleBack}
      mode="edit"
    />
  );
}

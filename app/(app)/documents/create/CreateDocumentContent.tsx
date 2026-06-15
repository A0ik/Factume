'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useDocumentSessionStore } from '@/components/canvas-copilot/documentSessionStore';
import CanvasCopilotLayout from '@/components/canvas-copilot/CanvasCopilotLayout';
import { DOC_TYPE_CONFIGS } from '@/components/canvas-copilot/config/documentTypeConfig';
import { DocumentType } from '@/types';
import ClientTypeModal from '@/components/invoices/ClientTypeModal';
import { toast } from 'sonner';

const VALID_TYPES: DocumentType[] = [
  'invoice', 'quote', 'credit_note', 'deposit',
  'purchase_order', 'delivery_note',
];

/**
 * Inner content for the document creation page.
 * Must be wrapped in <Suspense> by the parent because it calls useSearchParams().
 */
export default function CreateDocumentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuthStore();
  const { clients, createInvoice } = useDataStore();
  const sub = useSubscription();

  const session = useDocumentSessionStore();
  const savingRef = useRef(false);
  const [showClientTypeModal, setShowClientTypeModal] = useState(false);

  // ─── Parse URL params ──────────────────────────────
  const docType = (searchParams.get('type') || 'invoice') as DocumentType;
  const paramClientId = searchParams.get('clientId');
  const paramClientName = searchParams.get('clientName');
  const paramLinkedInvoiceId = searchParams.get('linkedInvoiceId');

  // Validate document type
  const isValidType = VALID_TYPES.includes(docType);
  const effectiveType = isValidType ? docType : 'invoice';

  // ─── Initialize session ────────────────────────────
  useEffect(() => {
    session.init(effectiveType, {
      clientId: paramClientId || undefined,
      clientName: paramClientName || undefined,
      linkedInvoiceId: paramLinkedInvoiceId || undefined,
    });

    return () => {
      // Clean up on unmount
    };
  }, [effectiveType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-fill client details when clientId is selected ──
  useEffect(() => {
    if (session.clientId && clients.length > 0) {
      const c = clients.find((cl) => cl.id === session.clientId);
      if (c) {
        session.updateField('clientEmail', c.email || '');
        session.updateField('clientPhone', c.phone || '');
        session.updateField('clientAddress', c.address || '');
        session.updateField('clientCity', c.city || '');
        session.updateField('clientPostalCode', c.postal_code || '');
        session.updateField('clientSiret', c.siret || '');
        session.updateField('clientVatNumber', c.vat_number || '');
      }
    }
  }, [session.clientId, clients]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Save handler ──────────────────────────────────
  const handleSave = useCallback(async () => {
    if (savingRef.current) return;

    // Validation
    if (!session.clientName && !session.items[0]?.description) {
      session.setError('Renseignez au moins un client ou une prestation.');
      return;
    }
    if (!session.items.some((i) => i.quantity > 0 && i.unit_price > 0)) {
      session.setError('Ajoutez au moins une prestation avec un montant.');
      return;
    }
    if (!profile?.id) {
      session.setError('Profil introuvable. Veuillez vous reconnecter.');
      return;
    }

    // Check client type (B2B/B2C) — required for PDP compliance
    if (!session.clientType) {
      setShowClientTypeModal(true);
      return;
    }

    // BUG 3: SIRET required for B2B invoices
    if (session.clientType === 'b2b' && !session.clientSiret?.trim()) {
      session.setError('Le SIRET du client est obligatoire pour une facture B2B (entreprise).');
      toast.error('SIRET client requis pour le B2B');
      return;
    }

    savingRef.current = true;
    session.setSaving(true);
    session.setError('');

    const idempotencyId = crypto.randomUUID();

    try {
      const newInvoice = await Promise.race([
        createInvoice(
          {
            client_id: session.clientId || undefined,
            client_name_override: session.clientId ? undefined : session.clientName || undefined,
            document_type: effectiveType,
            issue_date: session.issueDate,
            due_date: session.dueDate || undefined,
            items: session.items,
            notes: session.notes || undefined,
            discount_percent: session.discountPercent > 0 ? session.discountPercent : undefined,
            client_email: session.clientId ? undefined : session.clientEmail || undefined,
            client_phone: session.clientId ? undefined : session.clientPhone || undefined,
            client_address: session.clientId ? undefined : session.clientAddress || undefined,
            client_city: session.clientId ? undefined : session.clientCity || undefined,
            client_postal_code: session.clientId ? undefined : session.clientPostalCode || undefined,
            client_siret: session.clientId ? undefined : session.clientSiret || undefined,
            client_vat_number: session.clientId ? undefined : session.clientVatNumber || undefined,
            client_type: session.clientType,
            linked_invoice_id: session.linkedInvoiceId || undefined,
          },
          profile,
          idempotencyId,
        ),
        new Promise<never>((_, reject) =>
          // SENTINEL (URGENCE 1) : 60s (au lieu de 15s) — la transmission e-facturation
          // B2B (SuperPDP) peut dépasser 15s ; un timeout trop court masquait une
          // création réussie et empêchait la redirection de succès.
          setTimeout(() => reject(new Error('__timeout__')), 60000),
        ),
      ]);

      // Success
      const config = DOC_TYPE_CONFIGS[effectiveType];
      toast.success(`${config.shortLabel} créé${effectiveType === 'invoice' ? 'e' : ''} avec succès !`, {
        description: session.clientName ? `Pour ${session.clientName}` : undefined,
      });

      setTimeout(() => {
        router.push(`/invoices/${newInvoice.id}`);
      }, 100);
    } catch (e: any) {
      console.error('[CreateDocument] Error:', e);
      if (e?.message === '__timeout__') {
        // SENTINEL (URGENCE 1) : un timeout ≠ un échec. La facture est très
        // probablement créée côté serveur (la transmission e-facturation B2B via
        // SuperPDP peut dépasser 60s). On redirige vers la liste plutôt que
        // d'afficher un échec trompeur.
        session.setError('Création en cours : la transmission e-facturation prend plus de temps que prévu. Votre document est probablement créé.');
        toast.info('Création en cours — vérifiez vos documents.', {
          description: 'La e-facturation B2B peut prendre jusqu’à 1 minute.',
        });
        setTimeout(() => router.push('/invoices'), 1500);
      } else if (e?.code === 'LIMIT_REACHED' || e?.message?.includes('Limite')) {
        // SENTINEL (URGENCE 1) : le serveur renvoie « Limite atteinte (X/Y)… »
        // (et non « Limite de »). On matche le code structuré propagé par dataStore
        // + le texte réel, pour enfin rediriger vers /paywall.
        session.setError('Limite de documents atteinte.');
        toast.error('Limite atteinte !');
        setTimeout(() => router.push('/paywall'), 1500);
      } else {
        session.setError(e?.message || 'Erreur lors de la création.');
        toast.error(e?.message || 'Erreur lors de la création');
      }
    } finally {
      savingRef.current = false;
      session.setSaving(false);
    }
  }, [session, effectiveType, profile, createInvoice, router]);

  // ─── Client type selection handler ──────────────────
  const handleClientTypeSelect = useCallback((type: 'b2b' | 'b2c') => {
    session.updateField('clientType', type);
    setShowClientTypeModal(false);
  }, [session]);

  // ─── Navigation handlers ───────────────────────────
  const handleBack = useCallback(() => {
    const config = DOC_TYPE_CONFIGS[effectiveType];
    router.push(`/documents/${config.slug}`);
  }, [effectiveType, router]);

  const handlePaywall = useCallback(() => {
    router.push('/paywall');
  }, [router]);

  // ─── Render ────────────────────────────────────────
  if (!isValidType) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">Type de document invalide</p>
          <button
            onClick={() => router.push('/documents')}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold"
          >
            Retour aux documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ClientTypeModal
        open={showClientTypeModal}
        onSelect={handleClientTypeSelect}
        clientName={session.clientName || undefined}
      />
      <CanvasCopilotLayout
        profile={profile}
        isPro={sub.canUseVoice}
        onPaywall={handlePaywall}
        onSave={handleSave}
        onBack={handleBack}
      />
    </>
  );
}

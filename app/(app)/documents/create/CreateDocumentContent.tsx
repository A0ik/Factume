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
  // PROMETHEUS (CIBLE 8) — hydratation A→Z depuis la fiche client quand on arrive
  // de /client (DocPickerModal → ?clientId=…). On passe tous les champs à init().
  // Si clients[] n'est pas encore chargé au mount, l'effet d'auto-fill ci-dessous
  // (qui dépend de [session.clientId, clients]) complète dès que les données
  // arrivent — y compris le clientType, qui n'était JAMAIS pré-rempli auparavant.
  const initClient = paramClientId ? clients.find((c) => c.id === paramClientId) : undefined;

  useEffect(() => {
    // ATHÉNA (C1#5) — anti-amnésie : si l'arrivée sur la création est « neutre »
    // (aucun paramètre de préfill : ni client, ni fiche, ni avoir lié, ni montant
    // issu du Copilot), on RESTAURE d'abord un brouillon non enregistré (perte en
    // cas de refresh/navigation après dictée ou saisie) avant d'initialiser à vide.
    const hasPrefill = !!(
      paramClientId || paramClientName || paramLinkedInvoiceId
      || searchParams.get('amount') || searchParams.get('client')
    );
    if (!hasPrefill && session.tryResumeDraft(effectiveType)) {
      return () => { /* brouillon restauré — rien à nettoyer */ };
    }

    session.init(effectiveType, {
      clientId: paramClientId || undefined,
      clientName: paramClientName || initClient?.name,
      clientEmail: initClient?.email,
      clientPhone: initClient?.phone,
      clientAddress: initClient?.address,
      clientCity: initClient?.city,
      clientPostalCode: initClient?.postal_code,
      clientSiret: initClient?.siret,
      clientVatNumber: initClient?.vat_number,
      // B2B si la fiche porte un SIRET, sinon B2C — sinon on laisse l'utilisateur choisir.
      clientType: initClient?.siret ? 'b2b' : initClient ? 'b2c' : undefined,
      linkedInvoiceId: paramLinkedInvoiceId || undefined,
    });

    return () => {
      // Clean up on unmount
    };
  }, [effectiveType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pont FAB↔Canvas — montant pré-rempli par le Copilot (redirect_to_invoice_creator).
  // Le tool passe ?amount=…&clientName=… ; le client est appliqué par init() via
  // paramClientName, et le montant est posé ici sur la 1re ligne.
  const paramAmount = searchParams.get('amount');
  useEffect(() => {
    if (!paramAmount) return;
    const amt = parseFloat(paramAmount);
    if (!isFinite(amt) || amt <= 0) return;
    const first = session.items[0];
    if (first && first.unit_price !== amt) {
      session.updateItem(first.id, 'unit_price', amt);
    }
  }, [paramAmount, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-fill client details when clientId is selected ──
  // PHOENIX FIX (CRISE 0+1C / React #310) : garde d'égalité obligatoire.
  // `updateField` crée TOUJOURS un nouvel état Zustand (même si la valeur est
  // identique), ce qui déclenche un re-render. Comme `clients` est un array
  // instable (lu sans sélecteur sur useDataStore), l'effet se re-déclenchait à
  // chaque render → updateField → re-render → nouvelle réf `clients` → effet → ∞
  // → "Maximum update depth exceeded" (#310), qui tuait la page et rendait le
  // bouton « Créer » inactif. On ne mute désormais que si la valeur change.
  //
  // IMPORTANT : on garde les deps MINIMALES [session.clientId, clients]. NE PAS
  // ajouter session.clientEmail/etc. dans les deps — sinon chaque frappe de
  // l'utilisateur dans le champ email re-déclencherait l'effet et écraserait sa
  // saisie avec la valeur du client. La garde d'égalité suffit à casser la boucle.
  useEffect(() => {
    if (!session.clientId || clients.length === 0) return;
    const c = clients.find((cl) => cl.id === session.clientId);
    if (!c) return;

    if (session.clientEmail !== (c.email || '')) session.updateField('clientEmail', c.email || '');
    if (session.clientPhone !== (c.phone || '')) session.updateField('clientPhone', c.phone || '');
    if (session.clientAddress !== (c.address || '')) session.updateField('clientAddress', c.address || '');
    if (session.clientCity !== (c.city || '')) session.updateField('clientCity', c.city || '');
    if (session.clientPostalCode !== (c.postal_code || '')) session.updateField('clientPostalCode', c.postal_code || '');
    if (session.clientSiret !== (c.siret || '')) session.updateField('clientSiret', c.siret || '');
    if (session.clientVatNumber !== (c.vat_number || '')) session.updateField('clientVatNumber', c.vat_number || '');
    // PROMETHEUS (CIBLE 8) — clientType était JAMAIS pré-rempli (b2b si SIRET, sinon b2c).
    const inferredType = c.siret ? 'b2b' : 'b2c';
    if (session.clientType !== inferredType) session.updateField('clientType', inferredType);
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
            // PROMETHEUS (CIBLE 1) — on persiste le termId SÉMANTIQUE (reception /
            // days15 / … / end_of_month / custom-N) au lieu d'un simple nombre de
            // jours. C'est le seul moyen d'exprimer « fin de mois » et de fixer le
            // bug « toujours 30 jours » (la colonne invoices.payment_terms existe
            // désormais via la migration 20260620000005). Voir lib/payment-terms.ts.
            payment_terms: session.paymentTermId,
            items: session.items,
            notes: session.notes || undefined,
            discount_percent: session.discountType === 'percent' && session.discountPercent > 0 ? session.discountPercent : undefined,
            discount_amount: session.discountType === 'amount' && session.discountAmountInput > 0 ? session.discountAmountInput : undefined,
            discount_type: session.discountType,
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
      // ATHÉNA (C1#5) — création réussie : on efface le brouillon persisté.
      session.clearDraft();

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

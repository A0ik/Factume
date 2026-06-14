'use client';

import { use } from 'react';
import EditDocumentContent from './EditDocumentContent';

/**
 * LOI 2 (Arbiter) — l'édition utilise le MÊME <CanvasCopilotLayout /> que la création.
 * EditDocumentContent hydrate la session depuis la facture existante, applique les
 * gardes-fous d'immuabilité (LOI 8) et branche updateInvoice au bouton "Enregistrer".
 */
export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EditDocumentContent invoiceId={id} />;
}

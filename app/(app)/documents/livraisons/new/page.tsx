'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceForm from '@/components/invoices/InvoiceForm';

/**
 * LOI 2 (Arbiter) — la création est UN seul composant <InvoiceForm />,
 * strictement identique à l'édition (mêmes champs, même micro, même design).
 */
function NewLivraisonInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const clientName = searchParams.get('clientName');

  return (
    <InvoiceForm
      docType="delivery_note"
      initialClientId={clientId}
      initialClientName={clientName || undefined}
    />
  );
}

export default function NewLivraisonsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
      <NewLivraisonInner />
    </Suspense>
  );
}

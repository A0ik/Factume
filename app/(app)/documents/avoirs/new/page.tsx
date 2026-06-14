'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceForm from '@/components/invoices/InvoiceForm';

/**
 * LOI 2 (Arbiter) — la création est UN seul composant <InvoiceForm />,
 * strictement identique à l'édition. Pour un avoir, InvoiceForm exige la
 * sélection de la facture d'origine (Art. L.441-9 du Code de commerce).
 */
function NewAvoirInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const clientName = searchParams.get('clientName');
  const linkedInvoiceId = searchParams.get('invoiceId'); // pré-sélection possible depuis la facture

  return (
    <InvoiceForm
      docType="credit_note"
      initialClientId={clientId}
      initialClientName={clientName || undefined}
      initialLinkedInvoiceId={linkedInvoiceId}
    />
  );
}

export default function NewAvoirsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
      <NewAvoirInner />
    </Suspense>
  );
}

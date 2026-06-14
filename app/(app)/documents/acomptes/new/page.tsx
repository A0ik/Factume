'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceForm from '@/components/invoices/InvoiceForm';

/**
 * LOI 2 (Arbiter) — la création est UN seul composant <InvoiceForm />,
 * strictement identique à l'édition. Pour un acompte, InvoiceForm propose
 * de lier la facture d'origine et de pré-remplir le montant via un %.
 */
function NewAcompteInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const clientName = searchParams.get('clientName');

  return (
    <InvoiceForm
      docType="deposit"
      initialClientId={clientId}
      initialClientName={clientName || undefined}
    />
  );
}

export default function NewAcomptesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>}>
      <NewAcompteInner />
    </Suspense>
  );
}

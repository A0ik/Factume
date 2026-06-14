'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * CreateDocumentRedirect — redirige proprement les routes de création legacy
 * vers la page unifiée /documents/create (Canvas + Copilot).
 *
 * Préserve les paramètres pertinents : type, clientId, clientName, linkedInvoiceId, invoiceId.
 * La navigation se fait dans un effet (jamais pendant le rendu) pour rester compatible
 * avec le rendu concurrent de React 19.
 */
export default function CreateDocumentRedirect({ type }: { type: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams({ type });
    for (const key of ['clientId', 'clientName', 'linkedInvoiceId', 'invoiceId']) {
      const v = searchParams.get(key);
      if (v) params.set(key, v);
    }
    router.replace(`/documents/create?${params.toString()}`);
  }, [router, searchParams, type]);

  return null;
}

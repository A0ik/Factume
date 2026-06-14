'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * LOI 2 (Arbiter) — la création passe désormais par la page unifiée /documents/create.
 * Ce dispatcher préserve les paramètres (type, clientId, clientName).
 */
export default function NewInvoiceRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type') || 'invoice';
    const clientId = searchParams.get('clientId');
    const clientName = searchParams.get('clientName');

    const params = new URLSearchParams();
    params.set('type', type);
    if (clientId) params.set('clientId', clientId);
    if (clientName) params.set('clientName', clientName);

    router.push(`/documents/create?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Redirection...</p>
      </div>
    </div>
  );
}

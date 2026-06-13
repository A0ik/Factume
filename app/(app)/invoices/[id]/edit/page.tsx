'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { Invoice } from '@/types';

/**
 * LOI 2 (Arbiter) — l'édition utilise le MÊME composant <InvoiceForm /> que la création.
 * L'objet `invoice` passé en prop déclenche le mode édition (pré-rempli + updateInvoice).
 * Les gardes-fous d'immuabilité (LOI 8) sont gérés à l'intérieur du composant.
 */
export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { invoices, loading } = useDataStore();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const found = invoices.find((i) => i.id === id) || null;
    setInvoice(found);
    if (!loading) setChecked(true);
  }, [invoices, id, loading]);

  // Chargement en cours
  if (!checked) {
  return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Chargement du document…</p>
        </div>
      </div>
    );
  }

  // Introuvable
  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Document introuvable</p>
        <button onClick={() => router.push('/documents/factures')} className="mt-3 text-blue-600 font-semibold text-sm hover:underline">Retour</button>
      </div>
    );
  }

  return <InvoiceForm invoice={invoice} />;
}

'use client';

import { Suspense } from 'react';
import CreateDocumentRedirect from '@/components/documents/CreateDocumentRedirect';

/** Route legacy → redirection vers /documents/create?type=delivery_note (page unifiée). */
export default function NewLivraisonsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <CreateDocumentRedirect type="delivery_note" />
    </Suspense>
  );
}

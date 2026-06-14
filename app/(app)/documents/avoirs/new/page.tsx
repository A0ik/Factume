'use client';

import { Suspense } from 'react';
import CreateDocumentRedirect from '@/components/documents/CreateDocumentRedirect';

/** Route legacy → redirection vers /documents/create?type=credit_note (page unifiée). */
export default function NewAvoirsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <CreateDocumentRedirect type="credit_note" />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { DocumentType } from '@/types';
import CreateDocumentContent from './CreateDocumentContent';

const VALID_TYPES: DocumentType[] = [
  'invoice', 'quote', 'credit_note', 'deposit',
  'purchase_order', 'delivery_note',
];

/**
 * Unified document creation page — Canvas + Copilot paradigm.
 * Replaces the 6 separate /documents/{type}/new pages.
 *
 * URL: /documents/create?type=invoice&clientId=xxx&clientName=xxx
 *
 * IMPORTANT: This wrapper provides the <Suspense> boundary required by
 * useSearchParams() in Next.js 15 + React 19. Without it, the page
 * crashes with a hydration error (React #185).
 */
export default function CreateDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement du document…</p>
        </div>
      }
    >
      <CreateDocumentContent />
    </Suspense>
  );
}

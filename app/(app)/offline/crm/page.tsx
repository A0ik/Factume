'use client';

import CrmKanbanView from '@/components/crm/CrmKanbanView';

/**
 * /offline/crm — même Kanban que /crm (composant partagé CrmKanbanView).
 * Conservé pour la compatibilité des liens profonds / PWA.
 */
export default function CrmPage() {
  return <CrmKanbanView />;
}

'use client';

import CrmKanbanView from '@/components/crm/CrmKanbanView';

/**
 * /crm — route canonique du véritable Pipeline CRM (Kanban drag & drop).
 * Auparavant un stub qui redirigeait (avec un bug) vers /contacts?tab=crm.
 * Désormais le vrai Kanban s'affiche ici directement.
 */
export default function CrmPage() {
  return <CrmKanbanView />;
}

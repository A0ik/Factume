// Static check metadata — safe to import in client components.
// The actual check logic (which uses Supabase) lives in data-health-engine.ts (server-only).

import { Copy, Layers, Tag, Percent, Landmark, AlertTriangle, User, Receipt, Building2, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CheckMeta {
  id: string;
  label: string;
  weight: number;
  icon: LucideIcon;
}

export const CHECK_METADATA: CheckMeta[] = [
  { id: 'duplicate_invoices',        label: 'Factures en doublon',             weight: 15, icon: Copy },
  { id: 'duplicate_expenses',        label: 'Dépenses en doublon',             weight: 10, icon: Layers },
  { id: 'uncategorized_expenses',    label: 'Dépenses non catégorisées',       weight: 10, icon: Tag },
  { id: 'vat_consistency',           label: 'Cohérence TVA',                   weight: 15, icon: Percent },
  { id: 'unreconciled_transactions', label: 'Transactions non rapprochées',    weight: 15, icon: Landmark },
  { id: 'overdue_invoices',          label: 'Factures en retard',              weight: 10, icon: AlertTriangle },
  { id: 'missing_client_info',       label: 'Infos clients manquantes',        weight: 10, icon: User },
  { id: 'expenses_without_receipts', label: 'Dépenses sans justificatif',      weight:  5, icon: Receipt },
  { id: 'supplier_consistency',      label: 'Cohérence fournisseurs',          weight:  5, icon: Building2 },
  { id: 'accounting_completeness',   label: 'Complétude comptable',            weight:  5, icon: BarChart3 },
];

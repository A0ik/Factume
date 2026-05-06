// Static check metadata — safe to import in client components.
// The actual check logic (which uses Supabase) lives in data-health-engine.ts (server-only).

export interface CheckMeta {
  id: string;
  label: string;
  weight: number;
  icon: string;
}

export const CHECK_METADATA: CheckMeta[] = [
  { id: 'duplicate_invoices',        label: 'Factures en doublon',             weight: 15, icon: '📄' },
  { id: 'duplicate_expenses',        label: 'Dépenses en doublon',             weight: 10, icon: '💰' },
  { id: 'uncategorized_expenses',    label: 'Dépenses non catégorisées',       weight: 10, icon: '🏷️' },
  { id: 'vat_consistency',           label: 'Cohérence TVA',                   weight: 15, icon: '🧮' },
  { id: 'unreconciled_transactions', label: 'Transactions non rapprochées',    weight: 15, icon: '🏦' },
  { id: 'overdue_invoices',          label: 'Factures en retard',              weight: 10, icon: '⚠️' },
  { id: 'missing_client_info',       label: 'Infos clients manquantes',        weight: 10, icon: '👤' },
  { id: 'expenses_without_receipts', label: 'Dépenses sans justificatif',      weight:  5, icon: '🧾' },
  { id: 'supplier_consistency',      label: 'Cohérence fournisseurs',          weight:  5, icon: '🏭' },
  { id: 'accounting_completeness',   label: 'Complétude comptable',            weight:  5, icon: '📊' },
];

'use client';
import { cn } from '@/lib/utils';
import { InvoiceStatus } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400',
    success: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  );
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  sent: { label: 'Envoyée', variant: 'info' },
  paid: { label: 'Payée', variant: 'success' },
  overdue: { label: 'En retard', variant: 'danger' },
  accepted: { label: 'Acceptée', variant: 'success' },
  refused: { label: 'Refusée', variant: 'danger' },
  cancelled: { label: 'Annulé', variant: 'danger' },
  refunded: { label: 'Remboursé', variant: 'warning' },
  rejected: { label: 'Rejeté', variant: 'danger' },
  expired: { label: 'Expiré', variant: 'default' },
  pending: { label: 'En attente', variant: 'warning' },
  partial: { label: 'Partiel', variant: 'info' },
  delivered: { label: 'Livré', variant: 'success' },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'default' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-14 px-4', className)}>
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Icon size={26} className="text-gray-400" strokeWidth={1.6} />
      </div>
      <p className="text-gray-900 font-semibold mb-1">{title}</p>
      {description && <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">{description}</p>}
      {action}
    </div>
  );
}

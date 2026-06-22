'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title?: string;
  icon?: LucideIcon;
  accent?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  icon: Icon,
  accent = '#10b981',
  action,
  badge,
  children,
  className,
  bodyClassName,
  noPadding,
}: SectionCardProps) {
  return (
    <section className={cn('rounded-2xl border border-gray-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
          {Icon && (
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              <Icon size={15} strokeWidth={2.2} />
            </span>
          )}
          {title && (
            <h3 className="font-bold text-gray-900 text-sm flex-1 truncate flex items-center gap-2">
              {title}
              {badge}
            </h3>
          )}
          {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(!noPadding && 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

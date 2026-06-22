'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type BadgeTone = 'good' | 'warning' | 'critical' | 'info' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  // Uniquement des tokens remappés par globals.css (.dark) → clair/sombre auto
  good: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-600',
  info: 'bg-brand-50 text-brand-700',
  neutral: 'bg-gray-100 text-gray-600',
};

interface StatusBadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  /** Pastille colorée libre (hex) — désactive le tone et rend un pill neutre + point. */
  dot?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  tone = 'neutral',
  icon: Icon,
  dot,
  children,
  className,
  size = 'md',
}: StatusBadgeProps) {
  // Mode « dot » : pill neutre (bg-gray-100) + point coloré → fonctionne en clair/sombre
  // quelle que soit la couleur (évite les couleurs non remappées par globals.css).
  if (dot) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap bg-gray-100 text-gray-700',
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
          className,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 10 : 12} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

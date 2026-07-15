'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type BadgeTone = 'good' | 'warning' | 'critical' | 'info' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  // Variants translucides sémantiques → lisibles en clair ET en sombre
  good: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  neutral: 'bg-muted text-muted-foreground',
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
          'inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap bg-muted text-muted-foreground',
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

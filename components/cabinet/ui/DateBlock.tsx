'use client';

import { cn } from '@/lib/utils';

interface DateBlockProps {
  date: string | Date;
  daysUntil?: number;
  compact?: boolean;
}

// Bloc « date » façon échéance : jour + mois, teinté par l'urgence.
export function DateBlock({ date, daysUntil, compact }: DateBlockProps) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.toLocaleDateString('fr-FR', { day: '2-digit' });
  const month = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

  const urgent = daysUntil !== undefined && daysUntil < 0;
  const soon = daysUntil !== undefined && daysUntil >= 0 && daysUntil <= 3;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border text-center flex-shrink-0',
        compact ? 'w-11 h-12' : 'w-12 h-14',
        urgent
          ? 'bg-red-50 border-red-100'
          : soon
            ? 'bg-amber-50 border-amber-100'
            : 'bg-gray-50 border-gray-200',
      )}
    >
      <span
        className={cn(
          'font-black leading-none',
          compact ? 'text-base' : 'text-lg',
          urgent ? 'text-red-600' : soon ? 'text-amber-700' : 'text-gray-900',
        )}
      >
        {day}
      </span>
      <span
        className={cn(
          'uppercase font-semibold mt-0.5',
          compact ? 'text-[9px]' : 'text-[10px]',
          urgent ? 'text-red-600/80' : soon ? 'text-amber-700/80' : 'text-gray-500',
        )}
      >
        {month}
      </span>
    </div>
  );
}

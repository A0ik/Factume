'use client';

import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Appointment, Invoice } from '@/types';

// Helper function to check if date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

interface MagnificentCalendarDayCellProps {
  day: number | null;
  currentYear: number;
  currentMonth: number;
  isSelected: boolean;
  appointments: Appointment[];
  invoices: Invoice[];
  onClick: () => void;
  className?: string;
}

export function MagnificentCalendarDayCell({
  day,
  currentYear,
  currentMonth,
  isSelected,
  appointments,
  invoices,
  onClick,
  className,
}: MagnificentCalendarDayCellProps) {
  if (day === null) {
    return <div className="aspect-square sm:aspect-auto sm:min-h-[52px]" />;
  }

  const date = new Date(currentYear, currentMonth, day);
  const todayFlag = isToday(date);
  const hasAppts = appointments.length > 0;
  const hasInvoices = invoices.length > 0;
  const totalEvents = appointments.length + invoices.length;

  const cellVariants: Variants = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: 'easeOut' } },
  };

  return (
    <motion.div
      variants={cellVariants}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={cn(
        'relative aspect-square sm:aspect-auto sm:min-h-[52px] rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200',
        'group overflow-hidden flex flex-col items-center justify-between py-1.5 px-1',
        // Background
        todayFlag && !isSelected
          ? 'bg-gradient-to-br from-primary/20 to-emerald-500/20 dark:from-primary/30 dark:to-emerald-500/30'
          : !isSelected ? 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80' : '',
        isSelected && 'bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/30',
        // Border
        isSelected
          ? 'border-2 border-primary'
          : 'border-2 border-transparent hover:border-primary/30',
        className
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          'text-xs sm:text-sm font-bold tabular-nums leading-none',
          todayFlag && !isSelected && 'text-primary',
          isSelected && 'text-white',
          !todayFlag && !isSelected && 'text-gray-700 dark:text-gray-300'
        )}
      >
        {day}
      </span>

      {/* Event dots */}
      {totalEvents > 0 ? (
        <div className="flex gap-0.5 sm:gap-1 items-center justify-center">
          {hasAppts && (
            <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/90' : 'bg-primary')} />
          )}
          {hasInvoices && (
            <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white/70' : 'bg-amber-500')} />
          )}
        </div>
      ) : (
        <div className="h-1.5" />
      )}

      {/* Today ring */}
      {todayFlag && !isSelected && (
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-primary/50 pointer-events-none" />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl sm:rounded-2xl" />
    </motion.div>
  );
}

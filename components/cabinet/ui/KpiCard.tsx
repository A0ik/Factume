'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Couleur d'accent (hex) — white-label. */
  accent?: string;
  delta?: { value: string; direction: 'up' | 'down' | 'neutral' };
  hint?: string;
  loading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = '#10b981',
  delta,
  hint,
  loading,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      {/* Barre d'accent supérieure — signature « cockpit » */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />

      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon size={17} strokeWidth={2.2} />
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="h-7 w-24 bg-gray-200 animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-black tracking-tight text-gray-900">{value}</p>
        )}
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>

      {(delta || hint) && (
        <div className="mt-2 flex items-center gap-1.5">
          {delta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[11px] font-semibold',
                delta.direction === 'up' && 'text-green-600',
                delta.direction === 'down' && 'text-red-600',
                delta.direction === 'neutral' && 'text-gray-500',
              )}
            >
              {delta.direction === 'up' && <ArrowUpRight size={12} />}
              {delta.direction === 'down' && <ArrowDownRight size={12} />}
              {delta.value}
            </span>
          )}
          {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
        </div>
      )}
    </div>
  );
}

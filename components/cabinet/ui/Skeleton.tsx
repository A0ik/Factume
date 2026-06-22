'use client';

import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />;
}

export function KpiSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-gray-200 bg-white">
      <Skeleton className="w-9 h-9 rounded-xl mb-3" />
      <Skeleton className="w-24 h-6 mb-2" />
      <Skeleton className="w-20 h-3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  const widths = ['w-32', 'w-24', 'w-20', 'w-16', 'w-28', 'w-20', 'w-24'];
  return (
    <div className="p-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4', widths[c % widths.length])} />
          ))}
        </div>
      ))}
    </div>
  );
}

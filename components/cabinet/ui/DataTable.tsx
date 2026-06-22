'use client';

import { useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';
import type { LucideIcon } from 'lucide-react';
import { Users } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  className?: string;
  align?: 'left' | 'right' | 'center';
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  toolbar?: React.ReactNode;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  loading?: boolean;
  skeletonCols?: number;
  pageSize?: number;
  className?: string;
}

const ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchable,
  searchPlaceholder = 'Rechercher…',
  searchText,
  onRowClick,
  emptyState,
  emptyIcon = Users,
  emptyTitle,
  emptyDescription,
  emptyAction,
  toolbar,
  initialSort,
  loading,
  skeletonCols = 4,
  pageSize,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(
    initialSort ?? null,
  );
  const [page, setPage] = useState(0);

  const processed = useMemo(() => {
    let rows = data;

    if (query.trim() && searchable) {
      const q = query.toLowerCase();
      rows = rows.filter((row) => {
        const text = searchText ? searchText(row) : JSON.stringify(row);
        return text.toLowerCase().includes(q);
      });
    }

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        rows = [...rows].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av < bv) return sort.dir === 'asc' ? -1 : 1;
          if (av > bv) return sort.dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return rows;
  }, [data, query, sort, columns, searchable, searchText]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(processed.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const paged = pageSize ? processed.slice(safePage * pageSize, safePage * pageSize + pageSize) : processed;

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable && !col.sortValue) return;
    setSort((prev) => {
      if (prev?.key !== col.key) return { key: col.key, dir: 'asc' };
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {(searchable || toolbar) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border-b border-gray-100">
          {searchable && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 sm:ml-auto">{toolbar}</div>}
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={skeletonCols} />
      ) : paged.length === 0 ? (
        emptyState ?? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle || 'Aucun résultat'}
            description={emptyDescription}
            action={emptyAction}
          />
        )
      ) : (
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/60">
                {columns.map((col) => {
                  const isSorted = sort?.key === col.key;
                  const sortable = col.sortable || !!col.sortValue;
                  return (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col)}
                      className={cn(
                        'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap',
                        ALIGN[col.align || 'left'],
                        col.hideOnMobile && 'hidden md:table-cell',
                        sortable && 'cursor-pointer select-none hover:text-gray-700',
                        col.className,
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {sortable && (
                          <span className="flex flex-col -space-y-1">
                            <ChevronUp
                              size={11}
                              className={cn(
                                isSorted && sort?.dir === 'asc' ? 'text-gray-700' : 'text-gray-300',
                              )}
                            />
                            <ChevronDown
                              size={11}
                              className={cn(
                                isSorted && sort?.dir === 'desc' ? 'text-gray-700' : 'text-gray-300',
                              )}
                            />
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-gray-50',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-gray-700 align-middle',
                        ALIGN[col.align || 'left'],
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          <span>
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, processed.length)} sur{' '}
            {processed.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-2 font-medium text-gray-700">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  accent?: string;
  className?: string;
}

export function Tabs({ tabs, active, onChange, accent = '#10b981', className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-gray-200 scrollbar-none', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors -mb-px border-b-2',
              isActive
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700 border-transparent',
            )}
            style={isActive ? { borderColor: accent } : undefined}
          >
            {Icon && <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />}
            {tab.label}
            {tab.badge !== undefined && tab.badge !== 0 && (
              <span
                className={cn(
                  'ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                  isActive ? 'text-white' : 'bg-gray-100 text-gray-600',
                )}
                style={isActive ? { backgroundColor: accent } : undefined}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KebabMenuItem {
  label: string;
  icon: any;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface KebabMenuProps {
  items: KebabMenuItem[];
  align?: 'left' | 'right';
}

/**
 * KebabMenu — ZENITH contextual action grouping
 * Regroupe les actions secondaires sous un menu "..." (LOI 9)
 * Utilisé dans les lignes de documents, cartes clients, etc.
 */
export default function KebabMenu({ items, align = 'right' }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full mt-1 z-50 min-w-[180px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden py-1',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); item.onClick(); setOpen(false); }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors',
                  item.danger
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5',
                  item.disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                <item.icon size={14} strokeWidth={1.8} />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

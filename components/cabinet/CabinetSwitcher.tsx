'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCabinetStore } from '@/stores/cabinetStore';

export default function CabinetSwitcher() {
  const router = useRouter();
  const { cabinets, activeCabinetId, switchCabinet } = useCabinetStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeCabinet = cabinets.find((c) => c.id === activeCabinetId);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSwitch = async (cabinetId: string) => {
    setOpen(false);
    if (cabinetId === activeCabinetId) return;
    await switchCabinet(cabinetId);
    router.refresh();
  };

  if (cabinets.length === 0) return null;

  const color = activeCabinet?.primary_color || '#4f46e5';

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-semibold transition-colors border',
          open
            ? 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-gray-600'
            : 'hover:bg-gray-100 dark:hover:bg-white/5 border-transparent'
        )}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {activeCabinet?.logo_url ? (
            <img
              src={activeCabinet.logo_url}
              alt=""
              className="w-3.5 h-3.5 rounded-sm object-contain"
            />
          ) : (
            <Building2 size={11} className="text-white" />
          )}
        </div>
        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
          {activeCabinet?.name || 'Cabinet'}
        </span>
        <ChevronDown
          size={12}
          className={cn(
            'text-gray-400 transition-transform flex-shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50 overflow-hidden"
          >
            <div className="py-1">
              {cabinets.map((cabinet) => {
                const isActive = cabinet.id === activeCabinetId;
                const itemColor = cabinet.primary_color || '#4f46e5';
                return (
                  <button
                    key={cabinet.id}
                    onClick={() => handleSwitch(cabinet.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors',
                      isActive
                        ? 'bg-primary/5 dark:bg-primary/10 text-gray-900 dark:text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    )}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: itemColor }}
                    >
                      {cabinet.logo_url ? (
                        <img
                          src={cabinet.logo_url}
                          alt=""
                          className="w-3.5 h-3.5 rounded-sm object-contain"
                        />
                      ) : (
                        <Building2 size={11} className="text-white" />
                      )}
                    </div>
                    <span className="truncate flex-1 text-left">{cabinet.name}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: itemColor }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Create new cabinet */}
            <div className="border-t border-gray-100 dark:border-gray-700 py-1">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push('/cabinets');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-primary font-semibold hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
              >
                <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={11} className="text-primary" />
                </div>
                Créer un cabinet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

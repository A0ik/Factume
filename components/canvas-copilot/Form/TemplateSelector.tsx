'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Template Definitions ──────────────────────────────

const TEMPLATES = [
  { id: 1, name: 'Minimaliste', color: '#10b981', gradient: 'from-emerald-400 to-emerald-600' },
  { id: 2, name: 'Classique', color: '#3b82f6', gradient: 'from-blue-400 to-blue-600' },
  { id: 3, name: 'Moderne', color: '#8b5cf6', gradient: 'from-violet-400 to-violet-600' },
  { id: 4, name: 'Elegant', color: '#f59e0b', gradient: 'from-amber-400 to-amber-600' },
  { id: 5, name: 'Corporate', color: '#64748b', gradient: 'from-slate-400 to-slate-600' },
  { id: 6, name: 'Nature', color: '#22c55e', gradient: 'from-green-400 to-green-600' },
];

// ─── Props ─────────────────────────────────────────────

interface TemplateSelectorProps {
  value: number;
  onChange: (id: number) => void;
}

// ─── Component ─────────────────────────────────────────

export default function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Modele
      </p>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((template) => {
          const isActive = value === template.id;
          return (
            <motion.button
              key={template.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(template.id)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border transition-all',
                isActive
                  ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm'
                  : 'border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/20',
              )}
            >
              {/* Color swatch */}
              <div className="relative">
                <div
                  className={cn(
                    'w-6 h-6 rounded-lg bg-gradient-to-br shadow-inner',
                    template.gradient,
                  )}
                />
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
                  >
                    <Check size={9} className="text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </div>

              {/* Name */}
              <span className={cn(
                'text-[9px] font-semibold leading-tight',
                isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400',
              )}>
                {template.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

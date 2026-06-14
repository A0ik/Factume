'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/themeStore';

// ─── Template Definitions ──────────────────────────────

const TEMPLATES = [
  { id: 1, name: 'Minimaliste', accent: '#10b981', style: 'Épuré, grands espaces' },
  { id: 2, name: 'Classique', accent: '#3b82f6', style: 'Traditionnel, structuré' },
  { id: 3, name: 'Moderne', accent: '#8b5cf6', style: 'Contemporain, lignes nettes' },
  { id: 4, name: 'Elegant', accent: '#f59e0b', style: 'Raffiné, typographie soignée' },
  { id: 5, name: 'Corporate', accent: '#64748b', style: 'Professionnel, formel' },
  { id: 6, name: 'Nature', accent: '#22c55e', style: 'Organique, arrondis doux' },
];

// ─── Mini SVG Preview ──────────────────────────────────
// Generates a tiny SVG that looks like a miniature invoice layout.
// INSPECTOR (BUG 1) — l'aperçu DOIT s'adapter au mode sombre (Obsidian). Avant,
// le fond était un inline style `background:#fff` codé en dur : les overrides
// `.dark .bg-white{!important}` de globals.css ne peuvent PAS battre un inline
// style, donc la tuile restait blanche en mode sombre. On dérive désormais une
// palette (clair/sombre) depuis le thème résolu (source unique de vérité).

interface MiniPalette {
  bg: string;
  border: string;
  textMain: string;
  textSub: string;
  divider: string;
}

const LIGHT_PALETTE: MiniPalette = {
  bg: '#ffffff',
  border: '#e5e7eb',
  textMain: '#111827',
  textSub: '#9ca3af',
  divider: '#e5e7eb',
};

// Obsidian — aligné sur le wrapper dark:bg-slate-800 (#1e293b) du parent.
const DARK_PALETTE: MiniPalette = {
  bg: '#1e293b',
  border: '#334155',
  textMain: '#f1f5f9',
  textSub: '#64748b',
  divider: '#334155',
};

function MiniPreview({ accent, isActive, isDark }: { accent: string; isActive: boolean; isDark: boolean }) {
  const p = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const bg = isActive ? p.bg : (isDark ? '#0f172a' : '#fafafa');
  const border = isActive ? accent : p.border;
  const fill = accent;

  return (
    <svg viewBox="0 0 80 113" className="w-full h-full" style={{ background: bg, borderRadius: 4 }}>
      {/* Border */}
      <rect x="0.5" y="0.5" width="79" height="112" rx="4" fill="none" stroke={border} strokeWidth={isActive ? 1.5 : 0.5} />

      {/* Header accent bar */}
      <rect x="8" y="8" width="20" height="4" rx="1" fill={fill} opacity="0.8" />

      {/* Invoice number */}
      <rect x="52" y="8" width="20" height="3" rx="1" fill={p.textSub} opacity="0.4" />

      {/* Divider */}
      <line x1="8" y1="18" x2="72" y2="18" stroke={p.divider} strokeWidth="0.5" />

      {/* Client block */}
      <rect x="8" y="23" width="16" height="2" rx="0.5" fill={p.textSub} opacity="0.3" />
      <rect x="8" y="27" width="22" height="3" rx="0.5" fill={p.textMain} opacity="0.7" />
      <rect x="8" y="31" width="14" height="2" rx="0.5" fill={p.textSub} opacity="0.3" />

      {/* Title bar */}
      <rect x="8" y="39" width="64" height="14" rx="2" fill={fill} opacity="0.06" />
      <rect x="8" y="39" width="2" height="14" rx="1" fill={fill} opacity="0.8" />
      <rect x="13" y="41" width="12" height="2" rx="0.5" fill={fill} opacity="0.6" />
      <rect x="50" y="42" width="20" height="5" rx="0.5" fill={p.textMain} opacity="0.8" />

      {/* Table rows */}
      {[52, 60, 68, 76].map((y, i) => (
        <g key={i}>
          <rect x="8" y={y} width="40" height="2.5" rx="0.5" fill={p.textMain} opacity={i < 2 ? 0.5 : 0.25} />
          <rect x="52" y={y} width="8" height="2" rx="0.5" fill={p.textSub} opacity="0.3" />
          <rect x="64" y={y} width="16" height="2.5" rx="0.5" fill={p.textMain} opacity={i < 2 ? 0.5 : 0.25} />
        </g>
      ))}

      {/* Total line */}
      <line x1="8" y1="85" x2="72" y2="85" stroke={p.divider} strokeWidth="0.5" />
      <rect x="44" y="89" width="12" height="2" rx="0.5" fill={p.textSub} opacity="0.4" />
      <rect x="52" y="92" width="20" height="4" rx="0.5" fill={fill} opacity="0.9" />

      {/* Footer */}
      <rect x="16" y="103" width="48" height="2" rx="0.5" fill={p.textSub} opacity="0.2" />
    </svg>
  );
}

// ─── Props ─────────────────────────────────────────────

interface TemplateSelectorProps {
  value: number;
  onChange: (id: number) => void;
}

// ─── Component ─────────────────────────────────────────

export default function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  // INSPECTOR (BUG 1) — source unique du thème résolu (réactive au toggle live).
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const isDark = resolvedTheme === 'dark';

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
                'relative flex flex-col rounded-xl border transition-all overflow-hidden',
                isActive
                  ? 'border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20',
              )}
            >
              {/* Mini SVG preview */}
              <div className="w-full aspect-[210/297] p-1.5 bg-white dark:bg-slate-800">
                <MiniPreview accent={template.accent} isActive={isActive} isDark={isDark} />
              </div>

              {/* Active check */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm"
                >
                  <Check size={9} className="text-white" strokeWidth={3} />
                </motion.div>
              )}

              {/* Name + description */}
              <div className="px-2 py-1.5 text-center">
                <p className={cn(
                  'text-[9px] font-semibold leading-tight',
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300',
                )}>
                  {template.name}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

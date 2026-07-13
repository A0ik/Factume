'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/themeStore';

// ─── Template Definitions ──────────────────────────────
// APEX (anti-AI-slop) — un SEUL accent brand émeraude (#10b981) pour tous les
// templates. On différencie les aperçus par leur STRUCTURE (variant), pas par
// la couleur. Les variants reflètent fidèlement pdf-server.ts :
//   • classic = templates 1-6 (barre fine accent, total en bande)
//   • flat    = 7 PUR (filet capillaire, total à plat)
//   • card    = 8 AUDACE (bande accent pleine, total en carte accent)
//   • boxed   = 9 ÉLÉGANCE (filet sombre, total en boîte bordée accent)

type TemplateVariant = 'classic' | 'flat' | 'card' | 'boxed';

const TEMPLATES: { id: number; name: string; accent: string; variant: TemplateVariant; style: string }[] = [
  { id: 1, name: 'Minimaliste', accent: '#10b981', variant: 'classic', style: 'Épuré, grands espaces' },
  { id: 2, name: 'Classique', accent: '#10b981', variant: 'classic', style: 'Traditionnel, structuré' },
  { id: 3, name: 'Moderne', accent: '#10b981', variant: 'classic', style: 'Contemporain, lignes nettes' },
  { id: 4, name: 'Elegant', accent: '#10b981', variant: 'classic', style: 'Raffiné, typographie soignée' },
  { id: 5, name: 'Corporate', accent: '#10b981', variant: 'classic', style: 'Professionnel, formel' },
  { id: 6, name: 'Nature', accent: '#10b981', variant: 'classic', style: 'Organique, arrondis doux' },
  { id: 7, name: 'PUR', accent: '#10b981', variant: 'flat', style: 'Épuré, filets capillaires' },
  { id: 8, name: 'AUDACE', accent: '#10b981', variant: 'card', style: 'Audacieux, bande accent' },
  { id: 9, name: 'ÉLÉGANCE', accent: '#10b981', variant: 'boxed', style: 'Formel, boîte bordée' },
];

// ─── Mini SVG Preview ──────────────────────────────────
// APEX — l'aperçu reflète désormais le vrai rendu pdf-server (variant structurel),
// adapté au mode sombre (Obsidian) via la palette dérivée du thème résolu.

interface MiniPalette {
  bg: string;
  border: string;
  textMain: string;
  textSub: string;
  divider: string;
  darkBand: string; // bande sombre (ÉLÉGANCE / headers foncés)
}

const LIGHT_PALETTE: MiniPalette = {
  bg: '#ffffff',
  border: '#e5e7eb',
  textMain: '#111827',
  textSub: '#9ca3af',
  divider: '#e5e7eb',
  darkBand: '#1f2937',
};

const DARK_PALETTE: MiniPalette = {
  bg: '#1e293b',
  border: '#334155',
  textMain: '#f1f5f9',
  textSub: '#64748b',
  divider: '#334155',
  darkBand: '#0f172a',
};

function MiniPreview({
  accent,
  variant,
  isActive,
  isDark,
}: {
  accent: string;
  variant: TemplateVariant;
  isActive: boolean;
  isDark: boolean;
}) {
  const p = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const bg = isActive ? p.bg : (isDark ? '#0f172a' : '#fafafa');
  const border = isActive ? accent : p.border;

  const rows = [52, 60, 68];
  const row = (y: number, i: number) => (
    <g key={i}>
      <rect x="8" y={y} width="40" height="2.5" rx="0.5" fill={p.textMain} opacity={i === 0 ? 0.5 : 0.25} />
      <rect x="64" y={y} width="16" height="2.5" rx="0.5" fill={p.textMain} opacity={i === 0 ? 0.5 : 0.25} />
    </g>
  );

  return (
    <svg viewBox="0 0 80 113" className="w-full h-full" style={{ background: bg, borderRadius: 4 }}>
      {/* Border */}
      <rect x="0.5" y="0.5" width="79" height="112" rx="4" fill="none" stroke={border} strokeWidth={isActive ? 1.5 : 0.5} />

      {variant === 'card' && (
        // AUDACE — bande accent pleine en haut (headerH 120), corps blanc, total en carte accent.
        <>
          <rect x="0" y="0" width="80" height="26" fill={accent} />
          <rect x="8" y="8" width="20" height="3" rx="1" fill="#ffffff" opacity="0.85" />
          <rect x="52" y="8" width="20" height="2.5" rx="1" fill="#ffffff" opacity="0.5" />
          <rect x="8" y="34" width="22" height="3" rx="0.5" fill={p.textMain} opacity="0.7" />
          <rect x="8" y="39" width="14" height="2" rx="0.5" fill={p.textSub} opacity="0.4" />
          {rows.map((y, i) => row(y, i))}
          <rect x="8" y="78" width="64" height="2" rx="0.3" fill={p.textMain} opacity="0.4" />
          {/* Total = carte accent */}
          <rect x="40" y="84" width="36" height="14" rx="3" fill={accent} />
          <rect x="44" y="88" width="10" height="2" rx="0.5" fill="#ffffff" opacity="0.7" />
          <rect x="54" y="90" width="18" height="4" rx="0.5" fill="#ffffff" opacity="0.95" />
        </>
      )}

      {variant === 'boxed' && (
        // ÉLÉGANCE — filet sombre capillaire en haut, corps, total en boîte bordée accent.
        <>
          <rect x="0" y="0" width="80" height="3" fill={p.darkBand} />
          <rect x="8" y="12" width="22" height="3" rx="1" fill={accent} opacity="0.85" />
          <rect x="52" y="12" width="20" height="2.5" rx="1" fill={p.textSub} opacity="0.45" />
          <rect x="8" y="26" width="18" height="2.5" rx="0.5" fill={p.textMain} opacity="0.7" />
          <rect x="8" y="31" width="12" height="2" rx="0.5" fill={p.textSub} opacity="0.4" />
          {rows.map((y, i) => row(y, i))}
          <rect x="8" y="78" width="64" height="2" rx="0.3" fill={p.textMain} opacity="0.4" />
          {/* Total = boîte bordée accent (fond clair) */}
          <rect x="40" y="84" width="36" height="14" rx="3" fill={p.bg} stroke={accent} strokeWidth="1" />
          <rect x="44" y="88" width="10" height="2" rx="0.5" fill={accent} opacity="0.7" />
          <rect x="54" y="90" width="18" height="4" rx="0.5" fill={accent} opacity="0.95" />
        </>
      )}

      {variant === 'flat' && (
        // PUR — filet capillaire accent, pas de bande, table épurée, total à plat (grand chiffre sous règle accent).
        <>
          <rect x="8" y="10" width="22" height="3" rx="1" fill={accent} opacity="0.85" />
          <rect x="52" y="10" width="20" height="2.5" rx="1" fill={p.textSub} opacity="0.45" />
          <rect x="8" y="24" width="18" height="2.5" rx="0.5" fill={p.textMain} opacity="0.7" />
          <rect x="8" y="29" width="12" height="2" rx="0.5" fill={p.textSub} opacity="0.4" />
          {rows.map((y, i) => row(y, i))}
          {/* Règle accent capillaire */}
          <rect x="8" y="78" width="64" height="0.8" fill={accent} opacity="0.7" />
          <rect x="44" y="84" width="10" height="2" rx="0.5" fill={p.textSub} opacity="0.5" />
          {/* Total à plat : grand chiffre accent, sans boîte */}
          <rect x="50" y="88" width="26" height="6" rx="0.5" fill={accent} opacity="0.9" />
        </>
      )}

      {variant === 'classic' && (
        // Classique (1-6) — barre fine accent, titre avec barre latérale accent, total en bande.
        <>
          <rect x="0" y="0" width="80" height="3" fill={accent} opacity="0.9" />
          <rect x="8" y="12" width="20" height="3" rx="1" fill={accent} opacity="0.8" />
          <rect x="52" y="12" width="20" height="2.5" rx="1" fill={p.textSub} opacity="0.4" />
          <rect x="8" y="24" width="16" height="2" rx="0.5" fill={p.textSub} opacity="0.35" />
          <rect x="8" y="28" width="22" height="3" rx="0.5" fill={p.textMain} opacity="0.7" />
          <rect x="8" y="32" width="14" height="2" rx="0.5" fill={p.textSub} opacity="0.3" />
          <rect x="8" y="40" width="64" height="12" rx="2" fill={accent} opacity="0.06" />
          <rect x="8" y="40" width="2" height="12" rx="1" fill={accent} opacity="0.8" />
          {rows.map((y, i) => row(y, i))}
          <line x1="8" y1="76" x2="72" y2="76" stroke={p.divider} strokeWidth="0.5" />
          <rect x="44" y="80" width="10" height="2" rx="0.5" fill={p.textSub} opacity="0.45" />
          {/* Total en bande accent */}
          <rect x="40" y="85" width="36" height="12" rx="2" fill={accent} opacity="0.12" />
          <rect x="54" y="89" width="18" height="4" rx="0.5" fill={accent} opacity="0.9" />
          <rect x="16" y="103" width="48" height="2" rx="0.5" fill={p.textSub} opacity="0.2" />
        </>
      )}
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
        Modèle
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
                'relative flex flex-col rounded-control border transition-all overflow-hidden',
                isActive
                  ? 'border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20',
              )}
            >
              {/* Mini SVG preview */}
              <div className="w-full aspect-[210/297] p-1.5 bg-white dark:bg-white/[0.04]">
                <MiniPreview accent={template.accent} variant={template.variant} isActive={isActive} isDark={isDark} />
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

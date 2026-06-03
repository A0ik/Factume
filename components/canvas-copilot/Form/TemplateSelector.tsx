'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Template Definitions ──────────────────────────────

const TEMPLATES = [
  { id: 1, name: 'Minimaliste', accent: '#10b981' },
  { id: 2, name: 'Classique', accent: '#3b82f6' },
  { id: 3, name: 'Moderne', accent: '#8b5cf6' },
  { id: 4, name: 'Elegant', accent: '#f59e0b' },
  { id: 5, name: 'Corporate', accent: '#64748b' },
  { id: 6, name: 'Nature', accent: '#22c55e' },
];

/**
 * Generate a minimal HTML preview for a template.
 * Shows a miniature version of the actual template layout.
 */
function generateMiniPreview(accent: string): string {
  const alpha = accent + '15';
  const alpha2 = accent + '25';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Inter,system-ui,sans-serif;font-size:6px;color:#1f2937;padding:8px;background:#fff}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
  .logo{width:24px;height:8px;background:${accent};border-radius:2px}
  .num{font-size:5px;color:${accent};font-weight:700;letter-spacing:0.5px}
  .parties{display:flex;justify-content:space-between;margin-bottom:6px}
  .party{flex:1}
  .party-label{font-size:4px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}
  .party-name{font-size:5px;font-weight:700;color:#111827}
  .party-detail{font-size:4px;color:#6b7280;margin-top:1px}
  .title-bar{background:linear-gradient(135deg,${alpha},${alpha2});border-radius:3px;padding:4px 6px;margin-bottom:6px;border-left:2px solid ${accent}}
  .title-bar .label{font-size:4px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:0.5px}
  .title-bar .amount{font-size:8px;font-weight:900;color:#111827;margin-top:1px}
  table{width:100%;border-collapse:collapse}
  th{font-size:4px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.3px;padding:3px 4px;text-align:left;border-bottom:1px solid #f3f4f6}
  th:last-child,th:nth-child(4){text-align:right}
  th:nth-child(3){text-align:center}
  td{font-size:5px;padding:3px 4px;border-bottom:1px solid #f9fafb}
  td:last-child,td:nth-child(4){text-align:right}
  td:nth-child(3){text-align:center}
  .desc{font-weight:600;color:#111827}
  .vat{background:${alpha};color:${accent};font-size:4px;font-weight:700;padding:1px 3px;border-radius:2px}
  .total-row{display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #e5e7eb;margin-top:4px}
  .total-label{font-size:5px;font-weight:700;color:#111827}
  .total-amount{font-size:7px;font-weight:900;color:${accent}}
  .footer{margin-top:6px;padding-top:4px;border-top:1px solid #f3f4f6;font-size:3.5px;color:#9ca3af;text-align:center}
</style></head><body>
<div class="header"><div class="logo"></div><div class="num">FAC-2026-001</div></div>
<div class="parties">
  <div class="party"><div class="party-label">Emetteur</div><div class="party-name">Mon Entreprise</div><div class="party-detail">contact@monentreprise.fr</div></div>
  <div class="party" style="text-align:right"><div class="party-label">Client</div><div class="party-name">Dupont Consulting</div><div class="party-detail">75001 Paris</div></div>
</div>
<div class="title-bar"><div class="label">Facture</div><div class="amount">3 800,00 EUR</div></div>
<table>
  <tr><th>Description</th><th>Qte</th><th>TVA</th><th>Prix HT</th><th>Total</th></tr>
  <tr><td class="desc">Developpement web</td><td>5</td><td><span class="vat">20%</span></td><td>600,00</td><td>3 000,00</td></tr>
  <tr><td class="desc">Design UI/UX</td><td>2</td><td><span class="vat">20%</span></td><td>400,00</td><td>800,00</td></tr>
</table>
<div class="total-row"><span class="total-label">Total TTC</span><span class="total-amount">3 800,00 EUR</span></div>
<div class="footer">SIRET 123 456 789 01234 · TVA FR12 345678901 · IBAN FR76 XXXX XXXX XXXX XXXX</div>
</body></html>`;
}

// ─── Props ─────────────────────────────────────────────

interface TemplateSelectorProps {
  value: number;
  onChange: (id: number) => void;
}

// ─── Component ─────────────────────────────────────────

export default function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  // Generate preview HTML for each template
  const previews = useMemo(() =>
    TEMPLATES.map(t => generateMiniPreview(t.accent)),
    []
  );

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Modele
      </p>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((template, idx) => {
          const isActive = value === template.id;
          return (
            <motion.button
              key={template.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(template.id)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 rounded-xl border transition-all overflow-hidden',
                isActive
                  ? 'border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20',
              )}
            >
              {/* Mini preview iframe */}
              <div className="w-full aspect-[210/297] bg-white pointer-events-none overflow-hidden">
                <iframe
                  srcDoc={previews[idx]}
                  className="w-full h-full border-0 origin-top-left"
                  style={{
                    width: '210mm',
                    height: '297mm',
                    transform: 'scale(0.12)',
                    transformOrigin: 'top left',
                  }}
                  title={template.name}
                  sandbox=""
                />
              </div>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm"
                >
                  <Check size={9} className="text-white" strokeWidth={3} />
                </motion.div>
              )}

              {/* Name */}
              <span className={cn(
                'text-[9px] font-semibold leading-tight pb-1.5',
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

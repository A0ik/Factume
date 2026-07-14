'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import BottomSheet from '@/components/layout/BottomSheet';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface QuickActionsSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: QuickAction[];
}

/**
 * QuickActionsSheet — menu d'actions rapides en BottomSheet (CIBLE 3).
 *
 * VULCAIN : c'est le sheet signature Stripe — s'ouvre au long-press sur une
 * ligne de liste (facture, client, note de frais, article, contrat) pour
 * exposer les actions secondaires (éditer, dupliquer, relancer, supprimer…).
 * Compose le `BottomSheet` réutilisable sans le réécrire.
 */
export default function QuickActionsSheet({
  open,
  onClose,
  title = 'Actions rapides',
  actions,
}: QuickActionsSheetProps) {
  const handle = (a: QuickAction) => {
    if (a.disabled) return;
    triggerHaptic(a.danger ? 'heavy' : 'light');
    onClose();
    a.onClick();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-1.5 pb-6">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              onClick={() => handle(a)}
              disabled={a.disabled}
              className={cn(
                'flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl text-left transition-colors touch-target',
                a.danger
                  ? 'text-red-500 hover:bg-red-500/10 active:bg-red-500/15'
                  : 'text-foreground hover:bg-muted active:bg-secondary',
                a.disabled && 'opacity-40 pointer-events-none',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0',
                  a.danger ? 'bg-red-500/10' : 'bg-muted',
                )}
              >
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="text-[15px] font-medium">{a.label}</span>
            </motion.button>
          );
        })}
      </div>
    </BottomSheet>
  );
}

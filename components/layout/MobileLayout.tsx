'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * MobileLayout — 2026 page transitions
 *
 * VULCAIN FIX (CIBLE 2) : la transition est OPACITY-ONLY.
 * On n'anime PLUS l'axe `y`. Pourquoi : framer-motion réalise `y` via
 * `transform: translateY(...)`, or tout ancêtre portant un `transform`
 * devient le containing block des descendants `position: fixed` (spec CSS).
 * Le wrapper motion.div enveloppe les children des pages, donc l'
 * `InvoiceMobileActionBar` (fixed bottom-[68px]) s'ancrait au contenu qui
 * scroll au lieu du viewport → "lévitation" de la barre d'actions.
 * En restant opacity-only, aucun transform n'est écrit, fixed reste viewport-relative.
 *
 * LayoutGroup enables shared layout animations (layoutId) across routes.
 */

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 300,
  mass: 0.6,
};

interface MobileLayoutProps {
  children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname();

  return (
    <LayoutGroup>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="flex-1 flex flex-col min-w-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>
  );
}

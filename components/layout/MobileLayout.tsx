'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * MobileLayout — transitions entre pages
 *
 * Utilise des springs (ressorts physiques) au lieu de ease-in-out
 * pour un feeling natif. La page arrive légèrement par le bas
 * avec un rebond subtil.
 *
 * LayoutGroup permet aux animations partagées (layoutId) de
 * fonctionner à travers les routes — c'est le "Magic Move".
 */
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

const pageTransition = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 280,
  mass: 0.8,
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

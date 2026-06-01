'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * MobileLayout — 2026 page transitions
 *
 * Physics: spring with high stiffness (300) and moderate damping (28)
 * for a snappy, iOS-like page transition feel.
 * The page slides in subtly from below (y: 4px — very slight).
 * Exit is a quick fade — no movement needed.
 *
 * LayoutGroup enables shared layout animations (layoutId) across routes.
 */

const pageVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
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

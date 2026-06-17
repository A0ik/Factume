/**
 * lib/motion.ts — Variants & transitions Framer Motion partagés (APEX FOUNDATION).
 *
 * Centralise les animations pour éviter la prolifération de variants nommés
 * différemment selon les pages (containerVariants / staggerContainer / listContainer…).
 *
 * Règles 2026 (Calm Design) :
 *  - durées 200-400ms, easing naturel [0.4, 0, 0.2, 1]
 *  - on n'anime QUE transform & opacity (GPU, pas de reflow)
 *  - stagger 50ms entre items pour les listes
 */
import type { Transition, Variants } from 'framer-motion';

// ─── Springs ─────────────────────────────────────────────
export const springFast: Transition = { type: 'spring', damping: 25, stiffness: 400 };
export const springSmooth: Transition = { type: 'spring', damping: 28, stiffness: 300 };

// ─── Easing standard (Material "standard") ───────────────
export const easeStandard: [number, number, number, number] = [0.4, 0, 0.2, 1];

// ─── Entrées isolées ─────────────────────────────────────
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: springFast },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: easeStandard } },
};

// ─── Listes stagger ──────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: springFast },
};

/**
 * Shared Framer Motion spring constants for consistent animations
 * across the canvas-copilot interface.
 */

export const SPRING_FAST = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 400,
};

export const SPRING_SMOOTH = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 300,
};

export const SPRING_BOUNCE = {
  type: 'spring' as const,
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

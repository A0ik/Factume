'use client';

import { useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  /** Height in px that triggers the refresh */
  threshold?: number;
}

/**
 * PullToRefresh — Indicateur de rafraîchissement natif (mobile uniquement)
 *
 * Utilise uniquement les touch events + Framer Motion.
 * Sur desktop (pas de touch), le composant est transparent :
 * il rend simplement {children} sans wrapper supplémentaire.
 */
export default function PullToRefresh({
  children,
  onRefresh,
  threshold = 65,
}: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [canTrigger, setCanTrigger] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const pullDistance = useMotionValue(0);

  // Détecte si l'appareil supporte le touch
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop > 2) return;

    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling || refreshing) return;

      const diff = e.touches[0].clientY - startY.current;
      if (diff <= 0) {
        pullDistance.set(0);
        setCanTrigger(false);
        return;
      }

      // Rubber-band effect: resistance increases as you pull further
      const resistance = 0.4;
      const damped = diff * resistance;
      const clamped = Math.min(damped, threshold * 2);
      pullDistance.set(clamped);

      if (clamped >= threshold) {
        setCanTrigger(true);
      } else {
        setCanTrigger(false);
      }
    },
    [pulling, refreshing, threshold, pullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);

    if (canTrigger && !refreshing) {
      setRefreshing(true);
      animate(pullDistance, threshold, { type: 'spring', damping: 25, stiffness: 300 });

      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setCanTrigger(false);
        animate(pullDistance, 0, { type: 'spring', damping: 30, stiffness: 300 });
      }
    } else {
      setCanTrigger(false);
      animate(pullDistance, 0, { type: 'spring', damping: 30, stiffness: 300 });
    }
  }, [pulling, canTrigger, refreshing, onRefresh, pullDistance]);

  // Cleanup: if pullDistance is left hanging
  useEffect(() => {
    if (!pulling && !refreshing && pullDistance.get() !== 0) {
      animate(pullDistance, 0, { type: 'spring', damping: 30, stiffness: 300 });
    }
  }, [pulling, refreshing, pullDistance]);

  // Desktop : pas de touch, on rend les enfants directement
  // sans aucun wrapper pour ne pas perturber le scroll natif
  if (!isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overscroll-contain"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator — cercle émeraude */}
      <motion.div
        style={{ height: pullDistance }}
        className="flex items-end justify-center overflow-hidden"
      >
        <motion.div
          className="flex items-center justify-center mb-3"
          animate={{
            rotate: refreshing ? 360 : canTrigger ? 180 : 0,
          }}
          transition={{
            rotate: refreshing
              ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
              : { type: 'spring', damping: 20, stiffness: 200 },
          }}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 border-t-transparent flex items-center justify-center transition-colors duration-200 ${
              canTrigger || refreshing
                ? 'border-emerald-500 border-t-transparent'
                : 'border-slate-600 border-t-transparent'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                canTrigger || refreshing ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Content */}
      {children}
    </div>
  );
}

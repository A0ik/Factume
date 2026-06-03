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
 * PullToRefresh — Indicateur de rafraichissement natif (mobile uniquement)
 *
 * FIX: N'utilise PLUS de div wrapper avec overflow-y-auto.
 * Attache les touch events directement sur le document pour eviter
 * les conflits de scroll imbriques qui causent le bug de rebond.
 */
export default function PullToRefresh({
  children,
  onRefresh,
  threshold = 65,
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);
  const [canTrigger, setCanTrigger] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  const pulling = useRef(false);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const getScrollTop = useCallback(() => {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }, []);

  useEffect(() => {
    if (!isTouchDevice) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only pull when at the very top of the page
      if (getScrollTop() > 2) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;

      const diff = e.touches[0].clientY - startY.current;
      if (diff <= 0) {
        pullDistance.set(0);
        setCanTrigger(false);
        setShowIndicator(false);
        return;
      }

      // Only show indicator if we're still at top
      if (getScrollTop() > 5) {
        pullDistance.set(0);
        setCanTrigger(false);
        pulling.current = false;
        return;
      }

      // Rubber-band effect: resistance increases as you pull further
      const damped = diff * 0.4;
      const clamped = Math.min(damped, threshold * 2);
      pullDistance.set(clamped);
      setShowIndicator(true);

      if (clamped >= threshold) {
        setCanTrigger(true);
      } else {
        setCanTrigger(false);
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (canTrigger && !refreshing) {
        setRefreshing(true);
        animate(pullDistance, threshold, { type: 'spring', damping: 25, stiffness: 300 });

        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setCanTrigger(false);
          animate(pullDistance, 0, { type: 'spring', damping: 30, stiffness: 300 });
          setTimeout(() => setShowIndicator(false), 300);
        }
      } else {
        setCanTrigger(false);
        animate(pullDistance, 0, { type: 'spring', damping: 30, stiffness: 300 });
        setTimeout(() => setShowIndicator(false), 300);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isTouchDevice, refreshing, canTrigger, threshold, pullDistance, onRefresh, getScrollTop]);

  // Desktop: no touch, render children directly
  if (!isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Pull indicator — fixed at top of viewport */}
      {showIndicator && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-start justify-center pointer-events-none">
          <motion.div
            style={{ height: pullDistance, marginTop: 12 }}
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
                    : 'border-slate-400 border-t-transparent'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    canTrigger || refreshing ? 'bg-emerald-400' : 'bg-slate-400'
                  }`}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Content — no wrapper, no overflow-y-auto */}
      {children}
    </>
  );
}

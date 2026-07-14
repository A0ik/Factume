'use client';

import { useRef, useCallback, useEffect } from 'react';
import { triggerHaptic } from '@/lib/haptics';

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

/**
 * useLongPress — détecte un appui long (500ms) sans interférer avec le scroll.
 *
 * Usage :
 *   const lp = useLongPress(() => openActions(item));
 *   <motion.div {...lp.bind()} onClickCapture={lp.onClickGuard}>
 *
 * VULCAIN (CIBLE 3) : même heuristique que SwipeableCard (500ms + tolérance
 * de mouvement 10px = on distingue long-press vs scroll), extraite en hook
 * générique pour l'adopter sur toutes les listes mobiles.
 *
 * - Bouger > 10px annule (c'était un scroll/pan).
 * - Haptic medium au feu (retour tactile Stripe-like).
 * - `onClickGuard` : à poser en `onClickCapture` sur les éléments enveloppés
 *   dans un <Link> — empêche le "ghost click" de navigation qui suivrait le
 *   long-press sur certains navigateurs (Chrome Android).
 * - Sécurisé SSR ; nettoyage du timer au unmount.
 */
export function useLongPress(onLongPress: () => void, enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const fired = useRef(false);
  const cb = useRef(onLongPress);
  cb.current = onLongPress;

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled) return;
      fired.current = false;
      cancel();
      startPos.current = { x: clientX, y: clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        triggerHaptic('medium');
        cb.current();
      }, LONG_PRESS_MS);
    },
    [cancel, enabled],
  );

  const move = useCallback(
    (clientX: number, clientY: number) => {
      if (!timer.current) return;
      const dx = Math.abs(clientX - startPos.current.x);
      const dy = Math.abs(clientY - startPos.current.y);
      if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) cancel();
    },
    [cancel],
  );

  useEffect(() => () => cancel(), [cancel]);

  const onClickGuard = useCallback((e: React.MouseEvent) => {
    if (fired.current) {
      e.preventDefault();
      e.stopPropagation();
      fired.current = false;
    }
  }, []);

  const bind = {
    onTouchStart: (e: React.TouchEvent) => start(e.touches[0].clientX, e.touches[0].clientY),
    onTouchMove: (e: React.TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY),
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: (e: React.MouseEvent) => start(e.clientX, e.clientY),
    onMouseMove: (e: React.MouseEvent) => move(e.clientX, e.clientY),
    onMouseUp: cancel,
    onMouseLeave: cancel,
  };

  return {
    bind: () => bind,
    onClickGuard,
    cancelLongPress: cancel,
  };
}

'use client';

import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Trash2, CheckCircle } from 'lucide-react';
import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onDelete?: () => void;
  onMarkPaid?: () => void;
  /** Called when user long-presses the card — receives a summary for the quick-view sheet */
  onLongPress?: () => void;
  className?: string;
}

const SWIPE_THRESHOLD = 80;
const MAX_DRAG = 140;
const SPRING_BACK = { type: 'spring' as const, damping: 28, stiffness: 400 };
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;

/**
 * SwipeableCard — iOS-native feel with drag gestures
 *
 * - Swipe LEFT → reveals red Delete action (trash icon on LEFT edge)
 * - Swipe RIGHT → reveals green Mark as Paid action (check icon on RIGHT edge)
 * - Long Press → triggers onLongPress callback for Bottom Sheet preview
 * - Elastic physics with smooth spring-back on cancel
 * - Card animates off-screen BEFORE triggering action
 */
export default function SwipeableCard({
  children,
  onDelete,
  onMarkPaid,
  onLongPress,
  className = '',
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const [isPressed, setIsPressed] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isSwiping = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Opacity for action backgrounds — smooth 0→1 mapping
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const paidOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);

  // Scale for icons — slight bounce feedback
  const deleteIconScale = useTransform(x, [-MAX_DRAG, -SWIPE_THRESHOLD, 0], [1.15, 1, 0.6]);
  const paidIconScale = useTransform(x, [0, SWIPE_THRESHOLD, MAX_DRAG], [0.6, 1, 1.15]);

  // Progress for the drag — used for haptic-like visual intensity
  const leftProgress = useTransform(x, [-MAX_DRAG, 0], [1, 0]);
  const rightProgress = useTransform(x, [0, MAX_DRAG], [0, 1]);

  const springBack = useCallback(() => {
    animate(x, 0, SPRING_BACK);
  }, [x]);

  const animateOffScreen = useCallback((direction: 'left' | 'right', callback?: () => void) => {
    const target = direction === 'left' ? -600 : 600;
    const controls = animate(x, target, {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      onComplete: () => {
        callback?.();
        // Reset position after action (parent will likely remove the card)
        x.set(0);
      },
    });
    return controls;
  }, [x]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    isSwiping.current = false;

    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Velocity-based detection: fast flick counts even if distance is short
    const exceededThreshold = offset < -SWIPE_THRESHOLD || (offset < -30 && velocity < -500);
    const exceededThresholdRight = offset > SWIPE_THRESHOLD || (offset > 30 && velocity > 500);

    if (exceededThreshold && onDelete) {
      animateOffScreen('left', onDelete);
    } else if (exceededThresholdRight && onMarkPaid) {
      animateOffScreen('right', onMarkPaid);
    } else {
      // Smooth spring back to origin
      springBack();
    }
  }, [onDelete, onMarkPaid, animateOffScreen, springBack]);

  // Long press detection
  const startLongPress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!onLongPress) return;
    setLongPressTriggered(false);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartPos.current = { x: clientX, y: clientY };

    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      setIsPressed(false);
      onLongPress();
    }, LONG_PRESS_MS);
  }, [onLongPress]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsPressed(false);
  }, []);

  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!longPressTimer.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = Math.abs(clientX - touchStartPos.current.x);
    const dy = Math.abs(clientY - touchStartPos.current.y);

    if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // Ensure card resets if parent re-renders
  useEffect(() => {
    const current = x.get();
    if (current !== 0 && !isSwiping.current) {
      springBack();
    }
  }, [children, x, springBack]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* LEFT action background (delete) — RED, revealed when swiping LEFT */}
      {onDelete && (
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute inset-0 bg-gradient-to-l from-red-500 to-red-600 flex items-center justify-start pl-5 rounded-2xl"
        >
          <motion.div
            style={{ scale: deleteIconScale }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Trash2 size={20} className="text-white" />
            </div>
            <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">Suppr.</span>
          </motion.div>
        </motion.div>
      )}

      {/* RIGHT action background (mark as paid) — GREEN, revealed when swiping RIGHT */}
      {onMarkPaid && (
        <motion.div
          style={{ opacity: paidOpacity }}
          className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-end pr-5 rounded-2xl"
        >
          <motion.div
            style={{ scale: paidIconScale }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-white" />
            </div>
            <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">Payée</span>
          </motion.div>
        </motion.div>
      )}

      {/* Card content — draggable */}
      <motion.div
        ref={cardRef}
        drag="x"
        dragConstraints={{ left: onDelete ? -MAX_DRAG : 0, right: onMarkPaid ? MAX_DRAG : 0 }}
        dragElastic={{ left: 0.08, right: 0.08 }}
        onDragStart={() => {
          isSwiping.current = true;
          cancelLongPress();
        }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card border border-border rounded-2xl cursor-grab active:cursor-grabbing touch-pan-y"
        animate={isPressed && !longPressTriggered ? { scale: 0.97 } : { scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        // Long press event handlers
        onTouchStart={(e) => {
          setIsPressed(true);
          startLongPress(e);
        }}
        onTouchMove={handleMove}
        onTouchEnd={cancelLongPress}
        onMouseDown={(e) => {
          setIsPressed(true);
          startLongPress(e);
        }}
        onMouseMove={handleMove}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
      >
        {children}
      </motion.div>
    </div>
  );
}

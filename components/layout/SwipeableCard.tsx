'use client';

import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { Trash2, CheckCircle, CreditCard } from 'lucide-react';
import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onDelete?: () => void;
  onMarkPaid?: () => void;
  /** Called when user long-presses the card — receives a summary for the quick-view sheet */
  onLongPress?: () => void;
  className?: string;
}

const SWIPE_THRESHOLD = 100;
const MAX_DRAG = 120;
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;

/**
 * SwipeableCard — iOS-native feel with drag gestures
 *
 * - Swipe LEFT → reveals red Delete action
 * - Swipe RIGHT → reveals green Mark as Paid action
 * - Long Press → triggers onLongPress callback for Bottom Sheet preview
 * - Elastic resistance with spring physics
 * - Visual opacity feedback that follows the drag distance
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
  const isDragging = useRef(false);

  // Dynamic opacity for action backgrounds (0 → 1 as you drag)
  const bgOpacity = useTransform(x, [-MAX_DRAG, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, MAX_DRAG], [1, 1, 0, 1, 1]);
  const actionScale = useTransform(x, [-MAX_DRAG, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, MAX_DRAG], [1, 1, 0.8, 1, 1]);

  // Icon opacity for delete/paid backgrounds
  const deleteOpacity = useTransform(x, [-MAX_DRAG, 0], [1, 0]);
  const paidOpacity = useTransform(x, [0, MAX_DRAG], [0, 1]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    isDragging.current = false;

    if (info.offset.x < -SWIPE_THRESHOLD && onDelete) {
      onDelete();
    } else if (info.offset.x > SWIPE_THRESHOLD && onMarkPaid) {
      onMarkPaid();
    }
    // Spring back to 0
  }, [onDelete, onMarkPaid]);

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

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Right action background (mark as paid) — GREEN */}
      {onMarkPaid && (
        <motion.div
          style={{ opacity: paidOpacity }}
          className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 flex items-center justify-end pr-6 rounded-2xl"
        >
          <motion.div
            style={{ scale: actionScale }}
            className="flex flex-col items-center gap-1"
          >
            <CheckCircle size={24} className="text-white" />
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Payée</span>
          </motion.div>
        </motion.div>
      )}

      {/* Left action background (delete) — RED */}
      {onDelete && (
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute inset-0 bg-gradient-to-l from-red-600 via-red-500 to-red-400 flex items-center justify-start pl-6 rounded-2xl"
        >
          <motion.div
            style={{ scale: actionScale }}
            className="flex flex-col items-center gap-1"
          >
            <Trash2 size={24} className="text-white" />
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Supprimer</span>
          </motion.div>
        </motion.div>
      )}

      {/* Card content — draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: onDelete ? -MAX_DRAG : 0, right: onMarkPaid ? MAX_DRAG : 0 }}
        dragElastic={{ left: 0.12, right: 0.12 }}
        onDragStart={() => {
          isDragging.current = true;
          cancelLongPress();
        }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card border border-border rounded-2xl cursor-grab active:cursor-grabbing"
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

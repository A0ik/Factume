'use client';

import { motion, useMotionValue, useTransform, animate, PanInfo, AnimatePresence } from 'framer-motion';
import { Trash2, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onDelete?: () => void;
  onMarkPaid?: () => void;
  /** Called when user long-presses the card */
  onLongPress?: () => void;
  className?: string;
}

const SWIPE_THRESHOLD = 80;
const MAX_DRAG = 140;
const SPRING_BACK = { type: 'spring' as const, damping: 28, stiffness: 400 };
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;

/**
 * SwipeableCard — iOS feel with confirmation dialog
 *
 * - Swipe LEFT  → shows confirmation popup → delete
 * - Swipe RIGHT → marks as paid directly
 * - Long Press  → triggers onLongPress callback
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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isSwiping = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const wasDraggedRef = useRef(false);

  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const paidOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const deleteIconScale = useTransform(x, [-MAX_DRAG, -SWIPE_THRESHOLD, 0], [1.15, 1, 0.6]);
  const paidIconScale = useTransform(x, [0, SWIPE_THRESHOLD, MAX_DRAG], [0.6, 1, 1.15]);

  const springBack = useCallback(() => {
    animate(x, 0, SPRING_BACK);
  }, [x]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    isSwiping.current = false;

    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (Math.abs(offset) > 5) {
      wasDraggedRef.current = true;
    }

    const exceededThreshold = offset < -SWIPE_THRESHOLD || (offset < -30 && velocity < -500);
    const exceededThresholdRight = offset > SWIPE_THRESHOLD || (offset > 30 && velocity > 500);

    if (exceededThreshold && onDelete) {
      // Show confirmation popup instead of deleting directly
      springBack();
      setShowConfirmDelete(true);
    } else if (exceededThresholdRight && onMarkPaid) {
      // Mark as paid directly (no confirmation needed)
      const target = 600;
      animate(x, target, {
        type: 'spring',
        damping: 30,
        stiffness: 300,
        onComplete: () => {
          onMarkPaid();
          x.set(0);
        },
      });
    } else {
      springBack();
    }

    setTimeout(() => {
      wasDraggedRef.current = false;
    }, 100);
  }, [onDelete, onMarkPaid, springBack, x]);

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

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // Reset position when confirmation dialog appears/disappears
  useEffect(() => {
    const current = x.get();
    if (current !== 0 && !isSwiping.current) {
      springBack();
    }
  }, [children, x, springBack]);

  const handleChildClick = useCallback((e: React.MouseEvent) => {
    if (wasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDraggedRef.current = false;
    }
  }, []);

  const confirmDelete = useCallback(() => {
    setShowConfirmDelete(false);
    onDelete?.();
  }, [onDelete]);

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl ${className}`}
        onClickCapture={handleChildClick}
      >
        {/* LEFT action background (delete) */}
        {onDelete && (
          <motion.div
            style={{ opacity: deleteOpacity }}
            className="absolute inset-0 bg-gradient-to-l from-red-500 to-red-600 flex items-center justify-start pl-5 rounded-2xl"
          >
            <motion.div style={{ scale: deleteIconScale }} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Trash2 size={20} className="text-white" />
              </div>
              <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">Suppr.</span>
            </motion.div>
          </motion.div>
        )}

        {/* RIGHT action background (mark as paid) */}
        {onMarkPaid && (
          <motion.div
            style={{ opacity: paidOpacity }}
            className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-end pr-5 rounded-2xl"
          >
            <motion.div style={{ scale: paidIconScale }} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-white" />
              </div>
              <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">Payee</span>
            </motion.div>
          </motion.div>
        )}

        {/* Card content */}
        <motion.div
          ref={cardRef}
          drag="x"
          dragConstraints={{ left: onDelete ? -MAX_DRAG : 0, right: onMarkPaid ? MAX_DRAG : 0 }}
          dragElastic={{ left: 0.08, right: 0.08 }}
          onDragStart={() => {
            isSwiping.current = true;
            wasDraggedRef.current = true;
            cancelLongPress();
          }}
          onDragEnd={handleDragEnd}
          style={{ x, touchAction: 'pan-y' }}
          className="relative bg-card border border-border rounded-2xl cursor-grab active:cursor-grabbing"
          animate={isPressed && !longPressTriggered ? { scale: 0.97 } : { scale: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onTouchStart={(e) => { setIsPressed(true); startLongPress(e); }}
          onTouchMove={handleMove}
          onTouchEnd={cancelLongPress}
          onMouseDown={(e) => { setIsPressed(true); startLongPress(e); }}
          onMouseMove={handleMove}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
        >
          {children}
        </motion.div>
      </div>

      {/* ═══ Confirmation Dialog ═══ */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowConfirmDelete(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Supprimer ce document ?
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Cette action est irreversible.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-5 py-4">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={confirmDelete}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                  Supprimer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

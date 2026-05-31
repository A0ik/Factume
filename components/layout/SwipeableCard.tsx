'use client';

import { motion, useMotionValue, PanInfo } from 'framer-motion';
import { Trash2, CheckCircle } from 'lucide-react';
import { ReactNode, useCallback } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onDelete?: () => void;
  onMarkPaid?: () => void;
  className?: string;
}

export default function SwipeableCard({
  children,
  onDelete,
  onMarkPaid,
  className = '',
}: SwipeableCardProps) {
  const x = useMotionValue(0);

  const bgOpacity = useMotionValue(0);
  const side = useMotionValue(0); // -1 = left (delete), 1 = right (paid)

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.x < -80 && onDelete) {
      onDelete();
    } else if (info.offset.x > 80 && onMarkPaid) {
      onMarkPaid();
    }
  }, [onDelete, onMarkPaid]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Right action background (mark as paid) */}
      {onMarkPaid && (
        <motion.div
          style={{ opacity: bgOpacity }}
          className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-end pr-6 rounded-2xl"
        >
          <CheckCircle size={24} className="text-white/90" />
        </motion.div>
      )}

      {/* Left action background (delete) */}
      {onDelete && (
        <motion.div
          style={{ opacity: bgOpacity }}
          className="absolute inset-0 bg-gradient-to-l from-red-600 to-red-500 flex items-center justify-start pl-6 rounded-2xl"
        >
          <Trash2 size={24} className="text-white/90" />
        </motion.div>
      )}

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: onDelete ? -100 : 0, right: onMarkPaid ? 100 : 0 }}
        dragElastic={0.08}
        onDrag={(_, info) => {
          const offset = Math.abs(info.offset.x);
          const progress = Math.min(offset / 80, 1);
          bgOpacity.set(progress);
        }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-slate-800/50 border border-white/5 rounded-2xl cursor-grab active:cursor-grabbing"
        whileTap={{ scale: 0.98, backgroundColor: 'rgba(255,255,255,0.08)' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

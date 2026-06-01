'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * BottomSheet — 2026 standard
 *
 * Design: rounded top corners, drag handle indicator, glassmorphic.
 * Physics: spring (stiffness: 320, damping: 28) for snappy but smooth open/close.
 * whileTap on close button for tactile feedback.
 * Backdrop: blurred overlay that fades in.
 */

const sheetSpring = { type: 'spring' as const, damping: 28, stiffness: 320 };
const tapSpring = { type: 'spring' as const, stiffness: 400, damping: 17 };

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            className="absolute left-0 right-0 bottom-0 bg-card border-t border-border rounded-t-[28px] flex flex-col overflow-hidden"
            style={{ height: '85vh', paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 2.5rem))' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-9 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 mb-4 flex-shrink-0">
                <h3 className="text-xl font-semibold text-foreground tracking-tight">{title}</h3>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={tapSpring}
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <X size={18} />
                </motion.button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none px-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

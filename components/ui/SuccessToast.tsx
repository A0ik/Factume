'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, X, CreditCard } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   SuccessToast — Magnifique toast animé par le bas
   Style iOS natif, carte avec icône ✅
   Apparaît par le bas, remonte doucement, disparaît après 3s
   ═══════════════════════════════════════════════════════════ */

interface ToastData {
  id: string;
  icon?: 'success' | 'payment';
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  showToast: (data: Omit<ToastData, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((data: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts((prev) => [...prev, { ...data, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-20 left-0 right-0 z-[70] flex flex-col items-center gap-2 pointer-events-none lg:hidden px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const IconComponent = toast.icon === 'payment' ? CreditCard : CheckCircle;
  const iconBg = toast.icon === 'payment' ? 'bg-blue-500' : 'bg-emerald-500';

  return (
    <motion.div
      layout
      initial={{ y: 120, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 80, opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        damping: 22,
        stiffness: 260,
        mass: 0.8,
      }}
      className="pointer-events-auto w-full max-w-sm"
    >
      <div className="relative overflow-hidden bg-gray-900 dark:bg-gray-100 border border-gray-800 dark:border-gray-200 rounded-2xl shadow-2xl shadow-black/30">
        {/* Subtle shimmer animation */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.2, delay: 0.3, ease: 'easeInOut' }}
        />

        <div className="relative flex items-center gap-3 p-4">
          {/* Animated icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}
          >
            <IconComponent size={20} className="text-white" />
          </motion.div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-bold text-white dark:text-gray-900"
            >
              {toast.title}
            </motion.p>
            {toast.subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
              >
                {toast.subtitle}
              </motion.p>
            )}
          </div>

          {/* Action button */}
          {toast.action && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              whileTap={{ scale: 0.95 }}
              onClick={toast.action.onClick}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors flex-shrink-0"
            >
              {toast.action.label}
            </motion.button>
          )}

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-300 dark:hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <motion.div
          className="h-0.5 bg-emerald-500"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 3.5, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

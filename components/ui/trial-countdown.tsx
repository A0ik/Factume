"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialCountdownProps {
  onClose?: () => void;
  className?: string;
}

export function TrialCountdown({ onClose, className }: TrialCountdownProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = React.useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    // Fetch trial end date once from server
    const fetchTrialEnd = async () => {
      try {
        const response = await fetch('/api/subscription/trial-status');
        if (response.ok) {
          const data = await response.json();
          if (data.trialEndDate) {
            const endDate = new Date(data.trialEndDate);
            // Client-side countdown, synced to server end date
            const tick = () => {
              const now = Date.now();
              const diff = endDate.getTime() - now;
              if (diff <= 0) { setIsVisible(false); return; }
              setTimeRemaining({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
              });
            };
            tick();
            const interval = setInterval(tick, 1000);
            return () => clearInterval(interval);
          } else {
            setIsVisible(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trial status:', error);
      }
    };
    fetchTrialEnd();
  }, []);

  if (!isVisible || !timeRemaining) return null;

  const formatTime = (value: number) => String(value).padStart(2, '0');

  const totalHours = timeRemaining.days * 24 + timeRemaining.hours;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg",
          className
        )}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="flex-shrink-0"
              >
                <Clock className="w-5 h-5" />
              </motion.div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Essai gratuit</span>
                <span className="text-white/80">- Il vous reste</span>
                <div className="flex items-center gap-1 font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                  <span>{totalHours > 24 ? `${timeRemaining.days}j ` : ''}</span>
                  <span>{formatTime(timeRemaining.hours)}h</span>
                  <span>{formatTime(timeRemaining.minutes)}m</span>
                  <span>{formatTime(timeRemaining.seconds)}s</span>
                </div>
                <span className="text-white/80">avant de passer à l'abonnement Business</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/paywall')}
                className="bg-white text-orange-600 px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-orange-50 transition-colors"
              >
                Passer à Pro maintenant
              </motion.button>
              {onClose && (
                <button
                  onClick={() => {
                    setIsVisible(false);
                    onClose?.();
                  }}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

const easeOut = [0.16, 1, 0.3, 1] as const;

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  delay?: number;
  duration?: number;
}

export function Reveal({ children, className, direction = 'up', delay = 0, duration = 0.6 }: RevealProps) {
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 30 : direction === 'down' ? -20 : 0,
      x: direction === 'left' ? 40 : direction === 'right' ? -40 : 0,
      scale: direction === 'scale' ? 0.92 : 1,
    },
    visible: {
      opacity: 1, y: 0, x: 0, scale: 1,
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: '-40px' }}
      variants={variants}
      transition={{ duration, delay, ease: easeOut }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

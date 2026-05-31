'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface ShimmerButtonProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  shimmerColor?: string;
}

export function ShimmerButton({ children, className, href, shimmerColor = 'rgba(255,255,255,0.15)' }: ShimmerButtonProps) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      href={href}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl font-semibold transition-all duration-500 active:scale-[0.97]',
        className
      )}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: [0.16, 1, 0.3, 1], repeatDelay: 1 }}
        style={{
          background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
        }}
      />
    </Tag>
  );
}

'use client';

import { cn } from '@/lib/cn';
import { motion } from 'framer-motion';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = '#10b981',
  colorTo = '#059669',
  delay = 0,
}: BorderBeamProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ overflow: 'hidden' }}>
      <motion.div
        className={cn('absolute', className)}
        style={{
          width: size,
          height: size,
          background: `linear-gradient(to right, ${colorFrom}, ${colorTo})`,
          borderRadius: '50%',
          maskImage: `radial-gradient(transparent 70%, black)`,
        }}
        initial={{ offsetDistance: '0%' }}
        animate={{ offsetDistance: '100%' }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          delay,
        }}
        // @ts-expect-error offset-path is not in CSSProperties
        style={{
          ...({ offsetPath: `rect(0 auto auto 0 round ${size}px)` } as React.CSSProperties),
          width: size,
          height: size,
          background: `linear-gradient(to right, ${colorFrom}, ${colorTo})`,
          borderRadius: '50%',
          maskImage: `radial-gradient(transparent 70%, black)`,
        }}
      />
      {/* Fallback animated border using CSS */}
      <div
        className={cn('absolute inset-0', className)}
        style={{
          borderRadius: 'inherit',
          padding: borderWidth,
          background: `conic-gradient(from ${anchor}deg, transparent 0%, ${colorFrom} 10%, ${colorTo} 20%, transparent 30%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          animation: `border-beam-spin ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

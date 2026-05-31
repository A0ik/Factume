'use client';

import { cn } from '@/lib/cn';

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  reverse?: boolean;
  pauseOnHover?: boolean;
}

export function Marquee({ children, className, speed = 40, reverse = false, pauseOnHover = true }: MarqueeProps) {
  return (
    <div
      className={cn('group flex overflow-hidden [--gap:1.5rem] gap-[var(--gap)]', className)}
      style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex shrink-0 items-center gap-[var(--gap)]',
            reverse ? '[animation-direction:reverse]' : '',
            pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''
          )}
          style={{
            animation: `marquee ${speed}s linear infinite`,
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

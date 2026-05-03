import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  className?: string;
  dark?: boolean;
}

const SIZES = {
  sm: {
    icon: 'w-9 h-9 rounded-xl',
    text: 'text-base',
    gap: 'gap-2',
    px: 128, // Image size
    src: '/logo-md.png' // Use optimized 128px image
  },
  md: {
    icon: 'w-11 h-11 rounded-xl',
    text: 'text-lg',
    gap: 'gap-2.5',
    px: 128, // Image size
    src: '/logo-md.png' // Use optimized 128px image
  },
  lg: {
    icon: 'w-14 h-14 rounded-xl',
    text: 'text-xl',
    gap: 'gap-3',
    px: 256, // Image size
    src: '/logo-lg.png' // Use optimized 256px image
  },
  xl: {
    icon: 'w-20 h-20 rounded-2xl',
    text: 'text-2xl',
    gap: 'gap-3',
    px: 512, // Image size
    src: '/logo-xl.png' // Use optimized 512px image
  },
};

export function Logo({ size = 'md', variant = 'full', className, dark = false }: LogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      {/* Icon mark — uses optimized logo with beautiful rounded corners */}
      <Image
        src={s.src}
        alt="Factu.me"
        width={s.px}
        height={s.px}
        className={cn(
          'flex-shrink-0 shadow-lg',
          s.icon
        )}
        priority
        style={{ borderRadius: '12px' }}
      />

      {variant === 'full' && (
        <div className="flex items-baseline gap-0.5">
          <span className={cn('font-black tracking-tight leading-none', s.text, dark ? 'text-white' : 'text-gray-900')}>
            Factu
          </span>
          <span className={cn('font-black tracking-tight leading-none', s.text, 'text-primary')}>
            .me
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;

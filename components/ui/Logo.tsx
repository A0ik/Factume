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
    icon: 'w-8 h-8 rounded-xl',
    text: 'text-base',
    gap: 'gap-2',
    px: 64, // Image size
    src: '/logo-md.png' // Use optimized 128px image
  },
  md: {
    icon: 'w-10 h-10 rounded-xl',
    text: 'text-lg',
    gap: 'gap-2.5',
    px: 128, // Image size
    src: '/logo-md.png' // Use optimized 128px image
  },
  lg: {
    icon: 'w-12 h-12 rounded-xl',
    text: 'text-xl',
    gap: 'gap-3',
    px: 256, // Image size
    src: '/logo-lg.png' // Use optimized 256px image
  },
  xl: {
    icon: 'w-16 h-16 rounded-2xl',
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
      <div className={cn(
        'flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden bg-white border-2 border-primary/10',
        s.icon
      )}>
        <Image
          src={s.src}
          alt="Factu.me"
          width={s.px}
          height={s.px}
          className="w-full h-full object-cover p-1"
          priority
        />
      </div>

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

'use client';

import { cn } from '@/lib/cn';
import { type CSSProperties, forwardRef } from 'react';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#ffffff',
      shimmerSize = '0.05em',
      shimmerDuration = '3s',
      borderRadius = '100px',
      background = 'rgba(16, 185, 129, 1)',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'group relative cursor-pointer overflow-hidden whitespace-nowrap px-6 py-3 text-white transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/25 active:scale-[0.97]',
          className
        )}
        style={
          {
            borderRadius,
            background,
            '--spread': shimmerSize,
            '--shimmer-color': shimmerColor,
          } as CSSProperties
        }
        {...props}
      >
        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ borderRadius }}
        >
          <div
            className="absolute inset-[-100%] animate-[spin_3s_linear_infinite]"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, var(--shimmer-color) 10%, transparent 20%)`,
            }}
          />
        </div>

        {/* Inner background to create cutout */}
        <div
          className="absolute inset-[var(--spread)]"
          style={{
            background,
            borderRadius: `calc(${borderRadius} - var(--spread))`,
          }}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2 font-semibold">
          {children}
        </span>
      </button>
    );
  }
);

ShimmerButton.displayName = 'ShimmerButton';

export { ShimmerButton };

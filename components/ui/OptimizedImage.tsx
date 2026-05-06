'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  /** Fallback content shown when the image fails to load */
  fallback?: React.ReactNode;
  /** Show a shimmer placeholder while loading (default: true) */
  shimmer?: boolean;
  /** Additional class names for the wrapper div */
  wrapperClassName?: string;
}

function ShimmerPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg',
        className
      )}
    />
  );
}

function ErrorFallback({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-400 dark:text-gray-500',
        className
      )}
    >
      {children ?? (
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
          />
        </svg>
      )}
    </div>
  );
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  wrapperClassName,
  fallback,
  shimmer = true,
  loading = 'lazy',
  ...props
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (hasError) {
    return (
      <ErrorFallback className={wrapperClassName}>
        {fallback}
      </ErrorFallback>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      {/* Shimmer placeholder shown while the image loads */}
      {shimmer && isLoading && (
        <ShimmerPlaceholder className="absolute inset-0" />
      )}

      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        loading={loading}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        {...props}
      />
    </div>
  );
}

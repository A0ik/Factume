'use client';

import { cn, getInitials } from '@/lib/utils';

// Palette solide — contraste correct en clair ET sombre (texte blanc).
const AVATAR_PALETTE = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#06b6d4', '#ef4444', '#14b8a6',
];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function Avatar({ name, size = 'md', color, className }: AvatarProps) {
  const dimensions = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl font-bold text-white flex-shrink-0 select-none',
        dimensions[size],
        className,
      )}
      style={{ backgroundColor: color || pickColor(name || '?') }}
      aria-hidden
    >
      {getInitials(name || '?')}
    </div>
  );
}

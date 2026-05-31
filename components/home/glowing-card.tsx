'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface GlowingCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowingCard({ children, className, glowColor = 'rgba(16, 185, 129, 0.15)' }: GlowingCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-2xl border border-transparent bg-white p-6 sm:p-7 lg:p-8 transition-all duration-500',
        'hover:-translate-y-0.5 hover:shadow-xl',
        className
      )}
      style={{
        borderColor: isHovered ? 'rgba(16, 185, 129, 0.25)' : 'rgb(241 245 249)',
        background: isHovered
          ? `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 60%), white`
          : 'white',
      }}
    >
      {children}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Header — responsive, thème-adaptatif
 */
export default function Header({ title, subtitle, back, actions, className }: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof back === 'string') router.push(back);
    else router.back();
  };

  return (
    <div className={cn(
      'flex items-center justify-between px-4 lg:px-0 py-4',
      'bg-transparent border-b border-border lg:border-0',
      className,
    )}>
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors -ml-2 active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

'use client';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Calendar, Settings, Home } from 'lucide-react';
import { InteractiveMenu, InteractiveMenuItem } from '@/components/ui/modern-mobile-menu';
import { useSubscription } from '@/hooks/useSubscription';
import { Logo } from '@/components/ui/Logo';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const sub = useSubscription();

  // Build nav items based on subscription
  const buildNav = (): (InteractiveMenuItem & { href: string })[] => {
    const nav: (InteractiveMenuItem & { href: string })[] = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
      { href: '/documents', icon: FileText, label: 'Docs' },
      { href: '/clients', icon: Users, label: 'Clients' },
    ];

    // Notes de frais - Pro/Business only
    if (!sub.effectiveIsPro) {
      // Skip - not available for Solo/Free
    } else {
      // For Pro/Business, we could add expenses here, but let's keep it simple
      // nav.push({ href: '/expenses', icon: Receipt, label: 'Dépenses' });
    }

    nav.push(
      { href: '/calendar', icon: Calendar, label: 'Agenda' },
      { href: '/settings', icon: Settings, label: 'Réglages' },
    );

    return nav;
  };

  const NAV = buildNav();

  const activeIndex = NAV.findIndex(({ href }) => pathname.startsWith(href));

  const handleItemClick = (index: number) => {
    router.push(NAV[index].href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200/80 dark:border-emerald-900/30 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV.map((item, index) => {
          const isActive = index === activeIndex;
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-0',
                isActive
                  ? 'text-primary scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg shadow-primary/20'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}>
                <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                'text-[10px] font-medium whitespace-nowrap',
                isActive ? 'font-bold' : ''
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

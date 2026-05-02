'use client';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Calendar, Settings } from 'lucide-react';
import { InteractiveMenu, InteractiveMenuItem } from '@/components/ui/modern-mobile-menu';
import { useSubscription } from '@/hooks/useSubscription';

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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 safe-area-bottom px-2 py-1">
      <InteractiveMenu
        items={NAV}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onItemClick={handleItemClick}
      />
    </nav>
  );
}

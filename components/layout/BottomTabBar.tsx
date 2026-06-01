'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCircle,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

/**
 * BottomTabBar — Floating Island Navigation 2026
 *
 * Design: pill-shaped floating bar with aggressive glassmorphism.
 * Spaced from screen edges for a true "island" feel.
 * FAB: raised central button with shadow glow.
 *
 * Physics: all transitions via springs (stiffness: 300, damping: 25).
 * whileTap: every interactive element responds to touch.
 * layoutId: active indicator slides smoothly between tabs.
 */
const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/documents/factures', icon: FileText, label: 'Factures' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/settings', icon: UserCircle, label: 'Compte' },
];

const springTransition = { type: 'spring' as const, damping: 25, stiffness: 300 };
const tapSpring = { type: 'spring' as const, stiffness: 400, damping: 17 };

export default function BottomTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Floating island bar */}
      <div className="mx-3 mb-2 rounded-2xl bg-background/70 backdrop-blur-2xl border border-border/50 shadow-lg shadow-black/10">
        <div className="flex items-center h-[60px] px-1">

          {/* Tab 0: Accueil */}
          <TabItem tab={tabs[0]} active={isActive(tabs[0].href)} />

          {/* Tab 1: Factures */}
          <TabItem tab={tabs[1]} active={isActive(tabs[1].href)} />

          {/* Central FAB — create new invoice */}
          <Link
            href="/documents/factures/new"
            className="relative flex items-center justify-center -mt-5"
            onClick={() => triggerHaptic('medium')}
          >
            <motion.div
              whileTap={{ scale: 0.85 }}
              transition={tapSpring}
              className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/40 ring-4 ring-background/50"
            >
              <Plus size={26} className="text-white" strokeWidth={2.5} />
            </motion.div>
          </Link>

          {/* Tab 2: Clients */}
          <TabItem tab={tabs[2]} active={isActive(tabs[2].href)} />

          {/* Tab 3: Compte */}
          <TabItem tab={tabs[3]} active={isActive(tabs[3].href)} />

        </div>
      </div>
    </nav>
  );
}

/**
 * TabItem — individual tab with icon + label
 * Active indicator slides via layoutId spring
 * whileTap gives tactile visual feedback
 */
function TabItem({ tab, active }: { tab: typeof tabs[number]; active: boolean }) {
  const Icon = tab.icon;

  return (
    <Link
      href={tab.href}
      onClick={() => triggerHaptic('light')}
      className="relative flex flex-1 flex-col items-center justify-center h-full"
    >
      {/* Active indicator dot — slides between tabs via layoutId */}
      {active && (
        <motion.div
          layoutId="tabIndicator"
          transition={springTransition}
          className="absolute top-1.5 w-1 h-1 rounded-full bg-emerald-400"
          style={{ left: '50%', x: '-50%' }}
        />
      )}

      <motion.div
        whileTap={{ scale: 0.88 }}
        transition={tapSpring}
        animate={{ scale: active ? 1.05 : 1, y: active ? -1 : 0 }}
        className="flex flex-col items-center gap-0.5"
      >
        <Icon
          size={21}
          strokeWidth={active ? 2.2 : 1.5}
          className={cn(
            'transition-colors duration-200',
            active ? 'text-emerald-400' : 'text-muted-foreground',
          )}
        />
        <span
          className={cn(
            'text-[10px] font-semibold transition-colors duration-200',
            active ? 'text-emerald-400' : 'text-muted-foreground',
          )}
        >
          {tab.label}
        </span>
      </motion.div>
    </Link>
  );
}

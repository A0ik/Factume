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
import { emitQuickCreate } from '@/lib/quick-create-events';

/**
 * BottomTabBar — Navigation native mobile
 *
 * 4 onglets avec labels textuels (pas juste des icônes)
 * + FAB central pour création rapide
 *
 * Design : glassmorphism sur fond sombre, indicator animé,
 * spring transitions, retour tactile visuel.
 */
const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/documents/factures', icon: FileText, label: 'Factures' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/settings', icon: UserCircle, label: 'Compte' },
];

const springTransition = { type: 'spring' as const, damping: 25, stiffness: 300 };

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
      {/* Glassmorphism backdrop — uniquement pour les éléments flottants */}
      <div className="bg-slate-950/80 backdrop-blur-2xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {tabs.map((tab, index) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;

            // Insert FAB between tab index 1 and 2
            if (index === 2) {
              return (
                <div key="fab-group" className="flex items-center gap-1 -mx-1">
                  {/* Central FAB — ouvre le QuickCreateSheet sur mobile */}
                  <button
                    className="relative flex items-center justify-center -mt-5"
                    onClick={() => {
                      triggerHaptic('medium');
                      emitQuickCreate();
                    }}
                  >
                    <motion.div
                      whileTap={{ scale: 0.88 }}
                      transition={springTransition}
                      className="w-13 h-13 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25"
                      style={{ width: 52, height: 52 }}
                    >
                      <Plus size={24} className="text-white" strokeWidth={2.5} />
                    </motion.div>
                  </button>
                  {/* The tab itself */}
                  <TabItem tab={tab} active={active} />
                </div>
              );
            }

            return <TabItem key={tab.href} tab={tab} active={active} />;
          })}
        </div>
      </div>
    </nav>
  );
}

/**
 * TabItem — un onglet individuel avec icône + label
 * Animation : l'indicateur actif glisse horizontalement (spring)
 */
function TabItem({ tab, active }: { tab: typeof tabs[number]; active: boolean }) {
  const Icon = tab.icon;

  return (
    <Link
      href={tab.href}
      className="relative flex flex-col items-center justify-center w-16 h-full"
    >
      {/* Active indicator — dot under the icon */}
      {active && (
        <motion.div
          layoutId="tabIndicator"
          transition={springTransition}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-emerald-400"
        />
      )}

      <motion.div
        animate={{ scale: active ? 1.05 : 1, y: active ? -1 : 0 }}
        transition={springTransition}
        className="flex flex-col items-center gap-0.5"
      >
        <Icon
          size={22}
          strokeWidth={active ? 2.2 : 1.5}
          className={cn(
            'transition-colors duration-200',
            active ? 'text-emerald-400' : 'text-slate-500',
          )}
        />
        <span
          className={cn(
            'text-[10px] font-semibold transition-colors duration-200',
            active ? 'text-emerald-400' : 'text-slate-500',
          )}
        >
          {tab.label}
        </span>
      </motion.div>
    </Link>
  );
}

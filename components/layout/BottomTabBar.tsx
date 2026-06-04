'use client';

import { useState } from 'react';
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
import DocumentTypeSheet from '@/components/invoices/DocumentTypeSheet';

/**
 * BottomTabBar — Navigation native mobile
 *
 * 4 onglets + FAB central pour création rapide de documents
 * Layout : [Tab][Tab][FAB][Tab][Tab] — 5 colonnes égales
 *
 * Design : opaque background (no transparency leak),
 * indicator animé via layoutId, spring transitions, retour tactile visuel.
 *
 * BUG FIX: Uses solid opaque background instead of semi-transparent to prevent
 * content showing through during scroll. Uses env(safe-area-inset-bottom) for
 * proper anchoring on notched devices.
 */
const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/documents/factures', icon: FileText, label: 'Documents' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/settings', icon: UserCircle, label: 'Compte' },
];

const springTransition = { type: 'spring' as const, damping: 25, stiffness: 300 };

export default function BottomTabBar() {
  const pathname = usePathname();
  const [showDocSheet, setShowDocSheet] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Opaque background — no content leak during scroll.
            Using bg-white/bg-slate-900 instead of bg-background/80 transparency. */}
        <div className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-end h-16 max-w-lg mx-auto px-2">

            {/* Tab 0: Accueil */}
            <TabItem tab={tabs[0]} active={isActive(tabs[0].href)} />

            {/* Tab 1: Factures */}
            <TabItem tab={tabs[1]} active={isActive(tabs[1].href)} />

            {/* Central FAB — opens Document Type Sheet */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setShowDocSheet(true);
              }}
              className="relative flex items-center justify-center -mt-6"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                transition={springTransition}
                className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
              >
                <Plus size={26} className="text-white" strokeWidth={2.5} />
              </motion.div>
            </button>

            {/* Tab 2: Clients */}
            <TabItem tab={tabs[2]} active={isActive(tabs[2].href)} />

            {/* Tab 3: Compte */}
            <TabItem tab={tabs[3]} active={isActive(tabs[3].href)} />

          </div>
        </div>
      </nav>

      {/* Document Type Sheet — accessible from FAB */}
      <DocumentTypeSheet open={showDocSheet} onClose={() => setShowDocSheet(false)} />
    </>
  );
}

/**
 * TabItem — un onglet individuel avec icône + label
 * Animation : l'indicateur actif glisse horizontalement (layoutId spring)
 * Centrage strict via flex + items-center
 */
function TabItem({ tab, active }: { tab: typeof tabs[number]; active: boolean }) {
  const Icon = tab.icon;

  return (
    <Link
      href={tab.href}
      onClick={() => triggerHaptic('light')}
      className="relative flex flex-1 flex-col items-center justify-center h-full"
    >
      {/* Active indicator — perfectly centered above icon */}
      {active && (
        <motion.div
          layoutId="tabIndicator"
          transition={springTransition}
          className="absolute top-1 w-5 h-0.5 rounded-full bg-emerald-400"
          style={{ left: '50%', x: '-50%' }}
        />
      )}

      <motion.div
        animate={{ scale: active ? 1.08 : 1, y: active ? -2 : 0 }}
        transition={springTransition}
        className="flex flex-col items-center gap-0.5"
      >
        <Icon
          size={22}
          strokeWidth={active ? 2.2 : 1.5}
          className={cn(
            'transition-colors duration-200',
            active ? 'text-emerald-400' : 'text-slate-400 dark:text-slate-500',
          )}
        />
        <span
          className={cn(
            'text-[10px] font-semibold transition-colors duration-200',
            active ? 'text-emerald-400' : 'text-slate-400 dark:text-slate-500',
          )}
        >
          {tab.label}
        </span>
      </motion.div>
    </Link>
  );
}

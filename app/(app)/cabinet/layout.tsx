'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, FileText, Briefcase, Calendar,
  ClipboardList, Bell, UserPlus, Settings, Menu, X,
  Building2, ChevronRight, Shield, HardHat, FileCheck,
  CalendarClock, ArrowLeftRight, FileWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCabinetStore } from '@/stores/cabinetStore';
import CabinetGuard from '@/components/cabinet/CabinetGuard';
import CabinetSidebar from '@/components/cabinet/CabinetSidebar';

// ─── Mobile nav items (bottom tab bar) ──────────────────────────────
const MOBILE_TABS = [
  { href: '/cabinet', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/cabinet/clients', icon: Users, label: 'Clients' },
  { href: '/cabinet/facturation', icon: FileText, label: 'Factures' },
  { href: '/cabinet/settings', icon: Settings, label: 'Réglages' },
];

// ─── Mobile drawer nav ──────────────────────────────────────────────
const DRAWER_GROUPS = [
  {
    items: [
      { href: '/cabinet', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/cabinet/clients', icon: Users, label: 'Clients' },
      { href: '/cabinet/facturation', icon: FileText, label: 'Facturation' },
    ],
  },
  {
    title: 'Social',
    items: [
      { href: '/cabinet/paie', icon: Briefcase, label: 'Paie' },
      { href: '/cabinet/salaries', icon: HardHat, label: 'Salariés' },
      { href: '/cabinet/dsn', icon: Shield, label: 'DSN' },
      { href: '/cabinet/dpae', icon: FileCheck, label: 'DPAE' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { href: '/cabinet/contrats', icon: ClipboardList, label: 'Contrats' },
      { href: '/cabinet/missions', icon: Briefcase, label: 'Missions' },
      { href: '/cabinet/agenda', icon: Calendar, label: 'Agenda' },
    ],
  },
  {
    title: 'Fiscal & Juridique',
    items: [
      { href: '/cabinet/echeances', icon: CalendarClock, label: 'Échéances' },
      { href: '/cabinet/reconciliation', icon: ArrowLeftRight, label: 'Réconciliation' },
      { href: '/cabinet/juridique', icon: FileWarning, label: 'Juridique' },
    ],
  },
  {
    items: [
      { href: '/cabinet/relances', icon: Bell, label: 'Relances' },
      { href: '/cabinet/invitations', icon: UserPlus, label: 'Invitations' },
      { href: '/cabinet/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
];

// ─── Layout Component ───────────────────────────────────────────────
export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const cabinet = useCabinetStore(state => state.cabinet);

  const primaryColor = cabinet?.primary_color || '#10b981';

  const isActive = (href: string) => {
    if (href === '/cabinet') return pathname === '/cabinet';
    return pathname.startsWith(href);
  };

  return (
    <CabinetGuard>
      <div className="flex min-h-screen bg-[#09090B]">
        {/* ─── Desktop Sidebar ─── */}
        <CabinetSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* ─── Main Content Area ─── */}
        <main className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* ─── Mobile Top Bar ─── */}
          <div className="lg:hidden sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-2xl border-b border-white/[0.06]"
               style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className="flex items-center justify-between px-4 h-14">
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-all active:scale-90"
                aria-label="Menu cabinet"
              >
                <Menu size={20} strokeWidth={1.8} />
              </button>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Building2 size={12} className="text-white" />
                </div>
                <span className="text-[15px] font-semibold text-zinc-100 truncate max-w-[200px]">
                  {cabinet?.name || 'Cabinet'}
                </span>
              </div>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </div>

          {/* ─── Page Content ─── */}
          <div className="flex-1 w-full px-4 lg:px-8 py-5 lg:py-6">
            {children}
          </div>

          {/* ─── Mobile Bottom Tab Bar ─── */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090B]/95 backdrop-blur-xl border-t border-white/[0.06]"
               style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-around h-16 px-2">
              {MOBILE_TABS.map((tab) => {
                const active = isActive(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                      active ? 'text-zinc-100' : 'text-zinc-500'
                    )}
                  >
                    <div className="relative">
                      <tab.icon size={20} strokeWidth={active ? 2 : 1.6} />
                      {active && (
                        <motion.div
                          layoutId="cabinet-mobile-tab"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{ backgroundColor: primaryColor }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>

        {/* ─── Mobile Drawer ─── */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 z-50 lg:hidden"
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#09090B] border-r border-white/[0.06] z-50 lg:hidden flex flex-col"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Building2 size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100">{cabinet?.name || 'Cabinet'}</p>
                      <p className="text-[10px] text-zinc-500">Expert-Comptable</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Drawer Nav */}
                <nav className="flex-1 overflow-y-auto py-3 px-2">
                  {DRAWER_GROUPS.map((group, gi) => (
                    <div key={gi} className={cn(gi > 0 && 'mt-4')}>
                      {group.title && (
                        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">
                          {group.title}
                        </p>
                      )}
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setDrawerOpen(false)}
                              className={cn(
                                'flex items-center gap-3 h-10 px-3 rounded-xl transition-colors',
                                active
                                  ? 'bg-white/[0.06] text-zinc-100'
                                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                              )}
                            >
                              <item.icon size={18} strokeWidth={active ? 2 : 1.6} />
                              <span className="text-[13px] font-medium">{item.label}</span>
                              <ChevronRight size={14} className="ml-auto text-zinc-700" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                {/* Drawer Footer */}
                <div className="border-t border-white/[0.06] p-3">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 h-10 px-3 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
                  >
                    <ArrowLeftRight size={16} />
                    <span className="text-xs font-medium">Retour à l'app</span>
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </CabinetGuard>
  );
}

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, FileText, Briefcase, Calendar,
  ClipboardList, Bell, UserPlus, Settings, Menu, X,
  Building2, ChevronRight, Shield, HardHat, FileCheck,
  CalendarClock, ArrowLeftRight, Scale, Wallet, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import CabinetGuard from '@/components/cabinet/CabinetGuard';
import CabinetSidebar from '@/components/cabinet/CabinetSidebar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar } from '@/components/cabinet/ui';
import type { LucideIcon } from 'lucide-react';

// ─── Onglets mobile (barre du bas) ──────────────────────────────
const MOBILE_TABS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/cabinet', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/cabinet/clients', icon: Users, label: 'Clients' },
  { href: '/cabinet/facturation', icon: FileText, label: 'Factures' },
  { href: '/cabinet/settings', icon: Settings, label: 'Réglages' },
];

// ─── Drawer mobile ──────────────────────────────────────────────
const DRAWER_GROUPS: { title?: string; items: { href: string; icon: LucideIcon; label: string }[] }[] = [
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
      { href: '/cabinet/paie', icon: Wallet, label: 'Paie' },
      { href: '/cabinet/salaries', icon: HardHat, label: 'Salariés' },
      { href: '/cabinet/dsn', icon: Shield, label: 'DSN' },
      { href: '/cabinet/dpae', icon: FileCheck, label: 'DPAE' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { href: '/cabinet/contrats', icon: ClipboardList, label: 'Contrats' },
      { href: '/cabinet/missions', icon: Target, label: 'Missions' },
      { href: '/cabinet/agenda', icon: Calendar, label: 'Agenda' },
    ],
  },
  {
    title: 'Fiscal & Juridique',
    items: [
      { href: '/cabinet/echeances', icon: CalendarClock, label: 'Échéances' },
      { href: '/cabinet/reconciliation', icon: ArrowLeftRight, label: 'Réconciliation' },
      { href: '/cabinet/juridique', icon: Scale, label: 'Juridique' },
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

// ─── Titre de section selon le pathname (topbar desktop) ────────
function sectionTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/cabinet': 'Dashboard',
    '/cabinet/clients': 'Portefeuille clients',
    '/cabinet/facturation': 'Suivi facturation',
    '/cabinet/relances': 'Relances automatiques',
    '/cabinet/paie': 'Paie',
    '/cabinet/salaries': 'Dossiers salariés',
    '/cabinet/dsn': 'DSN',
    '/cabinet/dpae': 'DPAE',
    '/cabinet/contrats': 'Contrats & DPAE',
    '/cabinet/missions': 'Lettres de mission',
    '/cabinet/agenda': 'Agenda & rendez-vous',
    '/cabinet/echeances': 'Échéances fiscales',
    '/cabinet/reconciliation': 'Réconciliation',
    '/cabinet/juridique': 'Juridique',
    '/cabinet/analytics': 'Analytics',
    '/cabinet/invitations': 'Invitations',
    '/cabinet/settings': 'Mon cabinet',
  };
  const exact = map[pathname];
  if (exact) return exact;
  const match = Object.keys(map)
    .filter((k) => k !== '/cabinet' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? map[match] : 'Cabinet';
}

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const cabinet = useCabinetStore((state) => state.cabinet);
  const profile = useAuthStore((state) => state.profile);

  const primaryColor = cabinet?.primary_color || '#10b981';
  const brandName =
    cabinet?.hide_factu_branding && cabinet?.white_label_name
      ? cabinet.white_label_name
      : cabinet?.name || 'Cabinet';
  const userName = profile?.first_name || profile?.company_name || profile?.email || 'U';

  const isActive = (href: string) =>
    href === '/cabinet' ? pathname === '/cabinet' : pathname.startsWith(href);

  return (
    <CabinetGuard>
      <div className="flex min-h-screen">
        {/* ─── Sidebar desktop ─── */}
        <CabinetSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* ─── Zone principale ─── */}
        <main className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* ─── Topbar desktop ─── */}
          <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-3 px-6 bg-white/80 backdrop-blur-xl border-b border-gray-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {brandName}
              </span>
              <ChevronRight size={13} className="text-gray-300" />
              <h1 className="text-sm font-bold text-gray-900 truncate">{sectionTitle(pathname)}</h1>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <Link
                href="/cabinet/relances"
                className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                title="Notifications"
              >
                <Bell size={18} />
              </Link>
              <Link
                href="/cabinet/settings"
                className="ml-1 flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
                title="Mon cabinet"
              >
                <Avatar name={userName} size="sm" />
              </Link>
            </div>
          </header>

          {/* ─── Topbar mobile ─── */}
          <div
            className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-200"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="flex items-center justify-between px-4 h-14">
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-90"
                aria-label="Ouvrir le menu"
              >
                <Menu size={20} strokeWidth={1.8} />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {cabinet?.logo_url ? (
                    <img src={cabinet.logo_url} alt="" className="w-3.5 h-3.5 rounded object-contain" />
                  ) : (
                    <Building2 size={12} className="text-white" />
                  )}
                </div>
                <span className="text-[15px] font-bold text-gray-900 truncate max-w-[180px]">
                  {brandName}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* ─── Contenu ─── */}
          <div className="flex-1 w-full px-4 lg:px-6 py-5 lg:py-6 pb-24 lg:pb-6">{children}</div>

          {/* ─── Barre d'onglets mobile ─── */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-around h-16 px-2">
              {MOBILE_TABS.map((tab) => {
                const active = isActive(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                      active ? 'text-gray-900' : 'text-gray-400',
                    )}
                  >
                    <div className="relative">
                      <tab.icon size={20} strokeWidth={active ? 2.2 : 1.7} />
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

        {/* ─── Drawer mobile ─── */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 lg:hidden"
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="fixed left-0 top-0 bottom-0 w-[280px] bg-white border-r border-gray-200 z-50 lg:hidden flex flex-col"
              >
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {cabinet?.logo_url ? (
                        <img src={cabinet.logo_url} alt="" className="w-5 h-5 rounded object-contain" />
                      ) : (
                        <Building2 size={18} className="text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{brandName}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Expert-Comptable</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Fermer le menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-none">
                  {DRAWER_GROUPS.map((group, gi) => (
                    <div key={gi} className={cn(gi > 0 && 'mt-4')}>
                      {group.title && (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
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
                                  ? 'bg-gray-100 text-gray-900 font-semibold'
                                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                              )}
                            >
                              <item.icon size={18} strokeWidth={active ? 2.2 : 1.7} />
                              <span className="text-[13px] font-medium">{item.label}</span>
                              <ChevronRight size={14} className="ml-auto text-gray-300" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="border-t border-gray-100 p-3">
                  <Link
                    href="/dashboard"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 h-10 px-3 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeftRight size={16} />
                    <span className="text-xs font-medium">Retour à l&apos;app</span>
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

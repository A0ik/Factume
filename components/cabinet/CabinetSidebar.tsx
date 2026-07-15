'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, FileText, Bell, Wallet, HardHat, Shield,
  FileCheck, ClipboardList, Target, CalendarClock, Scale, ArrowLeftRight,
  Calendar, BarChart3, UserPlus, Settings, Calculator, MessageSquare,
  ChevronLeft, ArrowLeftRight as ArrowBack,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCabinetStore } from '@/stores/cabinetStore';
import CabinetSwitcher from './CabinetSwitcher';
import CabinetLogo from './CabinetLogo';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface NavGroup {
  title?: string;
  /** Pastille colorée du groupe (style Lexis). */
  accent?: string;
  items: NavItem[];
}

// ASTRÉE (CIBLE 2c) — Refonte Pennylane : 4 groupes clairs au lieu de 6 éparpillés.
//   1. Pilotage (sans titre) — Dashboard, Clients, Facturation, Relances
//   2. Social & Paie — tout le RH unifié
//   3. Conformité — échéances, réconciliation, juridique
//   4. Outils (sans titre) — agenda, analytics, invitations, paramètres
const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/cabinet', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/cabinet/clients', icon: Users, label: 'Clients' },
      { href: '/cabinet/facturation', icon: FileText, label: 'Facturation' },
      { href: '/cabinet/relances', icon: Bell, label: 'Relances' },
      { href: '/cabinet/messagerie', icon: MessageSquare, label: 'Messagerie' },
    ],
  },
  {
    title: 'Social & Paie',
    accent: '#14b8a6',
    items: [
      { href: '/cabinet/paie', icon: Wallet, label: 'Paie' },
      { href: '/cabinet/salaries', icon: HardHat, label: 'Salariés' },
      { href: '/cabinet/dpae', icon: FileCheck, label: 'DPAE' },
      { href: '/cabinet/dsn', icon: Shield, label: 'DSN' },
      { href: '/cabinet/contrats', icon: ClipboardList, label: 'Contrats' },
      { href: '/cabinet/missions', icon: Target, label: 'Missions' },
    ],
  },
  {
    title: 'Conformité',
    accent: '#f59e0b',
    items: [
      { href: '/cabinet/echeances', icon: CalendarClock, label: 'Échéances' },
      { href: '/cabinet/reconciliation', icon: ArrowLeftRight, label: 'Réconciliation' },
      { href: '/cabinet/comptabilite', icon: Calculator, label: 'Comptabilité' },
      { href: '/cabinet/juridique', icon: Scale, label: 'Juridique' },
    ],
  },
  {
    items: [
      { href: '/cabinet/agenda', icon: Calendar, label: 'Agenda' },
      { href: '/cabinet/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/cabinet/invitations', icon: UserPlus, label: 'Invitations' },
      { href: '/cabinet/settings', icon: Settings, label: 'Paramètres' },
    ],
  },
];

interface CabinetSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function CabinetSidebar({ collapsed, onToggle }: CabinetSidebarProps) {
  const pathname = usePathname();
  const cabinet = useCabinetStore((state) => state.cabinet);

  const isActive = (href: string) =>
    href === '/cabinet' ? pathname === '/cabinet' : pathname.startsWith(href);

  const primaryColor = cabinet?.primary_color || '#10b981';
  const brandName =
    cabinet?.hide_factu_branding && cabinet?.white_label_name
      ? cabinet.white_label_name
      : cabinet?.name || 'Cabinet';

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 264 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-border bg-card overflow-hidden flex-shrink-0 z-40"
    >
      {/* ─── Header : marque du cabinet ─── */}
      <div className="flex items-center gap-3 h-16 flex-shrink-0 border-b border-border px-4">
        {collapsed ? (
          <button
            onClick={onToggle}
            aria-label="Déplier le menu"
            title="Déplier le menu"
            className="flex-shrink-0 rounded-xl transition-transform hover:scale-105"
          >
            <CabinetLogo logoUrl={cabinet?.logo_url} color={primaryColor} />
          </button>
        ) : (
          <>
            <CabinetLogo logoUrl={cabinet?.logo_url} color={primaryColor} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{brandName}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expert-Comptable</p>
            </div>
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Replier le menu"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        )}
      </div>

      {/* ─── Switcher multi-cabinets ─── */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-border">
          <CabinetSwitcher />
        </div>
      )}

      {/* ─── Navigation ─── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-none">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-4')}>
            {group.title && !collapsed && (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: group.accent || '#6b7280' }}
                />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </p>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl transition-colors group relative',
                      collapsed ? 'w-11 h-11 mx-auto justify-center' : 'h-10 px-3',
                      active
                        ? 'bg-muted text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="cabinet-nav-indicator"
                        className="absolute left-0 w-[3px] h-5 rounded-r-full"
                        style={{ backgroundColor: primaryColor }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <item.icon
                      size={18}
                      strokeWidth={active ? 2.3 : 1.8}
                      className="flex-shrink-0"
                    />
                    {!collapsed && <span className="text-[13px] truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Footer ─── */}
      <div
        className={cn(
          'border-t border-border flex-shrink-0',
          collapsed ? 'p-2' : 'p-3',
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            collapsed ? 'w-11 h-11 mx-auto justify-center' : 'h-10 px-3',
          )}
          title="Retour à l'app"
        >
          <ArrowBack size={17} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Retour à l&apos;app</span>}
        </Link>
      </div>
    </motion.aside>
  );
}

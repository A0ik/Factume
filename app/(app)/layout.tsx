'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useSidebarState, hydrateSidebarMode } from '@/hooks/useSidebarState';
import Sidebar from '@/components/layout/Sidebar';
import MobileDrawer from '@/components/layout/MobileDrawer';
import BottomTabBar from '@/components/layout/BottomTabBar';
import MobileLayout from '@/components/layout/MobileLayout';
import { Logo } from '@/components/ui/Logo';
import dynamic from 'next/dynamic';
const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette'), { ssr: false });
const OnboardingWizard = dynamic(() => import('@/components/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })), { ssr: false });
const CopilotFAB = dynamic(() => import('@/components/copilot/CopilotFAB'), { ssr: false });
import { InvoiceCounter } from '@/components/ui/invoice-counter';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';
import { Toaster } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { ToastProvider } from '@/components/ui/SuccessToast';

/** Titre contextuel de la page pour la top bar mobile */
function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard' || pathname === '/') return 'Accueil';
  if (pathname === '/documents') return 'Documents';
  if (pathname === '/contacts') return 'Contacts';
  if (pathname.startsWith('/documents')) return 'Documents';
  if (pathname.startsWith('/contacts')) return 'Contacts';
  if (pathname.startsWith('/invoices/new') || pathname.startsWith('/documents/create')) return 'Nouveau document';
  if (pathname.startsWith('/invoices/')) return 'Document';
  if (pathname.startsWith('/clients')) return 'Clients';
  if (pathname.startsWith('/settings')) return 'Paramètres';
  if (pathname.startsWith('/contracts')) return 'Contrats';
  if (pathname.startsWith('/expenses')) return 'Dépenses';
  if (pathname.startsWith('/notifications')) return 'Notifications';
  if (pathname.startsWith('/recurring')) return 'Récurrentes';
  if (pathname.startsWith('/products')) return 'Articles';
  if (pathname.startsWith('/crm')) return 'Pipeline';
  return 'Factu.me';
}

/** Sidebar width for main content margin */
function getSidebarWidth(mode: string): number {
  if (mode === 'focus') return 0;
  if (mode === 'expanded') return 260;
  return 64;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const fetchInvoices = useDataStore(state => state.fetchInvoices);
  const fetchClients = useDataStore(state => state.fetchClients);
  const { isFree, invoiceCount, maxInvoices } = useSubscription();
  const pathname = usePathname();
  const sidebarMode = useSidebarState(state => state.mode);
  const [showInvoiceCounter, setShowInvoiceCounter] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hydrate sidebar mode from localStorage on mount
  useEffect(() => { hydrateSidebarMode(); }, []);

  // ZENITH: Cmd+/ toggle focus mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        useSidebarState.getState().toggleFocus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.replace('/login'); return; }
    fetchInvoices();
    fetchClients();
  }, [initialized, user, fetchInvoices, fetchClients]);

  useEffect(() => {
    if (typeof window === 'undefined' || !initialized || !user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      import('@/stores/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().fetchProfile(user.id);
      });
    }
  }, [initialized, user]);

  const hideBanners = pathname === '/paywall' || pathname === '/trial';

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const sidebarWidth = getSidebarWidth(sidebarMode);

  return (
    <ToastProvider>
      <meta name="robots" content="noindex, nofollow" />
      <Toaster position="top-right" richColors closeButton />
      <CommandPalette />
      <AutoSaveIndicator />
      {/* ARBITER FIX: OnboardingWizard only in (app) layout — never on auth/onboarding/marketing pages */}
      <OnboardingWizard />

      {/* CIBLE 1 (HEPHAISTOS) — Bannière d'essai supprimée du layout.
          Le composant TrialCountdown reste sur disque mais n'est plus rendu. */}

      {isFree && showInvoiceCounter && !hideBanners && (
        <InvoiceCounter invoiceCount={invoiceCount} maxInvoices={Number.isFinite(maxInvoices) ? maxInvoices : 3} onClose={() => setShowInvoiceCounter(false)} />
      )}

      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main
          className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0 transition-[margin-left] duration-300"
          style={{ marginLeft: sidebarWidth > 0 ? undefined : 0 }}
        >
          {/* Mobile top bar — native app style with contextual title */}
          <div className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-border"
               style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className="flex items-center justify-between px-4 h-14">
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-90"
                aria-label="Menu navigation"
              >
                <Menu size={20} strokeWidth={1.8} />
              </button>
              <h1 className="text-[15px] font-semibold text-foreground">
                {getPageTitle(pathname)}
              </h1>
              <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
                <Logo size="sm" variant="icon" />
              </Link>
            </div>
          </div>

          <MobileLayout>
            <div className={cn(
              "flex-1 w-full py-5 lg:py-6",
              pathname.startsWith('/cabinet')
                ? "px-0 lg:px-0"
                : "mx-auto px-5 lg:px-8",
              pathname === '/paywall' || pathname === '/calendar' || pathname === '/ocr' || pathname === '/expenses/analytics' || pathname === '/expenses/export' || pathname === '/expenses/approvals' || pathname.startsWith('/banking/transactions')
                ? "max-w-[1800px]"
                : pathname.startsWith('/contracts') || pathname === '/dashboard' || pathname === '/'
                ? "max-w-[1400px]"
                : !pathname.startsWith('/cabinet')
                ? "max-w-7xl"
                : ""
            )}>
              {children}
            </div>
          </MobileLayout>
        </main>

        {/* Floating pill navigation */}
        <BottomTabBar />

        {/* HEPHAISTOS (CIBLE 4) — Copilot IA flottant (plan Business, auto-gating interne) */}
        <CopilotFAB />

        {/* Mobile drawer */}
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </ToastProvider>
  );
}

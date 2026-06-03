'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import Sidebar from '@/components/layout/Sidebar';
import MobileDrawer from '@/components/layout/MobileDrawer';
import BottomTabBar from '@/components/layout/BottomTabBar';
import MobileLayout from '@/components/layout/MobileLayout';
import { Logo } from '@/components/ui/Logo';
import { ServiceWorkerRegistration } from '@/components/ui/ServiceWorkerRegistration';
import dynamic from 'next/dynamic';
const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette'), { ssr: false });
import { TrialCountdown } from '@/components/ui/trial-countdown';
import { InvoiceCounter } from '@/components/ui/invoice-counter';
import { UpgradeBanner } from '@/components/ui/upgrade-banner';
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
  if (pathname.startsWith('/documents')) return 'Documents';
  if (pathname.startsWith('/invoices/new') || pathname.startsWith('/documents/create')) return 'Nouveau document';
  if (pathname.startsWith('/invoices/')) return 'Document';
  if (pathname.startsWith('/clients')) return 'Clients';
  if (pathname.startsWith('/settings')) return 'Paramètres';
  if (pathname.startsWith('/contracts')) return 'Contrats';
  if (pathname.startsWith('/expenses')) return 'Dépenses';
  if (pathname.startsWith('/notifications')) return 'Notifications';
  if (pathname.startsWith('/recurring')) return 'Récurrentes';
  return 'Factu.me';
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, profile } = useAuthStore();
  const fetchInvoices = useDataStore(state => state.fetchInvoices);
  const fetchClients = useDataStore(state => state.fetchClients);
  const invoices = useDataStore(state => state.invoices);
  const { isFree, isTrialActive, invoiceCount } = useSubscription();
  const pathname = usePathname();
  const [showTrialBanner, setShowTrialBanner] = useState(true);
  const [showInvoiceCounter, setShowInvoiceCounter] = useState(true);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  return (
    <ToastProvider>
      <meta name="robots" content="noindex, nofollow" />
      <Toaster position="top-right" richColors closeButton />
      <ServiceWorkerRegistration />
      <CommandPalette />
      <AutoSaveIndicator />

      {isTrialActive && showTrialBanner && !hideBanners && (
        <TrialCountdown onClose={() => setShowTrialBanner(false)} trialDocumentCount={profile?.trial_document_count || 0} trialDocLimit={3} />
      )}

      {isFree && showInvoiceCounter && !hideBanners && (
        <InvoiceCounter invoiceCount={invoiceCount} maxInvoices={5} onClose={() => setShowInvoiceCounter(false)} />
      )}

      {isFree && !hideBanners && !pathname.startsWith('/cabinet') && showUpgradeBanner && pathname === '/invoices' && (
        <div className="container mx-auto px-4 lg:px-8 pt-4">
          <UpgradeBanner
            type="limit"
            buttonText="Activer l'essai gratuit"
            description="7 jours d'accès complet à toutes les fonctionnalités"
            onClick={() => router.push('/trial')}
            onClose={() => setShowUpgradeBanner(false)}
          />
        </div>
      )}

      <div className="flex min-h-screen bg-background">
        {!pathname.startsWith('/cabinet') && <Sidebar />}
        <main className={cn(
          "flex-1 flex flex-col min-w-0",
          pathname.startsWith('/cabinet') ? "pb-20 lg:pb-0 lg:pl-0" : "pb-20 lg:pb-0"
        )}>
          {/* Mobile top bar — native app style with contextual title */}
          {!pathname.startsWith('/cabinet') && (
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
          )}

          <MobileLayout>
            <div className={cn(
              "flex-1 w-full py-5 lg:py-6",
              pathname.startsWith('/cabinet')
                ? "px-0 lg:px-0"
                : "mx-auto px-5 lg:px-8",
              pathname === '/paywall' || pathname === '/calendar' || pathname === '/ocr' || pathname === '/expenses/analytics' || pathname === '/expenses/export' || pathname === '/expenses/approvals' || pathname.startsWith('/banking/transactions')
                ? "max-w-[1800px]"
                : pathname.startsWith('/contracts')
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
        {!pathname.startsWith('/cabinet') && <BottomTabBar />}

        {/* Mobile drawer */}
        {!pathname.startsWith('/cabinet') && <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
      </div>
    </ToastProvider>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CabinetGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore(state => state.profile);
  const initialized = useAuthStore(state => state.initialized);
  const cabinet = useCabinetStore(state => state.cabinet);
  const loading = useCabinetStore(state => state.loading);
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);
  const fetched = useRef(false);
  const [fetchCompleted, setFetchCompleted] = useState(false);

  useEffect(() => {
    if (initialized && profile && !fetched.current) {
      fetched.current = true;
      useCabinetStore.getState().hydrateFromCache();
      useCabinetStore.getState().fetchCabinet().then(() => {
        const { cabinet: freshCabinet } = useCabinetStore.getState();
        setFetchCompleted(true);
        if (freshCabinet) {
          redirected.current = false;
        }
      });
    }
  }, [initialized, profile]);

  // Only redirect to cabinet creation after fetch has completed and no cabinet found
  // Skip redirect if we're already on the cabinet dashboard page (it has its own creation UI)
  useEffect(() => {
    if (initialized && profile && fetchCompleted && !loading && !cabinet && !redirected.current && pathname !== '/cabinet') {
      redirected.current = true;
      toast.error('Creez d\'abord votre cabinet');
      router.push('/cabinet');
    }
  }, [initialized, profile, fetchCompleted, loading, cabinet, router, pathname]);

  if (!profile || loading || !fetchCompleted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!cabinet) {
    // On the cabinet dashboard, the page itself shows the creation form
    // On other cabinet pages, redirect to dashboard
    if (pathname !== '/cabinet') {
      if (!redirected.current) {
        redirected.current = true;
        router.push('/cabinet');
      }
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={36} className="text-primary animate-spin" />
        </div>
      );
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}

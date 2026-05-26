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
  const [fetchDone, setFetchDone] = useState(false);

  // Fetch cabinet data once when auth is ready
  useEffect(() => {
    if (initialized && profile && !fetched.current) {
      fetched.current = true;
      useCabinetStore.getState().hydrateFromCache();
      useCabinetStore.getState().fetchCabinet().then(() => {
        setFetchDone(true);
      }).catch(() => {
        // Network error — still mark as done, use cached data
        setFetchDone(true);
      });
    }
  }, [initialized, profile]);

  // Redirect to cabinet creation only if fetch succeeded and no cabinet
  useEffect(() => {
    if (
      initialized &&
      profile &&
      fetchDone &&
      !loading &&
      !cabinet &&
      !redirected.current &&
      pathname !== '/cabinet'
    ) {
      const freshCabinet = useCabinetStore.getState().cabinet;
      if (!freshCabinet) {
        redirected.current = true;
        toast.error('Créez d\'abord votre cabinet');
        router.push('/cabinet');
      }
    }
  }, [initialized, profile, fetchDone, loading, cabinet, router, pathname]);

  // Loading state while fetching
  if (!profile || !fetchDone || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  // No cabinet — show creation page or redirect
  if (!cabinet) {
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

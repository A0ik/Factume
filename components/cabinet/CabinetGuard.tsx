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
  const [fetchSucceeded, setFetchSucceeded] = useState(false);

  useEffect(() => {
    if (initialized && profile && !fetched.current) {
      fetched.current = true;
      useCabinetStore.getState().hydrateFromCache();
      useCabinetStore.getState().fetchCabinet().then(() => {
        const { cabinet: freshCabinet } = useCabinetStore.getState();
        setFetchCompleted(true);
        setFetchSucceeded(true);
        if (freshCabinet) {
          redirected.current = false;
        }
      }).catch(() => {
        // Fetch failed — don't redirect, let user retry
        setFetchCompleted(true);
        setFetchSucceeded(false);
      });
    }
  }, [initialized, profile]);

  // Only redirect to cabinet creation after fetch has completed successfully and no cabinet found
  useEffect(() => {
    if (
      initialized &&
      profile &&
      fetchCompleted &&
      fetchSucceeded &&
      !loading &&
      !cabinet &&
      !redirected.current &&
      pathname !== '/cabinet'
    ) {
      redirected.current = true;
      toast.error('Créez d\'abord votre cabinet');
      router.push('/cabinet');
    }
  }, [initialized, profile, fetchCompleted, fetchSucceeded, loading, cabinet, router, pathname]);

  if (!profile || loading || !fetchCompleted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!cabinet) {
    if (pathname !== '/cabinet') {
      if (fetchSucceeded && !redirected.current) {
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

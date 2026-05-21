'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCabinetStore } from '@/stores/cabinetStore';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CabinetGuard({ children }: { children: React.ReactNode }) {
  const { profile, initialized } = useAuthStore();
  const { cabinet, fetchCabinet, loading } = useCabinetStore();
  const router = useRouter();
  const redirected = useRef(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (initialized && profile && !fetched.current) {
      fetched.current = true;
      fetchCabinet();
    }
  }, [initialized, profile, fetchCabinet]);

  useEffect(() => {
    if (initialized && profile && !loading && !cabinet && !redirected.current) {
      redirected.current = true;
      toast.error('Creez d\'abord votre cabinet');
      router.push('/cabinet');
    }
  }, [initialized, profile, loading, cabinet, router]);

  if (!profile || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!cabinet) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

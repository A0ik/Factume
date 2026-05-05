'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchProfile } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const next = searchParams.get('next');
      if (next === '/reset-password') {
        router.push('/reset-password');
        return;
      }

      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      await fetchProfile(session.user.id);

      const { data: profile } = await getSupabaseClient()
        .from('profiles')
        .select('onboarding_done')
        .eq('id', session.user.id)
        .single();

      if (!profile || !profile.onboarding_done) {
        await getSupabaseClient().from('profiles').upsert({
          id: session.user.id,
          email: session.user.email ?? '',
          company_name: '',
          language: 'fr',
          onboarding_done: false,
          created_at: new Date().toISOString(),
        });
        router.push('/onboarding/language');
      } else {
        router.push('/dashboard');
      }
    };
    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Connexion en cours...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}

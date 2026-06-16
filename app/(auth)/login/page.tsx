'use client';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AuthPage } from '@/components/ui/auth-page';

// BASTION (CIBLE 1) — Traduit les codes d'erreur OAuth renvoyés par /auth/callback
// (?error=...) en messages lisibles. Sans cela, l'échec Google est silencieux.
function mapOauthError(code: string | null): string {
  switch (code) {
    case 'google_oauth_failed':
      return 'La connexion Google a échoué ou a été annulée. Veuillez réessayer.';
    case 'missing_code':
      return 'La connexion Google a été interrompue. Veuillez réessayer.';
    case 'session_creation_failed':
      return 'Impossible de finaliser la connexion. Veuillez réessayer.';
    case 'google_not_configured':
      return 'La connexion Google est temporairement indisponible.';
    default:
      return '';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle, loading } = useAuthStore();
  const initialError = useMemo(() => mapOauthError(searchParams.get('error')), [searchParams]);
  const [error, setError] = useState(initialError);

  const handleEmailLogin = async (email: string, password: string) => {
    setError('');
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects');
    }
  };

  const handleGoogle = async () => {
    setError('');
    try { await signInWithGoogle(); }
    catch (err: any) { setError(err.message); }
  };

  return (
    <AuthPage
      mode="login"
      onEmailLogin={handleEmailLogin}
      onGoogleLogin={handleGoogle}
      loading={loading}
      error={error}
      toggleHref="/register"
    />
  );
}

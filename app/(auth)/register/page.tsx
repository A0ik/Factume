'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { AuthPage } from '@/components/ui/auth-page';


const PASSWORD_CHECKS = [
  { label: 'Au moins 8 caractères', test: (p: string) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');
  const { signUp, signInWithGoogle, loading } = useAuthStore();
  const [error, setError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleEmailRegister = async (email: string, password: string, confirmPassword?: string) => {
    setError('');

    // Validate password match
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    // Validate password strength
    const failedChecks = PASSWORD_CHECKS.filter((c) => !c.test(password));
    if (failedChecks.length > 0) {
      setError(`Le mot de passe doit contenir : ${failedChecks.map((c) => c.label.toLowerCase()).join(', ')}`);
      return;
    }

    try {
      setPendingEmail(email);
      const { userId } = await signUp(email, password);

      // Track referral if code exists
      if (referralCode && userId) {
        try {
          await fetch('/api/referral/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referredUserId: userId, referralCode }),
          });
        } catch {
          // Referral tracking failure should not block registration
        }
      }

      router.push('/onboarding/quick');
    } catch (err: any) {
      if (err.message === 'CONFIRM_EMAIL') setConfirmEmail(true);
      else setError(err.message || 'Erreur lors de la création du compte');
    }
  };

  const handleGoogle = async () => {
    setError('');
    try { await signInWithGoogle(); }
    catch (err: any) { setError(err.message); }
  };

  if (confirmEmail) {
    return (
      <main className="relative min-h-screen flex items-center justify-center p-5 bg-[#020617]">
        {/* Animated background */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]" />
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] blur-[120px]" style={{ background: 'rgba(16,185,129,0.12)', animation: 'blob 8s ease-in-out infinite' }} />
          <div className="absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] blur-[100px]" style={{ background: 'rgba(20,184,166,0.08)', animation: 'blob 8s ease-in-out infinite 2s' }} />
        </div>

        <div className="relative z-10 w-full max-w-sm text-center space-y-5">
          <div className="flex items-center justify-center gap-3">
            <Image src="/logo-lg.png" alt="Factu.me" width={40} height={40} className="w-10 h-10 rounded-xl" priority style={{ borderRadius: '12px' }} />
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-black text-white">Factu</span>
              <span className="text-lg font-black text-emerald-400">.me</span>
            </div>
          </div>

          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <Mail size={28} className="text-emerald-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Vérifiez votre email</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Un lien de confirmation a été envoyé à <strong className="text-white">{pendingEmail}</strong>.
              Cliquez dessus pour activer votre compte.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all"
          >
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AuthPage
      mode="register"
      onEmailLogin={handleEmailRegister}
      onGoogleLogin={handleGoogle}
      loading={loading}
      error={error}
      toggleHref="/login"
    />
  );
}

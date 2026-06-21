'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { AuthPage } from '@/components/ui/auth-page';
import { ThemeOnboarding } from '@/components/onboarding/ThemeOnboarding';


const PASSWORD_CHECKS = [
  { label: 'Au moins 8 caractères', test: (p: string) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, verifyEmailOtp, resendSignupOtp, signInWithGoogle, loading } = useAuthStore();
  const [error, setError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // GUARDIAN (CIBLE 1) — Étape 0 : choix du thème AVANT le formulaire.
  const [step, setStep] = useState<'theme' | 'form'>('theme');

  // BASTION (CIBLE 2) — État du code OTP.
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Compte à rebours du bouton "Renvoyer le code"
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

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
      // signUp lève 'CONFIRM_EMAIL' quand la confirmation email est requise
      // (session non créée → l'utilisateur n'est PAS connecté).
      await signUp(email, password);
      router.push('/onboarding/quick');
    } catch (err: any) {
      if (err.message === 'CONFIRM_EMAIL') {
        setConfirmEmail(true);
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        // Focus le premier chiffre dès l'affichage
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      } else {
        setError(err.message || 'Erreur lors de la création du compte');
      }
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1); // 1 chiffre max
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError('');
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (!pasted.length) return;
    const next = ['', '', '', '', '', ''];
    pasted.forEach((d, i) => (next[i] = d));
    setOtp(next);
    setOtpError('');
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setOtpError('Veuillez saisir les 6 chiffres du code');
      return;
    }
    setOtpLoading(true);
    try {
      // Crée la session UNIQUEMENT si le code est valide.
      await verifyEmailOtp(pendingEmail, code);
      router.push('/onboarding/quick');
    } catch (err: any) {
      setOtpError(err.message || 'Code invalide ou expiré');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtpError('');
    try {
      await resendSignupOtp(pendingEmail);
      setResendCooldown(30);
    } catch (err: any) {
      setOtpError(err.message || 'Impossible de renvoyer le code');
    }
  };

  const handleGoogle = async () => {
    setError('');
    try { await signInWithGoogle(); }
    catch (err: any) { setError(err.message); }
  };

  // GUARDIAN (CIBLE 1) — Étape 0 : choix du thème avant tout le reste.
  if (step === 'theme') {
    return <ThemeOnboarding onDone={() => setStep('form')} />;
  }

  if (confirmEmail) {
    const codeComplete = otp.every((d) => d !== '');
    return (
      <main className="relative min-h-screen flex items-center justify-center p-5 bg-slate-50 dark:bg-[#09090B] transition-colors">
        {/* Animated background */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-[#09090B] dark:via-[#111113] dark:to-[#09090B]" />
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] blur-[120px]" style={{ background: 'rgba(16,185,129,0.10)', animation: 'blob 8s ease-in-out infinite' }} />
          <div className="absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] blur-[100px]" style={{ background: 'rgba(20,184,166,0.06)', animation: 'blob 8s ease-in-out infinite 2s' }} />
        </div>

        <div className="relative z-10 w-full max-w-sm text-center space-y-5">
          <div className="flex items-center justify-center gap-3">
            <Image src="/logo-lg.png" alt="Factu.me" width={40} height={40} className="w-10 h-10 rounded-xl" priority style={{ borderRadius: '12px' }} />
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-black text-slate-900 dark:text-white">Factu</span>
              <span className="text-lg font-black text-emerald-500 dark:text-emerald-400">.me</span>
            </div>
          </div>

          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={28} className="text-emerald-500 dark:text-emerald-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vérifiez votre email</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Saisissez le code à 6 chiffres envoyé à <strong className="text-slate-900 dark:text-white break-all">{pendingEmail}</strong>.
            </p>
          </div>

          {/* 6 cases OTP */}
          <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="w-11 h-14 sm:w-12 sm:h-14 rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-center text-2xl font-bold text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            ))}
          </div>

          {otpError && (
            <p className="text-sm text-red-500 dark:text-red-300">{otpError}</p>
          )}

          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={!codeComplete || otpLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {otpLoading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : null}
            {otpLoading ? 'Vérification…' : 'Vérifier le code'}
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => { setConfirmEmail(false); setError(''); }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={13} /> Changer d'email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw size={13} />
              {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}
            </button>
          </div>

          <Link
            href="/login"
            className="block pt-2 text-xs text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
          >
            Déjà un compte ? Se connecter
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

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { Lock, Eye, EyeOff, Check, X, CheckCircle2, AlertCircle } from 'lucide-react';

const PASSWORD_CHECKS = [
  { label: 'Au moins 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un caractere special', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Supabase password reset sets a session via the hash fragment
    const checkSession = async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        setError('Lien invalide ou expire. Demandez un nouveau lien.');
      } else {
        setHasSession(true);
      }
    };
    checkSession();
  }, []);

  const allChecksPassed = PASSWORD_CHECKS.every((c) => c.test(password));
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecksPassed || !passwordsMatch) return;
    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise a jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-lg.png"
            alt="Factu.me"
            width={44}
            height={44}
            className="w-11 h-11 rounded-xl shadow-lg flex-shrink-0"
            priority
            style={{ borderRadius: '12px' }}
          />
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black text-gray-900">Factu</span>
            <span className="text-xl font-black text-primary">.me</span>
          </div>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mx-auto">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mot de passe mis a jour</h1>
            <p className="text-sm text-gray-500">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Nouveau mot de passe</h1>
              <p className="text-sm text-gray-500">Choisissez un mot de passe securise pour votre compte.</p>
            </div>

            {!hasSession ? (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nouveau mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    {PASSWORD_CHECKS.map((check) => {
                      const passed = check.test(password);
                      return (
                        <div key={check.label} className="flex items-center gap-2">
                          {passed ? <Check size={12} className="text-green-500 flex-shrink-0" /> : <X size={12} className="text-gray-300 flex-shrink-0" />}
                          <span className={`text-[11px] ${passed ? 'text-green-600 font-medium' : 'text-gray-400'}`}>{check.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirmez le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                </div>

                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {passwordsMatch ? (
                      <><Check size={12} className="text-green-500" /><span className="text-[11px] text-green-600 font-medium">Les mots de passe correspondent</span></>
                    ) : (
                      <><X size={12} className="text-red-400" /><span className="text-[11px] text-red-400">Les mots de passe ne correspondent pas</span></>
                    )}
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !allChecksPassed || !passwordsMatch}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : null}
                  Mettre a jour le mot de passe
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}

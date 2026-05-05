'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase';
import { AtSign, ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error: supabaseError } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (supabaseError) throw supabaseError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-white">
      <Link href="/login" className="absolute top-6 left-5 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="size-4" /> Connexion
      </Link>

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

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mx-auto">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">Email envoye</h1>
              <p className="text-sm text-gray-500">
                Si un compte existe avec <strong className="text-gray-700">{email}</strong>, vous recevrez un lien pour reinitialiser votre mot de passe.
              </p>
            </div>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90"
            >
              Retour a la connexion
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mot de passe oublie ?</h1>
              <p className="text-sm text-gray-500">Entrez votre email, nous vous enverrons un lien pour reinitialiser votre mot de passe.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <Mail size={16} />
                )}
                Envoyer le lien
              </button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline">Creer un compte</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

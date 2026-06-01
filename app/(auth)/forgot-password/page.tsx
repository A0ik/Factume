'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabase';
import { AtSign, ArrowLeft, Mail, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const SPRING_GENTLE = { type: "spring" as const, stiffness: 180, damping: 22 };
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14, filter: "blur(3px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 260, damping: 20 } },
};

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
    <main className="relative min-h-screen flex flex-col items-center justify-center p-5 bg-[#020617]">
      {/* Animated background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]" />
        <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] blur-[120px]" style={{ background: 'rgba(16,185,129,0.12)', animation: 'blob 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] blur-[100px]" style={{ background: 'rgba(20,184,166,0.08)', animation: 'blob 8s ease-in-out infinite 2s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <Link href="/login" className="absolute top-6 left-5 z-20 inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 transition-colors">
        <ArrowLeft className="size-4" /> Connexion
      </Link>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
          <Image src="/logo-lg.png" alt="Factu.me" width={40} height={40} className="w-10 h-10 rounded-xl" priority style={{ borderRadius: '12px' }} />
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-black text-white">Factu</span>
            <span className="text-lg font-black text-emerald-400">.me</span>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_GENTLE}
              className="space-y-5"
            >
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">Email envoyé</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Si un compte existe avec <strong className="text-white">{email}</strong>, vous recevrez un lien pour réinitialiser votre mot de passe.
                </p>
              </div>
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all"
              >
                Retour à la connexion
              </Link>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <motion.div variants={itemVariants} className="space-y-1.5">
                <h1 className="text-[26px] font-bold tracking-tight text-white">Mot de passe oublié ?</h1>
                <p className="text-sm text-slate-400">Entrez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <motion.div variants={itemVariants} className="relative">
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <AtSign className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }} transition={SPRING_GENTLE} className="overflow-hidden">
                      <div className="flex items-center gap-2 rounded-xl bg-red-500/[0.1] border border-red-500/20 px-3.5 py-2.5">
                        <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-300">{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={itemVariants}>
                  <motion.button
                    type="submit"
                    disabled={loading || !email.trim()}
                    whileTap={{ scale: 0.97 }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:brightness-100"
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
                    {!loading && <ArrowRight size={16} />}
                  </motion.button>
                </motion.div>
              </form>

              <motion.p variants={itemVariants} className="text-center text-sm text-slate-500">
                Pas encore de compte ?{' '}
                <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                  Créer un compte
                </Link>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

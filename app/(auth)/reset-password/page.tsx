'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabase';
import { Lock, Eye, EyeOff, Check, X, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const SPRING_GENTLE = { type: "spring" as const, stiffness: 180, damping: 22 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14, filter: "blur(3px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 260, damping: 20 } },
};

const PASSWORD_CHECKS = [
  { label: 'Au moins 8 caractères', test: (p: string) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
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
    const checkSession = async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        setError('Lien invalide ou expiré. Demandez un nouveau lien.');
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
      setError(err.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-xl bg-white/[0.06] border border-white/[0.08] py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all";

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-5 bg-[#020617]">
      {/* Animated background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]" />
        <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] blur-[120px]" style={{ background: 'rgba(16,185,129,0.12)', animation: 'blob 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] blur-[100px]" style={{ background: 'rgba(20,184,166,0.08)', animation: 'blob 8s ease-in-out infinite 2s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

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
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_GENTLE}
              className="space-y-5 text-center"
            >
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Mot de passe mis à jour</h1>
                <p className="text-sm text-slate-400 mt-1.5">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              </div>
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all"
              >
                Se connecter
              </Link>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div variants={itemVariants} className="space-y-1.5 mb-5">
                <h1 className="text-[26px] font-bold tracking-tight text-white">Nouveau mot de passe</h1>
                <p className="text-sm text-slate-400">Choisissez un mot de passe sécurisé pour votre compte.</p>
              </motion.div>

              {!hasSession ? (
                <motion.div variants={itemVariants} className="flex items-start gap-2.5 bg-red-500/[0.1] border border-red-500/20 rounded-xl px-3.5 py-3">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <motion.div variants={itemVariants} className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nouveau mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className={inputCls}
                    />
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </motion.div>

                  {/* Password strength */}
                  <AnimatePresence>
                    {password.length > 0 && (
                      <motion.div key="strength" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING_GENTLE} className="overflow-hidden">
                        <div className="space-y-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3.5">
                          {PASSWORD_CHECKS.map((check) => {
                            const passed = check.test(password);
                            return (
                              <div key={check.label} className="flex items-center gap-2">
                                <AnimatePresence mode="wait">
                                  {passed ? (
                                    <motion.div key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" as const, stiffness: 260, damping: 20 }}>
                                      <Check size={12} className="text-emerald-400" />
                                    </motion.div>
                                  ) : (
                                    <motion.div key="x" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                                      <X size={12} className="text-slate-600" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <span className={`text-[11px] ${passed ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                                  {check.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div variants={itemVariants} className="relative">
                    <input
                      type="password"
                      placeholder="Confirmez le mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className={inputCls}
                    />
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  </motion.div>

                  {/* Password match */}
                  <AnimatePresence>
                    {confirmPassword.length > 0 && (
                      <motion.div key="match" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING_GENTLE} className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          {passwordsMatch ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span className="text-[11px] text-emerald-400 font-medium">Les mots de passe correspondent</span>
                            </>
                          ) : (
                            <>
                              <X size={12} className="text-red-400" />
                              <span className="text-[11px] text-red-400">Les mots de passe ne correspondent pas</span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
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

                  <motion.div variants={itemVariants} className="pt-1">
                    <motion.button
                      type="submit"
                      disabled={loading || !allChecksPassed || !passwordsMatch}
                      whileTap={{ scale: 0.97 }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:brightness-100"
                    >
                      {loading ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : null}
                      Mettre à jour le mot de passe
                      {!loading && <ArrowRight size={16} />}
                    </motion.button>
                  </motion.div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

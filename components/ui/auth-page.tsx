'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, ChevronLeft, Lock, Eye, EyeOff, Check, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

/* ——— Spring configs ——— */
const SPRING_BOUNCE = { type: "spring" as const, stiffness: 260, damping: 20 };
const SPRING_GENTLE = { type: "spring" as const, stiffness: 180, damping: 22 };
const SPRING_SNAP = { type: "spring" as const, stiffness: 400, damping: 25 };

/* ─── CSS-only reveal — same safe pattern as landing page R component ───
   Uses existing @keyframes reveal from globals.css.
   CSS animation is independent of JS hydration:
   • If CSS loads → animation plays (opacity 0 → 1)
   • If CSS fails → animation undefined → element at natural state (opacity 1)
   No useState, no useEffect, no IntersectionObserver, no Framer Motion initial="hidden".
*/
function AuthReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      style={{
        animation: 'reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ——— Google icon ——— */
const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
  </svg>
);

/* ——— Separator ——— */
const AuthSeparator = () => (
  <div className="flex w-full items-center py-1">
    <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
    <span className="px-3 text-[11px] font-medium text-slate-400 dark:text-white/25 uppercase tracking-widest">ou</span>
    <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
  </div>
);

/* ——— Animated background ——— */
function AuthBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-[#09090B] dark:via-[#111113] dark:to-[#09090B]" />
      <div
        className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] blur-[120px]"
        style={{ background: 'rgba(16,185,129,0.10)', animation: 'blob 8s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] blur-[100px]"
        style={{ background: 'rgba(20,184,166,0.06)', animation: 'blob 8s ease-in-out infinite 2s' }}
      />
      <div
        className="absolute top-[40%] left-[30%] w-[300px] h-[300px] blur-[80px]"
        style={{ background: 'rgba(52,211,153,0.04)', animation: 'blob 8s ease-in-out infinite 4s' }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

/* ——— Floating 3D Invoice ——— */
function FloatingInvoice3D() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -25, y: x * 25 });
    setGlare({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50 });
  };

  return (
    <div
      className="relative mx-auto w-[300px] xl:w-[360px] select-none"
      style={{ perspective: '1200px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="rounded-2xl bg-white p-6 xl:p-8 border border-gray-200/80 shadow-2xl transition-transform duration-150 ease-out origin-center relative overflow-hidden"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.05) translateZ(20px)`,
          transformStyle: 'preserve-3d',
          boxShadow: `-${tilt.y * 8}px ${tilt.x * 8}px 50px rgba(0,0,0,0.25), 0 0 80px rgba(16,185,129,0.08)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.25) 0%, transparent 60%)`,
            opacity: Math.abs(tilt.x) + Math.abs(tilt.y) > 2 ? 1 : 0,
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-2xl" />
        <div className="flex justify-between items-start mb-7" style={{ transform: 'translateZ(15px)' }}>
          <div>
            <div className="h-5 w-24 rounded bg-emerald-500/80 mb-2.5" />
            <div className="h-2.5 w-40 rounded bg-gray-200" />
            <div className="h-2 w-28 rounded bg-gray-100 mt-2" />
            <div className="h-2 w-32 rounded bg-gray-100 mt-1.5" />
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-bold tracking-widest">
              FACTURE
            </div>
            <div className="h-2 w-20 rounded bg-gray-100 ml-auto mt-3" />
            <div className="h-2 w-24 rounded bg-gray-100 ml-auto mt-1.5" />
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100" style={{ transform: 'translateZ(10px)' }}>
          <div className="h-2.5 w-14 rounded bg-gray-300 mb-2.5" />
          <div className="h-2 w-full rounded bg-gray-200 mb-1.5" />
          <div className="h-2 w-4/5 rounded bg-gray-200" />
        </div>
        <div className="space-y-3 mb-6" style={{ transform: 'translateZ(8px)' }}>
          {[
            { w: 'w-full', price: 'w-16' },
            { w: 'w-5/6', price: 'w-12' },
            { w: 'w-2/3', price: 'w-14' },
          ].map((row, i) => (
            <div key={i} className="flex gap-2.5 items-center">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <div className={`h-2 ${row.w} rounded bg-gray-200`} />
              <div className={`h-2 ${row.price} rounded bg-gray-300 ml-auto`} />
            </div>
          ))}
        </div>
        <div className="border-t-2 border-dashed border-gray-200 pt-4 flex justify-between items-end" style={{ transform: 'translateZ(12px)' }}>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total TTC</span>
          <span className="text-3xl font-black text-gray-900">
            1 240,00 <span className="text-emerald-500">€</span>
          </span>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center" style={{ transform: 'translateZ(5px)' }}>
          <div className="flex gap-1.5">
            <div className="h-1.5 w-8 rounded bg-gray-100" />
            <div className="h-1.5 w-12 rounded bg-gray-100" />
            <div className="h-1.5 w-6 rounded bg-gray-100" />
          </div>
          <div className="h-1.5 w-16 rounded bg-emerald-500/30" />
        </div>
      </div>
    </div>
  );
}

/* ——— Password strength ——— */
interface PasswordCheck {
  label: string;
  test: (p: string) => boolean;
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: 'Au moins 8 caractères', test: (p) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getPasswordStrength(password: string) {
  const passed = PASSWORD_CHECKS.filter((c) => c.test(password)).length;
  if (passed <= 1) return { score: 1, label: 'Très faible', color: '#ef4444' };
  if (passed === 2) return { score: 2, label: 'Faible', color: '#f97316' };
  if (passed === 3) return { score: 3, label: 'Moyen', color: '#eab308' };
  if (passed === 4) return { score: 4, label: 'Fort', color: '#22c55e' };
  return { score: 5, label: 'Très fort', color: '#10b981' };
}

/* ——— Props ——— */
export interface AuthPageProps {
  onEmailLogin?: (email: string, password: string, confirmPassword?: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  loading?: boolean;
  error?: string;
  mode?: 'login' | 'register';
  toggleHref?: string;
}

/* ——— Main component ——— */
export function AuthPage({
  onEmailLogin,
  onGoogleLogin,
  loading = false,
  error,
  mode = 'login',
  toggleHref,
}: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);

  const isLogin = mode === 'login';
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const allChecksPassed = PASSWORD_CHECKS.every((c) => c.test(password));
  const passwordsMatch = !isLogin && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      if (password !== confirmPassword) return;
      if (!allChecksPassed) return;
    }
    await onEmailLogin?.(email, password, confirmPassword);
  };

  const canSubmit = isLogin
    ? email.length > 0 && password.length > 0
    : email.length > 0 && allChecksPassed && password === confirmPassword && cguAccepted;

  const inputCls =
    "w-full rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.06] py-3 pl-10 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all";

  return (
    <main className="relative min-h-screen lg:h-screen lg:overflow-hidden lg:grid lg:grid-cols-2 bg-slate-50 dark:bg-[#09090B]">

      <AuthBackground />

      {/* ——— Left panel (desktop only) ——— Uses CSS animation, no FM initial="hidden" */}
      <div className="relative z-10 hidden lg:flex h-full flex-col p-10 xl:p-16">

        <AuthReveal delay={0}>
          <div className="relative z-10 flex items-center gap-3">
            <Image src="/logo-lg.png" alt="Factu.me" width={44} height={44} className="w-11 h-11 rounded-xl" priority style={{ borderRadius: '12px' }} />
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">Factu</span>
              <span className="text-xl font-black text-emerald-500 dark:text-emerald-400">.me</span>
            </div>
          </div>
        </AuthReveal>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center py-8">

          <AuthReveal delay={150}>
            <div className="mb-6">
              <h2 className="text-3xl xl:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-3">
                Factures, CRM,<br />
                <span className="bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  tout centralisé.
                </span>
              </h2>
              <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
                Relances IA, scan de reçus, pipeline de ventes et comptabilité. Gérez votre activité sans friction.
              </p>
            </div>
          </AuthReveal>

          <AuthReveal delay={300}>
            <div className="flex-1 flex items-center justify-center w-full max-w-md">
              <FloatingInvoice3D />
            </div>
          </AuthReveal>

          <AuthReveal delay={450}>
            <div className="w-full max-w-xs border-t border-white/10 pt-5 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[
                    { l: 'M', cls: 'bg-blue-500/20 text-blue-300' },
                    { l: 'S', cls: 'bg-purple-500/20 text-purple-300' },
                    { l: 'A', cls: 'bg-emerald-500/20 text-emerald-300' },
                  ].map((a) => (
                    <div key={a.l} className={`w-9 h-9 rounded-full border-2 border-slate-100 dark:border-[#09090B] flex items-center justify-center shadow-lg font-bold text-sm ${a.cls}`}>
                      {a.l}
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Ils nous font confiance</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">Rejoignez +2&nbsp;000 freelances</p>
                </div>
              </div>
            </div>
          </AuthReveal>
        </div>
      </div>

      {/* ——— Right panel / Mobile form ——— CSS-only stagger, no FM initial="hidden" */}
      <div className="relative z-10 flex min-h-screen flex-col justify-center p-5 sm:p-8">

        <Link href="/" className="absolute top-6 left-5 z-20 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white/80 transition-colors">
          <ChevronLeft className="size-4" /> Accueil
        </Link>

        <div className="mx-auto w-full max-w-sm">

          {/* Logo — mobile only */}
          <AuthReveal delay={100}>
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <Image src="/logo-lg.png" alt="Factu.me" width={40} height={40} className="w-10 h-10 rounded-xl" priority style={{ borderRadius: '12px' }} />
              <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-black text-slate-900 dark:text-white">Factu</span>
                <span className="text-lg font-black text-emerald-500 dark:text-emerald-400">.me</span>
              </div>
            </div>
          </AuthReveal>

          {/* Heading */}
          <AuthReveal delay={150}>
            <div className="mb-6">
              <h1 className="text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">
                {isLogin ? 'Connexion' : 'Créer un compte'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1.5">
                {isLogin ? 'Connectez-vous à votre espace Factu.me.' : 'Commencez votre facturation intelligente.'}
              </p>
            </div>
          </AuthReveal>

          {/* Google button */}
          <motion.button
            type="button"
            disabled={loading}
            onClick={onGoogleLogin}
            whileTap={{ scale: 0.97 }}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.06] py-3 text-sm font-semibold text-slate-900 dark:text-white transition-colors hover:bg-slate-200 dark:hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon className="size-4" /> Continuer avec Google
          </motion.button>

          {/* Separator */}
          <AuthSeparator />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            <div className="relative">
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
              />
              <AtSign className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isLogin ? '••••••••' : 'Choisissez un mot de passe'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isLogin ? 1 : 8}
                className={inputCls}
              />
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Forgot password */}
            {isLogin && (
              <div className="text-right pt-0.5">
                <Link href="/forgot-password" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            )}

            {/* Password strength — register only */}
            <AnimatePresence>
              {!isLogin && password.length > 0 && (
                <motion.div
                  key="strength"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={SPRING_GENTLE}
                  className="overflow-hidden"
                >
                  <div className="space-y-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: strength.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(strength.score / 5) * 100}%` }}
                          transition={SPRING_SNAP}
                        />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {PASSWORD_CHECKS.map((check) => {
                        const passed = check.test(password);
                        return (
                          <div key={check.label} className="flex items-center gap-2">
                            <AnimatePresence mode="wait">
                              {passed ? (
                                <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_BOUNCE}>
                                  <Check size={12} className="text-emerald-400" />
                                </motion.div>
                              ) : (
                                <motion.div key="x" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                                  <X size={12} className="text-zinc-600" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <span className={`text-[11px] ${passed ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                              {check.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm password — register only */}
            {!isLogin && (
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirmez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={inputCls}
                />
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            {/* Password match — register only */}
            <AnimatePresence>
              {!isLogin && confirmPassword.length > 0 && (
                <motion.div
                  key="match"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING_GENTLE}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 pt-0.5">
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

            {/* CGU acceptance — register only */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  key="cgu"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={SPRING_GENTLE}
                  className="overflow-hidden"
                >
                  <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={cguAccepted}
                      onClick={() => setCguAccepted(!cguAccepted)}
                      className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-all flex items-center justify-center ${
                        cguAccepted
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'bg-slate-100 border-slate-300 hover:border-emerald-500/50 dark:bg-white/[0.06] dark:border-white/[0.12]'
                      }`}
                    >
                      {cguAccepted && <Check size={10} className="text-white" strokeWidth={3} />}
                    </button>
                    <span className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                      J'accepte les{' '}
                      <Link href="/legal/cgu" target="_blank" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">
                        CGU
                      </Link>{' '}
                      et les{' '}
                      <Link href="/legal/cgv" target="_blank" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">
                        CGV
                      </Link>
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={SPRING_GENTLE}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-red-500/[0.1] border border-red-500/20 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-300">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-400/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.97]"
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : null}
                {isLogin ? 'Se connecter' : 'Créer mon compte'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>

          {/* Toggle */}
          {toggleHref && (
            <p className="text-center text-sm text-slate-500 dark:text-zinc-500 mt-6">
              {isLogin ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              <Link href={toggleHref} className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                {isLogin ? 'Créer un compte' : 'Se connecter'}
              </Link>
            </p>
          )}

          {/* Trust Signals */}
          <div className="space-y-3 pt-3 mt-5">
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-zinc-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Données hébergées en France 🇫🇷
              </span>
              <span className="h-3 w-px bg-slate-300 dark:bg-white/10" />
              <span>Essai gratuit 7 jours</span>
              <span className="h-3 w-px bg-slate-300 dark:bg-white/10" />
              <span>Annulation en 1 clic</span>
            </div>
            <p className="text-center text-[10px] text-slate-500 dark:text-zinc-600">
              En continuant, vous acceptez nos{' '}
              <Link href="/legal/cgu" className="underline underline-offset-2 hover:text-zinc-400 transition-colors">CGU</Link>{' '}
              et notre{' '}
              <Link href="/legal/confidentialite" className="underline underline-offset-2 hover:text-zinc-400 transition-colors">Politique de confidentialité</Link>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;

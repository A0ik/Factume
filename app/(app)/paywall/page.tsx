'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/stores/themeStore';
import {
  ArrowLeft, ArrowRight, Check, Crown, Zap, Rocket, Loader2, Shield, RefreshCw,
  CreditCard, Sparkles, Lock, BadgePercent, AlertTriangle, Infinity as InfinityIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   TYPES & PLAN DATA — 3 plans obligatoires : Gratuit / Pro / Business
   ═══════════════════════════════════════════════════════════════ */

interface PlanFeature { label: string; included: boolean; highlight?: boolean; }
interface Plan {
  id: 'free' | 'pro' | 'business';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  icon: React.ElementType;
  accent: 'zinc' | 'emerald' | 'violet';
  badge: string | null;
  popular?: boolean;
  cta: string;
  features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    tagline: 'Pour démarrer et tester Factu.me',
    priceMonthly: 0,
    priceYearly: 0,
    icon: Rocket,
    accent: 'zinc',
    badge: null,
    cta: 'Commencer gratuitement',
    features: [
      { label: '3 factures par mois', included: true },
      { label: '3 devis par mois', included: true },
      { label: 'Dictée vocale IA illimitée', included: true, highlight: true },
      { label: 'E-facturation certifiée Factur-X', included: true },
      { label: '1 cabinet · 10 clients CRM', included: true },
      { label: 'Accès mobile & web', included: true },
      { label: 'Support email', included: true },
      { label: 'Factures & devis illimités', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Le couteau suisse des indépendants & TPE',
    priceMonthly: 14.99,
    priceYearly: 149.99,
    icon: Zap,
    accent: 'emerald',
    badge: 'Populaire',
    popular: true,
    cta: 'Choisir Pro',
    features: [
      { label: 'Factures & devis illimités', included: true, highlight: true },
      { label: 'Dictée vocale IA illimitée', included: true, highlight: true },
      { label: 'Contrats de travail (CDI/CDD)', included: true },
      { label: 'OCR analyse de reçus', included: true },
      { label: 'Signature électronique', included: true },
      { label: 'URSSAF One-Click', included: true },
      { label: 'Export comptable (FEC, CSV)', included: true },
      { label: 'CRM illimité · sans watermark', included: true },
      { label: 'Support prioritaire', included: true },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Pour les PME & experts-comptables',
    priceMonthly: 39.99,
    priceYearly: 399.99,
    icon: Crown,
    accent: 'violet',
    badge: 'Premium',
    cta: 'Choisir Business',
    features: [
      { label: 'Tout le plan Pro', included: true },
      { label: '5 cabinets', included: true, highlight: true },
      { label: 'Comptable Connect', included: true, highlight: true },
      { label: 'Copilot Factu IA (avancé)', included: true },
      { label: 'Multi-utilisateur (5)', included: true },
      { label: 'API & Webhooks', included: true },
      { label: 'Rapports avancés', included: true },
      { label: 'Support dédié', included: true },
    ],
  },
];

const INVOICE_LIMIT = 3;

/* ═══════════════════════════════════════════════════════════════
   MAIN PAYWALL PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function PaywallPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const isYearly = billing === 'yearly';
  const [trialLoading, setTrialLoading] = useState(false);
  const trialTriggered = useRef(false);

  const monthlyRef = useRef<HTMLButtonElement>(null);
  const yearlyRef = useRef<HTMLButtonElement>(null);
  const [togglePos, setTogglePos] = useState({ left: 2, width: 0 });

  useEffect(() => {
    if (monthlyRef.current && yearlyRef.current) {
      const ref = !isYearly ? monthlyRef.current : yearlyRef.current;
      setTogglePos({ left: ref.offsetLeft, width: ref.offsetWidth });
    }
  }, [isYearly]);

  /* ─── Activation essai sans carte ─── */
  const handleTrialActivation = async () => {
    if (!profile?.id) return;
    setTrialLoading(true);
    try {
      const fp = btoa(
        `${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      ).slice(0, 64);
      const res = await fetch('/api/trial/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', fingerprint: fp }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Essai activé ! Profitez de Pro pendant 7 jours.');
        setTimeout(() => { window.location.href = '/dashboard?trial=true'; }, 700);
      } else {
        toast.error(data.error || "Impossible d'activer l'essai");
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Erreur');
    } finally {
      setTrialLoading(false);
    }
  };

  useEffect(() => {
    if (trialTriggered.current || !profile?.id || sub.tier !== 'free') return;
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    if (params.get('plan') && params.get('trial') === 'true') {
      trialTriggered.current = true;
      window.history.replaceState({}, '', '/paywall');
      handleTrialActivation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  /* ─── CTA principal : Checkout Hosted (ou essai gratuit) ─── */
  const handleSelect = async (planId: Plan['id']) => {
    // Plan Gratuit → essai sans carte si éligible, sinon on retourne à l'app
    if (planId === 'free') {
      if (sub.isFree && !sub.isTrialActive) {
        await handleTrialActivation();
      } else {
        router.push('/dashboard');
      }
      return;
    }

    if (planId === sub.tier) return;
    if (!profile?.id) return;

    // Utilisateur déjà abonné Stripe : changement de plan (prorata) via la route dédiée
    const hasRealStripeSubscription = !sub.isFree && !!profile?.stripe_subscription_id;
    setLoading(planId);
    try {
      const endpoint = hasRealStripeSubscription
        ? '/api/stripe/change-subscription'
        : '/api/stripe/checkout';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, yearly: isYearly }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect Checkout Hosted ou Portal
      } else if (data.success) {
        toast.success('Abonnement mis à jour !');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error(data.error || "Impossible de démarrer le paiement");
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Erreur');
    } finally {
      setLoading(null);
    }
  };

  const remaining = sub.invoicesRemaining ?? 0;
  const used = sub.invoiceCount ?? 0;
  const progress = Math.min(100, (used / INVOICE_LIMIT) * 100);

  const accentGrad: Record<Plan['accent'], string> = {
    zinc: 'linear-gradient(135deg, #52525b, #27272a)',
    emerald: 'linear-gradient(135deg, #10b981, #047857)',
    violet: 'linear-gradient(135deg, #1e40af, #6d28d9)',
  };

  return (
    <div className={cn(
      'min-h-screen pb-24 px-4 sm:px-6 lg:px-8 py-6 md:py-8',
      isDark ? 'bg-[#09090B]' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50',
    )}>
      <motion.button
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        onClick={router.back}
        className={cn(
          'mb-6 inline-flex items-center gap-2 text-sm w-fit transition-colors',
          isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-900',
        )}
      >
        <ArrowLeft size={14} /> Retour
      </motion.button>

      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto mb-8"
      >
        <h1 className={cn(
          'text-3xl md:text-4xl font-black tracking-tight',
          isDark ? 'text-white' : 'text-gray-900',
        )}>
          Passez à la vitesse supérieure
        </h1>
        <p className={cn('mt-2 text-sm md:text-base', isDark ? 'text-zinc-400' : 'text-gray-600')}>
          Choisissez le plan adapté à votre activité. Annulable en 1 clic, sans engagement.
        </p>
      </motion.div>

      {/* ═══ BANNIÈRE ESSAI SANS CARTE (free users) ═══ */}
      {sub.isFree && !sub.isTrialActive && (
        <motion.button
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onClick={handleTrialActivation}
          disabled={trialLoading}
          className={cn(
            'mx-auto mb-6 max-w-3xl w-full block text-left rounded-2xl border-2 p-5 transition-all',
            isDark
              ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10'
              : 'border-emerald-300 bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-emerald-50 shadow-xl shadow-emerald-200/50 hover:shadow-2xl',
          )}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
              {trialLoading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn('text-lg font-bold', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                  Essai Gratuit 7 Jours
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                  Sans carte
                </span>
              </div>
              <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-gray-600')}>
                Testez toutes les fonctionnalités Pro pendant 7 jours. Aucune carte requise.
              </p>
              <div className={cn('flex items-center gap-2 text-sm font-semibold mt-1', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                <ArrowRight size={16} /> Commencer maintenant
              </div>
            </div>
          </div>
        </motion.button>
      )}

      {/* ═══ ALERTE COMPTEUR (free users, FIX : /3 pas /5) ═══ */}
      {sub.isFree && !sub.isTrialActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="mx-auto mb-8 max-w-3xl"
        >
          <div className={cn(
            'rounded-2xl border-2 p-5',
            remaining > 0
              ? isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10'
              : isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-300 bg-gradient-to-r from-red-50 via-orange-50 to-red-50',
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-lg',
                remaining > 0
                  ? isDark ? 'bg-emerald-500/15' : 'bg-gradient-to-br from-primary/20 to-primary/10'
                  : isDark ? 'bg-red-500/15' : 'bg-gradient-to-br from-red-100 to-red-200',
              )}>
                {remaining > 0 ? <Zap size={22} className="text-primary" /> : <Lock size={22} className={isDark ? 'text-red-400' : 'text-red-500'} />}
              </div>
              <div className="flex-1">
                <h3 className={cn(
                  'text-lg font-bold mb-1',
                  remaining > 0 ? isDark ? 'text-emerald-400' : 'text-primary' : isDark ? 'text-red-400' : 'text-red-700',
                )}>
                  {remaining > 0 ? 'Plan Gratuit' : 'Limite atteinte'}
                </h3>
                <p className={cn('text-sm mb-3', isDark ? 'text-zinc-400' : 'text-gray-700')}>
                  {remaining > 0
                    ? `Vous pouvez créer encore ${remaining} facture${remaining > 1 ? 's' : ''} ce mois-ci. La dictée vocale reste illimitée.`
                    : `Vous avez atteint votre limite de ${INVOICE_LIMIT} factures mensuelles. La voix reste illimitée.`}
                </p>
                <div className="mb-1">
                  <div className="flex justify-between text-xs mb-2">
                    <span className={cn('font-medium', isDark ? 'text-zinc-500' : 'text-gray-600')}>
                      {used} / {INVOICE_LIMIT} factures
                    </span>
                    <span className={cn('font-bold', remaining > 0 ? isDark ? 'text-emerald-400' : 'text-primary' : isDark ? 'text-red-400' : 'text-red-500')}>
                      {remaining > 0 ? `${remaining} restantes` : 'Limite atteinte'}
                    </span>
                  </div>
                  <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-white/[0.06]' : 'bg-gray-200')}>
                    <motion.div
                      className={cn('h-full rounded-full', remaining > 0 ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-gradient-to-r from-red-400 to-red-500')}
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ TOGGLE MENSUEL / ANNUEL ═══ */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className={cn(
          'relative inline-flex items-center p-1 rounded-full border shadow-md',
          isDark ? 'bg-[#111113] border-white/[0.08]' : 'bg-gray-100 border-gray-200/60',
        )}>
          <motion.div
            className="absolute top-1 bottom-1 rounded-full shadow-md"
            animate={{
              left: togglePos.left - 1, width: togglePos.width + 2,
              background: isYearly ? 'linear-gradient(135deg, #059669, #047857)' : isDark ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          <button ref={monthlyRef} onClick={() => setBilling('monthly')}
            className={cn('relative z-10 px-6 sm:px-7 py-2.5 rounded-full text-sm font-semibold transition-colors',
              !isYearly ? 'text-white' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-500 hover:text-gray-700')}>
            Mensuel
          </button>
          <button ref={yearlyRef} onClick={() => setBilling('yearly')}
            className={cn('relative z-10 px-6 sm:px-7 py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2',
              isYearly ? 'text-white' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-500 hover:text-gray-700')}>
            Annuel
            <span className={cn('px-2 py-0.5 text-[10px] font-black rounded-full tracking-wide',
              isYearly ? 'bg-white/25 text-white' : isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}>
              -17%
            </span>
          </button>
        </div>
        <AnimatePresence mode="wait">
          {isYearly && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-full border',
                isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200')}>
              <BadgePercent size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              <span className={cn('text-xs font-semibold', isDark ? 'text-emerald-400' : 'text-emerald-700')}>
                Économisez jusqu'à 80€/an avec le plan annuel
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ GRILLE DES 3 PLANS ═══ */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto items-stretch">
        {PLANS.map((plan, index) => {
          const isCurrent = plan.id === sub.tier;
          const isLoading = loading === plan.id;
          const isPopular = plan.popular;

          const monthlyEq = isYearly ? plan.priceYearly / 12 : plan.priceMonthly;
          const priceLabel = plan.id === 'free' ? '0€' : `${monthlyEq.toFixed(2).replace('.', ',')}€`;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.1 }}
              className={cn(
                'relative rounded-2xl overflow-hidden flex flex-col transition-all',
                isDark ? 'bg-[#111113]' : 'bg-white',
                isPopular
                  ? cn('border-2 shadow-2xl md:-translate-y-2', isDark ? 'border-emerald-500/40 shadow-emerald-500/10' : 'border-emerald-400 shadow-emerald-300/30')
                  : cn('border-2', isDark ? 'border-white/[0.08] shadow-xl' : 'border-gray-200 shadow-lg'),
              )}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white rounded-bl-xl z-10"
                  style={{ background: accentGrad[plan.accent] }}>
                  {plan.badge}
                </div>
              )}

              {/* En-tête plan */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{ background: accentGrad[plan.accent] }}>
                    <plan.icon size={22} />
                  </div>
                  <div>
                    <h2 className={cn('text-xl font-black', isDark ? 'text-white' : 'text-gray-900')}>{plan.name}</h2>
                    <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-gray-500')}>{plan.tagline}</p>
                  </div>
                </div>

                <div className="flex items-end gap-1.5">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={priceLabel}
                      initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className={cn('text-4xl font-black', isDark ? 'text-white' : 'text-gray-900')}>
                      {priceLabel}
                    </motion.span>
                  </AnimatePresence>
                  {plan.id !== 'free' && (
                    <span className={cn('text-sm mb-1', isDark ? 'text-zinc-500' : 'text-gray-500')}>/ mois</span>
                  )}
                </div>
                {plan.id === 'free' ? (
                  <p className={cn('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-gray-500')}>Gratuit pour toujours</p>
                ) : isYearly ? (
                  <p className={cn('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-gray-500')}>
                    {plan.priceYearly.toFixed(2).replace('.', ',')}€ facturés annuellement
                  </p>
                ) : (
                  <p className={cn('text-xs mt-1', isDark ? 'text-zinc-500' : 'text-gray-500')}>Sans engagement</p>
                )}
              </div>

              {/* Liste features */}
              <div className="px-6 pb-4 flex-1">
                <div className="space-y-2.5">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      {feat.included ? (
                        <Check size={16} className={cn('flex-shrink-0 mt-0.5', feat.highlight ? 'text-emerald-500' : isDark ? 'text-zinc-400' : 'text-gray-400')} strokeWidth={3} />
                      ) : (
                        <span className="flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
                          <span className={cn('block w-3 h-[2px] rounded-full', isDark ? 'bg-zinc-700' : 'bg-gray-300')} />
                        </span>
                      )}
                      <span className={cn(
                        'text-sm',
                        feat.included
                          ? cn(feat.highlight && 'font-semibold', isDark ? 'text-zinc-200' : 'text-gray-700')
                          : isDark ? 'text-zinc-600 line-through' : 'text-gray-400 line-through',
                      )}>
                        {feat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="p-6 pt-2">
                <button
                  onClick={() => handleSelect(plan.id)}
                  disabled={isLoading || isCurrent}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                    isCurrent
                      ? cn('cursor-default', isDark ? 'bg-white/[0.06] text-zinc-500' : 'bg-gray-100 text-gray-400')
                      : plan.id === 'free'
                        ? cn(isDark ? 'bg-white/[0.08] text-white hover:bg-white/[0.14] border border-white/10' : 'bg-gray-900 text-white hover:bg-gray-800')
                        : cn('text-white shadow-lg hover:opacity-90 hover:scale-[1.02]'),
                  )}
                  style={!isCurrent && plan.id !== 'free' ? { background: accentGrad[plan.accent] } : undefined}
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Redirection…</>
                  ) : isCurrent ? (
                    <>✓ Plan actuel</>
                  ) : (
                    <>{plan.cta} <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══ Lien continuer gratuitement ═══ */}
      {sub.isFree && (
        <div className="flex justify-center mt-6">
          <button onClick={() => router.push('/dashboard')}
            className={cn('text-sm underline underline-offset-4 transition-colors',
              isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600')}>
            Continuer gratuitement ({INVOICE_LIMIT} factures/mois · voix illimitée)
          </button>
        </div>
      )}

      {/* ═══ Micro-réassurance ═══ */}
      <div className="mx-auto mt-10 max-w-2xl flex flex-wrap items-center justify-center gap-3 text-sm">
        {[
          { icon: Shield, label: 'Paiement sécurisé Stripe' },
          { icon: RefreshCw, label: 'Annulation en 1 clic' },
          { icon: CreditCard, label: 'RGPD compliant' },
          { icon: InfinityIcon, label: 'Voix illimitée partout' },
        ].map((badge, i) => (
          <div key={i} className={cn('flex items-center gap-2 px-4 py-2 rounded-full border',
            isDark ? 'bg-[#111113]/50 border-white/[0.06]' : 'bg-white/50 backdrop-blur-sm border-gray-200')}>
            <badge.icon size={15} className="text-primary" />
            <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-gray-500')}>{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

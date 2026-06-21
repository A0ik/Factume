'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Crown, ShieldCheck, Zap, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANNUAL_DISCOUNT_BADGE } from '@/lib/plans';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import CheckoutModal, { type CheckoutMode } from '@/components/ui/CheckoutModal';

/**
 * LOI 5 + LOI 9 (Arbiter) — /trial est une COPIE CONFORME de la section Tarifs
 * de la homepage (mêmes cartes, mêmes prix, même design dark). Une seule source
 * de vérité tarifaire. Le CTA est contextuel pour convertir au maximum :
 *  - essai actif  → bannière "essai en cours" + souscrire au plan choisi
 *  - non connecté → /register
 *  - déjà payant  → "Plan actuel"
 * LOI 6 — souscription via Stripe Checkout Hosted (aucune friction ToS).
 */

const PLANS = [
  {
    name: 'Starter',
    price: 'Gratuit',
    yearly: 'Gratuit',
    tag: 'Pour démarrer et tester',
    features: [
      'E-facturation certifiée',
      '3 factures & devis/mois',
      '1 cabinet, 10 clients',
      'Dictée vocale IA activée',
      'Support email',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: '14,99€',
    yearly: '12,50€',
    tag: 'Indépendants & TPE',
    features: [
      'Factures & devis illimités',
      'Contrats CDI/CDD',
      'OCR reçus',
      'Signature électronique',
      'Voice Expense illimité',
      'IK & notes de frais',
      'URSSAF One-Click',
      'Export FEC/CSV',
      'Rapprochement bancaire',
      'Sans watermark',
    ],
    popular: true,
  },
  {
    name: 'Business',
    price: '39,99€',
    yearly: '33,33€',
    tag: 'PME & Experts-comptables',
    features: [
      'E-facturation certifiée',
      'Tout Pro inclus',
      '5 cabinets',
      'Comptable Connect',
      'Multi-utilisateur (5)',
      'Copilot IA avancé',
      'Support dédié',
    ],
    popular: false,
  },
] as const;

export default function TrialPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();

  const [billing, setBilling] = React.useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan] = React.useState<string | null>(null);
  const [checkout, setCheckout] = React.useState<{
    open: boolean;
    mode: CheckoutMode;
    planId: 'pro' | 'business';
  }>({ open: false, mode: 'payment', planId: 'pro' });

  const currentTier = (profile?.subscription_tier || 'free').toLowerCase(); // free | pro | business …
  const trialActive = !!sub?.isTrialActive;

  // ALCHEMIST — souscription on-site via Stripe Elements (no redirect).
  const subscribe = (planName: string) => {
    const plan = planName.toLowerCase();
    if (plan === 'starter') {
      router.push(profile?.id ? '/dashboard' : '/register');
      return;
    }
    if (!profile?.id) {
      router.push(`/register?plan=${plan}&billing=${billing}`);
      return;
    }
    if (plan === currentTier && !trialActive) return;
    const hasRealStripeSubscription = !sub?.isFree && !!profile?.stripe_subscription_id;
    setCheckout({
      open: true,
      mode: hasRealStripeSubscription ? 'change' : 'payment',
      planId: plan as 'pro' | 'business',
    });
  };

  const ctaFor = (planName: string): { label: string; disabled: boolean } => {
    const plan = planName.toLowerCase();
    if (plan === currentTier && !trialActive) return { label: 'Plan actuel', disabled: true };
    if (plan === 'starter') return { label: profile?.id ? 'Continuer gratuitement' : 'Commencer gratuitement', disabled: false };
    if (plan === currentTier && trialActive) return { label: `Passer en ${planName}`, disabled: false };
    return { label: `Choisir ${planName}`, disabled: false };
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ════════════ PRICING — copie conforme homepage ════════════ */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* halo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-[2] max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-12">
            {/* Bannière contextuelle (LOI 9) */}
            {profile?.id && trialActive && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-6"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Votre essai est en cours — souscrivez pour garder toutes vos fonctionnalités
              </motion.div>
            )}
            {profile?.id && !trialActive && !sub?.isFree && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-neutral-300 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-6"
              >
                <Crown className="w-3.5 h-3.5 text-emerald-400" />
                Vous êtes déjà abonné — merci !
              </motion.div>
            )}

            <p className="text-[11px] sm:text-xs text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4">
              Tarifs transparents
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Choisissez votre plan
            </h1>
            <p className="text-base text-neutral-400">Sans engagement. Évoluez quand vous voulez.</p>

            {/* Toggle mensuel / annuel */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setBilling('monthly')}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200',
                  billing === 'monthly' ? 'bg-white text-neutral-950' : 'bg-neutral-900 text-neutral-400 hover:text-white',
                )}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200',
                  billing === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white',
                )}
              >
                Annuel <span className="text-xs opacity-70">({ANNUAL_DISCOUNT_BADGE})</span>
              </button>
            </div>
          </div>

          {/* Cards — copie conforme homepage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start">
            {PLANS.map((plan, i) => {
              const cta = ctaFor(plan.name);
              const busy = loadingPlan === plan.name;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    'relative rounded-2xl p-7 flex flex-col h-full transition-all duration-300',
                    plan.popular
                      ? 'border-2 border-emerald-500/70 scale-100 md:scale-105 z-10 bg-neutral-900/60 shadow-[0_0_50px_rgba(16,185,129,0.15)]'
                      : 'bg-neutral-900/40 border border-white/[0.06] hover:border-white/10',
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
                        <Crown className="w-3 h-3" />
                        Recommandé
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      {plan.popular && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          TOP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 mb-4">{plan.tag}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white tracking-tight">
                        {billing === 'monthly' ? plan.price : plan.yearly}
                      </span>
                      <span className="text-sm text-neutral-400">/mois</span>
                    </div>
                    {billing === 'yearly' && plan.price !== 'Gratuit' && (
                      <p className="text-xs text-emerald-400 font-medium mt-1">Économisez sur l'annuel</p>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className={cn('text-neutral-300', j === 0 && 'text-emerald-300 font-medium')}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => subscribe(plan.name)}
                    disabled={cta.disabled || busy}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 text-center font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed',
                      plan.popular
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-60'
                        : 'bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08] disabled:opacity-50',
                    )}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirection…
                      </>
                    ) : (
                      cta.label
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Reassurance */}
          <p className="text-center text-xs sm:text-sm text-neutral-400 mt-8 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Données en France · SSL · RGPD · Annulation en un clic
          </p>

          {profile?.id && (
            <div className="text-center mt-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xs sm:text-sm text-neutral-500 hover:text-neutral-300 transition-colors underline underline-offset-4"
              >
                Retour au tableau de bord
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ALCHEMIST — checkout on-site (no redirect) */}
      <CheckoutModal
        open={checkout.open}
        onOpenChange={(o) => setCheckout((c) => ({ ...c, open: o }))}
        mode={checkout.mode}
        planId={checkout.planId}
        billing={billing}
        currentPlan={currentTier}
        userId={profile?.id}
      />
    </div>
  );
}

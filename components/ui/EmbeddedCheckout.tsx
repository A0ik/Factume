'use client';

import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Check, Shield, Loader2, Lock, Sparkles, Crown, Zap, Rocket, Clock, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/stores/themeStore';
import { getStripe, hasStripePublishableKey } from '@/lib/stripe-client';

export interface PlanInfo {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  features: string[];
}

/* ═══════════════════════════════════════════════════════════════
   LOI 8 : STRIPE APPEARANCE API — Dual Theme
   Light → theme 'stripe' with clean whites
   Dark  → theme 'night' with Obsidian palette
   ═══════════════════════════════════════════════════════════════ */

function getLightAppearance(primaryColor: string) {
  return {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: primaryColor,
      colorBackground: '#ffffff',
      colorText: '#111827',
      colorDanger: '#ef4444',
      colorWarning: '#f59e0b',
      colorSuccess: '#10b981',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSizeBase: '14px',
      fontSizeSm: '13px',
      fontSizeXs: '11px',
      fontSizeLg: '16px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '600',
      spacingUnit: '4px',
      borderRadius: '12px',
      borderWidth: '1px',
      focusRing: `${primaryColor}15`,
    },
    rules: {
      '.Tab': {
        color: '#6B7280',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: 'none',
      },
      '.Tab:hover': {
        backgroundColor: '#F3F4F6',
        borderColor: '#D1D5DB',
      },
      '.Tab--selected': {
        backgroundColor: '#FFFFFF',
        borderColor: primaryColor,
        color: primaryColor,
        fontWeight: '600',
        boxShadow: `0 0 0 2px ${primaryColor}15`,
      },
      '.Input': {
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '11px 14px',
        fontSize: '14px',
        color: '#111827',
        boxShadow: 'none',
      },
      '.Input::placeholder': { color: '#9CA3AF' },
      '.Input:focus': {
        border: `1px solid ${primaryColor}`,
        backgroundColor: '#FFFFFF',
        boxShadow: `0 0 0 3px ${primaryColor}12`,
      },
      '.Input--invalid': {
        border: '1px solid #EF4444',
        backgroundColor: '#FEF2F2',
      },
      '.Label': {
        color: '#374151',
        fontWeight: '600',
        fontSize: '12px',
        marginBottom: '6px',
      },
      '.Label--focused': { color: primaryColor },
      '.Label--invalid': { color: '#EF4444' },
      '.Error': {
        color: '#EF4444',
        fontSize: '12px',
        marginTop: '6px',
        fontWeight: '500',
      },
      '.Divider': { borderColor: '#E5E7EB' },
    },
  };
}

function getDarkAppearance(primaryColor: string) {
  return {
    theme: 'night' as const,
    variables: {
      colorPrimary: primaryColor,
      colorBackground: '#111113',
      colorText: '#FAFAFA',
      colorDanger: '#f87171',
      colorWarning: '#fbbf24',
      colorSuccess: '#34d399',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSizeBase: '14px',
      fontSizeSm: '13px',
      fontSizeXs: '11px',
      fontSizeLg: '16px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '600',
      spacingUnit: '4px',
      borderRadius: '12px',
      borderWidth: '1px',
      focusRing: `${primaryColor}25`,
    },
    rules: {
      '.Tab': {
        color: '#A1A1AA',
        backgroundColor: '#09090B',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: 'none',
      },
      '.Tab:hover': {
        backgroundColor: '#111113',
        borderColor: 'rgba(255,255,255,0.12)',
      },
      '.Tab--selected': {
        backgroundColor: '#111113',
        borderColor: primaryColor,
        color: primaryColor,
        fontWeight: '600',
        boxShadow: `0 0 0 2px ${primaryColor}20`,
      },
      '.Input': {
        backgroundColor: '#09090B',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '11px 14px',
        fontSize: '14px',
        color: '#FAFAFA',
        boxShadow: 'none',
      },
      '.Input::placeholder': { color: '#71717A' },
      '.Input:focus': {
        border: `1px solid ${primaryColor}`,
        backgroundColor: '#111113',
        boxShadow: `0 0 0 3px ${primaryColor}18`,
      },
      '.Input--invalid': {
        border: '1px solid #f87171',
        backgroundColor: 'rgba(239,68,68,0.08)',
      },
      '.Label': {
        color: '#D4D4D8',
        fontWeight: '600',
        fontSize: '12px',
        marginBottom: '6px',
      },
      '.Label--focused': { color: primaryColor },
      '.Label--invalid': { color: '#f87171' },
      '.Error': {
        color: '#f87171',
        fontSize: '12px',
        marginTop: '6px',
        fontWeight: '500',
      },
      '.Divider': { borderColor: 'rgba(255,255,255,0.08)' },
    },
  };
}

/* ═══════════════════════════════════════════════════════════════
   Plan Config — couleurs par plan
   ALCHEMIST : doctrine « un seul accent chromatique » (Émeraude raffiné).
   Pro = émeraude vif (héros), Business = émeraude profond (premium).
   ═══════════════════════════════════════════════════════════════ */

const PLAN_CONFIG: Record<string, {
  icon: typeof Zap;
  gradient: string;
  color: string;
  lightBg: string;
  darkBg: string;
  lightText: string;
  darkText: string;
  lightRing: string;
  darkRing: string;
}> = {
  pro: {
    icon: Zap, gradient: 'from-emerald-500 to-emerald-600', color: '#10B981',
    lightBg: 'bg-emerald-50', darkBg: 'bg-emerald-500/10',
    lightText: 'text-emerald-700', darkText: 'text-emerald-400',
    lightRing: 'ring-emerald-200', darkRing: 'ring-emerald-500/30',
  },
  business: {
    icon: Crown, gradient: 'from-emerald-700 to-emerald-900', color: '#047857',
    lightBg: 'bg-emerald-50', darkBg: 'bg-emerald-700/10',
    lightText: 'text-emerald-800', darkText: 'text-emerald-400',
    lightRing: 'ring-emerald-300', darkRing: 'ring-emerald-600/30',
  },
};

/* ═══════════════════════════════════════════════════════════════
   CheckoutForm — formulaire interne avec PaymentElement
   LOI 9: Gestion d'erreurs élégante, pas de rechargement de page
   LOI 7: Micro-réassurance sous le bouton de validation
   ALCHEMIST: redirect:'if_required' (3DS uniquement) + onSuccess callback
   ═══════════════════════════════════════════════════════════════ */

function CheckoutForm({
  planInfo,
  isSetupMode,
  isDark,
  onSuccess,
}: {
  userId: string;
  planInfo: PlanInfo;
  isSetupMode: boolean;
  isDark: boolean;
  onSuccess?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = PLAN_CONFIG[planInfo.id] || PLAN_CONFIG.pro;
  const PlanIcon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);
    const returnUrl = `${window.location.origin}/dashboard?success=true${isSetupMode ? '&trial=true' : ''}`;

    // redirect:'if_required' → les paiements sans 3DS se terminent in-app,
    // seules les cartes nécessitant une authentification redirigent (puis reviennent).
    const result = isSetupMode
      ? await stripe.confirmSetup({ elements, redirect: 'if_required', confirmParams: { return_url: returnUrl } })
      : await stripe.confirmPayment({ elements, redirect: 'if_required', confirmParams: { return_url: returnUrl } });

    if (result.error) {
      setError(result.error.message || 'Une erreur est survenue');
      setIsLoading(false);
    } else {
      setSucceeded(true);
      onSuccess?.();
    }
  };

  // ── État de succès (carte validée sans 3DS) ──
  if (succeeded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "rounded-2xl border p-8 text-center",
          isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
        )}
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg"
        >
          <Check size={28} strokeWidth={3} />
        </motion.div>
        <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-gray-900")}>
          {isSetupMode ? 'Essai démarré !' : 'Paiement confirmé !'}
        </h3>
        <p className={cn("mt-1 text-sm", isDark ? "text-zinc-400" : "text-gray-600")}>
          {isSetupMode
            ? 'Votre carte est validée. Redirection vers votre tableau de bord…'
            : 'Merci ! Redirection vers votre tableau de bord…'}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Carte récap du plan — dual theme */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border",
          isDark
            ? "bg-[#111113] border-white/[0.08]"
            : "bg-white border-gray-200",
          `ring-2 ${isDark ? config.darkRing : config.lightRing}`
        )}
      >
        <div className="flex items-center gap-4 p-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl shadow-md bg-gradient-to-br flex-shrink-0",
            config.gradient
          )}>
            <PlanIcon size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-bold text-base",
                isDark ? config.darkText : config.lightText
              )}>
                {planInfo.name}
              </h3>
              {isSetupMode && (
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1",
                  isDark
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-amber-100 text-amber-700"
                )}>
                  <Clock size={10} />
                  Essai 7j
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={cn(
                "text-xl font-black",
                isDark ? config.darkText : config.lightText
              )}>
                {planInfo.price}
              </span>
              <span className={cn(
                "text-xs",
                isDark ? "text-zinc-500" : "text-gray-500"
              )}>
                {planInfo.priceNote}
              </span>
            </div>
          </div>
        </div>

        {/* Feature pills — dual theme */}
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {planInfo.features.map((f, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium",
                isDark
                  ? "bg-white/[0.05] text-zinc-400"
                  : "bg-gray-50 text-gray-600"
              )}
            >
              <Check size={10} className={isDark ? config.darkText : config.lightText} strokeWidth={3} />
              {f}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Formulaire de paiement — LOI 9: gestion d'erreur */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* LOI 8: l'apparence Stripe s'adapte au thème */}
          <div className={cn(
            "relative overflow-hidden rounded-xl border",
            isDark
              ? "bg-[#111113] border-white/[0.08]"
              : "bg-white border-gray-200",
            "transition-all duration-200",
            isDark
              ? "hover:border-white/[0.12] focus-within:border-white/[0.12] focus-within:ring-2 focus-within:ring-emerald-500/10"
              : "hover:border-gray-300 focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-gray-100"
          )}>
            <PaymentElement
              options={{
                layout: 'tabs',
                wallets: { applePay: 'auto', googlePay: 'auto' },
              }}
              className="relative z-10"
            />
          </div>

          {/* LOI 9: affichage d'erreur — theme-aware */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "rounded-xl border p-3 flex items-start gap-2",
                  isDark
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-red-50 border-red-200"
                )}
              >
                <Shield size={14} className={isDark ? "text-red-400 mt-0.5 flex-shrink-0" : "text-red-500 mt-0.5 flex-shrink-0"} />
                <p className={cn("text-xs", isDark ? "text-red-400" : "text-red-700")}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton de validation */}
          <motion.button
            type="submit"
            disabled={!stripe || isLoading}
            whileHover={{ scale: !stripe || isLoading ? 1 : 1.01 }}
            whileTap={{ scale: !stripe || isLoading ? 1 : 0.99 }}
            className={cn(
              "relative w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "bg-gradient-to-r text-white shadow-md hover:shadow-lg",
              config.gradient,
              isLoading && "opacity-80"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Vérification en cours...</span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>{isSetupMode ? 'Démarrer mon essai gratuit' : "Confirmer et s'abonner"}</span>
              </>
            )}
          </motion.button>

          {/* LOI 7: micro-réassurance */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <div className={cn(
              "flex items-center gap-1.5 text-[11px]",
              isDark ? "text-zinc-500" : "text-gray-400"
            )}>
              <Lock size={11} />
              <span>Chiffrement SSL</span>
            </div>
            <div className={cn("w-px h-3", isDark ? "bg-zinc-800" : "bg-gray-200")} />
            <div className={cn(
              "flex items-center gap-1.5 text-[11px]",
              isDark ? "text-zinc-500" : "text-gray-400"
            )}>
              <Shield size={11} />
              <span>Stripe PCI DSS</span>
            </div>
            <div className={cn("w-px h-3", isDark ? "bg-zinc-800" : "bg-gray-200")} />
            <div className={cn(
              "flex items-center gap-1.5 text-[11px]",
              isDark ? "text-zinc-500" : "text-gray-400"
            )}>
              <BadgeCheck size={11} />
              <span>RGPD</span>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EmbeddedCheckout — Wrapper avec apparence Stripe dynamique
   LOI 8: bascule dynamique entre les thèmes Stripe light/dark
   ═══════════════════════════════════════════════════════════════ */

export default function EmbeddedCheckout({
  clientSecret,
  userId,
  planInfo,
  isSetupMode = false,
  onSuccess,
}: {
  clientSecret: string;
  userId: string;
  planInfo: PlanInfo;
  isSetupMode?: boolean;
  onSuccess?: () => void;
}) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const config = PLAN_CONFIG[planInfo.id] || PLAN_CONFIG.pro;
  const primaryColor = config.color;

  // LOI 8: construit l'apparence Stripe dynamiquement
  const appearance = isDark
    ? getDarkAppearance(primaryColor)
    : getLightAppearance(primaryColor);

  const options = {
    clientSecret,
    appearance,
  };

  if (!hasStripePublishableKey) {
    return (
      <div className={cn(
        "p-4 rounded-xl text-sm",
        isDark ? "text-red-400 bg-red-500/10" : "text-red-500 bg-red-50"
      )}>
        Configuration Stripe manquante. Ajoutez NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY à votre environnement.
      </div>
    );
  }

  return (
    <Elements options={options} stripe={getStripe()}>
      <CheckoutForm
        userId={userId}
        planInfo={planInfo}
        isSetupMode={isSetupMode}
        isDark={isDark}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}

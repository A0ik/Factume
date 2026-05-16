'use client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Check, CreditCard, Smartphone, Shield, Loader2, Lock, Sparkles, Crown, Zap, Rocket, Clock, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const stripePk = process.env.NEXT_PUBLIC_STRIPE_PK;
const stripePromise = stripePk ? loadStripe(stripePk) : null;

export interface PlanInfo {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  features: string[];
}

function CheckoutForm({ userId, planInfo, isSetupMode }: { userId: string; planInfo: PlanInfo; isSetupMode: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);
    const returnUrl = `${window.location.origin}/dashboard?success=true${isSetupMode ? '&trial=true' : ''}`;

    const { error: err } = isSetupMode
      ? await stripe.confirmSetup({ elements, confirmParams: { return_url: returnUrl } })
      : await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } });

    if (err) {
      setError(err.message || 'Une erreur est survenue');
      setIsLoading(false);
    }
  };

  const getPlanConfig = () => {
    switch (planInfo.id) {
      case 'solo':
        return { icon: Zap, gradient: 'from-emerald-500 to-emerald-600', color: '#10B981', lightBg: 'bg-emerald-50', textColor: 'text-emerald-700', ring: 'ring-emerald-200' };
      case 'pro':
        return { icon: Rocket, gradient: 'from-blue-600 to-blue-800', color: '#2563EB', lightBg: 'bg-blue-50', textColor: 'text-blue-700', ring: 'ring-blue-200' };
      case 'business':
        return { icon: Crown, gradient: 'from-purple-600 to-violet-700', color: '#9333EA', lightBg: 'bg-purple-50', textColor: 'text-purple-700', ring: 'ring-purple-200' };
      default:
        return { icon: Sparkles, gradient: 'from-gray-700 to-gray-900', color: '#374151', lightBg: 'bg-gray-50', textColor: 'text-gray-700', ring: 'ring-gray-200' };
    }
  };

  const config = getPlanConfig();
  const PlanIcon = config.icon;

  return (
    <div className="space-y-5">
      {/* Plan summary card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border",
          "bg-white shadow-sm",
          `ring-2 ${config.ring}`
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
              <h3 className={cn("font-bold text-base", config.textColor)}>{planInfo.name}</h3>
              {isSetupMode && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                  <Clock size={10} />
                  Essai 4j
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={cn("text-xl font-black", config.textColor)}>{planInfo.price}€</span>
              <span className="text-xs text-gray-500">{planInfo.priceNote}</span>
            </div>
          </div>
        </div>

        {/* Features pills */}
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {planInfo.features.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-[11px] text-gray-600 font-medium">
              <Check size={10} className={config.textColor} strokeWidth={3} />
              {f}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Payment form */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stripe Payment Element */}
          <div className={cn(
            "relative overflow-hidden rounded-xl border bg-white",
            "border-gray-200",
            "transition-all duration-200",
            "hover:border-gray-300 focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-gray-100"
          )}>
            <PaymentElement
              options={{
                layout: 'tabs',
                wallets: { applePay: 'auto', googlePay: 'auto' },
              }}
              className="relative z-10"
            />
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2"
              >
                <Shield size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
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
                <span>{isSetupMode ? 'Démarrer mon essai gratuit' : 'Confirmer et s\'abonner'}</span>
              </>
            )}
          </motion.button>

          {/* Security footer */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <Lock size={11} />
              <span>Chiffrement SSL</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <Shield size={11} />
              <span>Stripe PCI DSS</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <BadgeCheck size={11} />
              <span>RGPD</span>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function EmbeddedCheckout({
  clientSecret,
  userId,
  planInfo,
  isSetupMode = false,
}: {
  clientSecret: string;
  userId: string;
  planInfo: PlanInfo;
  isSetupMode?: boolean;
}) {
  const getPlanColor = () => {
    switch (planInfo.id) {
      case 'solo': return '#10B981';
      case 'pro': return '#2563EB';
      case 'business': return '#9333EA';
      default: return '#111827';
    }
  };

  const primaryColor = getPlanColor();

  const options = {
    clientSecret,
    appearance: {
      theme: 'flat' as const,
      variables: {
        colorPrimary: primaryColor,
        colorBackground: '#FFFFFF',
        colorText: '#111827',
        colorDanger: '#EF4444',
        colorWarning: '#F59E0B',
        colorSuccess: '#10B981',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSizeBase: '14px',
        fontSizeSm: '13px',
        fontSizeXs: '11px',
        fontSizeLg: '16px',
        fontWeightNormal: '400',
        fontWeightMedium: '500',
        fontWeightBold: '600',
        spacingUnit: '4px',
        borderRadius: '10px',
        borderWidth: '1px',
        focusRing: `${primaryColor}15`,
      },
      rules: {
        '.Tab': {
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.15s ease',
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
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '14px',
          color: '#111827',
          boxShadow: 'none',
          transition: 'all 0.15s ease',
        },
        '.Input::placeholder': { color: '#9CA3AF' },
        '.Input:focus': {
          border: `1px solid ${primaryColor}`,
          backgroundColor: '#FFFFFF',
          boxShadow: `0 0 0 2px ${primaryColor}12`,
          outline: 'none',
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
          letterSpacing: '-0.01em',
        },
        '.Label--focused': { color: primaryColor },
        '.Label--invalid': { color: '#EF4444' },
        '.Error': {
          color: '#EF4444',
          fontSize: '12px',
          marginTop: '6px',
          fontWeight: '500',
        },
        '.CardField': { backgroundColor: '#F9FAFB' },
        '.Divider': { borderColor: '#E5E7EB', margin: '12px 0' },
      },
    },
  };

  if (!stripePromise) {
    return <div className="p-4 text-red-500">Configuration Stripe manquante.</div>;
  }

  return (
    <Elements options={options} stripe={stripePromise}>
      <CheckoutForm userId={userId} planInfo={planInfo} isSetupMode={isSetupMode} />
    </Elements>
  );
}

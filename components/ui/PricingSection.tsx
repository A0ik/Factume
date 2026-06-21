'use client';

/**
 * ALCHEMIST — PricingSection (adaptation FR/EUR du composant pricing.tsx fourni).
 *
 * Conserve les éléments signature du composant d'origine :
 *   • InteractiveStarfield (champ d'étoiles magnétique au curseur)
 *   • confetti à la bascule vers l'annuel (célébration de conversion)
 *   • NumberFlow (prix animés entre mensuel / équivalent-mensuel-annuel)
 *   • carte glassmorphism + badge « Le plus populaire »
 *
 * Adapté au contexte Factu.me :
 *   • FR, devise EUR (format fr-FR)
 *   • données depuis lib/plans (single source of truth) transmises par le paywall
 *   • bascule Mensuel/Annuel contrôlée par le parent (sync avec la modale de checkout)
 *   • CTA par callback onSelect(planId) → ouverture du tunnel on-site (plus de <Link>)
 *   • doctrine « un seul accent » : émeraude (Pro héros, Business émeraude profond)
 *   • respect de prefers-reduced-motion (confetti désactivé si demandé)
 */
import { motion, useSpring } from 'framer-motion';
import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Check, Star as LucideStar, Sparkles } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useThemeStore } from '@/stores/themeStore';
import { ANNUAL_DISCOUNT_BADGE } from '@/lib/plans';

// ─── UTILITY ──────────────────────────────────────────────────────
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);
  useEffect(() => {
    function onChange(event: MediaQueryListEvent) { setValue(event.matches); }
    const result = matchMedia(query);
    result.addEventListener('change', onChange);
    setValue(result.matches);
    return () => result.removeEventListener('change', onChange);
  }, [query]);
  return value;
}

// ─── BUTTON (auto-contenu pour ne pas clasher avec le Button custom du projet) ──
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5',
        outline: 'border-2 border-emerald-500/60 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400',
        muted: 'bg-white/[0.06] text-zinc-300 dark:bg-white/[0.06]',
      },
      size: {
        default: 'h-11 px-8',
        lg: 'h-12 px-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = 'Button';

// ─── INTERACTIVE STARFIELD ────────────────────────────────────────
function Star({
  mousePosition,
  containerRef,
}: {
  mousePosition: { x: number | null; y: number | null };
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [initialPos] = useState(() => ({
    top: `${(Math.random() * 100).toFixed(2)}%`,
    left: `${(Math.random() * 100).toFixed(2)}%`,
  }));
  const springConfig = { stiffness: 100, damping: 15, mass: 0.1 };
  const springX = useSpring(0, springConfig);
  const springY = useSpring(0, springConfig);

  useEffect(() => {
    if (!containerRef.current || mousePosition.x === null || mousePosition.y === null) {
      springX.set(0); springY.set(0);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const starX = rect.left + (parseFloat(initialPos.left) / 100) * rect.width;
    const starY = rect.top + (parseFloat(initialPos.top) / 100) * rect.height;
    const deltaX = mousePosition.x - starX;
    const deltaY = mousePosition.y - starY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const radius = 520;
    if (distance < radius) {
      const force = 1 - distance / radius;
      springX.set(deltaX * force * 0.5);
      springY.set(deltaY * force * 0.5);
    } else {
      springX.set(0); springY.set(0);
    }
  }, [mousePosition, initialPos, containerRef, springX, springY]);

  return (
    <motion.div
      className="absolute rounded-full bg-emerald-400/70"
      style={{
        top: initialPos.top, left: initialPos.left,
        width: `${1 + Math.random() * 2}px`,
        height: `${1 + Math.random() * 2}px`,
        x: springX, y: springY,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.8, 0] }}
      transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
    />
  );
}

function InteractiveStarfield({
  mousePosition, containerRef, count,
}: {
  mousePosition: { x: number | null; y: number | null };
  containerRef: React.RefObject<HTMLDivElement | null>;
  count: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={`star-${i}`} mousePosition={mousePosition} containerRef={containerRef} />
      ))}
    </div>
  );
}

// ─── PLAN SHAPE ───────────────────────────────────────────────────
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;          // ex 14.99
  priceYearly: number;           // total annuel ex 149.99
  priceYearlyMonthlyEq: number;  // équivalent mensuel annuel ex 12.50
  features: string[];
  buttonText: string;
  isPopular?: boolean;
  isCurrent?: boolean;
  isFreeAction?: boolean;        // le CTA ne déclenche pas de checkout (ex: plan gratuit)
}

export type Billing = 'monthly' | 'yearly';

interface PricingSectionProps {
  plans: PricingPlan[];
  billing: Billing;
  onBillingChange: (billing: Billing) => void;
  onSelect: (planId: string) => void;
  title?: string;
  description?: string;
}

// ─── TOGGLE MENSUEL / ANNUEL ──────────────────────────────────────
function PricingToggle({
  billing, onBillingChange,
}: {
  billing: Billing;
  onBillingChange: (b: Billing) => void;
}) {
  const isMonthly = billing === 'monthly';
  const confettiRef = useRef<HTMLDivElement>(null);
  const monthlyBtnRef = useRef<HTMLButtonElement>(null);
  const annualBtnRef = useRef<HTMLButtonElement>(null);
  const [pillStyle, setPillStyle] = useState<Record<string, number>>({});

  useEffect(() => {
    const btnRef = isMonthly ? monthlyBtnRef : annualBtnRef;
    if (btnRef.current) {
      setPillStyle({ width: btnRef.current.offsetWidth, transform: btnRef.current.offsetLeft });
    }
  }, [isMonthly]);

  const handleToggle = (next: Billing) => {
    if (billing === next) return;
    onBillingChange(next);
    // Célébration uniquement au passage à l'annuel, et si l'utilisateur n'a pas
    // demandé de réduire les animations.
    if (next === 'yearly' && confettiRef.current && annualBtnRef.current) {
      const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;
      const rect = annualBtnRef.current.getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / window.innerWidth;
      const originY = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 70, spread: 75,
        origin: { x: originX, y: originY },
        colors: ['#10b981', '#059669', '#34d399', '#a7f3d0'],
        ticks: 280, gravity: 1.2, decay: 0.94, startVelocity: 28,
      });
    }
  };

  return (
    <div className="flex justify-center">
      <div ref={confettiRef} className="relative flex w-fit items-center rounded-full border border-border/60 bg-muted/60 p-1 backdrop-blur">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 p-1 shadow-md"
          style={pillStyle}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
        <button
          ref={monthlyBtnRef}
          onClick={() => handleToggle('monthly')}
          className={cn(
            'relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors sm:px-7',
            isMonthly ? 'text-white' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Mensuel
        </button>
        <button
          ref={annualBtnRef}
          onClick={() => handleToggle('yearly')}
          className={cn(
            'relative z-10 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors sm:px-7',
            !isMonthly ? 'text-white' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Annuel
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide',
            !isMonthly ? 'bg-white/25 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          )}>
            {ANNUAL_DISCOUNT_BADGE}
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── CARTE DE PLAN ────────────────────────────────────────────────
function PricingCard({
  plan, index, isMonthly, onSelect,
}: {
  plan: PricingPlan;
  index: number;
  isMonthly: boolean;
  onSelect: (id: string) => void;
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const value = isMonthly ? plan.priceMonthly : plan.priceYearlyMonthlyEq;
  const annualSaving = Math.round(plan.priceMonthly * 12 - plan.priceYearly);

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      whileInView={{ y: plan.isPopular && isDesktop ? -16 : 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, type: 'spring', stiffness: 100, damping: 20, delay: index * 0.12 }}
      className={cn(
        'relative flex flex-col rounded-2xl p-7 backdrop-blur-sm',
        plan.isPopular
          ? 'border-2 border-emerald-500/60 bg-background/70 shadow-xl shadow-emerald-500/10 dark:bg-neutral-950/60'
          : 'border border-border/70 bg-background/60 dark:bg-neutral-950/40',
      )}
    >
      {plan.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 shadow-md">
            <LucideStar className="h-4 w-4 fill-current text-white" />
            <span className="text-sm font-bold text-white">Le plus populaire</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col text-center">
        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
        <p className="mt-1.5 min-h-[2.5rem] text-sm text-muted-foreground">{plan.description}</p>

        <div className="mt-5 flex items-baseline justify-center gap-x-1">
          {plan.priceMonthly === 0 ? (
            <span className="text-5xl font-black tracking-tight text-foreground">0€</span>
          ) : (
            <>
              <span className="text-5xl font-black tracking-tight text-foreground">
                <NumberFlow
                  value={value}
                  locales="fr-FR"
                  format={{ style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }}
                  transformTiming={{ duration: 450 }}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                />
              </span>
              <span className="text-sm font-semibold tracking-wide text-muted-foreground">/ mois</span>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {plan.priceMonthly === 0
            ? 'Gratuit pour toujours'
            : isMonthly
              ? 'Sans engagement'
              : <>
                  {plan.priceYearly.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} facturés/an
                  <span className="block font-semibold text-emerald-600 dark:text-emerald-400">
                    soit {annualSaving}€ économisés/an
                  </span>
                </>}
        </p>

        <ul role="list" className="mt-7 space-y-3 text-left text-sm leading-6 text-muted-foreground">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-x-3">
              <Check className="h-5 w-5 flex-none text-emerald-500" strokeWidth={3} aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <Button
            variant={plan.isCurrent ? 'muted' : plan.isPopular ? 'default' : 'outline'}
            size="lg"
            disabled={plan.isCurrent}
            onClick={() => onSelect(plan.id)}
            className="w-full"
          >
            {plan.isCurrent ? '✓ Plan actuel' : plan.buttonText}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SECTION PRINCIPALE ───────────────────────────────────────────
export function PricingSection({
  plans, billing, onBillingChange, onSelect,
  title = 'Choisissez le plan adapté à votre activité',
  description = 'Annulable en 1 clic, sans engagement. La dictée vocale reste illimitée partout.',
}: PricingSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePosition({ x: null, y: null })}
      className={cn(
        'relative w-full overflow-hidden py-16 sm:py-20',
        isDark ? 'bg-[#09090B]' : 'bg-gradient-to-br from-gray-50 via-white to-emerald-50/40',
      )}
    >
      {/* Starfield desktop uniquement (mobile = performance) */}
      {isDesktop && <InteractiveStarfield mousePosition={mousePosition} containerRef={containerRef} count={46} />}

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-3xl space-y-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles size={12} /> Tarifs simples et transparents
          </div>
          <h2 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            {title}
          </h2>
          <p className="whitespace-pre-line text-base text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>

        <PricingToggle billing={billing} onBillingChange={onBillingChange} />

        <div className="mt-12 grid grid-cols-1 items-start gap-7 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              index={index}
              isMonthly={billing === 'monthly'}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

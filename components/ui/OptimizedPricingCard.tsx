'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Shield, ArrowRight, CheckCircle2, Circle, Lock, HeadphonesIcon as Headphones, BadgePercent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface PlanFeature { label: string; included: boolean; highlight?: boolean; }
interface Plan {
  id: string; name: string; price: string; yearlyPrice: string; yearlySavings: string; tagline: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  gradient: string; gradientFrom: string; gradientTo: string;
  features: PlanFeature[]; cta: string; badge?: string;
  borderColor: string; glowColor: string; popular?: boolean;
}

interface OptimizedPricingCardProps {
  plan: Plan;
  isHighlighted: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  isDowngrade: boolean;
  onClick: () => void;
  delay: number;
  billing: 'monthly' | 'yearly';
  userCount?: string;
  prorataAmount?: number;
  prorataPercent?: number;
  currentPlan?: string;
}

// Animated background particles per plan
const PLAN_COLORS: Record<string, { dot: string; glow: string; meteor: string }> = {
  solo: { dot: 'rgba(16, 185, 129, 0.5)', glow: 'rgba(16, 185, 129, 0.15)', meteor: '#10b981' },
  pro: { dot: 'rgba(59, 130, 246, 0.5)', glow: 'rgba(59, 130, 246, 0.15)', meteor: '#3b82f6' },
  business: { dot: 'rgba(147, 51, 234, 0.5)', glow: 'rgba(147, 51, 234, 0.15)', meteor: '#9333ea' },
};

const PLAN_BUTTON: Record<string, string> = {
  solo: 'linear-gradient(135deg, #10b981, #059669)',
  pro: 'linear-gradient(135deg, #1e40af, #3730a3)',
  business: 'linear-gradient(135deg, #9333ea, #6d28d9)',
};

const PLAN_HEADER: Record<string, string> = {
  solo: 'linear-gradient(135deg, #10b981, #059669)',
  pro: 'linear-gradient(135deg, #1e40af, #312e81)',
  business: 'linear-gradient(135deg, #9333ea, #6d28d9)',
};

function FloatingOrbs({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}, transparent 70%)`,
            width: 40 + i * 20,
            height: 40 + i * 20,
            left: `${15 + i * 22}%`,
            top: `${10 + i * 18}%`,
          }}
          animate={{
            x: [0, 30 + i * 10, -20, 0],
            y: [0, -25, 15 + i * 5, 0],
            opacity: [0.3, 0.6, 0.4, 0.3],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 6 + i * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.8,
          }}
        />
      ))}
    </div>
  );
}

function MeteorShower({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`meteor-${i}`}
          className="absolute"
          style={{
            width: 2,
            height: 20 + i * 10,
            background: `linear-gradient(to bottom, ${color}, transparent)`,
            borderRadius: 999,
            left: `${20 + i * 30}%`,
            top: '-10%',
          }}
          animate={{
            y: ['0%', '120%'],
            x: [0, -30 + i * 15],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2.5 + i * 0.8,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 1.2 + Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

function FloatingDots({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute rounded-full"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            backgroundColor: color,
            left: `${10 + i * 12}%`,
            top: `${15 + (i * 17) % 70}%`,
          }}
          animate={{
            y: [0, -15 - i * 3, 10, 0],
            x: [0, 8 - i * 2, -5, 0],
            opacity: [0, 0.8, 0.4, 0],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  );
}

const PlanFeatureItem = ({ feature, delay }: { feature: PlanFeature; delay: number }) => (
  <motion.li
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: delay + 0.05 }}
    className={cn(
      'flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg transition-all duration-200',
      feature.included ? 'hover:bg-gray-50' : 'opacity-50',
      feature.highlight && 'bg-emerald-50/80 border border-emerald-200/50'
    )}
  >
    {feature.included ? (
      <CheckCircle2 size={15} className={cn(
        'flex-shrink-0 stroke-[2.5]',
        feature.highlight ? 'text-emerald-600' : 'text-primary'
      )} />
    ) : (
      <Circle size={15} className="flex-shrink-0 text-gray-300 stroke-2" />
    )}
    <span className={cn(
      'text-[13px] flex-1',
      feature.included ? 'text-gray-700' : 'text-gray-400',
      feature.highlight && 'font-semibold text-emerald-800'
    )}>
      {feature.label}
    </span>
    {feature.highlight && (
      <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider">
        Top
      </span>
    )}
  </motion.li>
);

export function OptimizedPricingCard({
  plan,
  isHighlighted,
  isCurrent,
  isLoading,
  isDowngrade,
  onClick,
  delay,
  billing,
  userCount = '+2,500',
  prorataAmount = 0,
  prorataPercent = 0,
  currentPlan,
}: OptimizedPricingCardProps) {
  const Icon = plan.icon;
  const isYearly = billing === 'yearly';
  const displayPrice = isYearly ? plan.yearlyPrice : plan.price;
  const hasProrata = prorataAmount > 0 && !isCurrent && !isDowngrade;
  const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.pro;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        animate={{ y: hovered ? -6 : 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative h-full flex flex-col rounded-2xl overflow-hidden cursor-pointer',
          'bg-white border transition-all duration-300',
          isHighlighted
            ? 'border-gray-200 shadow-xl ring-2'
            : 'border-gray-200/80 shadow-sm hover:shadow-lg hover:border-gray-300',
          isCurrent && !isHighlighted && 'ring-1 ring-primary/20',
        )}
        style={{
          ...(isHighlighted ? { ringColor: colors.dot.replace('0.5', '0.3') } : {}),
          boxShadow: isHighlighted
            ? `0 8px 40px -12px ${colors.glow}`
            : hovered
              ? `0 4px 20px -8px ${colors.glow}`
              : undefined,
        }}
        onClick={onClick}
      >
        {/* ===== ANIMATED BACKGROUND LAYER ===== */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <FloatingOrbs color={colors.glow} />
          <MeteorShower color={colors.meteor} />
          <FloatingDots color={colors.dot} />

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle, ${colors.dot} 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />
        </div>

        {/* Popular badge */}
        {isHighlighted && (
          <div className="absolute top-0 right-0 z-20">
            <div
              className="text-[10px] font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-2xl text-white"
              style={{ background: PLAN_HEADER[plan.id] }}
            >
              {plan.badge}
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div
            className="relative p-6 pb-7 rounded-t-2xl overflow-hidden text-white"
            style={{ background: PLAN_HEADER[plan.id] }}
          >
            {/* Header particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`hpart-${i}`}
                  className="absolute rounded-full bg-white/20"
                  style={{ width: 3, height: 3, left: `${i * 22}%`, top: `${20 + i * 15}%` }}
                  animate={{
                    y: [0, -20, 10, 0],
                    x: [0, 10 - i * 4, -8, 0],
                    opacity: [0, 0.8, 0.3, 0],
                  }}
                  transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.6 }}
                />
              ))}
            </div>

            <div className="relative">
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.05 }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-3 bg-white/20 backdrop-blur-sm"
              >
                <Icon size={24} className="text-white" />
              </motion.div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                {isCurrent && (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                    Actuel
                  </span>
                )}
                {isYearly && !isCurrent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-emerald-400/30 rounded-full border border-white/20">
                    <BadgePercent size={9} />
                    -20%
                  </span>
                )}
              </div>
              <p className="text-sm text-white/80 mt-0.5">{plan.tagline}</p>
            </div>

            {/* Price */}
            <div className="relative mt-5">
              <div className="flex items-baseline gap-1">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={isYearly ? 'yearly' : 'monthly'}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="text-4xl font-black tracking-tight"
                  >
                    {displayPrice}
                  </motion.span>
                </AnimatePresence>
                <span className="text-sm text-white/70 font-medium">
                  {hasProrata ? '' : '/ mois'}
                </span>
              </div>

              {isYearly && !hasProrata && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 mt-1.5"
                >
                  <span className="text-xs text-white/50 line-through">{plan.price}/mois</span>
                  <span className="text-xs text-emerald-300 font-semibold">
                    -{plan.yearlySavings}/an
                  </span>
                </motion.div>
              )}

              {hasProrata && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 flex items-center gap-2"
                >
                  <span className="px-2 py-0.5 bg-emerald-400/30 text-white text-[10px] font-bold rounded-full">
                    Prorata {prorataPercent}%
                  </span>
                  <span className="text-xs text-white/70">Au lieu de {plan.price}</span>
                </motion.div>
              )}

              <p className="text-[11px] text-white/70 mt-2">
                {isYearly ? 'Facturé annuellement' : 'Sans engagement'}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="flex-1 px-5 py-5 relative">
            <ul className="space-y-0.5 relative z-10">
              {plan.features.map((feat, i) => (
                <PlanFeatureItem key={i} feature={feat} delay={delay} />
              ))}
            </ul>
          </div>

          {/* Trust badges for highlighted plan */}
          {isHighlighted && (
            <div className="px-5 pb-3">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100">
                  <Shield size={11} className="text-primary" />
                  <span className="text-[9px] font-semibold text-gray-500">Sécurisé</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100">
                  <Lock size={11} className="text-primary" />
                  <span className="text-[9px] font-semibold text-gray-500">RGPD</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100">
                  <Headphones size={11} className="text-primary" />
                  <span className="text-[9px] font-semibold text-gray-500">Support</span>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="px-5 pb-5 pt-2">
            <motion.button
              whileHover={{ scale: isCurrent || isDowngrade ? 1 : 1.02 }}
              whileTap={{ scale: isCurrent || isDowngrade ? 1 : 0.98 }}
              disabled={isCurrent || isLoading || isDowngrade}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 relative overflow-hidden',
                isCurrent
                  ? 'bg-gray-100 text-gray-500 cursor-default'
                  : isDowngrade
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-white shadow-lg hover:shadow-xl',
              )}
              style={(!isCurrent && !isDowngrade) ? { background: PLAN_BUTTON[plan.id] } : undefined}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                  <span>Chargement...</span>
                </>
              ) : isCurrent ? (
                <>
                  <Check size={14} />
                  Plan actuel
                </>
              ) : isDowngrade ? (
                'Plan inférieur'
              ) : (
                <>
                  {plan.cta}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>

            {!isCurrent && !isDowngrade && (
              <p className="text-[10px] text-gray-400 text-center mt-2.5 flex items-center justify-center gap-1">
                <Shield size={10} />
                Satisfait ou remboursé sous 30 jours
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default OptimizedPricingCard;

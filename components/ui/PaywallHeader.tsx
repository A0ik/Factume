'use client';

import { motion } from 'framer-motion';
import { Crown, Users, Shield, Award, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/themeStore';

interface PaywallHeaderProps {
  onCTAClick?: () => void;
}

/**
 * PaywallHeader — Dual-theme en-tête pour la conversion
 * LOI 1: Dualité parfaite (Clair & Obsidian)
 * Social proof, autorité, urgence, CTA
 */
export function PaywallHeader({ onCTAClick }: PaywallHeaderProps) {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="space-y-6 mb-10">
      {/* Hero Section with Social Proof */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-5"
      >
        {/* Trust Badge — dual theme */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full border",
            isDark
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30"
          )}
        >
          <Crown size={14} className="text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Solutions de facturation #1 en France
          </span>
        </motion.div>

        {/* Main Title — dual theme */}
        <div className="space-y-3">
          <h1 className={cn(
            "text-3xl md:text-4xl lg:text-5xl font-black tracking-tight",
            isDark ? "text-white" : "text-gray-900"
          )}>
            Choisissez votre plan
            <span className="block bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent">
              pour libérer votre potentiel
            </span>
          </h1>

          <p className={cn(
            "mx-auto max-w-xl text-sm md:text-base",
            isDark ? "text-zinc-400" : "text-gray-500"
          )}>
            Commencez gratuitement, évoluez à votre rythme. Rejoignez{' '}
            <span className={cn("font-bold", isDark ? "text-zinc-200" : "text-gray-700")}>
              +2,500 entreprises
            </span>{' '}
            qui nous font confiance.
          </p>
        </div>

        {/* Trust Badges row — dual theme */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-3 text-sm"
        >
          {/* RGPD badge */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border",
            isDark
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30"
          )}>
            <Shield size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Certifié RGPD
            </span>
          </div>

          {/* Support badge */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border",
            isDark
              ? "bg-blue-500/10 border-blue-500/20"
              : "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
          )}>
            <Award size={14} className={isDark ? "text-blue-400" : "text-blue-600"} />
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              isDark ? "text-blue-400" : "text-blue-700"
            )}>
              Support Français
            </span>
          </div>

          {/* No commitment badge */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border",
            isDark
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200"
          )}>
            <CheckCircle2 size={14} className={isDark ? "text-emerald-400" : "text-emerald-600"} />
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              isDark ? "text-emerald-400" : "text-emerald-700"
            )}>
              Sans Engagement
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom trust badges — dual theme */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {[
          { icon: Shield, label: 'Sécurisé Stripe' },
          { icon: CheckCircle2, label: 'RGPD Compliant' },
          { icon: Award, label: 'Support 24/7' },
          { icon: Users, label: '+2M€ facturés' },
        ].map((badge, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border",
              isDark
                ? "bg-[#111113] border-white/[0.06] shadow-sm"
                : "bg-white shadow-sm border-gray-200"
            )}
          >
            <badge.icon size={14} className="text-primary" />
            <span className={cn(
              "text-[11px] font-semibold",
              isDark ? "text-zinc-400" : "text-gray-700"
            )}>
              {badge.label}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default PaywallHeader;

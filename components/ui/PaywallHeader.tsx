'use client';

import { motion } from 'framer-motion';
import { Crown, Users, Shield, Award, CheckCircle2 } from 'lucide-react';

interface PaywallHeaderProps {
  onCTAClick?: () => void;
}

/**
 * PaywallHeader - En-tête optimisé pour la conversion
 *
 * Éléments clés :
 * - Preuve sociale (nombre d'utilisateurs, étoiles)
 * - Autorité (badges de confiance)
 * - Urgence (essai gratuit limité)
 * - CTA clair et visible
 */
export function PaywallHeader({ onCTAClick }: PaywallHeaderProps) {
  return (
    <div className="space-y-8 mb-12">
      {/* Hero Section with Social Proof */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        {/* Trust Badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30"
        >
          <Crown size={14} className="text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Solutions de facturation #1 en France
          </span>
        </motion.div>

        {/* Main Title */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight">
            Choisissez votre plan
            <span className="block bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent">
              pour libérer votre potentiel
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-base text-gray-500">
            Commencez gratuitement, évoluez à votre rythme. Rejoignez <span className="font-bold text-gray-700">+2,500 entreprises</span> qui nous font confiance.
          </p>
        </div>

        {/* Trust Badges - Without fake reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4 text-sm"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30">
            <Shield size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Certifié RGPD
            </span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
            <Award size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Support Français
            </span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Sans Engagement
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Trust Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
          <Shield size={16} className="text-primary" />
          <span className="text-xs font-semibold text-gray-700">Sécurisé Stripe</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
          <CheckCircle2 size={16} className="text-primary" />
          <span className="text-xs font-semibold text-gray-700">RGPD Compliant</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
          <Award size={16} className="text-primary" />
          <span className="text-xs font-semibold text-gray-700">Support 24/7</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
          <Users size={16} className="text-primary" />
          <span className="text-xs font-semibold text-gray-700">+2M€ facturés</span>
        </div>
      </motion.div>

    </div>
  );
}

export default PaywallHeader;

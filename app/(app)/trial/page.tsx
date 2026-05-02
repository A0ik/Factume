"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  FileText, BarChart3, Shield, Clock, TrendingUp,
  CheckCircle2, ArrowRight, Sparkles, Zap, Crown,
  Rocket, Star, Award, Loader2
} from "lucide-react";
import Button from "@/components/ui/Button";
import TiltCard from "@/components/ui/TiltCard";

export default function TrialPage() {
  const [isActivating, setIsActivating] = React.useState(false);
  const [isActivated, setIsActivated] = React.useState(false);

  const handleActivateTrial = async () => {
    setIsActivating(true);
    try {
      setTimeout(() => {
        window.location.href = '/paywall?plan=business&trial=true';
      }, 500);
    } catch (error) {
      console.error('Error activating trial:', error);
      alert('Erreur lors de l\'activation de l\'essai');
      setIsActivating(false);
    }
  };

  const features = [
    {
      icon: FileText,
      title: "Factures illimitées",
      description: "Créez autant de factures que vous le souhaitez pendant 4 jours",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      icon: Sparkles,
      title: "IA & Voix",
      description: "Dictée vocale et génération de factures par intelligence artificielle",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600"
    },
    {
      icon: BarChart3,
      title: "CRM & Recouvrement",
      description: "Gérez vos clients et suivez vos opportunités commerciales",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      textColor: "text-green-600"
    },
    {
      icon: Shield,
      title: "Signature électronique",
      description: "Faites signer vos devis et contrats en ligne",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600"
    },
    {
      icon: Clock,
      title: "Factures récurrentes",
      description: "Automatisez vos factures périodiques",
      color: "from-indigo-500 to-violet-500",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600"
    },
    {
      icon: TrendingUp,
      title: "Export comptabilité",
      description: "Exportez vos données au format FEC pour votre comptable",
      color: "from-teal-500 to-cyan-500",
      bgColor: "bg-teal-50",
      textColor: "text-teal-600"
    }
  ];

  const steps = [
    {
      number: "01",
      icon: Rocket,
      title: "Activez votre essai",
      description: "Cliquez sur le bouton ci-dessous pour démarrer votre essai gratuit de 4 jours",
      color: "from-purple-500 to-violet-600"
    },
    {
      number: "02",
      icon: Star,
      title: "Profitez de toutes les fonctionnalités",
      description: "Créez des factures, utilisez l'IA, gérez votre CRM, et bien plus encore",
      color: "from-blue-500 to-indigo-600"
    },
    {
      number: "03",
      icon: Crown,
      title: "Votre abonnement Business continue",
      description: "Après 4 jours, votre abonnement Business continue automatiquement à 59,99€/mois",
      color: "from-emerald-500 to-teal-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 lg:py-32 px-4">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-violet-400/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [90, 0, 90],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl"
          />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-12"
          >
            {/* Badge */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold mb-8 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              Offre limitée
            </motion.div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-800 bg-clip-text text-transparent leading-tight">
              Essai Gratuit Business 4 Jours
            </h1>

            <p className="text-lg md:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Découvrez toutes les fonctionnalités Business de FacturmeWeb sans engagement.
              Après l'essai, votre abonnement Business continuera automatiquement à 59,99€/mois.
            </p>

            {/* CTA Buttons */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {isActivated ? (
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg">
                  <CheckCircle2 className="w-6 h-6" />
                  Essai activé ! Redirection...
                </div>
              ) : (
                <Button
                  onClick={handleActivateTrial}
                  disabled={isActivating}
                  className="bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white px-10 py-5 rounded-full text-lg font-bold shadow-xl shadow-purple-500/30 text-lg"
                >
                  {isActivating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-3"
                      >
                        <Loader2 className="w-5 h-5" />
                      </motion.div>
                      Redirection vers le paiement...
                    </>
                  ) : (
                    <>
                      Commencer mon essai Business
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              )}
            </motion.div>

            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Carte bancaire requise · Essai 4 jours puis abonnement Business à 59,99€/mois
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-slate-800 dark:text-slate-100">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Accédez à toutes les fonctionnalités Pro pendant votre essai
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <TiltCard className="h-full">
                  <div className="h-full bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-slate-200 dark:border-slate-700">
                    <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6 shadow-lg`}>
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-slate-800 dark:text-slate-100">
              Comment ça marche ?
            </h2>
          </motion.div>

          <div className="space-y-8 md:space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="flex flex-col md:flex-row items-start gap-6 md:gap-8"
              >
                {/* Number badge */}
                <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br shadow-xl flex items-center justify-center text-3xl md:text-4xl font-black text-white relative overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to))`,
                  '--tw-gradient-from': step.color.split(' ')[0].replace('from-', ''),
                  '--tw-gradient-to': step.color.split(' ')[1].replace('to-', '')
                } as React.CSSProperties}>
                  <div className="absolute inset-0 bg-white/10"></div>
                  <span className="relative z-10">{step.number}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${step.color} text-white shadow-md`}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="container mx-auto max-w-5xl"
        >
          <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-800 rounded-3xl md:rounded-[40px] p-8 md:p-12 lg:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-5 py-2.5 rounded-full text-sm font-semibold mb-6">
                <Star className="w-4 h-4 fill-current" />
                Satisfaction garantie
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Prêt à transformer votre facturation ?
              </h2>
              <p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto leading-relaxed">
                Rejoignez des milliers d'entrepreneurs qui font confiance à FacturmeWeb
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleActivateTrial}
                  disabled={isActivating || isActivated}
                  className="bg-white text-purple-600 hover:bg-purple-50 px-10 py-5 rounded-full text-lg font-bold shadow-xl"
                >
                  {isActivated ? 'Essai déjà activé' : 'Démarrer maintenant'}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trust badges */}
      <section className="py-12 md:py-16 px-4 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 justify-center"
            >
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Paiement sécurisé</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Crypté par Stripe</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-4 justify-center"
            >
              <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Annulation facile</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">En 1 clic, sans engagement</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 justify-center"
            >
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-2xl">
                <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Support dédié</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Assistance 7j/7</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

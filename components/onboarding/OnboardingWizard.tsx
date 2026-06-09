'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Sparkles, FileText, Users, Zap, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  action?: () => void;
  skip?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue sur Factu.me !',
    description: 'Découvrez comment créer vos premières factures en quelques minutes.',
    icon: Sparkles,
  },
  {
    id: 'first-invoice',
    title: 'Créez votre première facture',
    description: 'Commencez par créer une facture pour découvrir toutes les fonctionnalités.',
    icon: FileText,
    skip: true,
  },
  {
    id: 'add-client',
    title: 'Ajoutez vos clients',
    description: 'Importez ou créez vos clients pour faciliter la création de factures.',
    icon: Users,
    skip: true,
  },
  {
    id: 'explore',
    title: 'Explorez les fonctionnalités',
    description: 'Découvrez les devis, relances automatiques, et bien plus encore.',
    icon: Zap,
    skip: true,
  },
  {
    id: 'upgrade',
    title: 'Passez au niveau supérieur',
    description: 'Débloquez des fonctionnalités avancées avec les plans Solo et Pro.',
    icon: Crown,
    skip: true,
  },
];

export function OnboardingWizard() {
  const router = useRouter();
  const { profile, completeOnboarding } = useAuthStore();
  const { clients, invoices } = useDataStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // ARBITER FIX: OnboardingWizard ne s'affiche qu'APRÈS que l'utilisateur
    // a complété le formulaire d'entreprise (onboarding_done === true en BDD).
    // Avant, il apparaissait sur la page d'onboarding elle-même, bloquant le flux.
    const hasSeenOnboarding = localStorage.getItem('onboarding_completed') === 'true';

    // Condition stricte : profil chargé + onboarding validé en BDD + pas déjà vu
    if (profile && profile.onboarding_done === true && !hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, [profile]);

  const handleNext = () => {
    const step = ONBOARDING_STEPS[currentStep];

    if (step.action) {
      step.action();
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    completeOnboarding();
    setIsOpen(false);
  };

  if (!isOpen || !profile) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
        >
          {/* Header */}
          <div className="relative">
            {/* Progress bar */}
            <div className="h-1 bg-gray-100 dark:bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary-dark"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>

            {/* Content */}
            <div className="p-8 pt-12">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
                  <Icon size={32} className="text-white" />
                </div>

                {/* Title & Description */}
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  {step.description}
                </p>

                {/* Step-specific content */}
                {step.id === 'first-invoice' && (
                  <div className="bg-primary/5 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Vos factures
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {invoices.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        router.push('/invoices/new');
                        handleNext();
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all"
                    >
                      Créer une facture
                    </button>
                  </div>
                )}

                {step.id === 'add-client' && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Vos clients
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {clients.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        router.push('/clients');
                        handleNext();
                      }}
                      className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
                    >
                      Gérer les clients
                    </button>
                  </div>
                )}

                {step.id === 'upgrade' && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Crown className="w-8 h-8 text-amber-500" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Débloquez tout le potentiel
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Factures illimitées, relances automatiques, IA...
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        router.push('/paywall');
                        handleNext();
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:shadow-lg transition-all"
                    >
                      Découvrir les offres
                    </button>
                  </div>
                )}
              </motion.div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                  Précédent
                </button>

                <div className="flex items-center gap-2">
                  {ONBOARDING_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep
                          ? 'bg-primary'
                          : index < currentStep
                          ? 'bg-primary/30'
                          : 'bg-gray-200 dark:bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                {currentStep < ONBOARDING_STEPS.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all"
                  >
                    Suivant
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all"
                  >
                    <Check size={18} />
                    Commencer
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  CreditCard,
  Briefcase,
  RotateCcw,
  DollarSign,
  Server,
  Lock,
  ShieldAlert,
  XCircle,
  Scale,
  ArrowLeft,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  Ban
} from 'lucide-react';

export default function CGV() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Conditions Générales de Vente
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                CGV de la plateforme Factu.me
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Zap className="w-4 h-4" />
            Dernière mise à jour : mai 2026
          </div>
        </motion.div>

        {/* Acceptance Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 bg-gradient-to-r from-primary/10 to-purple-600/10 dark:from-primary/20 dark:to-purple-600/20 border-2 border-primary/20 dark:border-primary/30 rounded-3xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Acceptation des CGV
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                En souscrivant à un abonnement sur Factu.me, vous reconnaissez avoir lu, compris et accepté les présentes Conditions Générales de Vente dans leur intégralité.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Section 1: Objet des CGV */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 0 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              1. Objet des CGV
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <p className="mb-3">
              Les présentes <strong className="text-primary">Conditions Générales de Vente (CGV)</strong> régissent les modalités de vente des abonnements et services proposés par Factu.me, plateforme de facturation et de gestion d'entreprise assistée par intelligence artificielle.
            </p>
            <p className="mb-3">
              Toute commande ou souscription à un abonnement implique l'acceptation pleine et entière des présentes CGV, sans réserve.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Factu.me se réserve le droit de modifier les présentes CGV à tout moment. Les CGV applicables sont celles en vigueur au moment de la souscription.
            </p>
          </div>
        </motion.div>

        {/* Section 2: Prix et modalités de paiement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 1 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              2. Prix et modalités de paiement
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="grid gap-4">
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                  Devis en euros TTC
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  Tous les prix sont affichés en euros (EUR), toutes taxes comprises (TTC). Les prix sont susceptibles d'être modifiés à tout moment, sous réserve de notification préalable de 30 jours.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                  Paiement par Stripe
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  Paiement sécurisé par carte bancaire via Stripe, processeur de paiement certifié PCI-DSS Level 1. Le prélèvement est effectué à la date anniversaire de l'abonnement chaque mois.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                  Paiement par SumUp
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  Paiement par terminal de paiement SumUp pour les transactions en personne. Conforme aux normes PCI-DSS et sécurisé par chiffrement de bout en bout.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                  Virement bancaire
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  Paiement par virement bancaire possible pour les abonnements annuels. L'accès au service est activé après réception et validation du virement.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                  Facture
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  Une facture est générée automatiquement après chaque paiement et est accessible depuis l'espace utilisateur.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 3: Services proposés */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 2 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              3. Services proposés
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="space-y-3">
              <p className="mb-3">
                Factu.me propose des <strong className="text-primary">abonnements mensuels</strong> donnant accès à différentes fonctionnalités selon le plan souscrit :
              </p>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 dark:text-white">Facturation illimitée :</strong> Création, envoi et suivi de factures, devis et avoirs</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 dark:text-white">Intelligence artificielle :</strong> Génération et modification intelligente de documents par IA</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 dark:text-white">Gestion clients (CRM) :</strong> Base clients, historique commercial et relances automatisées</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 dark:text-white">Scan OCR :</strong> Numérisation automatique de reçus et factures fournisseurs</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 dark:text-white">Liens de paiement :</strong> Encaissement sécurisé via Stripe et SumUp</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-gray-900 dark:text-white">Export comptable :</strong> Exports conformes aux obligations fiscales françaises</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Les fonctionnalités exactes dépendent du plan souscrit. Consultez la page Tarifs pour le détail de chaque offre.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Section 4: Droit de rétractation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 3 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <RotateCcw className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              4. Droit de rétractation
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="space-y-3">
              <p className="mb-3">
                Conformément à l'<strong className="text-primary">article L.221-18 du Code de la consommation</strong>, vous disposez d'un délai de rétractation de <strong>14 jours calendaires</strong> à compter de la conclusion du contrat pour revenir sur votre décision.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-2">Modalités d'exercice</p>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Adressez votre demande par email à <a href="mailto:contact@factu.me" className="text-primary hover:underline">contact@factu.me</a></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Indiquez votre nom, l'adresse email du compte et la référence de l'abonnement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Le remboursement sera effectué dans les 14 jours suivant la réception de votre demande</span>
                  </li>
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">Exception</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats fournissant des services pleinement exécutés avant la fin du délai de rétractation, si l'exécution a commencé avec votre accord préalable exprès et renonciation explicite à votre droit de rétractation.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 5: Remboursement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 4 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              5. Remboursement
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="space-y-3">
              <p className="mb-3">En cas de demande de remboursement après la période de rétractation de 14 jours, la politique suivante s'applique :</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Abonnements mensuels</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Remboursement au <strong>prorata</strong> des jours restants sur le mois en cours. Le remboursement est calculé sur la base du prix journalier du forfait souscrit.
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Abonnements annuels</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Remboursement au <strong>prorata</strong> des mois restants sur l'année en cours, calculé sur la base du tarif mensuel équivalent.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 mt-3">
                <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Le remboursement est effectué sur le moyen de paiement utilisé lors de la souscription, dans un délai de 5 à 10 jours ouvrés.
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 6: Disponibilité du service */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 5 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
              <Server className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              6. Disponibilité du service
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="space-y-3">
              <p className="mb-3">Factu.me s'engage à fournir un service accessible et fiable.</p>
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase">SLA garanti</p>
                    <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">99,9 %</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Factu.me garantit un taux de disponibilité de <strong>99,9 %</strong> de la plateforme, hors périodes de maintenance planifiées communiquées au préalable.
                </p>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Maintenance planifiée :</strong> Communiquée au minimum 48 heures à l'avance par email et notification in-app
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Incidents :</strong> Page de statut accessible en temps réel pour suivre l'état des services
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Sauvegardes :</strong> Sauvegardes quotidiennes automatisées avec rétention de 30 jours
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 7: Propriété intellectuelle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 6 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              7. Propriété intellectuelle
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Droits de Factu.me</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  L'ensemble des éléments composant la plateforme (logiciels, designs, textes, marques, logos, bases de données, algorithmes d'IA) sont la propriété exclusive de Factu.me et sont protégés par le droit d'auteur, le droit des marques et le droit des bases de données.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Droits de l'utilisateur</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  L'utilisateur conserve la pleine propriété de toutes les données qu'il saisit et des documents qu'il crée via la plateforme. Factu.me ne revendique aucun droit de propriété sur ces contenus.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Licence d'utilisation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  L'abonnement confère à l'utilisateur une licence non-exclusive, non-transmissible et révocable d'utilisation de la plateforme pour ses besoins professionnels, dans la limite des fonctionnalités du plan souscrit.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 8: Responsabilité */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 7 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              8. Responsabilité
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="space-y-3">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase mb-2">Limitation de responsabilité</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  La responsabilité totale de Factu.me, quelle qu'en soit la cause ou le fondement, est strictement limitée au <strong>montant total des frais payés par l'utilisateur au cours des 12 derniers mois</strong> précédant la survenance du fait générateur du préjudice.
                </p>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Force majeure :</strong> Factu.me ne saurait être tenu responsable des retards ou manquements résultant d'un cas de force majeure tel que défini par l'article 1218 du Code civil
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Données utilisateur :</strong> L'utilisateur est seul responsable de la vérification de l'exactitude et de la conformité légale des documents générés via la plateforme
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Service d'IA :</strong> Les suggestions et générations fournies par l'intelligence artificielle sont fournies à titre indicatif et ne remplacent pas l'avis d'un professionnel comptable ou juridique
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 9: Résiliation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 8 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
              <XCircle className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              9. Résiliation
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-2">
                  <Ban className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="font-semibold text-green-700 dark:text-green-400">Sans frais et à tout moment</p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  L'utilisateur peut résilier son abonnement <strong>à tout moment, sans frais</strong> et sans justification.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">Fin d'abonnement :</strong> La résiliation prend effet à la fin de la période de facturation en cours. L'utilisateur conserve l'accès aux fonctionnalités payantes jusqu'à cette date
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">Rétrogradation :</strong> Le compte est automatiquement rétrogradé vers le plan gratuit à la fin de la période payée
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">Conservation des données :</strong> Les documents et données restent accessibles pendant 30 jours suivant la résiliation. Un export préalable est recommandé
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">Suppression du compte :</strong> Pour une suppression complète et définitive, l'utilisateur peut en faire la demande depuis les paramètres de son compte
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 10: Droit applicable et juridiction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * 9 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              10. Droit applicable et juridiction
            </h2>
          </div>
          <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
            <div className="space-y-3">
              <p className="mb-3">
                Les présentes CGV sont soumises au <strong className="text-primary">droit français</strong>.
              </p>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-2">En cas de litige :</p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      Tentative de résolution à l'amiable en priorité, par voie de réclamation adressée à <a href="mailto:contact@factu.me" className="text-primary hover:underline">contact@factu.me</a>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      Recours possible à un médiateur de la consommation en application des articles L.612-1 et suivants du Code de la consommation
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>
                      À défaut de résolution amiable, <strong>compétence exclusive du Tribunal de commerce de Paris</strong>
                    </span>
                  </li>
                </ul>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Les présentes CGV peuvent être traduites dans d'autres langues. En cas de contradiction entre les versions, la version française prévaudra.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-8 text-white"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Scale className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Questions sur les CGV ?</h3>
                <p className="text-white/80 text-sm">
                  Notre équipe est à votre disposition pour toute question relative aux conditions de vente
                </p>
              </div>
            </div>

            <a
              href="mailto:contact@factu.me"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              Contactez-nous
            </a>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/legal/mentions-legales" className="hover:text-primary transition-colors">
              Mentions légales
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link href="/legal/confidentialite" className="hover:text-primary transition-colors">
              Politique de confidentialité
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link href="/legal/cgu" className="hover:text-primary transition-colors">
              CGU
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Retour sur Factu.me
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

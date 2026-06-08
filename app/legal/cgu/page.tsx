'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  User,
  Briefcase,
  CreditCard,
  Scale,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Zap,
  CheckCircle,
  Sparkles,
  Shield,
  Bot,
  Gavel,
  Database
} from 'lucide-react';

export default function CGU() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Conditions Générales d'Utilisation
              </h1>
              <p className="text-zinc-400 mt-1">
                CGU de la plateforme Factu.me
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Zap className="w-4 h-4" />
            Dernière mise à jour : mai 2026
          </div>
        </motion.div>

        {/* Acceptance Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 bg-white/[0.06] backdrop-blur border border-white/[0.06] rounded-3xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">
                Acceptation des CGU
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                En créant un compte sur Factu.me, vous reconnaissez avoir lu, compris et accepté les présentes Conditions Générales d'Utilisation.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Legal Sections */}
        <div className="grid gap-6">

          {/* Section 1 — Objet des CGU */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 0 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                1. Objet des CGU
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <p className="mb-3">
                Les présentes <strong className="text-white">Conditions Générales d'Utilisation (CGU)</strong> régissent l'utilisation de la plateforme Factu.me, un service de facturation et de gestion d'entreprise en ligne propulsé par l'intelligence artificielle.
              </p>
              <p className="text-sm text-zinc-500">
                En vous inscrivant sur Factu.me, vous acceptez sans réserve les présentes CGU dans leur intégralité.
              </p>
            </div>
          </motion.div>

          {/* Section 2 — Inscription et compte utilisateur */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 1 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                2. Inscription et compte utilisateur
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <div className="grid gap-4">
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                    Conditions d'inscription
                  </p>
                  <p className="text-sm text-zinc-300">
                    L'utilisateur doit fournir des informations exactes, complètes et à jour lors de son inscription
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                    Capacité et âge
                  </p>
                  <p className="text-sm text-zinc-300">
                    Le service est réservé aux personnes physiques majeures (18 ans et plus) ou aux personnes morales
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                    Identifiants de connexion
                  </p>
                  <p className="text-sm text-zinc-300">
                    L'utilisateur est responsable de la confidentialité de ses identifiants et de toute utilisation de son compte
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                    Compte individuel
                  </p>
                  <p className="text-sm text-zinc-300">
                    Chaque compte est personnel et ne peut être partagé avec des tiers
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 3 — Services proposés */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 2 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                3. Services proposés
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <div className="grid gap-4">
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">Facturation</p>
                  <p className="text-sm text-zinc-300">Création et gestion de factures, devis, avoirs et autres documents commerciaux</p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">Intelligence Artificielle</p>
                  <p className="text-sm text-zinc-300">Génération et modification intelligente de documents par IA</p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">CRM</p>
                  <p className="text-sm text-zinc-300">Gestion de la base clients et historique commercial</p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">Scan OCR</p>
                  <p className="text-sm text-zinc-300">Numérisation automatique de reçus et factures fournisseurs</p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">Paiements</p>
                  <p className="text-sm text-zinc-300">Liens de paiement sécurisés via Stripe et SumUp</p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">Facturation électronique</p>
                  <p className="text-sm text-zinc-300">
                    Factu.me utilise l'API de superpdp.tech en tant que PDP (Plateforme de Dématérialisation Partenaire), agréée conformément à la réglementation française. Génération de factures électroniques conformes au standard Factur-X / EN 16931, compatibles Chorus Pro.
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">Export comptable</p>
                  <p className="text-sm text-zinc-300">Génération d'exports conformes aux obligations fiscales françaises</p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">Espaces collaboratifs</p>
                  <p className="text-sm text-zinc-300">Workspaces pour équipes et comptables</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 4 — Intelligence Artificielle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 3 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                4. Intelligence Artificielle
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <p className="mb-4">
                Factu.me recourt à l'intelligence artificielle pour assister l'utilisateur dans la création, la modification et l'analyse de documents commerciaux et juridiques.
              </p>
              <div className="space-y-3">
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-1">Nature de l'assistance IA</p>
                  <p className="text-sm text-zinc-300">
                    Les contenus générés par l'IA sont fournis à titre <strong>d'assistance uniquement</strong>. Ils ne constituent en aucun cas un conseil juridique, comptable ou fiscal. L'utilisateur reste seul juge de la pertinence et de l'exactitude des contenus produits.
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-1">Responsabilité de l'utilisateur</p>
                  <p className="text-sm text-zinc-300">
                    L'utilisateur s'engage à <strong>vérifier systématiquement</strong> tout contenu généré par l'IA avant de l'utiliser à des fins professionnelles, commerciales ou juridiques. Factu.me ne saurait être tenu responsable des erreurs, omissions ou inexactitudes résultant de contenus produits par l'IA.
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-1">Conformité au Règlement européen sur l'IA</p>
                  <p className="text-sm text-zinc-300">
                    Les fonctionnalités d'IA de Factu.me sont conçues dans le respect du <strong>Règlement (UE) 2024/1689 du Parlement européen et du Conseil</strong> (AI Act), dit Règlement sur l'Intelligence Artificielle. Les outils d'IA utilisés sur la plateforme sont classés comme systèmes à risque limité et ne relèvent pas des catégories à haut risque au sens de l'article 6 dudit règlement.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 5 — Documents juridiques et Contrats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 4 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Gavel className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                5. Documents juridiques et Contrats
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <div className="space-y-3">
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-1">Modèles et outils</p>
                  <p className="text-sm text-zinc-300">
                    Les modèles de contrats, lettres et documents juridiques proposés sur Factu.me sont fournis comme <strong>outils d'aide à la rédaction</strong>. Ils ne constituent en aucun cas un conseil juridique et ne remplacent pas l'accompagnement d'un professionnel du droit.
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-1">Vérification par l'utilisateur</p>
                  <p className="text-sm text-zinc-300">
                    L'utilisateur doit <strong>vérifier la conformité</strong> de chaque document avec le droit applicable à sa situation particulière. Les textes légaux et réglementaires évoluent régulièrement et il incombe à l'utilisateur de s'assurer que ses documents sont à jour.
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-1">Absence de relation juridique</p>
                  <p className="text-sm text-zinc-300">
                    Factu.me <strong>n'est pas un cabinet d'avocats</strong> et ne fournit pas de conseil juridique. Aucune relation client-avocat n'est créée par l'utilisation de la plateforme. Pour tout conseil juridique, l'utilisateur est invité à consulter un avocat ou un professionnel qualifié.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 6 — Plans, tarification et paiements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 5 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                6. Plans, tarification et paiements
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Plan gratuit :</strong> Accès sans engagement aux fonctionnalités de base
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Plans payants :</strong> Accès étendu selon le plan souscrit (voir page Tarifs)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Paiement :</strong> Prélèvement mensuel via notre prestataire de paiement Stripe (carte bancaire, SEPA) ou SumUp (carte bancaire)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Facturation électronique :</strong> Factu.me prend en charge le standard Factur-X (EN 16931), conforme aux obligations de facturation électronique en France (loi n° 2022-1156 du 16 novembre 2022 relative à la lutte contre la fraude) et à la directive européenne 2014/55/UE
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Résiliation :</strong> Possibilité de résilier à tout moment sans pénalité
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 7 — Responsabilités et obligations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 6 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                7. Responsabilités et obligations
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <div className="grid gap-4">
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                    Responsabilité de Factu.me
                  </p>
                  <p className="text-sm text-zinc-300">
                    Mise en œuvre de tous les moyens raisonnables pour assurer la disponibilité, la sécurité et la performance du service
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                    Limitations de responsabilité
                  </p>
                  <p className="text-sm text-zinc-300">
                    Factu.me ne peut être tenu responsable en cas de force majeure, panne technique, interruption de service ou perte de données
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                    Responsabilité de l'utilisateur
                  </p>
                  <p className="text-sm text-zinc-300">
                    L'utilisateur reste seul responsable du contenu de ses documents commerciaux et de leur conformité légale
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                    Utilisation conforme
                  </p>
                  <p className="text-sm text-zinc-300">
                    L'utilisateur s'engage à n'utiliser le service que dans le respect des lois et règlements en vigueur
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 8 — Propriété intellectuelle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 7 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Scale className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                8. Propriété intellectuelle
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <div className="space-y-3">
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="font-semibold text-white mb-1">Droits de Factu.me</p>
                  <p className="text-sm text-zinc-400">
                    L'ensemble des éléments composant la plateforme (logiciels, designs, textes, marques, base de données) appartient à Factu.me et est protégé par le droit d'auteur et le droit des marques.
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="font-semibold text-white mb-1">Droits de l'utilisateur</p>
                  <p className="text-sm text-zinc-400">
                    L'utilisateur conserve la pleine propriété des données qu'il saisit et des documents qu'il crée. Factu.me ne revendique aucun droit sur ces contenus.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 9 — Protection des données (RGPD) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 8 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                9. Protection des données (RGPD)
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <p className="mb-4">
                Les données personnelles sont traitées conformément à notre{' '}
                <Link href="/legal/confidentialite" className="text-white hover:underline">
                  Politique de Confidentialité
                </Link>{' '}
                et au Règlement Général sur la Protection des Données (RGPD - Règlement (UE) 2016/679), ainsi qu'à la Loi n° 2024-197 du 21 mars 2024 relative à la protection des données personnelles.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/[0.06] rounded-xl p-3 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase">Traitement</p>
                  <p className="text-sm text-zinc-300">Conforme RGPD</p>
                </div>
                <div className="bg-white/[0.06] rounded-xl p-3 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase">Localisation</p>
                  <p className="text-sm text-zinc-300">Serveurs en France</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-2">Durées de conservation des données</p>
                  <ul className="space-y-1 text-sm text-zinc-300">
                    <li><strong>Données de compte :</strong> durée de vie du compte, puis suppression sous 30 jours</li>
                    <li><strong>Factures et documents comptables :</strong> 10 ans (Art. L.123-22 du Code de commerce)</li>
                    <li><strong>Données de paiement :</strong> 13 mois à compter de la transaction (Art. L.522-18 du Code monétaire et financier)</li>
                    <li><strong>Journaux de connexion :</strong> 12 mois (Art. 6 loi n° 2004-575 du 21 juin 2004)</li>
                    <li><strong>Cookies analytiques :</strong> 13 mois maximum (recommandation CNIL)</li>
                  </ul>
                </div>

                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-2">Vos droits en matière de données personnelles</p>
                  <p className="text-sm text-zinc-300 mb-2">
                    Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :
                  </p>
                  <ul className="space-y-1 text-sm text-zinc-300">
                    <li><strong>Droit d'accès</strong> (Art. 15) : obtenir la confirmation et les détails du traitement de vos données</li>
                    <li><strong>Droit de rectification</strong> (Art. 16) : corriger des données inexactes ou incomplètes</li>
                    <li><strong>Droit à l'effacement</strong> (Art. 17) : demander la suppression de vos données dans les cas prévus par la loi</li>
                    <li><strong>Droit à la portabilité</strong> (Art. 20) : recevoir vos données dans un format structuré et courant, ou les transmettre à un autre responsable de traitement</li>
                    <li><strong>Droit d'opposition</strong> (Art. 21) : vous opposer au traitement de vos données pour des raisons légitimes</li>
                    <li><strong>Droit à la limitation</strong> (Art. 18) : demander la limitation du traitement dans certains cas</li>
                  </ul>
                </div>

                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-2">Délégué à la Protection des Données (DPO)</p>
                  <p className="text-sm text-zinc-300">
                    Pour exercer vos droits ou pour toute question relative à la protection de vos données personnelles, vous pouvez contacter notre DPO :
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                    <li><strong>Email :</strong> <a href="mailto:contact@factu.me" className="text-white hover:underline">contact@factu.me</a></li>
                    <li><strong>Objet :</strong> &quot;Demande RGPD - [votre nom]&quot;</li>
                    <li><strong>Délai de réponse :</strong> 1 mois maximum à compter de la réception de la demande (Art. 12 RGPD)</li>
                  </ul>
                </div>

                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-2">Réclamation</p>
                  <p className="text-sm text-zinc-300">
                    Vous avez le droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) si vous estimez que le traitement de vos données n'est pas conforme au RGPD :{' '}
                    <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">www.cnil.fr</a>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 10 — Conservation des données */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 9 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Database className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                10. Conservation des données
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <p className="mb-3">
                Conformément à la réglementation française, Factu.me conserve les données comptables et commerciales pour les durées légales requises.
              </p>
              <div className="space-y-3">
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="text-xs font-semibold text-white uppercase mb-1">Durée de conservation</p>
                  <p className="text-sm text-zinc-300">
                    Les factures et documents comptables sont conservés pendant une durée de <strong className="text-white">10 ans</strong> conformément à l'Article L.123-22 du Code de commerce et l'Article 1649 quater B du CGI (Code Général des Impôts).
                  </p>
                </div>
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="font-semibold text-white mb-2">Références légales</p>
                  <ul className="space-y-1 text-sm text-zinc-400">
                    <li>&bull; <strong>Article L.123-22 du Code de commerce</strong> : conservation des documents comptables pendant 10 ans</li>
                    <li>&bull; <strong>Article 1649 quater B du CGI</strong> : conservation des factures et pièces justificatives</li>
                    <li>&bull; <strong>Article 6 de la loi du 21 juin 2004</strong> : conservation des données de trafic</li>
                    <li>&bull; <strong>Loi n° 2022-1156 du 16 novembre 2022</strong> : obligations de facturation électronique</li>
                    <li>&bull; <strong>Règlement (UE) 2024/1689 (AI Act)</strong> : transparence et gouvernance des systèmes d'IA</li>
                  </ul>
                </div>
                <p className="text-xs text-zinc-500">
                  À l'issue de ces durées, les données sont supprimées définitivement de nos serveurs, sauf obligation légale contraire.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Section 11 — Résiliation et suppression */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 10 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                11. Résiliation et suppression
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Résiliation à tout moment :</strong> L'utilisateur peut supprimer son compte depuis les paramètres
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Suppression définitive :</strong> La suppression entraîne la perte définitive des données
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">
                    <strong className="text-white">Export recommandé :</strong> Un export préalable des données est recommandé avant suppression
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 12 — Droit applicable et juridiction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * 11 }}
            className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Scale className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                12. Droit applicable et juridiction
              </h2>
            </div>
            <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
              <div className="space-y-3">
                <p className="mb-2">
                  Les présentes CGU sont soumises au <strong className="text-white">droit français</strong>.
                </p>
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="font-semibold text-white mb-2">En cas de litige :</p>
                  <ul className="space-y-1 text-sm text-zinc-400">
                    <li>&bull; Tentative de résolution à l'amiable</li>
                    <li>&bull; Recours possible à un médiateur de la consommation (Art. L.612-1 du Code de la consommation)</li>
                    <li>&bull; Compétence exclusive des tribunaux de commerce de Paris</li>
                  </ul>
                </div>
                <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
                  <p className="font-semibold text-white mb-2">Textes de référence</p>
                  <ul className="space-y-1 text-sm text-zinc-400">
                    <li>&bull; <strong>Règlement (UE) 2016/679</strong> (RGPD) : protection des données personnelles</li>
                    <li>&bull; <strong>Règlement (UE) 2024/1689</strong> (AI Act) : réglementation de l'intelligence artificielle</li>
                    <li>&bull; <strong>Loi n° 2024-197 du 21 mars 2024</strong> : protection des données personnelles (adaptation nationale)</li>
                    <li>&bull; <strong>Loi n° 2022-1156 du 16 novembre 2022</strong> : lutte contre la fraude et facturation électronique</li>
                    <li>&bull; <strong>Directive (UE) 2019/770</strong> : droits des contrats pour la fourniture de contenus et services numériques</li>
                    <li>&bull; <strong>Code de commerce</strong> : obligations comptables et commerciales</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-white/[0.06] backdrop-blur border border-white/[0.06] rounded-3xl p-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Questions sur les CGU ?</h3>
                <p className="text-zinc-400 text-sm">
                  Notre équipe est à votre disposition pour toute question
                </p>
              </div>
            </div>

            <a
              href="mailto:contact@factu.me"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
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
          className="mt-12 pt-8 border-t border-white/[0.06] text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
            <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <span className="text-zinc-600">&bull;</span>
            <Link href="/legal/confidentialite" className="hover:text-white transition-colors">
              Politique de confidentialité
            </Link>
            <span className="text-zinc-600">|</span>
            <Link href="/legal/cgv" className="hover:text-white transition-colors">
              CGV
            </Link>
            <span className="text-zinc-600">|</span>
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Retour sur Factu.me
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

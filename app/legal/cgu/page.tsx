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
  const sections = [
    {
      icon: FileText,
      title: '1. Objet des CGU',
      color: 'from-blue-500 to-cyan-500',
      content: `
        <p class="mb-3">Les presentes <strong class="text-primary">Conditions Generales d'Utilisation (CGU)</strong> regissent l'utilisation de la plateforme Factu.me, un service de facturation et de gestion d'entreprise en ligne propulse par l'intelligence artificielle.</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">En vous inscrivant sur Factu.me, vous acceptez sans reserve les presentes CGU dans leur integralite.</p>
      `
    },
    {
      icon: User,
      title: '2. Inscription et compte utilisateur',
      color: 'from-purple-500 to-pink-500',
      items: [
        {
          subtitle: "Conditions d'inscription",
          description: "L'utilisateur doit fournir des informations exactes, completes et a jour lors de son inscription"
        },
        {
          subtitle: 'Capacite et age',
          description: "Le service est reserve aux personnes physiques majeures (18 ans et plus) ou aux personnes morales"
        },
        {
          subtitle: 'Identifiants de connexion',
          description: "L'utilisateur est responsable de la confidentialite de ses identifiants et de toute utilisation de son compte"
        },
        {
          subtitle: 'Compte individuel',
          description: "Chaque compte est personnel et ne peut etre partage avec des tiers"
        }
      ]
    },
    {
      icon: Briefcase,
      title: '3. Services proposes',
      color: 'from-emerald-500 to-teal-500',
      items: [
        { subtitle: 'Facturation', description: 'Creation et gestion de factures, devis, avoirs et autres documents commerciaux' },
        { subtitle: 'Intelligence Artificielle', description: 'Generation et modification intelligente de documents par IA' },
        { subtitle: 'CRM', description: 'Gestion de la base clients et historique commercial' },
        { subtitle: 'Scan OCR', description: 'Numerisation automatique de recus et factures fournisseurs' },
        { subtitle: 'Paiements', description: 'Liens de paiement securises via Stripe et SumUp' },
        { subtitle: 'Facturation electronique', description: "Factu.me utilise l'API de superpdp.tech en tant que PDP (Plateforme de Dematerialisation Partenaire), agree conformement a la reglementation francaise. Generation de factures electroniques conformes au standard Factur-X / EN 16931, compatibles Chorus Pro." },
        { subtitle: 'Export comptable', description: "Generation d'exports conformes aux obligations fiscales francaises" },
        { subtitle: 'Espaces collaboratifs', description: 'Workspaces pour equipes et comptables' }
      ]
    },
    {
      icon: Bot,
      title: '4. Intelligence Artificielle',
      color: 'from-violet-500 to-indigo-500',
      content: `
        <p class="mb-4">Factu.me recourt a l'intelligence artificielle pour assister l'utilisateur dans la creation, la modification et l'analyse de documents commerciaux et juridiques.</p>
        <div class="space-y-3">
          <div class="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
            <p class="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase mb-1">Nature de l'assistance IA</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Les contenus generes par l'IA sont fournis a titre <strong>d'assistance uniquement</strong>. Ils ne constituent en aucun cas un conseil juridique, comptable ou fiscal. L'utilisateur reste seul juge de la pertinence et de l'exactitude des contenus produits.</p>
          </div>
          <div class="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
            <p class="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase mb-1">Responsabilite de l'utilisateur</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">L'utilisateur s'engage a <strong>verifier systematiquement</strong> tout contenu genere par l'IA avant de l'utiliser a des fins professionnelles, commerciales ou juridiques. Factu.me ne saurait etre tenu responsable des erreurs, omissions ou inexactitudes resultant de contenus produits par l'IA.</p>
          </div>
          <div class="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
            <p class="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase mb-1">Conformite au Reglement europeen sur l'IA</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Les fonctionnalites d'IA de Factu.me sont concues dans le respect du <strong>Reglement (UE) 2024/1689 du Parlement europeen et du Conseil</strong> (AI Act), dit Reglement sur l'Intelligence Artificielle. Les outils d'IA utilises sur la plateforme sont classes comme systemes a risque limite et ne relevent pas des categories a haut risque au sens de l'article 6 dudit reglement.</p>
          </div>
        </div>
      `
    },
    {
      icon: Gavel,
      title: '5. Documents juridiques et Contrats',
      color: 'from-amber-500 to-orange-500',
      content: `
        <div class="space-y-3">
          <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">Modeles et outils</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Les modeles de contrats, lettres et documents juridiques proposes sur Factu.me sont fournis comme <strong>outils d'aide a la redaction</strong>. Ils ne constituent en aucun cas un conseil juridique et ne remplacent pas l'accompagnement d'un professionnel du droit.</p>
          </div>
          <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">Verification par l'utilisateur</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">L'utilisateur doit <strong>verifier la conformite</strong> de chaque document avec le droit applicable a sa situation particuliere. Les textes legaux et reglementaires evoluent regulierement et il incombe a l'utilisateur de s'assurer que ses documents sont a jour.</p>
          </div>
          <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">Absence de relation juridique</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Factu.me <strong>n'est pas un cabinet d'avocats</strong> et ne fournit pas de conseil juridique. Aucune relation client-avocat n'est creee par l'utilisation de la plateforme. Pour tout conseil juridique, l'utilisateur est invite a consulter un avocat ou un professionnel qualifie.</p>
          </div>
        </div>
      `
    },
    {
      icon: CreditCard,
      title: '6. Plans, tarification et paiements',
      color: 'from-orange-500 to-red-500',
      content: `
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Plan gratuit :</strong> Acces sans engagement aux fonctionnalites de base</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Plans payants :</strong> Acces etendu selon le plan souscrit (voir page Tarifs)</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Paiement :</strong> Prelevement mensuel via notre prestataire de paiement Stripe (carte bancaire, SEPA) ou SumUp (carte bancaire)</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Facturation electronique :</strong> Factu.me prend en charge le standard Factur-X (EN 16931), conforme aux obligations de facturation electronique en France (loi n° 2022-1156 du 16 novembre 2022 relative a la lutte contre la fraude) et a la directive europeenne 2014/55/UE</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Resiliation :</strong> Possibilite de resilier a tout moment sans penalite</span>
          </div>
        </div>
      `
    },
    {
      icon: AlertTriangle,
      title: '7. Responsabilites et obligations',
      color: 'from-indigo-500 to-violet-500',
      items: [
        {
          subtitle: 'Responsabilite de Factu.me',
          description: "Mise en oeuvre de tous les moyens raisonnables pour assurer la disponibilite, la securite et la performance du service"
        },
        {
          subtitle: 'Limitations de responsabilite',
          description: "Factu.me ne peut etre tenu responsable en cas de force majeure, panne technique, interruption de service ou perte de donnees"
        },
        {
          subtitle: "Responsabilite de l'utilisateur",
          description: "L'utilisateur reste seul responsable du contenu de ses documents commerciaux et de leur conformite legale"
        },
        {
          subtitle: 'Utilisation conforme',
          description: "L'utilisateur s'engage a n'utiliser le service que dans le respect des lois et reglements en vigueur"
        }
      ]
    },
    {
      icon: Scale,
      title: '8. Propriete intellectuelle',
      color: 'from-amber-500 to-yellow-500',
      content: `
        <div class="space-y-3">
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Droits de Factu.me</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">L'ensemble des elements composant la plateforme (logiciels, designs, textes, marques, base de donnees) appartient a Factu.me et est protege par le droit d'auteur et le droit des marques.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Droits de l'utilisateur</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">L'utilisateur conserve la pleine propriete des donnees qu'il saisit et des documents qu'il cree. Factu.me ne revendique aucun droit sur ces contenus.</p>
          </div>
        </div>
      `
    },
    {
      icon: Shield,
      title: '9. Protection des donnees (RGPD)',
      color: 'from-rose-500 to-pink-600',
      content: `
        <p class="mb-4">Les donnees personnelles sont traitees conformement a notre <a href="/legal/confidentialite" class="text-primary hover:underline">Politique de Confidentialite</a> et au Reglement General sur la Protection des Donnees (RGPD - Reglement (UE) 2016/679), ainsi qu'a la Loi n° 2024-197 du 21 mars 2024 relative a la protection des donnees personnelles.</p>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
            <p class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Traitement</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Conforme RGPD</p>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
            <p class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Localisation</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Serveurs en France</p>
          </div>
        </div>

        <div class="space-y-3">
          <div class="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
            <p class="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase mb-2">Durees de conservation des donnees</p>
            <ul class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li><strong>Donnees de compte :</strong> duree de vie du compte, puis suppression sous 30 jours</li>
              <li><strong>Factures et documents comptables :</strong> 10 ans (Art. L.123-22 du Code de commerce)</li>
              <li><strong>Donnees de paiement :</strong> 13 mois a compter de la transaction (Art. L.522-18 du Code monetaire et financier)</li>
              <li><strong>Journaux de connexion :</strong> 12 mois (Art. 6 loi n° 2004-575 du 21 juin 2004)</li>
              <li><strong>Cookies analytiques :</strong> 13 mois maximum (recommandation CNIL)</li>
            </ul>
          </div>

          <div class="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
            <p class="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase mb-2">Vos droits en matiere de donnees personnelles</p>
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">Conformement aux articles 15 a 22 du RGPD, vous disposez des droits suivants :</p>
            <ul class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li><strong>Droit d'acces</strong> (Art. 15) : obtenir la confirmation et les details du traitement de vos donnees</li>
              <li><strong>Droit de rectification</strong> (Art. 16) : corriger des donnees inexactes ou incompletes</li>
              <li><strong>Droit a l'effacement</strong> (Art. 17) : demander la suppression de vos donnees dans les cas prevus par la loi</li>
              <li><strong>Droit a la portabilite</strong> (Art. 20) : recevoir vos donnees dans un format structure et courant, ou les transmettre a un autre responsable de traitement</li>
              <li><strong>Droit d'opposition</strong> (Art. 21) : vous opposer au traitement de vos donnees pour des raisons legitimes</li>
              <li><strong>Droit a la limitation</strong> (Art. 18) : demander la limitation du traitement dans certains cas</li>
            </ul>
          </div>

          <div class="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
            <p class="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase mb-2">Délégué a la Protection des Donnees (DPO)</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Pour exercer vos droits ou pour toute question relative a la protection de vos donnees personnelles, vous pouvez contacter notre DPO :</p>
            <ul class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li><strong>Email :</strong> <a href="mailto:contact@factu.me" class="text-primary hover:underline">contact@factu.me</a></li>
              <li><strong>Objet :</strong> "Demande RGPD - [votre nom]"</li>
              <li><strong>Delai de reponse :</strong> 1 mois maximum a compter de la reception de la demande (Art. 12 RGPD)</li>
            </ul>
          </div>

          <div class="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
            <p class="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase mb-2">Reclamation</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Vous avez le droit d'introduire une reclamation aupres de la Commission Nationale de l'Informatique et des Libertes (CNIL) si vous estimez que le traitement de vos donnees n'est pas conforme au RGPD : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">www.cnil.fr</a></p>
          </div>
        </div>
      `
    },
    {
      icon: Database,
      title: '10. Conservation des donnees',
      color: 'from-teal-500 to-cyan-600',
      content: `
        <p class="mb-3">Conformement a la reglementation francaise, Factu.me conserve les donnees comptables et commerciales pour les durees legales requises.</p>
        <div class="space-y-3">
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <p class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-1">Duree de conservation</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Les factures et documents comptables sont conserves pendant une duree de <strong class="text-primary">10 ans</strong> conformement a l'Article L.123-22 du Code de commerce et l'Article 1649 quater B du CGI (Code General des Impots).</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-2">References legales</p>
            <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>&#8226; <strong>Article L.123-22 du Code de commerce</strong> : conservation des documents comptables pendant 10 ans</li>
              <li>&#8226; <strong>Article 1649 quater B du CGI</strong> : conservation des factures et pieces justificatives</li>
              <li>&#8226; <strong>Article 6 de la loi du 21 juin 2004</strong> : conservation des donnees de trafic</li>
              <li>&#8226; <strong>Loi n° 2022-1156 du 16 novembre 2022</strong> : obligations de facturation electronique</li>
              <li>&#8226; <strong>Reglement (UE) 2024/1689 (AI Act)</strong> : transparence et gouvernance des systemes d'IA</li>
            </ul>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">A l'issue de ces durees, les donnees sont supprimees definitivement de nos serveurs, sauf obligation legale contraire.</p>
        </div>
      `
    },
    {
      icon: Trash2,
      title: '11. Resiliation et suppression',
      color: 'from-cyan-500 to-blue-600',
      content: `
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Resiliation a tout moment :</strong> L'utilisateur peut supprimer son compte depuis les parametres</span>
          </div>
          <div class="flex items-start gap-3">
            <AlertTriangle class="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Suppression definitive :</strong> La suppression entraine la perte definitive des donnees</span>
          </div>
          <div class="flex items-start gap-3">
            <Sparkles class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Export recommande :</strong> Un export prealable des donnees est recommande avant suppression</span>
          </div>
        </div>
      `
    },
    {
      icon: Scale,
      title: '12. Droit applicable et juridiction',
      color: 'from-violet-500 to-purple-600',
      content: `
        <div class="space-y-3">
          <p class="mb-2">Les presentes CGU sont soumises au <strong class="text-primary">droit francais</strong>.</p>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-2">En cas de litige :</p>
            <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>&#8226; Tentative de resolution a l'amiable</li>
              <li>&#8226; Recours possible a un mediateur de la consommation (Art. L.612-1 du Code de la consommation)</li>
              <li>&#8226; Competence exclusive des tribunaux de commerce de Paris</li>
            </ul>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-2">Textes de reference</p>
            <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>&#8226; <strong>Reglement (UE) 2016/679</strong> (RGPD) : protection des donnees personnelles</li>
              <li>&#8226; <strong>Reglement (UE) 2024/1689</strong> (AI Act) : reglementation de l'intelligence artificielle</li>
              <li>&#8226; <strong>Loi n° 2024-197 du 21 mars 2024</strong> : protection des donnees personnelles (adaptation nationale)</li>
              <li>&#8226; <strong>Loi n° 2022-1156 du 16 novembre 2022</strong> : lutte contre la fraude et facturation electronique</li>
              <li>&#8226; <strong>Directive (UE) 2019/770</strong> : droits des contrats pour la fourniture de contenus et services numeriques</li>
              <li>&#8226; <strong>Code de commerce</strong> : obligations comptables et commerciales</li>
            </ul>
          </div>
        </div>
      `
    }
  ];

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
            Retour a l'accueil
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Conditions Generales d'Utilisation
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                CGU de la plateforme Factu.me
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Zap className="w-4 h-4" />
            Derniere mise a jour : mai 2026
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
                Acceptation des CGU
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                En creant un compte sur Factu.me, vous reconnaissez avoir lu, compris et accepte les presentes Conditions Generales d'Utilisation.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Legal Sections */}
        <div className="grid gap-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {section.title}
                  </h2>
                </div>

                <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
                  {section.content && (
                    <div dangerouslySetInnerHTML={{ __html: section.content }} />
                  )}

                  {section.items && (
                    <div className="grid gap-4">
                      {section.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5"
                        >
                          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                            {item.subtitle}
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

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
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Questions sur les CGU ?</h3>
                <p className="text-white/80 text-sm">
                  Notre equipe est a votre disposition pour toute question
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
              Mentions legales
            </Link>
            <span className="text-gray-300 dark:text-gray-600">&#8226;</span>
            <Link href="/legal/confidentialite" className="hover:text-primary transition-colors">
              Politique de confidentialite
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link href="/legal/cgv" className="hover:text-primary transition-colors">
              CGV
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

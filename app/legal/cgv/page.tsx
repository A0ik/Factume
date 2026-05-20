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
  const sections = [
    {
      icon: FileText,
      title: '1. Objet des CGV',
      color: 'from-blue-500 to-cyan-500',
      content: `
        <p class="mb-3">Les presentes <strong class="text-primary">Conditions Generales de Vente (CGV)</strong> regissent les modalites de vente des abonnements et services proposes par Factu.me, plateforme de facturation et de gestion d'entreprise assistee par intelligence artificielle.</p>
        <p class="mb-3">Toute commande ou souscription a un abonnement implique l'acceptation pleine et entiere des presentes CGV, sans reservation.</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Factu.me se reserve le droit de modifier les presentes CGV a tout moment. Les CGV applicables sont celles en vigueur au moment de la souscription.</p>
      `
    },
    {
      icon: CreditCard,
      title: '2. Prix et modalites de paiement',
      color: 'from-purple-500 to-pink-500',
      items: [
        {
          subtitle: 'Devis en euros TTC',
          description: 'Tous les prix sont affiches en euros (EUR), toutes taxes comprises (TTC). Les prix sont susceptibles d\'etre modifies a tout moment, sous reserve de notification previe de 30 jours.'
        },
        {
          subtitle: 'Paiement par Stripe',
          description: 'Paiement securise par carte bancaire via Stripe, processeur de paiement certifie PCI-DSS Level 1. Le prelevement est effectue a la date anniversaire de l\'abonnement chaque mois.'
        },
        {
          subtitle: 'Paiement par SumUp',
          description: 'Paiement par terminal de paiement SumUp pour les transactions en personne. Conforme aux normes PCI-DSS et securise par chiffrement de bout en bout.'
        },
        {
          subtitle: 'Virement bancaire',
          description: 'Paiement par virement bancaire possible pour les abonnements annuels. L\'acces au service est active apres reception et validation du virement.'
        },
        {
          subtitle: 'Facture',
          description: 'Une facture est generee automatiquement apres chaque paiement et est accessible depuis l\'espace utilisateur.'
        }
      ]
    },
    {
      icon: Briefcase,
      title: '3. Services proposes',
      color: 'from-emerald-500 to-teal-500',
      content: `
        <div class="space-y-3">
          <p class="mb-3">Factu.me propose des <strong class="text-primary">abonnements mensuels</strong> donnant acces a differentes fonctionnalites selon le plan souscrit :</p>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Facturation illimitee :</strong> Creation, envoi et suivi de factures, devis et avoirs</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Intelligence artificielle :</strong> Generation et modification intelligente de documents par IA</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Gestion clients (CRM) :</strong> Base clients, historique commercial et relances automatisees</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Scan OCR :</strong> Numerisation automatique de recus et factures fournisseurs</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Liens de paiement :</strong> Encaissement securise via Stripe et SumUp</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Export comptable :</strong> Exports conformes aux obligations fiscales francaises</span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-4">Les fonctionnalites exactes dependent du plan souscrit. Consultez la page Tarifs pour le detail de chaque offre.</p>
        </div>
      `
    },
    {
      icon: RotateCcw,
      title: '4. Droit de retractation',
      color: 'from-orange-500 to-red-500',
      content: `
        <div class="space-y-3">
          <p class="mb-3">Conformement a l'<strong class="text-primary">article L.221-18 du Code de la consommation</strong>, vous disposez d'un delai de retractation de <strong>14 jours calendaires</strong> a compter de la conclusion du contrat pour revenir sur votre decision.</p>
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <p class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-2">Modalites d'exercice</p>
            <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li class="flex items-start gap-2">
                <CheckCircle class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Adressez votre demande par email a <a href="mailto:contact@factu.me" class="text-primary hover:underline">contact@factu.me</a></span>
              </li>
              <li class="flex items-start gap-2">
                <CheckCircle class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Indiquez votre nom, l'adresse email du compte et la reference de l'abonnement</span>
              </li>
              <li class="flex items-start gap-2">
                <CheckCircle class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>Le remboursement sera effectue dans les 14 jours suivant la reception de votre demande</span>
              </li>
            </ul>
          </div>
          <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">Exception</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Conformement a l'article L.221-28 du Code de la consommation, le droit de retractation ne peut etre exerce pour les contrats fournissant des services pleinement executes avant la fin du delai de retractation, si l'execution a commence avec votre accord prealable exprès et renonciation explicite a votre droit de retractation.</p>
          </div>
        </div>
      `
    },
    {
      icon: DollarSign,
      title: '5. Remboursement',
      color: 'from-teal-500 to-cyan-600',
      content: `
        <div class="space-y-3">
          <p class="mb-3">En cas de demande de remboursement apres la periode de retractation de 14 jours, la politique suivante s'applique :</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <p class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Abonnements mensuels</p>
              <p class="text-sm text-gray-700 dark:text-gray-300">Remboursement au <strong>prorata</strong> des jours restants sur le mois en cours. Le remboursement est calcule sur la base du prix journalier du forfait souscrit.</p>
            </div>
            <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <p class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Abonnements annuels</p>
              <p class="text-sm text-gray-700 dark:text-gray-300">Remboursement au <strong>prorata</strong> des mois restants sur l'annee en cours, calcule sur la base du tarif mensuel equivalent.</p>
            </div>
          </div>
          <div class="flex items-start gap-3 mt-3">
            <Clock class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span class="text-sm text-gray-600 dark:text-gray-400">Le remboursement est effectue sur le moyen de paiement utilise lors de la souscription, dans un delai de 5 a 10 jours ouvrés.</span>
          </div>
        </div>
      `
    },
    {
      icon: Server,
      title: '6. Disponibilite du service',
      color: 'from-indigo-500 to-violet-500',
      content: `
        <div class="space-y-3">
          <p class="mb-3">Factu.me s'engage a fournir un service accessible et fiable.</p>
          <div class="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-xl p-5 border border-indigo-200 dark:border-indigo-800">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Server class="w-6 h-6 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase">SLA garanti</p>
                <p class="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">99,9 %</p>
              </div>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300">Factu.me garantit un taux de disponibilite de <strong>99,9 %</strong> de la plateforme, hors periodes de maintenance planifiees communiquees au prealable.</p>
          </div>
          <div class="space-y-2 mt-3">
            <div class="flex items-start gap-3">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span class="text-sm text-gray-600 dark:text-gray-400"><strong class="text-gray-900 dark:text-white">Maintenance planifiee :</strong> Communiquee au minimum 48 heures a l'avance par email et notification in-app</span>
            </div>
            <div class="flex items-start gap-3">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span class="text-sm text-gray-600 dark:text-gray-400"><strong class="text-gray-900 dark:text-white">Incidents :</strong> Page de statut accessible en temps reel pour suivre l'etat des services</span>
            </div>
            <div class="flex items-start gap-3">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span class="text-sm text-gray-600 dark:text-gray-400"><strong class="text-gray-900 dark:text-white">Sauvegardes :</strong> Sauvegardes quotidiennes automatisees avec retention de 30 jours</span>
            </div>
          </div>
        </div>
      `
    },
    {
      icon: Lock,
      title: '7. Propriete intellectuelle',
      color: 'from-amber-500 to-yellow-500',
      content: `
        <div class="space-y-3">
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Droits de Factu.me</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">L'ensemble des elements composant la plateforme (logiciels, designs, textes, marques, logos, bases de données, algorithmes d'IA) sont la propriete exclusive de Factu.me et sont proteges par le droit d'auteur, le droit des marques et le droit des bases de données.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Droits de l'utilisateur</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">L'utilisateur conserve la pleine propriete de toutes les donnees qu'il saisit et des documents qu'il cree via la plateforme. Factu.me ne revendique aucun droit de propriete sur ces contenus.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Licence d'utilisation</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">L'abonnement confere a l'utilisateur une licence non-exclusive, non-transmissible et revocable d'utilisation de la plateforme pour ses besoins professionnels, dans la limite des fonctionnalites du plan souscrit.</p>
          </div>
        </div>
      `
    },
    {
      icon: ShieldAlert,
      title: '8. Responsabilite',
      color: 'from-rose-500 to-pink-600',
      content: `
        <div class="space-y-3">
          <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <p class="text-xs font-semibold text-red-700 dark:text-red-400 uppercase mb-2">Limitation de responsabilite</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">La responsabilite totale de Factu.me, quelle qu'en soit la cause ou le fondement, est strictement limitee au <strong>montant total des frais payes par l'utilisateur au cours des 12 derniers mois</strong> precedent la survenance du fait generateur du prejudice.</p>
          </div>
          <div class="space-y-2 mt-3">
            <div class="flex items-start gap-3">
              <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span class="text-sm text-gray-600 dark:text-gray-400"><strong class="text-gray-900 dark:text-white">Force majeure :</strong> Factu.me ne saurait etre tenu responsable des retards ou manquements resultant d'un cas de force majeure tel que defini par l'article 1218 du Code civil</span>
            </div>
            <div class="flex items-start gap-3">
              <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span class="text-sm text-gray-600 dark:text-gray-400"><strong class="text-gray-900 dark:text-white">Donnees utilisateur :</strong> L'utilisateur est seul responsable de la verification de l'exactitude et de la conformite legale des documents generes via la plateforme</span>
            </div>
            <div class="flex items-start gap-3">
              <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span class="text-sm text-gray-600 dark:text-gray-400"><strong class="text-gray-900 dark:text-white">Service d'IA :</strong> Les suggestions et generations fournies par l'intelligence artificielle sont fournies a titre indicatif et ne remplacent pas l'avis d'un professionnel comptable ou juridique</span>
            </div>
          </div>
        </div>
      `
    },
    {
      icon: XCircle,
      title: '9. Resiliation',
      color: 'from-cyan-500 to-blue-600',
      content: `
        <div class="space-y-3">
          <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div class="flex items-center gap-3 mb-2">
              <Ban class="w-5 h-5 text-green-600 dark:text-green-400" />
              <p class="font-semibold text-green-700 dark:text-green-400">Sans frais et a tout moment</p>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300">L'utilisateur peut resilier son abonnement <strong>a tout moment, sans frais</strong> et sans justification.</p>
          </div>
          <div class="space-y-2">
            <div class="flex items-start gap-3">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Fin d'abonnement :</strong> La resiliation prend effet a la fin de la periode de facturation en cours. L'utilisateur conserve l'acces aux fonctionnalites payantes jusqu'a cette date</span>
            </div>
            <div class="flex items-start gap-3">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Retrogradation :</strong> Le compte est automatiquement retrograde vers le plan gratuit a la fin de la periode payee</span>
            </div>
            <div class="flex items-start gap-3">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Conservation des donnees :</strong> Les documents et donnees restent accessibles pendant 30 jours suivant la resiliation. Un export prealable est recommande</span>
            </div>
            <div class="flex items-start gap-3">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Suppression du compte :</strong> Pour une suppression complete et definitive, l'utilisateur peut en faire la demande depuis les parametres de son compte</span>
            </div>
          </div>
        </div>
      `
    },
    {
      icon: Scale,
      title: '10. Droit applicable et juridiction',
      color: 'from-violet-500 to-purple-600',
      content: `
        <div class="space-y-3">
          <p class="mb-3">Les presentes CGV sont soumises au <strong class="text-primary">droit francais</strong>.</p>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-2">En cas de litige :</p>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li class="flex items-start gap-2">
                <CheckCircle class="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Tentative de resolution a l'amiable en priorite, par voie de reclamation adressee a <a href="mailto:contact@factu.me" class="text-primary hover:underline">contact@factu.me</a></span>
              </li>
              <li class="flex items-start gap-2">
                <CheckCircle class="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Recours possible a un mediateur de la consommation en application des articles L.612-1 et suivants du Code de la consommation</span>
              </li>
              <li class="flex items-start gap-2">
                <CheckCircle class="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>A defaut de resolution amiable, <strong>competence exclusive du Tribunal de commerce de Paris</strong></span>
              </li>
            </ul>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-3">Les presentes CGV peuvent etre traduites dans d'autres langues. En cas de contradiction entre les versions, la version francaise prevalera.</p>
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
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Conditions Generales de Vente
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                CGV de la plateforme Factu.me
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
                Acceptation des CGV
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                En souscrivant a un abonnement sur Factu.me, vous reconnaissez avoir lu, compris et accepte les presentes Conditions Generales de Vente dans leur integralite.
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
                <Scale className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Questions sur les CGV ?</h3>
                <p className="text-white/80 text-sm">
                  Notre equipe est a votre disposition pour toute question relative aux conditions de vente
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
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link href="/legal/confidentialite" className="hover:text-primary transition-colors">
              Politique de confidentialite
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

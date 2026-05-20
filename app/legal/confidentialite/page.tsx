'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  Database,
  Lock,
  Clock,
  UserCheck,
  Building,
  Mail,
  ArrowLeft,
  Zap,
  AlertCircle,
  CheckCircle,
  FileText,
  Cookie,
  Globe,
  Users,
  Scale
} from 'lucide-react';

export default function Confidentialite() {
  const sections = [
    {
      icon: UserCheck,
      title: '1. Responsable du traitement',
      color: 'from-blue-500 to-cyan-500',
      content: `
        <p class="mb-3">La societe <strong class="text-primary">Factu.me</strong>, SAS au capital variable, immatriculee au RCS de Paris, est le responsable du traitement des donnees personnelles collectees sur la plateforme.</p>
        <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 mt-3">
          <p class="font-semibold text-gray-900 dark:text-white mb-2">DPO - Delegue a la Protection des Donnees</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Pour toute question relative a la protection de vos donnees personnelles, vous pouvez contacter notre Delegue a la Protection des Donnees :</p>
          <p class="text-sm mt-2"><strong>Email :</strong> <a href="mailto:contact@factu.me" class="text-primary hover:underline">contact@factu.me</a></p>
        </div>
      `
    },
    {
      icon: Database,
      title: '2. Donnees collectees',
      color: 'from-purple-500 to-pink-500',
      items: [
        {
          subtitle: 'Donnees d\'inscription',
          description: 'Nom, prenom, adresse email, mot de passe (chiffre)'
        },
        {
          subtitle: 'Donnees professionnelles',
          description: 'Nom de l\'entreprise, SIRET, adresse, secteur d\'activite'
        },
        {
          subtitle: 'Donnees d\'utilisation',
          description: 'Documents crees, clients, historique de connexion'
        },
        {
          subtitle: 'Donnees de paiement',
          description: 'Traitees directement par Stripe et SumUp (PCI-DSS compliant) - Factu.me ne stocke aucune donnee bancaire'
        }
      ]
    },
    {
      icon: Eye,
      title: '3. Finalites du traitement',
      color: 'from-emerald-500 to-teal-500',
      items: [
        { subtitle: 'Fourniture du service', description: 'Creation et gestion de documents commerciaux' },
        { subtitle: 'Support technique', description: 'Assistance et amelioration du service' },
        { subtitle: 'Conformite legale', description: 'Obligations fiscales et comptables' },
        { subtitle: 'Communication', description: 'Avec consentement prealable pour les newsletters' }
      ]
    },
    {
      icon: Lock,
      title: '4. Securite des donnees',
      color: 'from-orange-500 to-red-500',
      content: `
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">Chiffrement</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">TLS 1.3 en transit, AES-256 au repos</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">Localisation</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Serveurs heberges en France (Paris)</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">Isolement</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Row Level Security (RLS) pour chaque utilisateur</p>
            </div>
          </div>
        </div>
      `
    },
    {
      icon: Clock,
      title: '5. Duree de conservation',
      color: 'from-indigo-500 to-violet-500',
      content: `
        <div class="space-y-3">
          <p>Les donnees sont conservees pendant la duree du contrat, puis :</p>
          <ul class="space-y-2">
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Compte actif :</strong> Conservation illimitee durant la souscription</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Apres resiliation :</strong> Suppression dans un delai de 30 jours</span>
            </li>
          </ul>
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 mt-4">
            <p class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-2">Durees legales specifiques</p>
            <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
                <span><strong>10 ans</strong> pour les donnees fiscales et comptables, conformement a l'article L.123-22 du Code de commerce</span>
              </li>
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
                <span><strong>3 ans</strong> pour les donnees de clients inactifs (derniere connexion ou interaction), apres quoi elles sont anonymisees ou supprimees</span>
              </li>
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
                <span><strong>13 mois</strong> pour les cookies de mesure d'audience (consentement renouvele annuellement)</span>
              </li>
            </ul>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">A l'issue de ces durees, les donnees sont supprimees definitivement de nos serveurs, sauf obligation legale contraire.</p>
        </div>
      `
    },
    {
      icon: Shield,
      title: '6. Vos droits (RGPD)',
      color: 'from-amber-500 to-yellow-500',
      items: [
        {
          subtitle: 'Droit d\'acces (Art. 15)',
          description: 'Obtenir la confirmation du traitement de vos donnees et une copie de celles-ci, ainsi que les informations relatives aux finalites, aux categories de donnees et aux destinataires'
        },
        {
          subtitle: 'Droit de rectification (Art. 16)',
          description: 'Corriger des donnees inexactes ou incompletes. Vous pouvez modifier vos informations directement depuis votre espace utilisateur'
        },
        {
          subtitle: 'Droit a l\'effacement (Art. 17)',
          description: 'Demander la suppression de vos donnees personnelles (« droit a l\'oubli »), sous reserve des obligations legales de conservation'
        },
        {
          subtitle: 'Droit a la limitation (Art. 18)',
          description: 'Demander la limitation du traitement de vos donnees pendant la duree necessaire a la verification de l\'exactitude ou en cas de contestation'
        },
        {
          subtitle: 'Droit a la portabilite (Art. 20)',
          description: 'Exporter vos donnees dans un format structure, couramment utilise et lisible par machine (JSON, CSV). Disponible directement depuis les parametres de votre compte'
        },
        {
          subtitle: 'Droit d\'opposition (Art. 21)',
          description: 'Vous opposer au traitement de vos donnees pour des motifs legitimes, ou vous opposer a la prospection commerciale a tout moment'
        }
      ]
    },
    {
      icon: Building,
      title: '7. Sous-traitants',
      color: 'from-rose-500 to-pink-600',
      content: `
        <p class="mb-4">Factu.me fait appel aux sous-traitants suivants pour le traitement de vos donnees. Chaque sous-traitant est lie par un contrat de sous-traitance conforme a l'article 28 du RGPD :</p>
        <div class="space-y-3">
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-gray-900 dark:text-white">Supabase</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                EU
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Hebergement de la base de donnees et des fichiers. Serveurs localises a Frankfort, Allemagne. Conforme RGPD, certifie SOC 2 Type II.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-gray-900 dark:text-white">Stripe</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                EU / US
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Traitement des paiements par carte bancaire. Certifie PCI-DSS Level 1. Donnees traitees dans l'Union europeenne conformement au RGPD.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-gray-900 dark:text-white">SumUp</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                EU
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Traitement des paiements par terminal de paiement. Conforme PCI-DSS. Sie social a Londres, Royaume-Uni (adequation RGPD reconnue).</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-gray-900 dark:text-white">Vercel</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                EU
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Hebergement de l'application web. Infrastructures certifiees ISO 27001, SOC 2 Type II. Serveurs localises a Paris, France.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-gray-900 dark:text-white">Resend</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                EU
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Envoi d'emails transactionnels (factures, notifications, confirmation de compte). Donnees hebergees en Union europeenne.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-gray-900 dark:text-white">OpenRouter</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                US
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Services d'intelligence artificielle pour la generation et la modification de documents. Heberge aux Etats-Unis. Transfert encadre par des clauses contractuelles types (SCCs) conformement au RGPD.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-gray-900 dark:text-white">Google Analytics</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                US
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Mesure d'audience et analyse du trafic. Heberge aux Etats-Unis. Transfert encadre par les clauses contractuelles types et protocole Privacy Shield. Donnees anonymisees le cas echeant.</p>
          </div>
        </div>
      `
    },
    {
      icon: Cookie,
      title: '8. Cookies',
      color: 'from-teal-500 to-cyan-600',
      content: `
        <div class="space-y-3">
          <p class="mb-3">Factu.me utilise des cookies pour ameliorer votre experience de navigation et assurer le bon fonctionnement du service. Vous pouvez gerer vos preferences de cookies a tout moment depuis les parametres de votre navigateur.</p>
          <div class="space-y-3">
            <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Lock class="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                </div>
                <p class="font-semibold text-gray-900 dark:text-white">Cookies essentiels</p>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Necessaires au fonctionnement du service : session utilisateur, authentification (token JWT), preferences linguistiques et theme (sombre/clair). Ces cookies ne necessitent pas de consentement.</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Duree : session + 30 jours maximum</p>
            </div>
            <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Eye class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <p class="font-semibold text-gray-900 dark:text-white">Google Analytics</p>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Mesure d'audience et analyse comportementale (pages visitees, duree de visite, source de trafic). Donnees anonymisees via l'option IP anonymisation. Soumis a votre consentement prealable.</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Duree : 13 mois maximum (renouvellement par consentement)</p>
            </div>
            <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-white/5">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Zap class="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <p class="font-semibold text-gray-900 dark:text-white">Vercel Analytics</p>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">Analyse des performances techniques (temps de chargement, Core Web Vitals, erreurs). Aucune donnee personnelle n'est collectee, uniquement des metriques de performance agregees.</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Duree : session en cours</p>
            </div>
          </div>
        </div>
      `
    },
    {
      icon: Globe,
      title: '9. Transferts hors UE',
      color: 'from-slate-500 to-gray-600',
      content: `
        <div class="space-y-3">
          <p class="mb-3">Certains de nos sous-traitants (OpenRouter, Google Analytics) sont susceptibles de traiter des donnees en dehors de l'Union europeenne (Etats-Unis). Ces transferts sont encadres par :</p>
          <ul class="space-y-2">
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Clauses contractuelles types (SCCs)</strong> approuvees par la Commission europeenne</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Evaluations d'impact</strong> sur la protection des donnees (AIPD) lorsqu'elles sont requises</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Mesures techniques complementaires</strong> : chiffrement des donnees en transit et au repos, minimisation des donnees transferees</span>
            </li>
          </ul>
        </div>
      `
    },
    {
      icon: Scale,
      title: '10. Reclamations',
      color: 'from-violet-500 to-purple-600',
      content: `
        <div class="space-y-3">
          <p class="mb-3">Si vous estimez que le traitement de vos donnees personnelles n'est pas conforme a la reglementation, vous disposez du droit d'introduire une reclamation aupres de l'autorite de controle :</p>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-2">CNIL - Commission Nationale de l'Informatique et des Libertes</p>
            <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">www.cnil.fr</a></li>
              <li>Adresse : 3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07</li>
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
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Politique de Confidentialite
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Conformement au RGPD (Reglement UE 2016/679)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Zap className="w-4 h-4" />
            Derniere mise a jour : mai 2026
          </div>
        </motion.div>

        {/* GDPR Compliance Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 bg-gradient-to-r from-primary/10 to-purple-600/10 dark:from-primary/20 dark:to-purple-600/20 border-2 border-primary/20 dark:border-primary/30 rounded-3xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Protection de vos donnees
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Factu.me s'engage a proteger vos donnees personnelles et a respecter votre vie privee.
                Cette politique decrit comment nous collectons, utilisons, conservons et securisons vos informations,
                conformement au Reglement General sur la Protection des Donnees (RGPD) et a la loi Informatique et Libertes.
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

        {/* Exercise Rights Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-8 text-white"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Mail className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Exercez vos droits</h3>
                <p className="text-white/80 text-sm">
                  DPO : contact@factu.me - Reponse sous 30 jours maximum
                </p>
              </div>
            </div>

            <a
              href="mailto:contact@factu.me"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              <Mail className="w-5 h-5" />
              contact@factu.me
            </a>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/legal/mentions-legales" className="hover:text-primary transition-colors">
              Mentions legales
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link href="/legal/cgu" className="hover:text-primary transition-colors">
              CGU
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

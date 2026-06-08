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
      content: `
        <p class="mb-3">La société <strong class="text-white">Factu.me</strong>, SAS au capital variable, immatriculée au RCS de Paris, est le responsable du traitement des données personnelles collectées sur la plateforme.</p>
        <div class="bg-white/[0.06] rounded-xl p-4 mt-3 border border-white/[0.06]">
          <p class="font-semibold text-white mb-2">DPO - Délégué à la Protection des Données</p>
          <p class="text-sm text-zinc-400">Pour toute question relative à la protection de vos données personnelles, vous pouvez contacter notre Délégué à la Protection des Données :</p>
          <p class="text-sm mt-2 text-zinc-300"><strong>Email :</strong> <a href="mailto:contact@factu.me" class="text-white hover:underline">contact@factu.me</a></p>
        </div>
      `
    },
    {
      icon: Database,
      title: '2. Données collectées',
      items: [
        {
          subtitle: "Données d'inscription",
          description: 'Nom, prénom, adresse email, mot de passe (chiffré)'
        },
        {
          subtitle: 'Données professionnelles',
          description: "Nom de l'entreprise, SIRET, adresse, secteur d'activité"
        },
        {
          subtitle: "Données d'utilisation",
          description: 'Documents créés, clients, historique de connexion'
        },
        {
          subtitle: 'Données de paiement',
          description: "Traitées directement par Stripe et SumUp (PCI-DSS compliant) - Factu.me ne stocke aucune donnée bancaire"
        }
      ]
    },
    {
      icon: Eye,
      title: '3. Finalités du traitement',
      items: [
        { subtitle: 'Fourniture du service', description: 'Création et gestion de documents commerciaux' },
        { subtitle: 'Support technique', description: 'Assistance et amélioration du service' },
        { subtitle: 'Conformité légale', description: 'Obligations fiscales et comptables' },
        { subtitle: 'Communication', description: 'Avec consentement préalable pour les newsletters' }
      ]
    },
    {
      icon: Lock,
      title: '4. Sécurité des données',
      content: `
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-white" />
            </div>
            <div>
              <p class="font-semibold text-white">Chiffrement</p>
              <p class="text-sm text-zinc-400">TLS 1.3 en transit, AES-256 au repos</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-white" />
            </div>
            <div>
              <p class="font-semibold text-white">Localisation</p>
              <p class="text-sm text-zinc-400">Serveurs hébergés en France (Paris)</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-white" />
            </div>
            <div>
              <p class="font-semibold text-white">Isolement</p>
              <p class="text-sm text-zinc-400">Row Level Security (RLS) pour chaque utilisateur</p>
            </div>
          </div>
        </div>
      `
    },
    {
      icon: Clock,
      title: '5. Durée de conservation',
      content: `
        <div class="space-y-3">
          <p class="text-zinc-400">Les données sont conservées pendant la durée du contrat, puis :</p>
          <ul class="space-y-2">
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <span class="text-zinc-300"><strong class="text-white">Compte actif :</strong> Conservation illimitée durant la souscription</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <span class="text-zinc-300"><strong class="text-white">Après résiliation :</strong> Suppression dans un délai de 30 jours</span>
            </li>
          </ul>
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06] mt-4">
            <p class="text-xs font-semibold text-white uppercase mb-2">Durées légales spécifiques</p>
            <ul class="space-y-2 text-sm text-zinc-300">
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 mt-2"></div>
                <span><strong>10 ans</strong> pour les données fiscales et comptables, conformément à l'article L.123-22 du Code de commerce</span>
              </li>
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 mt-2"></div>
                <span><strong>3 ans</strong> pour les données de clients inactifs (dernière connexion ou interaction), après quoi elles sont anonymisées ou supprimées</span>
              </li>
              <li class="flex items-start gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 mt-2"></div>
                <span><strong>13 mois</strong> pour les cookies de mesure d'audience (consentement renouvelé annuellement)</span>
              </li>
            </ul>
          </div>
          <p class="text-xs text-zinc-500 mt-2">À l'issue de ces durées, les données sont supprimées définitivement de nos serveurs, sauf obligation légale contraire.</p>
        </div>
      `
    },
    {
      icon: Shield,
      title: '6. Vos droits (RGPD)',
      items: [
        {
          subtitle: "Droit d'accès (Art. 15)",
          description: "Obtenir la confirmation du traitement de vos données et une copie de celles-ci, ainsi que les informations relatives aux finalités, aux catégories de données et aux destinataires"
        },
        {
          subtitle: 'Droit de rectification (Art. 16)',
          description: "Corriger des données inexactes ou incomplètes. Vous pouvez modifier vos informations directement depuis votre espace utilisateur"
        },
        {
          subtitle: "Droit à l'effacement (Art. 17)",
          description: "Demander la suppression de vos données personnelles (« droit à l'oubli »), sous réserve des obligations légales de conservation"
        },
        {
          subtitle: 'Droit à la limitation (Art. 18)',
          description: "Demander la limitation du traitement de vos données pendant la durée nécessaire à la vérification de l'exactitude ou en cas de contestation"
        },
        {
          subtitle: 'Droit à la portabilité (Art. 20)',
          description: "Exporter vos données dans un format structuré, couramment utilisé et lisible par machine (JSON, CSV). Disponible directement depuis les paramètres de votre compte"
        },
        {
          subtitle: "Droit d'opposition (Art. 21)",
          description: "Vous opposer au traitement de vos données pour des motifs légitimes, ou vous opposer à la prospection commerciale à tout moment"
        }
      ]
    },
    {
      icon: Building,
      title: '7. Sous-traitants',
      content: `
        <p class="mb-4 text-zinc-400">Factu.me fait appel aux sous-traitants suivants pour le traitement de vos données. Chaque sous-traitant est lié par un contrat de sous-traitance conforme à l'article 28 du RGPD :</p>
        <div class="space-y-3">
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-white">Supabase</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white">
                EU
              </span>
            </div>
            <p class="text-sm text-zinc-400">Hébergement de la base de données et des fichiers. Serveurs localisés à Frankfort, Allemagne. Conforme RGPD, certifié SOC 2 Type II.</p>
          </div>
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-white">Stripe</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white">
                EU / US
              </span>
            </div>
            <p class="text-sm text-zinc-400">Traitement des paiements par carte bancaire. Certifié PCI-DSS Level 1. Données traitées dans l'Union européenne conformément au RGPD.</p>
          </div>
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-white">SumUp</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white">
                EU
              </span>
            </div>
            <p class="text-sm text-zinc-400">Traitement des paiements par terminal de paiement. Conforme PCI-DSS. Siège social à Londres, Royaume-Uni (adéquation RGPD reconnue).</p>
          </div>
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-white">Vercel</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white">
                EU
              </span>
            </div>
            <p class="text-sm text-zinc-400">Hébergement de l'application web. Infrastructures certifiées ISO 27001, SOC 2 Type II. Serveurs localisés à Paris, France.</p>
          </div>
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-white">Resend</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white">
                EU
              </span>
            </div>
            <p class="text-sm text-zinc-400">Envoi d'emails transactionnels (factures, notifications, confirmation de compte). Données hébergées en Union européenne.</p>
          </div>
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-white">OpenRouter</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                US
              </span>
            </div>
            <p class="text-sm text-zinc-400">Services d'intelligence artificielle pour la génération et la modification de documents. Hébergé aux États-Unis. Transfert encadré par des clauses contractuelles types (SCCs) conformément au RGPD.</p>
          </div>
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
            <div class="flex items-center justify-between mb-1">
              <p class="font-semibold text-white">Google Analytics</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                US
              </span>
            </div>
            <p class="text-sm text-zinc-400">Mesure d'audience et analyse du trafic. Hébergé aux États-Unis. Transfert encadré par les clauses contractuelles types et protocole Privacy Shield. Données anonymisées le cas échéant.</p>
          </div>
        </div>
      `
    },
    {
      icon: Cookie,
      title: '8. Cookies',
      content: `
        <div class="space-y-3">
          <p class="mb-3 text-zinc-400">Factu.me utilise des cookies pour améliorer votre expérience de navigation et assurer le bon fonctionnement du service. Vous pouvez gérer vos préférences de cookies à tout moment depuis les paramètres de votre navigateur.</p>
          <div class="space-y-3">
            <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                  <Lock class="w-3.5 h-3.5 text-white" />
                </div>
                <p class="font-semibold text-white">Cookies essentiels</p>
              </div>
              <p class="text-sm text-zinc-400">Nécessaires au fonctionnement du service : session utilisateur, authentification (token JWT), préférences linguistiques et thème (sombre/clair). Ces cookies ne nécessitent pas de consentement.</p>
              <p class="text-xs text-zinc-500 mt-1">Durée : session + 30 jours maximum</p>
            </div>
            <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                  <Eye class="w-3.5 h-3.5 text-white" />
                </div>
                <p class="font-semibold text-white">Google Analytics</p>
              </div>
              <p class="text-sm text-zinc-400">Mesure d'audience et analyse comportementale (pages visitées, durée de visite, source de trafic). Données anonymisées via l'option IP anonymisation. Soumis à votre consentement préalable.</p>
              <p class="text-xs text-zinc-500 mt-1">Durée : 13 mois maximum (renouvellement par consentement)</p>
            </div>
            <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                  <Zap class="w-3.5 h-3.5 text-white" />
                </div>
                <p class="font-semibold text-white">Vercel Analytics</p>
              </div>
              <p class="text-sm text-zinc-400">Analyse des performances techniques (temps de chargement, Core Web Vitals, erreurs). Aucune donnée personnelle n'est collectée, uniquement des métriques de performance agrégées.</p>
              <p class="text-xs text-zinc-500 mt-1">Durée : session en cours</p>
            </div>
          </div>
        </div>
      `
    },
    {
      icon: Globe,
      title: '9. Transferts hors UE',
      content: `
        <div class="space-y-3">
          <p class="mb-3 text-zinc-400">Certains de nos sous-traitants (OpenRouter, Google Analytics) sont susceptibles de traiter des données en dehors de l'Union européenne (États-Unis). Ces transferts sont encadrés par :</p>
          <ul class="space-y-2">
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <span class="text-zinc-300"><strong class="text-white">Clauses contractuelles types (SCCs)</strong> approuvées par la Commission européenne</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <span class="text-zinc-300"><strong class="text-white">Évaluations d'impact</strong> sur la protection des données (AIPD) lorsqu'elles sont requises</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <span class="text-zinc-300"><strong class="text-white">Mesures techniques complémentaires</strong> : chiffrement des données en transit et au repos, minimisation des données transférées</span>
            </li>
          </ul>
        </div>
      `
    },
    {
      icon: Scale,
      title: '10. Réclamations',
      content: `
        <div class="space-y-3">
          <p class="mb-3 text-zinc-400">Si vous estimez que le traitement de vos données personnelles n'est pas conforme à la réglementation, vous disposez du droit d'introduire une réclamation auprès de l'autorité de contrôle :</p>
          <div class="bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]">
            <p class="font-semibold text-white mb-2">CNIL - Commission Nationale de l'Informatique et des Libertés (<a href="https://www.cnil.fr/" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">cnil.fr</a>)</p>
            <ul class="space-y-1 text-sm text-zinc-400">
              <li>Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" class="text-white hover:underline">www.cnil.fr</a></li>
              <li>Adresse : 3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07</li>
            </ul>
          </div>
        </div>
      `
    }
  ];

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
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Politique de Confidentialité
              </h1>
              <p className="text-zinc-400 mt-1">
                Conformément au RGPD (Règlement UE 2016/679)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Zap className="w-4 h-4" />
            Dernière mise à jour : mai 2026
          </div>
        </motion.div>

        {/* GDPR Compliance Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 bg-white/[0.06] backdrop-blur border border-white/[0.06] rounded-3xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">
                Protection de vos données
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Factu.me s'engage à protéger vos données personnelles et à respecter votre vie privée.
                Cette politique décrit comment nous collectons, utilisons, conservons et sécurisons vos informations,
                conformément au <a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">Règlement Général sur la Protection des Données (RGPD)</a> et à la loi Informatique et Libertés.
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
                className="bg-[#171717] border border-white/[0.06] rounded-3xl p-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {section.title}
                  </h2>
                </div>

                <div className="text-zinc-400 prose prose-sm max-w-none prose-invert">
                  {section.content && (
                    <div dangerouslySetInnerHTML={{ __html: section.content }} />
                  )}

                  {section.items && (
                    <div className="grid gap-4">
                      {section.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06]"
                        >
                          <p className="text-xs font-semibold text-white uppercase tracking-wide mb-1">
                            {item.subtitle}
                          </p>
                          <p className="text-sm text-zinc-300">
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
          className="mt-12 bg-white/[0.06] backdrop-blur border border-white/[0.06] rounded-3xl p-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Exercez vos droits</h3>
                <p className="text-zinc-400 text-sm">
                  DPO : contact@factu.me - Réponse sous 30 jours maximum
                </p>
              </div>
            </div>

            <a
              href="mailto:contact@factu.me"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
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
          className="mt-12 pt-8 border-t border-white/[0.06] text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
            <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <span className="text-zinc-600">|</span>
            <Link href="/legal/cgu" className="hover:text-white transition-colors">
              CGU
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

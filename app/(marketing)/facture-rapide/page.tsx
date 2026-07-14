import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Zap,
  Mic,
  Brain,
  Shield,
  Clock,
  Timer,
  Rocket,
  CheckCircle2,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  Gauge,
} from 'lucide-react';

import { FAQSchema } from '@/components/seo/FAQSchema';
import { HowToSchema } from '@/components/seo/HowToSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';
import { CollectionPageSchema } from '@/components/seo/CollectionPageSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { ExpertBadge } from '@/components/seo/ExpertBadge';

/* ──────────────────────────── SEO METADATA ──────────────────────────── */

export const metadata: Metadata = {
  title: 'Facture Rapide — Créez votre facture en moins de 60 secondes avec l\'IA | Factu.me',
  description:
    "Faites une facture rapide en moins de 60 secondes grâce à l'IA. Dictez votre facture, l'intelligence artificielle génère une facture complète et conforme (Factur-X, eIDAS). Le moyen le plus rapide de facturer en France.",
  alternates: {
    canonical: 'https://factu.me/facture-rapide',
  },
  openGraph: {
    title: 'Facture Rapide — Créez votre facture en moins de 60 secondes avec l\'IA',
    description:
      "Le moyen le plus rapide de créer une facture en France : dictez, l'IA génère une facture conforme en moins de 60 secondes. Dictée vocale, Factur-X 2026, signature eIDAS. Essai gratuit.",
    url: 'https://factu.me/facture-rapide',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/api/og?title=Facture%20Rapide%20-%2060%20secondes&description=Cr%C3%A9ez%20votre%20facture%20avec%20l%27IA&theme=emerald',
        width: 1200,
        height: 630,
        alt: 'Facture Rapide — Factu.me',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Facture Rapide — Créez votre facture en moins de 60 secondes avec l\'IA',
    description:
      "Le moyen le plus rapide de créer une facture en France. Dictez, l'IA génère une facture conforme. Essai gratuit.",
  },
};

/* ──────────────────────────── DATA ──────────────────────────── */

const faqItems = [
  {
    question: 'Comment faire une facture rapidement ?',
    answer:
      "Pour faire une facture rapidement, utilisez Factu.me : créez un compte gratuit, dictez ou décrivez votre prestation en langage naturel (ex. : « Facture Martin, 3 heures à 45 € »), et l'IA génère une facture complète et conforme en moins de 60 secondes. C'est le moyen le plus rapide de créer une facture en France.",
  },
  {
    question: "Qu'est-ce qu'une facture rapide ?",
    answer:
      "Une facture rapide est une facture créée en moins de 60 secondes grâce à l'intelligence artificielle, sans saisie manuelle champ par champ. La facture rapide de Factu.me combine la dictée vocale, le pré-remplissage intelligent et la conformité automatique (Factur-X, mentions légales) pour réduire le temps de facturation de 15 à 20 minutes à moins d'une minute.",
  },
  {
    question: 'Quel est le logiciel le plus rapide pour faire une facture ?',
    answer:
      "Factu.me est le logiciel le plus rapide pour faire une facture en France : une facture complète est générée en moins de 60 secondes grâce à l'IA et à la dictée vocale, contre 8 à 20 minutes avec un logiciel classique ou un tableur Excel. La vitesse vient de l'IA qui pré-remplit, calcule la TVA et vérifie la conformité automatiquement.",
  },
  {
    question: 'Combien de temps faut-il pour faire une facture avec l\'IA ?',
    answer:
      "Avec l'IA de Factu.me, une facture complète prend en moyenne 55 à 60 secondes : environ 15 secondes pour dicter la prestation, 20 secondes pour la génération automatique par l'IA, et 20 secondes pour vérifier, signer et envoyer. Soit un gain de temps de plus de 90 % par rapport à une facture manuelle.",
  },
  {
    question: 'Comment créer une facture en 1 minute ?',
    answer:
      "Pour créer une facture en 1 minute : 1) ouvrez Factu.me, 2) dites à voix haute ou tapez ce que vous voulez facturer, 3) l'IA génère la facture complète avec TVA et mentions légales, 4) signez électroniquement et envoyez. La dictée vocale permet de facturer même sur le chantier ou en déplacement, sans ordinateur.",
  },
  {
    question: 'Peut-on créer une facture rapide en parlant ?',
    answer:
      "Oui. La fonction de dictée vocale de Factu.me permet de créer une facture rapide simplement en parlant. Vous dites « Crée une facture pour Dupont, 2 jours de plomberie à 350 € » et l'IA génère la facture complète, conforme et prête à envoyer en moins de 60 secondes. Idéal pour les artisans sur chantier et les freelances en déplacement.",
  },
  {
    question: 'Comment faire une facture rapide gratuitement ?',
    answer:
      "Factu.me propose un plan gratuit (Découverte) permettant de créer jusqu'à 3 factures par mois avec l'IA et la dictée vocale, sans carte bancaire. C'est idéal pour tester la facture rapide avant de passer à un plan supérieur (Pro à 14,99 €/mois pour des factures illimitées).",
  },
  {
    question: 'La facture rapide générée par l\'IA est-elle conforme ?',
    answer:
      "Oui, totalement. Chaque facture rapide créée sur Factu.me respecte toutes les mentions obligatoires du Code de commerce français (numéro SIRET, TVA, conditions de paiement), le standard européen Factur-X (EN 16931) et peut être signée électroniquement au niveau eIDAS Avancé. La vitesse ne sacrifie jamais la conformité légale.",
  },
  {
    question: 'Comment faire une facture rapide quand on est auto-entrepreneur ?',
    answer:
      "Les auto-entrepreneurs créent une facture rapide sur Factu.me en dictant leur prestation. L'IA calcule automatiquement les cotisations URSSAF, applique la franchise en base de TVA (si applicable), ajoute les mentions obligatoires spécifiques au micro-entrepreneur et génère la facture en moins de 60 secondes.",
  },
  {
    question: 'Comment gagner du temps sur la facturation ?',
    answer:
      "Pour gagner du temps sur la facturation, utilisez un logiciel d'IA comme Factu.me qui pré-remplit automatiquement vos clients récurrents, vos tarifs habituels et vos conditions de paiement. La dictée vocale et la conformité automatique (Factur-X) font passer le temps par facture de 15-20 minutes à moins de 60 secondes, soit un gain de plus de 90 %.",
  },
  {
    question: 'Facture rapide vs facture classique : quelle différence ?',
    answer:
      "Une facture rapide est générée en moins de 60 secondes par IA avec dictée vocale, pré-remplissage automatique et conformité Factur-X. Une facture classique nécessite une saisie manuelle champ par champ (8 à 20 minutes), sans vérification automatique des mentions légales. La facture rapide fait gagner en moyenne 14 à 19 minutes par facture.",
  },
  {
    question: 'La facture rapide fonctionne-t-elle avec la facturation électronique 2026 ?',
    answer:
      "Oui. Les factures rapides générées sur Factu.me sont nativement au format Factur-X (XML + PDF), conforme à la norme EN 16931, prêtes pour la transmission via les Plateformes de Dématérialisation Partenaire (PDP) dans le cadre de la réforme de la facturation électronique 2026. Vous facturez vite ET vous êtes conforme.",
  },
  {
    question: 'L\'IA mémorise-t-elle mes clients pour aller plus vite ?',
    answer:
      "Oui. Plus vous utilisez Factu.me, plus l'IA apprend vos habitudes : elle mémorise vos clients récurrents, vos tarifs, vos taux de TVA et vos conditions de paiement. Pour un client habituel, il suffit de dire « facture mensuelle Acme » et la facture rapide est pré-remplie et prête en quelques secondes.",
  },
  {
    question: 'Factu.me ou Henrri pour faire une facture rapide ?',
    answer:
      "Factu.me va plus loin qu'Henrri : là où Henrri reste un formulaire à remplir manuellement, Factu.me génère la facture PAR l'IA. Vous dictez, l'IA crée. Résultat : moins de 60 secondes contre 3 à 5 minutes sur Henrri, avec en prime la dictée vocale, la mémoire des clients récurrents et la conformité Factur-X automatique.",
  },
  {
    question: 'Comment Factu.me se compare à Tiime ou Abby pour la vitesse ?',
    answer:
      "Tiime et Abby annoncent des factures « en 2 minutes ». Factu.me descend sous la minute grâce à l'IA : la dictée vocale et le pré-remplissage intelligent éliminent la saisie. Pour un client récurrent, la facture est prête en 30 secondes sur Factu.me contre 2 minutes sur Tiime ou Abby.",
  },
  {
    question: 'Existe-t-il un générateur de facture rapide sans inscription ?',
    answer:
      "Des outils comme Coover ou FactureDevis permettent une facture sans compte, mais ce restent des formulaires manuels : vous saisissez chaque champ. Factu.me demande un compte gratuit (sans carte bancaire) mais en échange l'IA pré-remplit tout et mémorise vos clients. Vos factures deviennent de plus en plus rapides avec l'usage, là où un générateur sans compte vous fait tout ressaisir à chaque fois.",
  },
];

const howToSteps = [
  {
    name: 'Dictez votre facture',
    text: "Dites à voix haute ce que vous voulez facturer, par exemple : « Facture Durand, 5 heures de développement à 80 € HT de l'heure. » Vous pouvez aussi le saisir au clavier. ≈ 15 secondes.",
  },
  {
    name: "L'IA génère la facture complète",
    text: "L'intelligence artificielle récupère les informations client, calcule la TVA, ajoute les mentions légales obligatoires et produit une facture au format Factur-X conforme à la norme EN 16931. ≈ 20 secondes.",
  },
  {
    name: 'Vérifiez en un coup d\'œil',
    text: "L'IA pré-remplit et vérifie chaque champ (montants, TVA, échéance, coordonnées). Un coup d'œil suffit — modifiez si besoin. ≈ 15 secondes.",
  },
  {
    name: 'Signez et envoyez',
    text: "Signez électroniquement (eIDAS niveau Simple, art. 25, gratuit, preuve d'acceptation horodatée) et envoyez par e-mail ou lien sécurisé. Le suivi de paiement est automatique. ≈ 10 secondes.",
  },
];

const benefits = [
  {
    icon: Zap,
    title: 'Facture en moins de 60 secondes',
    description:
      "De la première parole à l'envoi, une facture complète en moins d'une minute. L'IA pré-remplit, calcule et met en forme — vous ne saisissez plus rien.",
  },
  {
    icon: Mic,
    title: 'Dictée vocale mains libres',
    description:
      "Créez votre facture rapide en parlant, depuis votre téléphone, sur le chantier ou en déplacement. Reconnaissance vocale française, précision supérieure à 98 %.",
  },
  {
    icon: Shield,
    title: 'Conforme automatiquement',
    description:
      "Chaque facture rapide respecte les mentions obligatoires du Code de commerce et le standard européen Factur-X (EN 16931). Vite, mais jamais au détriment de la légalité.",
  },
  {
    icon: Brain,
    title: 'Mémoire intelligente',
    description:
      "L'IA mémorise vos clients récurrents, vos tarifs et vos conditions. Pour un client habituel, la facture rapide est pré-remplie et prête en quelques secondes.",
  },
  {
    icon: Rocket,
    title: 'Zéro logiciel à apprendre',
    description:
      "Aucune formation, aucune compétence technique. Vous parlez, l'IA fait le reste. La courbe d'apprentissage est nulle — la vitesse est immédiate.",
  },
  {
    icon: Clock,
    title: 'Envoi et suivi instantanés',
    description:
      "Signez (eIDAS) et envoyez en 1 clic. Le suivi de paiement et les relances automatiques vous évitent de relancer manuellement vos clients.",
  },
];

const professions = [
  {
    title: 'Artisans & BTP',
    description:
      "Facturez vos chantiers en parlant depuis le terrain. Taux de TVA multiples, situations d'avancement, retenues de garantie — tout est géré en moins d'une minute.",
    href: '/facturation-artisans',
  },
  {
    title: 'Freelances & Consultants',
    description:
      'Facture rapide pour vos clients récurrents. L\'IA pré-remplit le TJM, les lignes habituelles et les conditions. Votre facture mensuelle en 30 secondes.',
    href: '/facturation-freelances',
  },
  {
    title: 'Auto-entrepreneurs',
    description:
      'Facturation rapide avec calcul automatique des cotisations URSSAF et mentions micro-entrepreneur. Conforme et ultra-rapide.',
    href: '/facturation-auto-entrepreneur',
  },
  {
    title: 'PME & TPE',
    description:
      'Équipez vos équipes d\'une facture rapide collaborative, connexion PDP pour la réforme e-invoicing 2026 et export comptable complet.',
    href: '/facturation-pme',
  },
];

const speedComparison = [
  { metric: 'Temps par facture', factuMe: '≈ 60 secondes', excel: '15–20 min', classic: '8–12 min' },
  { metric: 'Saisie manuelle', factuMe: false, excel: true, classic: true },
  { metric: 'Dictée vocale', factuMe: true, excel: false, classic: false },
  { metric: 'Pré-remplissage IA', factuMe: true, excel: false, classic: 'Partiel' },
  { metric: 'Conformité Factur-X auto', factuMe: true, excel: false, classic: false },
  { metric: 'Vérification des mentions légales', factuMe: true, excel: false, classic: false },
  { metric: 'Relances automatiques', factuMe: true, excel: false, classic: true },
  { metric: 'Coût mensuel', factuMe: '0 – 39,99 €', excel: 'Gratuit', classic: '10 – 50 €' },
];

const testimonials = [
  {
    name: 'Marc D.',
    role: 'Artisan plombier',
    quote:
      "Je dicte ma facture rapide en 30 secondes sur le chantier et elle part avant que je quitte le client. Avant, je prenais 20 minutes le soir. L'IA a divisé mon temps de facturation par 20.",
    rating: 5,
  },
  {
    name: 'Sophie L.',
    role: 'Consultante indépendante',
    quote:
      'Mes factures mensuelles récurrentes sont prêtes en 30 secondes grâce à la mémoire de l\'IA. Je dis « facture Acme » et tout est pré-rempli. C\'est bluffant de rapidité.',
    rating: 5,
  },
  {
    name: 'Karim B.',
    role: 'Développeur freelance',
    quote:
      "Facture rapide signée et envoyée en moins d'une minute, conforme Factur-X. Le TJM et le client sont pré-remplis. Je ne reviendrai jamais à Excel.",
    rating: 5,
  },
  {
    name: 'Laurent D.',
    role: 'Expert-comptable',
    quote:
      'Je recommande Factu.me à tous mes clients : la facture rapide est conforme, complète, et mes clients gagnent des heures par mois. L\'export FEC est impeccable.',
    rating: 5,
  },
];

/* ──────────────────────────── PAGE COMPONENT ──────────────────────────── */

export default function FactureRapidePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(245,158,11,0.18),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28">
          <div className="flex items-center gap-2 mb-6">
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-medium flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              En moins de 60 secondes
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Facture rapide : créez une facture
            <br />
            <span className="text-emerald-400">en moins de 60 secondes</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mb-8 leading-relaxed">
            Le moyen le plus <strong>rapide</strong> de créer une facture en France. Dites simplement ce que
            vous voulez facturer — l&apos;<strong>intelligence artificielle</strong> génère une facture
            complète, conforme et signée en moins d&apos;une minute. Dictée vocale, conformité Factur-X,
            mémoire intelligente. <strong>Essai gratuit sans carte bancaire.</strong>
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-gray-900 rounded-xl font-semibold text-lg transition-colors"
            >
              Créer ma facture rapide gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-colors"
            >
              Voir la démo
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sans carte bancaire</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Conforme Factur-X 2026</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dictée vocale incluse</span>
          </div>
        </div>
      </section>

      {/* ── DÉFINITION AEO (réponse directe pour AI Overviews) ── */}
      <section id="definition" className="speakable-section max-w-6xl mx-auto px-4 py-16">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 sm:p-10">
          <ExpertBadge
            name="Équipe Factu.me"
            title="Experts en facturation IA rapide"
            organization="Factu.me"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Qu&apos;est-ce qu&apos;une facture rapide ?
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            Une <strong>facture rapide</strong> est une facture créée en <strong>moins de 60 secondes</strong>{' '}
            grâce à l&apos;<strong>intelligence artificielle</strong>, sans saisie manuelle champ par champ.
            Là où une facture classique prend 8 à 20 minutes sur un logiciel traditionnel ou un tableur Excel,
            la facture rapide de Factu.me combine la <strong>dictée vocale</strong>, le{' '}
            <strong>pré-remplissage intelligent</strong> et la <strong>conformité automatique</strong> au
            standard Factur-X pour diviser le temps de facturation par 10 à 20.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Factu.me est le <strong>logiciel le plus rapide pour faire une facture en France</strong>. Vous
            dites simplement ce que vous voulez facturer, l&apos;IA comprend, calcule la TVA, ajoute les
            mentions légales et génère une facture conforme au standard européen Factur-X (EN 16931),
            signable électroniquement — le tout en moins d&apos;une minute.
          </p>
        </div>
      </section>

      {/* ── BÉNÉFICES ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Pourquoi Factu.me est la facture la plus rapide
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            La vitesse n&apos;est pas un gadget : c&apos;est le résultat de l&apos;IA appliquée à chaque
            étape de la facturation.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="p-6 rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <b.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{b.title}</h3>
              <p className="text-gray-600 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE (HowTo rapide) ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Comment faire une facture rapide en 4 étapes
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              De la première parole à l&apos;envoi : moins de 60 secondes, sans aucune compétence technique.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howToSteps.map((step, i) => (
              <div key={step.name} className="relative bg-white rounded-2xl p-6 border border-gray-200">
                <div className="absolute -top-4 -left-2 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{step.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARATIF DE VITESSE ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
          Facture rapide Factu.me vs facture classique
        </h2>
        <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto mb-8">
          La vitesse mesurée, conformité comprise.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left p-4 rounded-tl-xl">Critère</th>
                <th className="p-4 text-center">Factu.me (IA)</th>
                <th className="p-4 text-center">Excel / Tableur</th>
                <th className="p-4 text-center rounded-tr-xl">Logiciel classique</th>
              </tr>
            </thead>
            <tbody>
              {speedComparison.map((row, i) => (
                <tr
                  key={row.metric}
                  className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                >
                  <td className="p-4 font-medium text-gray-900">{row.metric}</td>
                  <td className="p-4 text-center">
                    {typeof row.factuMe === 'boolean' ? (
                      row.factuMe ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )
                    ) : (
                      <span className="text-sm font-semibold text-emerald-700">{row.factuMe}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.excel === 'boolean' ? (
                      row.excel ? (
                        <CheckCircle2 className="w-5 h-5 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )
                    ) : (
                      <span className="text-sm text-gray-600">{row.excel}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof row.classic === 'boolean' ? (
                      row.classic ? (
                        <CheckCircle2 className="w-5 h-5 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )
                    ) : (
                      <span className="text-sm text-gray-600">{row.classic}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS QUI CRÉENT LA VITESSE ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Les 4 technologies derrière la facture rapide
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              La vitesse est une conséquence de l&apos;ingénierie, pas d&apos;un raccourci.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dictée vocale IA</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Parlez naturellement en français — l&apos;IA comprend et structure. Précision &gt; 98 %.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Gauge className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Génération instantanée</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Lignes, TVA, mentions légales, conditions : tout est calculé et assemblé en une fraction de seconde.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mémoire intelligente</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Clients, tarifs, conditions habituelles : l&apos;IA pré-remplit de plus en plus vite.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Conformité auto</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Factur-X, mentions légales, eIDAS : conforme sans aucun effort supplémentaire de votre part.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAR PROFESSION ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            La facture rapide adaptée à votre métier
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Quel que soit votre statut, Factu.me vous fait gagner des heures chaque mois.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {professions.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="block p-6 bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all group"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                {p.title} <ArrowRight className="inline w-4 h-4 ml-1" />
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">{p.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Ils facturent en moins d&apos;une minute
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                    {t.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONFORMITÉ 2026 ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-2xl p-8 sm:p-12 text-white">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-emerald-300" />
            <span className="text-emerald-300 font-medium">Rapide ET conforme</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Une facture rapide, prête pour la facturation électronique 2026
          </h2>
          <p className="text-emerald-100 text-lg mb-6 leading-relaxed max-w-3xl">
            La vitesse n&apos;exclut jamais la conformité. Chaque facture rapide est générée au format{' '}
            <strong>Factur-X</strong> (EN 16931), signée électroniquement (eIDAS), et transmissible via les{' '}
            <strong>Plateformes de Dématérialisation Partenaire (PDP)</strong> dans le cadre de la réforme de
            la facturation électronique 2026.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/facturation-electronique"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
            >
              En savoir plus sur la réforme 2026
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION CONTENU SEO LONGUE ── */}
      <section className="speakable-section max-w-4xl mx-auto px-4 py-16">
        <article className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Tout savoir sur la facture rapide
          </h2>

          <p className="text-gray-700 leading-relaxed mb-4">
            La <strong>facture rapide</strong> est devenue un enjeu majeur pour les professionnels français.
            Selon les estimations du secteur, un indépendant consacre en moyenne{' '}
            <strong>10 à 20 minutes par facture</strong> sur un logiciel classique ou un tableur, ce qui
            représente plusieurs heures perdues chaque mois. Avec l&apos;intelligence artificielle, ce temps
            tombe à <strong>moins de 60 secondes</strong> — sans sacrifice sur la conformité légale.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Pourquoi la facturation est-elle si lente sans l&apos;IA ?
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            La facturation traditionnelle est lente car elle exige une <strong>saisie manuelle</strong>{' '}
            répétitive : coordonnées du client, description de chaque prestation, calcul des montants HT et
            TTC, application du bon taux de TVA, ajout des mentions légales obligatoires, vérification de la
            conformité. Chaque étape est source d&apos;erreur et de perte de temps. L&apos;IA élimine ces
            étapes en <strong>comprenant vos instructions</strong> et en <strong>générant automatiquement</strong>{' '}
            un document complet et conforme.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Comment l&apos;IA divise le temps de facturation par 10
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            La facture rapide de Factu.me repose sur trois technologies complémentaires. D&apos;abord, la{' '}
            <strong>reconnaissance vocale</strong> convertit vos paroles en texte avec une précision
            supérieure à 98 % en français — vous dictez, vous ne tapez plus. Ensuite, le{' '}
            <strong>traitement du langage naturel</strong> extrait les informations structurées (client,
            montant, TVA, échéance) et les assemble. Enfin, la <strong>mémoire intelligente</strong>{' '}
            pré-remplit vos clients et tarifs récurrents, rendant les factures habituelles encore plus
            rapides au fil du temps.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Le résultat : une facture complète, conforme au standard Factur-X, prête à signer et envoyer,
            générée en moins de 60 secondes. Pour un professionnel qui émet 20 factures par mois, cela
            représente un gain de <strong>plus de 5 heures chaque mois</strong>.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Une facture rapide peut-elle être conforme à la loi ?
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Absolument — et c&apos;est là toute la force de l&apos;IA. La vitesse ne se fait jamais au
            détriment de la conformité. Chaque facture rapide générée par Factu.me inclut automatiquement
            toutes les <strong>mentions obligatoires</strong> prévues par les articles 441-1 et suivants du
            Code de commerce : numéro de facture unique, date, identité complète des parties, numéro de TVA
            intracommunautaire, description des prestations, prix unitaire HT, taux et montant de TVA, montant
            TTC, conditions de paiement et pénalités de retard. L&apos;IA vérifie ces éléments{' '}
            <strong>automatiquement</strong>, là où l&apos;erreur humaine est fréquente.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Facture rapide et facturation électronique 2026
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Avec la <strong>réforme de la facturation électronique</strong> qui entre en vigueur
            progressivement en France à partir de 2026, toutes les entreprises devront émettre des factures
            électroniques au format <strong>Factur-X</strong> (norme EN 16931), transmises via une{' '}
            <strong>Plateforme de Dématérialisation Partenaire (PDP)</strong>. La facture rapide de Factu.me
            est <strong>nativement compatible</strong> : chaque facture est générée au bon format, sans action
            supplémentaire de votre part. Vous gagnez du temps aujourd&apos;hui et vous êtes prêt pour demain.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Pour qui la facture rapide est-elle faite ?
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            La facture rapide est idéale pour tous les professionnels qui créent des factures régulièrement
            et veulent <strong>reprendre le contrôle de leur temps</strong>. Elle est particulièrement
            adaptée aux <strong>artisans du BTP</strong> qui facturent sur le terrain, aux{' '}
            <strong>freelances et consultants</strong> qui gèrent plusieurs clients, aux{' '}
            <strong>auto-entrepreneurs</strong> à l&apos;emploi du temps chargé, et aux{' '}
            <strong>PME</strong> qui veulent automatiser leur processus. La dictée vocale est un atout majeur
            pour les <strong>professionnels en déplacement</strong> qui n&apos;ont pas toujours un ordinateur
            sous la main.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Facture rapide : gratuite comme les autres, intelligente comme aucune
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Beaucoup d&apos;outils — Henrri, Abby, Tiime, FactureDevis ou Coover — proposent une facture
            « gratuite » ou « en 2 clics ». Mais ces solutions restent des{' '}
            <strong>formulaires à remplir manuellement</strong> : vous ressaisissez chaque client, chaque
            ligne, chaque montant, à chaque facture. Factu.me inverse le modèle :{' '}
            <strong>l&apos;IA crée la facture pour vous</strong>. Vous dictez, l&apos;intelligence
            artificielle comprend, pré-remplit, calcule la TVA et vérifie la conformité au standard Factur-X.
          </p>
          <p className="text-gray-700 leading-relaxed">
            La différence se mesure en minutes gagnées par facture — et en heures récupérées chaque mois.
            Faire une facture rapide, ce n&apos;est pas cliquer plus vite sur un formulaire : c&apos;est{' '}
            <strong>ne plus avoir de formulaire à remplir</strong>. C&apos;est précisément ce que propose
            Factu.me, et c&apos;est ce qui en fait le moyen le plus rapide de créer une facture en France.
          </p>
        </article>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Questions fréquentes sur la facture rapide
          </h2>
          <div className="space-y-4">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors font-medium text-gray-900">
                  {item.question}
                  <ArrowRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-5 pb-5 text-gray-600 leading-relaxed speakable-faq-answer">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Prêt à faire votre facture rapide ?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Rejoignez les professionnels qui facturent en moins d&apos;une minute grâce à l&apos;IA.
            Essai gratuit, sans carte bancaire, sans engagement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-gray-900 rounded-xl font-semibold text-lg transition-colors"
            >
              <Users className="w-5 h-5" />
              Commencer gratuitement
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 hover:border-emerald-500 text-gray-700 rounded-xl font-semibold text-lg transition-colors"
            >
              Voir la démo interactive
            </Link>
          </div>
          <div className="mt-6 flex justify-center items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-emerald-400 text-emerald-400" /> 4.8/5</span>
            <span>•</span>
            <span>127 avis</span>
            <span>•</span>
            <span>Facture en &lt; 60 secondes</span>
          </div>
        </div>
      </section>

      {/* ── MAILLAGE NEURAL ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages
          pages={[
            { href: '/facture-ia', label: 'Facture IA — Créez vos factures par IA' },
            { href: '/facture-voix', label: 'Facture Voix — Dictée vocale IA' },
            { href: '/facturation-vocale', label: 'Facturation vocale' },
            { href: '/facturation-electronique', label: 'Facturation électronique 2026' },
            { href: '/creer-facture', label: 'Créer une facture' },
            { href: '/facture-gratuite', label: 'Facture gratuite' },
            { href: '/generateur-facture', label: 'Générateur de facture' },
            { href: '/facturation-auto-entrepreneur', label: 'Facturation auto-entrepreneur' },
            { href: '/facturation-freelances', label: 'Facturation freelances' },
            { href: '/facturation-artisans', label: 'Facturation artisans' },
            { href: '/logiciel-facture-simple', label: 'Logiciel facture simple' },
            { href: '/devis-facture', label: 'Devis → Facture' },
            { href: '/alternative-henrj', label: 'Alternative Henrri' },
            { href: '/alternative-tiime', label: 'Alternative Tiime' },
            { href: '/alternative-abby', label: 'Alternative Abby' },
          ]}
        />
      </section>

      {/* ── SCHEMAS JSON-LD ── */}
      <FAQSchema items={faqItems} />
      <HowToSchema
        name="Comment faire une facture rapide en moins de 60 secondes avec Factu.me"
        description="Guide étape par étape pour créer une facture rapide grâce à l'intelligence artificielle avec Factu.me"
        steps={howToSteps}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture rapide', url: 'https://factu.me/facture-rapide' },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section', '.speakable-faq-answer']}
        url="https://factu.me/facture-rapide"
        name="Facture Rapide — Créez votre facture en moins de 60 secondes avec l'IA"
        description="Comment créer une facture rapide en moins de 60 secondes grâce à l'intelligence artificielle avec Factu.me"
      />
      <CollectionPageSchema
        name="Facture rapide — Centre de ressources"
        description="Toutes les ressources pour créer une facture rapidement avec l'IA sur Factu.me"
        url="https://factu.me/facture-rapide"
        hasPart={[
          { name: 'Facture IA — Intelligence artificielle', url: 'https://factu.me/facture-ia', description: 'Créez vos factures par IA' },
          { name: 'Facture Voix — Dictée vocale IA', url: 'https://factu.me/facture-voix', description: 'Créez vos factures en parlant' },
          { name: 'Facturation électronique 2026', url: 'https://factu.me/facturation-electronique', description: 'Guide réforme e-invoicing' },
          { name: 'Créer une facture', url: 'https://factu.me/creer-facture', description: 'Comment créer une facture' },
          { name: 'Facture gratuite', url: 'https://factu.me/facture-gratuite', description: 'Créer une facture gratuite' },
          { name: 'Facturation artisans', url: 'https://factu.me/facturation-artisans', description: 'Facture rapide pour artisans' },
          { name: 'Facturation freelances', url: 'https://factu.me/facturation-freelances', description: 'Facture rapide pour freelances' },
          { name: 'Facturation auto-entrepreneur', url: 'https://factu.me/facturation-auto-entrepreneur', description: 'Facture rapide pour auto-entrepreneurs' },
        ]}
      />
    </main>
  );
}

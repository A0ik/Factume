import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Brain,
  Mic,
  FileText,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  BarChart3,
  Globe,
  MessageSquare,
  PenTool,
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
  title: 'Facture IA — Créez vos factures par Intelligence Artificielle | Factu.me',
  description:
    'Créez vos factures avec l\'intelligence artificielle. Factu.me génère, vérifie et envoie vos factures automatiquement grâce à l\'IA. Dictée vocale, conformité Factur-X, signature eIDAS. Essai gratuit.',
  alternates: {
    canonical: 'https://factu.me/facture-ia',
  },
  openGraph: {
    title: 'Facture IA — Créez vos factures par Intelligence Artificielle',
    description:
      'Générez vos factures automatiquement grâce à l\'IA. Dictée vocale, conformité Factur-X 2026, signature eIDAS. Le futur de la facturation.',
    url: 'https://factu.me/facture-ia',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/api/og?title=Facture%20IA%20-%20Intelligence%20Artificielle&description=Cr%C3%A9ez%20vos%20factures%20par%20IA&theme=emerald',
        width: 1200,
        height: 630,
        alt: 'Facture IA — Factu.me',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Facture IA — Créez vos factures par Intelligence Artificielle',
    description:
      'Générez vos factures automatiquement grâce à l\'IA. Essai gratuit.',
  },
};

/* ──────────────────────────── DATA ──────────────────────────── */

const faqItems = [
  {
    question: "Qu'est-ce qu'une facture IA ?",
    answer:
      "Une facture IA est une facture générée automatiquement par un logiciel d'intelligence artificielle. L'IA analyse vos données clients, produits et services pour créer une facture complète, conforme aux normes légales françaises et au standard Factur-X (EN 16931), sans saisie manuelle.",
  },
  {
    question: 'Comment faire une facture avec l\'IA ?',
    answer:
      "Pour faire une facture avec l'IA sur Factu.me, créez un compte gratuit, puis dictez ou décrivez votre prestation en langage naturel (ex. : « Facture Acme, 2 jours de conseil à 500 € »). L'IA génère une facture complète et conforme en moins de 60 secondes — TVA, mentions légales et format Factur-X inclus. Aucune saisie manuelle, aucune compétence technique requise.",
  },
  {
    question: 'Comment fonctionne la facturation par intelligence artificielle ?',
    answer:
      "La facturation par IA utilise des modèles de langage (LLM) et la reconnaissance vocale pour comprendre vos instructions — par texte ou par la voix. Vous dictez « Facture Dupont, 3 heures de plomberie à 45 € de l'heure » et l'IA génère la facture complète avec TVA, mentions légales et format Factur-X.",
  },
  {
    question: 'Est-ce que la facture IA est légale en France ?',
    answer:
      'Oui. Les factures générées par IA sur Factu.me sont 100 % conformes à la législation française. Elles incluent toutes les mentions obligatoires (numéro SIRET, TVA, conditions de paiement), respectent le standard Factur-X (EN 16931) et peuvent être signées électroniquement au niveau eIDAS Avancé.',
  },
  {
    question: "Quel est le meilleur logiciel de facture IA pour les indépendants ?",
    answer:
      "Factu.me est le logiciel de facture IA le plus adapté aux indépendants et TPE françaises. Il combine dictée vocale IA, génération automatique de factures Factur-X conformes, signature eIDAS gratuite, et gestion des devis et contrats. Essai gratuit sans carte bancaire.",
  },
  {
    question: 'Combien coûte un logiciel de facture IA ?',
    answer:
      'Sur Factu.me, la facture IA est accessible dès 0 € (plan Starter, 3 factures/mois avec dictée vocale). Le plan Pro à 14,99 €/mois offre factures illimitées, URSSAF One-Click, Voice Expense et Copilot IA. Le plan Business à 39,99 €/mois ajoute Comptable Connect, 5 cabinets et multi-utilisateur.',
  },
  {
    question: 'Peut-on créer une facture IA gratuitement ?',
    answer:
      'Oui, Factu.me propose un plan gratuit (Découverte) permettant de créer jusqu\'à 3 factures par mois avec l\'IA, sans carte bancaire. C\'est idéal pour tester la facturation intelligente avant de passer à un plan supérieur.',
  },
  {
    question: 'La facture IA fonctionne-t-elle avec la facturation électronique obligatoire 2026 ?',
    answer:
      'Oui. Factu.me est entièrement compatible avec la réforme de la facturation électronique qui entre en vigueur en France. Les factures IA sont générées au format Factur-X (XML + PDF), prêtes pour la transmission via PDP (Plateforme de Dématérialisation Partenaire).',
  },
  {
    question: "Comment l'IA génère-t-elle les lignes de facture automatiquement ?",
    answer:
      "L'IA de Factu.me analyse l'historique de vos factures, vos devis acceptés et vos données clients pour pré-remplir automatiquement les lignes de facture. Elle suggère les prix, les quantités et les TVA adaptés à chaque client et à chaque type de prestation.",
  },
  {
    question: 'La facture IA est-elle adaptée aux artisans du BTP ?',
    answer:
      'Absolument. La facture IA de Factu.me est particulièrement adaptée aux artisans du BTP : elle gère les taux de TVA multiples (20 %, 10 %, 5,5 %), les situations d\'avancement, les retenues de garantie et les mentions légales spécifiques au BTP. Vous pouvez dicter vos factures directement sur le chantier.',
  },
  {
    question: "Quelle est la différence entre une facture IA et une facture classique ?",
    answer:
      "Une facture IA est générée automatiquement par intelligence artificielle, tandis qu'une facture classique nécessite une saisie manuelle. La facture IA de Factu.me se distingue par : la dictée vocale, le pré-remplissage intelligent, la conformité automatique aux normes légales, la signature électronique intégrée et le format Factur-X natif.",
  },
  {
    question: 'Peut-on dicter une facture en langage naturel ?',
    answer:
      'Oui, c\'est l\'une des fonctions clés de Factu.me. Vous dites simplement « Crée une facture pour Martin Dupont, 2 jours de consultant à 500 euros par jour, TVA 20 % » et l\'IA génère la facture complète, conforme et prête à envoyer.',
  },
  {
    question: "Est-ce que l'IA peut vérifier la conformité d'une facture ?",
    answer:
      "Oui. L'IA de Factu.me vérifie automatiquement que chaque facture respecte les mentions légales obligatoires en France (articles 441-1 et suivants du Code de commerce) : numéro unique, date, identité des parties, TVA, conditions de paiement, pénalités de retard.",
  },
  {
    question: 'Comment passer d\'un logiciel de facturation classique à une facture IA ?',
    answer:
      'La transition est simple sur Factu.me : vous importez vos données clients et votre historique de factures, l\'IA analyse vos habitudes et commence à pré-remplir vos factures immédiatement. Aucune formation technique n\'est nécessaire.',
  },
  {
    question: 'La facture IA est-elle sécurisée ?',
    answer:
      'Oui. Factu.me utilise un chiffrement de bout en bout, un hébergement conforme RGPD en Europe, et propose la signature électronique eIDAS niveau Simple (art. 25), avec preuve d\'acceptation horodatée. Vos données financières sont protégées selon les normes les plus strictes.',
  },
  {
    question: 'Pourquoi utiliser l\'IA pour la facturation plutôt qu\'un tableur Excel ?',
    answer:
      'L\'IA automatise ce que Excel ne peut pas faire : reconnaissance vocale, pré-remplissage intelligent, vérification légale automatique, signature électronique, format Factur-X, relances automatiques, et connexion PDP. Vous gagnez en moyenne 30 à 50 minutes par facture.',
  },
  {
    question: 'Facture IA : mieux vaut créer ou scanner ses factures ?',
    answer:
      "Créer ses factures par IA est plus puissant que les scanner. Les solutions qui « scannent » (comme Dext, SmartFacture AI ou certains outils de pré-comptabilité) extraient les données de factures déjà existantes — utile en réception comptable. Factu.me crée la facture à partir de rien : vous dictez votre prestation et l'IA génère une facture complète et conforme. C'est l'usage le plus direct pour un indépendant, un artisan ou une TPE qui émet ses propres factures.",
  },
  {
    question: 'Factu.me est-il un vrai logiciel de facture IA ou un simple générateur ?',
    answer:
      "Factu.me est une plateforme complète de facturation par IA, pas un simple générateur. Elle combine la dictée vocale, la génération automatique de factures Factur-X conformes (norme EN 16931), la signature eIDAS gratuite, la mémoire des clients récurrents, la connexion aux Plateformes de Dématérialisation Partenaire (PDP) pour la réforme 2026, et la gestion des devis et contrats. C'est un logiciel de facturation IA de bout en bout, conçu pour le marché français.",
  },
];

const howToSteps = [
  {
    name: 'Dictiez ou décrivez votre facture',
    text: 'Ouvrez Factu.me et dictez votre facture en langage naturel, ou décrivez-la par texte. Par exemple : « Facture pour la société Durand, 5 heures de développement web à 80 € HT de l\'heure. »',
  },
  {
    name: "L'IA génère la facture complète",
    text: "L'intelligence artificielle analyse votre demande, récupère les informations client, calcule la TVA, ajoute les mentions légales obligatoires et génère une facture au format Factur-X conforme à la norme EN 16931.",
  },
  {
    name: 'Vérifiez et validez en un clic',
    text: 'Relisez la facture pré-remplie par l\'IA. Modifiez si nécessaire. Chaque champ est vérifié automatiquement : numéro de TVA, coordonnées,montants, échéance de paiement.',
  },
  {
    name: 'Signez et envoyez',
    text: 'Signez électroniquement votre facture avec une signature eIDAS niveau Simple, art. 25 (gratuite sur Factu.me, preuve d\'acceptation horodatée). Envoyez la facture par email ou partagez un lien sécurisé. Le suivi de paiement est automatique.',
  },
];

const benefits = [
  {
    icon: Clock,
    title: '90 % de temps gagné',
    description:
      "L'IA pré-remplit, calcule et met en forme votre facture en quelques secondes. Plus besoin de copier-coller ou de vérifier manuellement chaque champ.",
  },
  {
    icon: Shield,
    title: '100 % conforme légalement',
    description:
      'Chaque facture IA respecte les mentions obligatoires du Code de commerce français et le standard européen Factur-X (EN 16931). Zéro risque de redressement.',
  },
  {
    icon: Mic,
    title: 'Dictée vocale intégrée',
    description:
      'Créez vos factures en parlant, directement depuis votre téléphone. Parfait pour les artisans sur chantier ou les freelances en déplacement.',
  },
  {
    icon: Zap,
    title: 'Envoi instantané',
    description:
      'Signez électroniquement (eIDAS) et envoyez votre facture en 1 clic. Le suivi de paiement et les relances sont automatisés.',
  },
  {
    icon: Brain,
    title: 'Apprentissage continu',
    description:
      "Plus vous utilisez Factu.me, plus l'IA comprend vos habitudes. Elle pré-remplit vos tarifs, vos clients récurrents et vos conditions de paiement habituelles.",
  },
  {
    icon: BarChart3,
    title: 'Insights financiers',
    description:
      "L'IA analyse vos flux de facturation pour vous alerter sur les retards de paiement, les clients à risque et les opportunités de trésorerie.",
  },
];

const professions = [
  {
    title: 'Artisans & BTP',
    description:
      'Facturez vos chantiers en parlant depuis le terrain. Taux de TVA multiples (20 %, 10 %, 5,5 %), situations d\'avancement, retenues de garantie — tout est géré automatiquement.',
    href: '/facturation-artisans',
  },
  {
    title: 'Freelances & Consultants',
    description:
      'Pré-remplissage de vos factures récurrentes, gestion multi-clients, export FEC comptable. Votre comptable vous remercie.',
    href: '/facturation-freelances',
  },
  {
    title: 'Auto-entrepreneurs',
    description:
      'Facturation simplifiée avec calcul automatique des cotisations URSSAF. Conforme aux spécificités du régime micro-entrepreneur.',
    href: '/facturation-auto-entrepreneur',
  },
  {
    title: 'PME & TPE',
    description:
      'Gestion multi-utilisateurs, connexion PDP pour la réforme e-invoicing 2026, CRM intégré et export comptable complet.',
    href: '/facturation-pme',
  },
  {
    title: 'Développeurs & Tech',
    description:
      'Facturation au TJM, gestion des contrats, multi-devises. L\'IA reconnaît les termes techniques et structure vos factures professionnellement.',
    href: '/facturation-developpeur',
  },
  {
    title: 'Designers & Créatifs',
    description:
      'Factures esthétiques personnalisées avec votre logo. Gestion des acomptes, cessions de droits et livrables.',
    href: '/facturation-designer',
  },
];

const features = [
  {
    icon: MessageSquare,
    title: 'Dictée vocale IA',
    description:
      'Dites simplement « Facture Martin, 3 heures à 45 € » et l\'IA fait le reste. Reconnaissance vocale en français, compréhension du langage naturel, pré-remplissage automatique.',
  },
  {
    icon: Sparkles,
    title: 'Génération automatique',
    description:
      "L'IA crée votre facture complète à partir de vos instructions : lignes, TVA, mentions légales, conditions de paiement. Plus rien à saisir manuellement.",
  },
  {
    icon: Globe,
    title: 'Format Factur-X natif',
    description:
      'Chaque facture IA est générée au format Factur-X (XML + PDF), conforme à la norme EN 16931. Prêt pour la facturation électronique obligatoire 2026.',
  },
  {
    icon: Shield,
    title: 'Signature eIDAS gratuite',
    description:
      'Signez vos factures électroniquement avec une signature eIDAS niveau Simple (art. 25), incluse dans tous les plans, avec preuve d\'acceptation horodatée. Valeur juridique renforcée (niveau Qualifié) disponible via un partenaire certifié.',
  },
  {
    icon: FileText,
    title: 'Devis → Facture en 1 clic',
    description:
      'Convertissez vos devis acceptés en factures IA automatiquement. Les données client, les prix et les conditions sont pré-remplis.',
  },
  {
    icon: PenTool,
    title: 'Contrats CDI/CDD intelligents',
    description:
      "L'IA génère vos contrats de travail conformes au droit du travail français. Modèles pré-remplis, clauses personnalisables, signature électronique intégrée.",
  },
];

const testimonials = [
  {
    name: 'Marc D.',
    role: 'Artisan plombier',
    quote:
      'La dictée vocale change tout sur les chantiers. Je dicte ma facture en 30 secondes et elle est envoyée avant même de quitter le client. L\'IA comprend même les termes techniques de la plomberie.',
    rating: 5,
  },
  {
    name: 'Laurent D.',
    role: 'Expert-comptable',
    quote:
      'Je recommande Factu.me à tous mes clients artisans et freelances. Les factures Factur-X sont impeccables, la conformité légale est automatique, et l\'export FEC me fait gagner un temps précieux.',
    rating: 5,
  },
  {
    name: 'Sophie L.',
    role: 'Consultante indépendante',
    quote:
      'Je faisais mes factures sur Excel en 20 minutes. Avec l\'IA de Factu.me, c\'est 2 minutes. Le pré-remplissage de mes clients récurrents est un gain de temps énorme.',
    rating: 5,
  },
  {
    name: 'Karim B.',
    role: 'Développeur freelance',
    quote:
      'Le TJM est pré-rempli, les clients aussi. Je dis « facture mensuelle Acme » et la facture est prête. Multi-devises, conforme, signée. C\'est le futur.',
    rating: 5,
  },
];

const comparisonData = [
  { feature: 'Génération automatique', factuMe: true, excel: false, classic: false },
  { feature: 'Dictée vocale IA', factuMe: true, excel: false, classic: false },
  { feature: 'Conformité légale auto', factuMe: true, excel: false, classic: false },
  { feature: 'Format Factur-X', factuMe: true, excel: false, classic: false },
  { feature: 'Signature eIDAS', factuMe: true, excel: false, classic: false },
  { feature: 'Relances automatiques', factuMe: true, excel: false, classic: false },
  { feature: 'Export FEC comptable', factuMe: true, excel: false, classic: false },
  { feature: 'CRM intégré', factuMe: true, excel: false, classic: false },
  { feature: 'Mode hors-ligne', factuMe: true, excel: true, classic: false },
  { feature: 'Coût mensuel', factuMe: '0 - 39,99 €', excel: 'Gratuit', classic: '10 - 50 €' },
];

/* ──────────────────────────── PAGE COMPONENT ──────────────────────────── */

export default function FactureIAPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28">
          <div className="flex items-center gap-2 mb-6">
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-medium">
              Propulsé par l&apos;Intelligence Artificielle
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Facture IA : Créez vos factures
            <br />
            <span className="text-emerald-400">par intelligence artificielle</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mb-8 leading-relaxed">
            La première solution de <strong>facturation par IA</strong> conçue pour les indépendants,
            artisans et TPE françaises. <strong>Faites une facture avec l&apos;IA</strong> en moins de
            60 secondes : dites simplement ce que vous voulez facturer, l&apos;intelligence artificielle
            fait le reste — dictée vocale, conformité Factur-X, signature eIDAS.
            <strong> Essai gratuit sans carte bancaire.</strong>
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-lg transition-colors"
            >
              Essayer la facture IA gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-colors"
            >
              Voir la démo
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sans carte bancaire</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Conforme Factur-X 2026</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Signature eIDAS gratuite</span>
          </div>
        </div>
      </section>

      {/* ── DÉFINITION AEO (Loi 3 : réponse directe pour AI Overviews) ── */}
      <section id="definition" className="speakable-section max-w-6xl mx-auto px-4 py-16">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 sm:p-10">
          <ExpertBadge
            name="Équipe Factu.me"
            title="Experts en facturation IA"
            organization="Factu.me"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Qu&apos;est-ce qu&apos;une facture IA ?
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            Une <strong>facture IA</strong> est une facture générée automatiquement par un
            logiciel d&apos;<strong>intelligence artificielle</strong>. Contrairement aux logiciels
            de facturation traditionnels qui nécessitent une saisie manuelle champ par champ,
            une facture IA comprend vos instructions en <strong>langage naturel</strong> — par
            texte ou par la voix — et crée une facture complète, conforme aux normes légales
            françaises et au standard européen <strong>Factur-X (EN 16931)</strong>.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Factu.me est le <strong>premier logiciel de facture IA</strong> conçu spécifiquement
            pour le marché français. Il combine la <strong>dictée vocale IA</strong>, la génération
            automatique de factures électroniques conformes, la signature électronique eIDAS
            et la connexion aux Plateformes de Dématérialisation Partenaire (PDP) pour la
            <strong> réforme de la facturation électronique 2026</strong>.
          </p>
        </div>
      </section>

      {/* ── BÉNÉFICES ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Pourquoi utiliser l&apos;IA pour vos factures ?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            La facture IA révolutionne la gestion administrative des indépendants et TPE.
            Découvrez les avantages concrets.
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

      {/* ── COMMENT ÇA MARCHE (HowTo) ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Comment créer une facture avec l&apos;IA ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              4 étapes simples pour passer de l&apos;idée à la facture envoyée. Aucune compétence technique requise.
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

      {/* ── FONCTIONNALITÉS DÉTAILLÉES ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Les fonctionnalités IA de Factu.me
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Un écosystème complet de facturation intelligente pour les professionnels français.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PAR PROFESSION ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              La facture IA adaptée à votre métier
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Que vous soyez artisan, freelance ou gérant de PME, l&apos;IA de Factu.me s&apos;adapte à votre activité.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
      </section>

      {/* ── COMPARAISON ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
          Facture IA vs Facturation classique
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left p-4 rounded-tl-xl">Fonctionnalité</th>
                <th className="p-4 text-center">Factu.me (IA)</th>
                <th className="p-4 text-center">Excel / Tableur</th>
                <th className="p-4 text-center rounded-tr-xl">Logiciel classique</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, i) => (
                <tr
                  key={row.feature}
                  className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                >
                  <td className="p-4 font-medium text-gray-900">{row.feature}</td>
                  <td className="p-4 text-center">
                    {typeof row.factuMe === 'boolean' ? (
                      row.factuMe ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )
                    ) : (
                      <span className="text-sm font-medium text-emerald-700">{row.factuMe}</span>
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

      {/* ── TÉMOIGNAGES ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Ils utilisent la facture IA au quotidien
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
                    {t.name.split(' ').map(n => n[0]).join('')}
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
            <span className="text-emerald-300 font-medium">Réforme e-invoicing 2026</span>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Prêt pour la facturation électronique obligatoire
          </h2>
          <p className="text-emerald-100 text-lg mb-6 leading-relaxed max-w-3xl">
            La facturation électronique devient obligatoire en France. Avec la facture IA de Factu.me,
            vous êtes déjà prêt : chaque facture est générée au format <strong>Factur-X</strong> (EN 16931),
            signée électroniquement (eIDAS), et peut être transmise via les <strong>Plateformes de
            Dématérialisation Partenaire (PDP)</strong> — sans aucune action supplémentaire de votre part.
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
            Tout savoir sur la facture par intelligence artificielle
          </h2>

          <p className="text-gray-700 leading-relaxed mb-4">
            La <strong>facture par intelligence artificielle</strong> représente une évolution majeure
            dans la gestion administrative des professionnels français. Alors que les logiciels de
            facturation traditionnels se contentent de mettre en forme les données saisies manuellement,
            la facture IA va bien plus loin : elle <strong>comprend vos instructions</strong>, les
            <strong> analyse sémantiquement</strong>, et <strong>génère un document complet et conforme</strong>{' '}
            en quelques secondes.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Comment l&apos;IA révolutionne la création de factures
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Le processus de création d&apos;une facture IA repose sur plusieurs technologies avancées.
            Premièrement, la <strong>reconnaissance vocale</strong> (speech-to-text) convertit vos
            paroles en texte avec une précision supérieure à 98 % en français. Deuxièmement, le
            <strong> traitement du langage naturel</strong> (NLP) analyse ce texte pour en extraire
            les informations structurées : nom du client, montant, taux de TVA, échéance de paiement,
            description des prestations. Troisièmement, le <strong>moteur de génération</strong> assemble
            ces données dans un document conforme aux normes légales françaises et au standard
            européen Factur-X.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            L&apos;intelligence artificielle ne se contente pas de transcrire : elle <strong>comprend
            le contexte</strong>. Si vous dites « comme d&apos;habitude » pour un client récurrent,
            l&apos;IA récupère automatiquement ses tarifs habituels, ses conditions de paiement et
            ses informations légales. Si vous facturez un artisan du BTP, elle applique les bons
            taux de TVA (20 %, 10 % ou 5,5 %) selon la nature des travaux.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Les mentions légales vérifiées automatiquement
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            En France, une facture doit contenir <strong>plusieurs mentions obligatoires</strong> sous
            peine d&apos;amende (articles 441-1 et suivants du Code de commerce). La facture IA de
            Factu.me vérifie automatiquement la présence de chacune de ces mentions : numéro de
            facture unique, date d&apos;émission, identité complète des parties (nom, adresse, SIRET),
            numéro de TVA intracommunautaire, description précise des prestations, prix unitaire HT,
            taux de TVA applicable, montant TTC, conditions de paiement et pénalités de retard.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Cette vérification automatique élimine le risque d&apos;oubli ou d&apos;erreur, un problème
            fréquent avec les factures créées manuellement. Selon les données de la DGCCRF, plus de
            <strong> 30 % des factures émises par les TPE contiennent au moins une anomalie</strong>.
            La facture IA réduit ce risque à quasiment zéro.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Facture IA et facturation électronique obligatoire 2026
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            La <strong>réforme de la facturation électronique</strong> en France, qui entre en vigueur
            progressivement à partir de septembre 2026, rend obligatoire l&apos;émission et la
            transmission de factures électroniques pour toutes les entreprises. Les factures doivent
            être au format <strong>Factur-X</strong> (norme EN 16931), transmises via une
            <strong> Plateforme de Dématérialisation Partenaire (PDP)</strong> ou le portail public
            de facturation (PPF).
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            La facture IA de Factu.me est <strong>nativement compatible</strong> avec cette réforme.
            Chaque facture générée par l&apos;IA est automatiquement au format Factur-X (fichier XML
            intégré au PDF), avec tous les champs requis par la norme EN 16931. La connexion aux
            PDP est intégrée dans les plans Pro et Business, vous n&apos;avez rien à configurer.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Pour quels professionnels la facture IA est-elle faite ?
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            La facture IA est conçue pour tous les professionnels qui créent des factures régulièrement
            et cherchent à <strong>gagner du temps</strong> tout en <strong>garantissant la conformité
            légale</strong>. Elle est particulièrement adaptée aux <strong>artisans du BTP</strong> qui
            facturent sur le terrain, aux <strong>freelances et consultants</strong> qui gèrent
            plusieurs clients simultanément, aux <strong>auto-entrepreneurs</strong> qui doivent
            maintenir une comptabilité rigoureuse malgré un emploi du temps chargé, et aux{' '}
            <strong>PME</strong> qui veulent automatiser leur processus de facturation.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            La dictée vocale est un atout majeur pour les <strong>professionnels en déplacement</strong>
            (artisans, commerciaux, consultants) qui n&apos;ont pas toujours un ordinateur sous la main.
            Sur un smartphone, dicter une facture prend 30 secondes contre 10 à 20 minutes de saisie
            manuelle. C&apos;est un gain de productivité mesurable et immédiat.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            La sécurité des données dans la facture IA
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            La sécurité est un enjeu crucial quand il s&apos;agit de données financières. Factu.me
            utilise un <strong>chiffrement de bout en bout</strong> pour toutes vos factures et données
            clients. L&apos;hébergement est situé en Europe, conforme au <strong>RGPD</strong>. La
            signature électronique utilise une signature <strong>eIDAS niveau Simple (art. 25)</strong>, qui
            garantit l&apos;authenticité et l&apos;intégrité du document signé, avec preuve d&apos;acceptation
            horodatée. Une signature à valeur juridique renforcée (niveau Qualifié) est disponible via un
            partenaire certifié. Vos données ne sont jamais partagées avec des tiers sans votre consentement explicite.
          </p>
        </article>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Questions fréquentes sur la facture IA
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
            Prêt à essayer la facture IA ?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Rejoignez les professionnels qui ont déjà adopté la facturation par intelligence
            artificielle. Essai gratuit, sans carte bancaire, sans engagement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-lg transition-colors"
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
            <span>Factur-X conforme</span>
          </div>
        </div>
      </section>

      {/* ── MAILLAGE NEURAL (Loi 8) ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages
          pages={[
            { href: '/facture-rapide', label: 'Facture rapide — En moins de 60 secondes' },
            { href: '/facture-voix', label: 'Facture Voix — Dictée vocale IA' },
            { href: '/facturation-vocale', label: 'Facturation vocale' },
            { href: '/facturation-electronique', label: 'Facturation électronique 2026' },
            { href: '/facturation-freelances', label: 'Facturation freelances' },
            { href: '/facturation-artisans', label: 'Facturation artisans' },
            { href: '/facturation-auto-entrepreneur', label: 'Facturation auto-entrepreneur' },
            { href: '/facturation-btp', label: 'Facturation BTP' },
            { href: '/logiciel-facture-freelance', label: 'Logiciel facture freelance' },
            { href: '/creer-facture', label: 'Créer une facture' },
            { href: '/generateur-facture', label: 'Générateur de facture' },
            { href: '/mentions-obligatoires-facture', label: 'Mentions obligatoires' },
            { href: '/alternative-henrj', label: 'Alternative Henrj' },
          ]}
        />
      </section>

      {/* ── SCHEMAS JSON-LD (Loi 6 : Schema Layering) ── */}
      <FAQSchema items={faqItems} />
      <HowToSchema
        name="Comment créer une facture avec l'IA sur Factu.me"
        description="Guide étape par étape pour créer une facture par intelligence artificielle avec Factu.me"
        steps={howToSteps}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture IA', url: 'https://factu.me/facture-ia' },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section', '.speakable-faq-answer']}
        url="https://factu.me/facture-ia"
        name="Facture IA — Créez vos factures par Intelligence Artificielle"
        description="Comment créer des factures automatiquement grâce à l'intelligence artificielle avec Factu.me"
      />
      <CollectionPageSchema
        name="Facture IA — Centre de ressources"
        description="Toutes les ressources sur la facturation par intelligence artificielle avec Factu.me"
        url="https://factu.me/facture-ia"
        hasPart={[
          { name: 'Facture rapide — En moins de 60 secondes', url: 'https://factu.me/facture-rapide', description: 'Créez une facture rapide avec l\'IA' },
          { name: 'Facture Voix — Dictée vocale IA', url: 'https://factu.me/facture-voix', description: 'Créez vos factures en parlant' },
          { name: 'Facturation électronique 2026', url: 'https://factu.me/facturation-electronique', description: 'Guide réforme e-invoicing' },
          { name: 'Facturation artisans', url: 'https://factu.me/facturation-artisans', description: 'Facture IA pour artisans' },
          { name: 'Facturation freelances', url: 'https://factu.me/facturation-freelances', description: 'Facture IA pour freelances' },
          { name: 'Facturation auto-entrepreneur', url: 'https://factu.me/facturation-auto-entrepreneur', description: 'Facture IA pour auto-entrepreneurs' },
          { name: 'Facturation BTP', url: 'https://factu.me/facturation-btp', description: 'Facture IA pour le BTP' },
          { name: 'Facturation PME', url: 'https://factu.me/facturation-pme', description: 'Facture IA pour PME' },
          { name: 'Créer une facture', url: 'https://factu.me/creer-facture', description: 'Comment créer une facture' },
          { name: 'Mentions obligatoires', url: 'https://factu.me/mentions-obligatoires-facture', description: 'Mentions légales obligatoires' },
          { name: 'Modèles de facture', url: 'https://factu.me/modeles-facture', description: 'Modèles gratuits de factures' },
        ]}
      />
    </main>
  );
}

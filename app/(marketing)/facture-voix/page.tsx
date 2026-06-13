import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Mic,
  Brain,
  Volume2,
  FileText,
  Clock,
  Shield,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Star,
  Users,
  MessageCircle,
  AudioWaveform,
  Headphones,
  Settings,
  Cpu,
  BarChart3,
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
  title: 'Facture Voix — Créez vos factures en parlant par dictée vocale IA | Factu.me',
  description:
    'Créez vos factures par la voix. Factu.me transforme votre voix en facture grâce à l\'IA. Dictée vocale, reconnaissance du langage naturel, conformité Factur-X, signature eIDAS. Essai gratuit.',
  alternates: {
    canonical: 'https://factu.me/facture-voix',
  },
  openGraph: {
    title: 'Facture Voix — Créez vos factures en parlant | Factu.me',
    description:
      'Dites simplement ce que vous voulez facturer. L\'IA de Factu.me transforme votre voix en facture conforme, signée et envoyée. Essai gratuit.',
    url: 'https://factu.me/facture-voix',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/api/og?title=Facture%20Voix%20-%20Dict%C3%A9e%20Vocale%20IA&description=Cr%C3%A9ez%20vos%20factures%20en%20parlant&theme=blue',
        width: 1200,
        height: 630,
        alt: 'Facture Voix — Dictée vocale IA | Factu.me',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Facture Voix — Créez vos factures en parlant',
    description:
      'Dites simplement ce que vous voulez facturer. L\'IA fait le reste. Essai gratuit.',
  },
};

/* ──────────────────────────── DATA ──────────────────────────── */

const faqItems = [
  {
    question: 'Comment créer une facture avec la voix ?',
    answer:
      'Ouvrez Factu.me sur votre téléphone ou ordinateur, appuyez sur le microphone et dites simplement ce que vous voulez facturer. Par exemple : « Crée une facture pour Martin Dupont, 5 heures de plomberie à 45 euros de l\'heure, TVA 20 %. » L\'IA transforme votre voix en facture complète, conforme et prête à envoyer.',
  },
  {
    question: 'Qu\'est-ce que la facture voix ?',
    answer:
      'La facture voix (ou facture vocale) est une facture créée par dictée vocale grâce à l\'intelligence artificielle. Au lieu de saisir manuellement chaque champ, vous parlez naturellement et l\'IA comprend vos instructions pour générer une facture complète avec TVA, mentions légales et format Factur-X.',
  },
  {
    question: 'La reconnaissance vocale fonctionne-t-elle bien en français ?',
    answer:
      'Oui. Factu.me utilise un modèle de reconnaissance vocale optimisé pour le français, avec une précision supérieure à 98 %. Il comprend les accents régionaux, les termes techniques (BTP, informatique, juridique), les nombres et les montants en toutes lettres ou en chiffres.',
  },
  {
    question: 'Est-ce que je peux dicter une facture sur mon téléphone ?',
    answer:
      'Absolument. Factu.me est une application web progressive (PWA) qui fonctionne parfaitement sur mobile. Vous pouvez dicter vos factures depuis votre smartphone, en déplacement ou sur le terrain. L\'application fonctionne même en mode hors-ligne.',
  },
  {
    question: 'La facture voix est-elle conforme légalement en France ?',
    answer:
      'Oui. Les factures créées par la voix sur Factu.me sont 100 % conformes à la législation française. Elles incluent toutes les mentions obligatoires (numéro SIRET, TVA intracommunautaire, conditions de paiement, pénalités de retard) et respectent le format Factur-X (EN 16931) pour la facturation électronique.',
  },
  {
    question: 'Combien de temps faut-il pour dicter une facture ?',
    answer:
      'En moyenne 30 secondes. Vous dites votre instruction, l\'IA génère la facture en 2 à 3 secondes, vous vérifiez et envoyez. Comparé à 10-20 minutes de saisie manuelle, c\'est un gain de temps de 95 %.',
  },
  {
    question: 'Peut-on dicter des factures complexes avec plusieurs lignes ?',
    answer:
      'Oui. Vous pouvez dicter des factures multi-lignes, multi-taux de TVA, avec des remises, des acomptes et des situations d\'avancement. Par exemple : « Facture pour la société Durand. Ligne 1 : 3 jours de maçonnerie à 350 € HT, TVA 10 %. Ligne 2 : fournitures 200 € HT, TVA 20 %. Remise 5 %. »',
  },
  {
    question: 'Est-ce que la facture voix fonctionne pour les artisans du BTP ?',
    answer:
      'C\'est même l\'utilisation idéale. Les artisans du BTP facturent souvent sur le chantier, sans ordinateur. Avec Factu.me, ils sortent leur téléphone, dictent la facture en 30 secondes et l\'envoient avant de quitter le client. L\'IA gère les taux de TVA multiples du BTP automatiquement.',
  },
  {
    question: 'Quel est le coût de la facture voix sur Factu.me ?',
    answer:
      'La dictée vocale est disponible dès le plan Pro à 14,99 €/mois (factures illimitées avec IA). Vous pouvez tester gratuitement avec le plan Découverte (3 factures/mois). Aucun équipement supplémentaire n\'est nécessaire — le micro de votre téléphone suffit.',
  },
  {
    question: 'L\'IA comprend-elle le jargon technique de mon métier ?',
    answer:
      'Oui. Le modèle linguistique de Factu.me est entraîné sur le vocabulaire des métiers français : BTP (plomberie, électricité, maçonnerie), informatique (développement, consulting), juridique, design, etc. Il reconnaît les termes techniques et les associe aux bons codes NAF/APE.',
  },
  {
    question: 'Que se passe-t-il si l\'IA ne comprend pas bien ma dictée ?',
    answer:
      'Vous pouvez toujours modifier la facture après la dictée. L\'IA pré-remplit la facture et vous la présente pour validation. Vous pouvez corriger n\'importe quel champ avant envoi. En pratique, le taux de compréhension dépasse 98 %, les corrections sont rares.',
  },
  {
    question: 'Peut-on dicter des devis et des contrats en plus des factures ?',
    answer:
      'Oui. La dictée vocale IA fonctionne pour les devis, les contrats de travail (CDI, CDD) et les factures. Vous pouvez dicter un devis, le faire accepter par le client, puis le convertir en facture en un clic — sans rien ressaisir.',
  },
  {
    question: 'La facture voix fonctionne-t-elle avec la réforme e-invoicing 2026 ?',
    answer:
      'Oui. Chaque facture créée par la voix est automatiquement générée au format Factur-X (XML + PDF), conforme à la norme EN 16931. Elle peut être transmise via les Plateformes de Dématérialisation Partenaire (PDP) dès sa création.',
  },
  {
    question: 'Peut-on utiliser la facture voix sans connexion internet ?',
    answer:
      'Factu.me propose un mode hors-ligne via sa PWA. Vous pouvez préparer vos factures sans connexion, et elles seront synchronisées et envoyées automatiquement lorsque la connexion revient. La dictée vocale nécessite en revanche une connexion internet pour fonctionner.',
  },
  {
    question: 'Est-ce que la facture voix remplace complètement la saisie manuelle ?',
    answer:
      'Oui, si vous le souhaitez. La dictée vocale couvre 100 % des cas d\'usage de la facturation. Toutefois, vous gardez toujours la possibilité de saisir manuellement si vous préférez. L\'objectif est de vous faire gagner du temps, pas de vous contraindre.',
  },
];

const howToSteps = [
  {
    name: 'Ouvrez Factu.me et activez le micro',
    text: 'Lancez l\'application sur votre téléphone ou ordinateur. Appuyez sur le bouton microphone pour activer la dictée vocale IA.',
  },
  {
    name: 'Dites votre facture naturellement',
    text: 'Parlez normalement : « Crée une facture pour la société Martin, 2 heures de consultation à 150 euros, TVA 20 %. » L\'IA comprend le langage naturel.',
  },
  {
    name: "L'IA génère la facture complète",
    text: 'En 2 secondes, l\'intelligence artificielle crée votre facture avec : lignes détaillées, TVA calculée, mentions légales, format Factur-X. Tout est pré-rempli.',
  },
  {
    name: 'Vérifiez, signez et envoyez',
    text: 'Relisez rapidement la facture. Signez électroniquement (eIDAS) et envoyez par email ou lien. Le suivi de paiement est automatique.',
  },
];

const benefits = [
  {
    icon: Clock,
    title: '30 secondes par facture',
    description:
      'Dites votre facture, elle est créée. Plus besoin de saisir champ par champ. Le gain de temps est de 95 % par rapport à une facturation manuelle.',
  },
  {
    icon: Smartphone,
    title: 'Facturez depuis le terrain',
    description:
      'Sur un chantier, en rendez-vous, en déplacement. Sortez votre téléphone, dictez, c\'est envoyé. Pas besoin d\'ordinateur.',
  },
  {
    icon: Brain,
    title: 'Compréhension naturelle',
    description:
      'Parlez comme vous respiriez. L\'IA comprend le français naturel, les accents, les montants, les taux de TVA, et même le jargon technique de votre métier.',
  },
  {
    icon: Shield,
    title: 'Conforme automatiquement',
    description:
      'Mentions légales, TVA, format Factur-X, signature eIDAS — tout est géré automatiquement. Zéro risque d\'erreur ou d\'oubli.',
  },
  {
    icon: Volume2,
    title: 'Précision > 98 %',
    description:
      'Notre reconnaissance vocale est optimisée pour le français et les termes professionnels. Les corrections sont rares et la validation reste toujours sous votre contrôle.',
  },
  {
    icon: BarChart3,
    title: 'Apprentissage continu',
    description:
      'Plus vous utilisez la dictée, plus l\'IA apprend vos clients, vos tarifs et vos habitudes. Les factures deviennent de plus en plus rapides à créer.',
  },
];

const useCases = [
  {
    icon: MessageCircle,
    title: 'Artisans sur chantier',
    description:
      'Le plombier qui vient de terminer une réparation dicte sa facture depuis le sous-sol du client. 30 secondes plus tard, la facture est dans la boîte mail du client.',
    phrase: '« Facture Dupont, remplacement chauffe-eau, 450 euros HT, TVA 10 %. »',
  },
  {
    icon: Headphones,
    title: 'Freelances en déplacement',
    description:
      'La consultante qui sort d\'un meeting crée sa facture dans le taxi. Pas besoin d\'attendre d\'être au bureau.',
    phrase: '« Facture mensuelle Acme Consulting, 10 jours à 600 euros jour, TVA 20 %. »',
  },
  {
    icon: Settings,
    title: 'Auto-entrepreneurs pressés',
    description:
      'L\'auto-entrepreneur qui facture entre deux rendez-vous. Rapide, conforme, sans prise de tête avec les mentions légales.',
    phrase: '« Facture Restaurant Le Provençal, prestation SEO mars, 800 euros HT. »',
  },
  {
    icon: Cpu,
    title: 'Développeurs & Tech',
    description:
      'Le développeur qui facture ses missions au TJM. Multi-devises, multi-clients, tout est géré par la voix.',
    phrase: '« Facture StartupXYZ, sprint 14, 5 jours à 450 euros, TVA 20 %. »',
  },
];

const testimonials = [
  {
    name: 'Marc D.',
    role: 'Artisan plombier',
    quote:
      'Avant, je faisais mes factures le soir, fatigué, avec des erreurs. Maintenant je dicte sur le chantier en partant et le client reçoit la facture avant que je sois dans ma camionnette. C\'est un game-changer.',
    rating: 5,
  },
  {
    name: 'Émilie R.',
    role: 'Consultante indépendante',
    quote:
      'Je sors d\'un rendez-vous, je dicte ma facture dans le métro, elle est envoyée. Mes clients sont impressionnés par la réactivité. Le taux de paiement à 30 jours a augmenté de 40 %.',
    rating: 5,
  },
  {
    name: 'Thomas P.',
    role: 'Développeur freelance',
    quote:
      'La reconnaissance vocale comprend parfaitement le jargon tech. Je dis « TJM 450, sprint 12 » et ça sort proprement. Même les adresses email des clients sont pré-remplies.',
    rating: 5,
  },
  {
    name: 'Nadia M.',
    role: 'Auto-entrepreneuse',
    quote:
      'En tant qu\'auto-entrepreneuse, la facturation c\'était ma bête noire. Maintenant je parle, c\'est fait. Les mentions légales sont bonnes, la TVA est calculée, je n\'y pense plus.',
    rating: 5,
  },
];

const voiceExamples = [
  {
    title: 'Facture artisan BTP',
    example: '« Crée une facture pour Pierre Martin. Remplacement robinet cuisine : 1h30 à 45 €/h. Pièce : robinet thermostatique 85 €. TVA 5,5 % car rénovation. »',
    result: 'Facture complète avec 2 lignes, TVA 5,5 %, mentions légales BTP, format Factur-X',
  },
  {
    title: 'Facture consultant',
    example: '« Facture mensuelle Société Durand. Mission conseil stratégique : 8 jours à 600 € HT. TVA 20 %. Échéance 30 jours. »',
    result: 'Facture avec TJM calculé, TVA 20 %, conditions de paiement, lien de suivi',
  },
  {
    title: 'Devis développeur',
    example: '« Crée un devis pour la startup TechFlow. Développement API : 15 jours à 450 €/jour. Hébergement cloud : 50 €/mois. Validité 30 jours. »',
    result: 'Devis avec 2 lignes, convertibles en facture en 1 clic après acceptation',
  },
];

const techSpecs = [
  { label: 'Reconnaissance vocale', value: 'Modèle français optimisé > 98 % de précision' },
  { label: 'Compréhension', value: 'NLP + LLM pour le langage naturel français' },
  { label: 'Latence', value: '< 3 secondes entre la dictée et la facture générée' },
  { label: 'Langues', value: 'Français (natif), anglais (bêta)' },
  { label: 'Appareils', value: 'Téléphone, tablette, ordinateur — microphone intégré' },
  { label: 'Mode hors-ligne', value: 'PWA — factures en attente synchronisées automatiquement' },
];

/* ──────────────────────────── PAGE COMPONENT ──────────────────────────── */

export default function FactureVoixPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28">
          <div className="flex items-center gap-2 mb-6">
            <Mic className="w-5 h-5 text-indigo-300" />
            <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm font-medium">
              Dictée vocale propulsée par l&apos;IA
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Facture Voix : Créez vos factures
            <br />
            <span className="text-indigo-400">en parlant simplement</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mb-8 leading-relaxed">
            Dites ce que vous voulez facturer. L&apos;<strong>IA de Factu.me</strong> transforme
            votre voix en <strong>facture complète, conforme et signée</strong>. Dictée vocale en
            français, reconnaissance du langage naturel, conformité Factur-X, signature eIDAS.
            <strong> Essai gratuit sans carte bancaire.</strong>
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-semibold text-lg transition-colors"
            >
              <Mic className="w-5 h-5" />
              Essayer la facture voix gratuitement
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-colors"
            >
              Voir la démo
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Précision &gt; 98 %</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Français natif</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> 30 secondes par facture</span>
          </div>
        </div>
      </section>

      {/* ── DÉFINITION AEO (Loi 3 : réponse directe pour AI Overviews) ── */}
      <section id="definition" className="speakable-section max-w-6xl mx-auto px-4 py-16">
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-8 sm:p-10">
          <ExpertBadge
            name="Équipe Factu.me"
            title="Experts en facturation vocale IA"
            organization="Factu.me"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Qu&apos;est-ce que la facture voix ?
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            La <strong>facture voix</strong> (aussi appelée <strong>facture vocale</strong>) est une
            facture créée par <strong>dictée vocale</strong> grâce à l&apos;intelligence artificielle.
            Au lieu de remplir manuellement chaque champ d&apos;un formulaire, vous <strong>parlez
            naturellement</strong> et l&apos;IA comprend vos instructions pour générer une facture
            complète : lignes détaillées, TVA calculée automatiquement, mentions légales incluses,
            format <strong>Factur-X</strong> (EN 16931) conforme à la réglementation française.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Factu.me est le <strong>premier logiciel de facture voix</strong> conçu pour le marché
            français. Il combine la <strong>reconnaissance vocale en français</strong> avec une
            précision supérieure à 98 %, la compréhension du langage naturel par IA, et la
            génération automatique de factures électroniques conformes. Le tout fonctionnant
            depuis votre téléphone, en 30 secondes.
          </p>
        </div>
      </section>

      {/* ── EXEMPLES CONCRETS ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Dites-le, c&apos;est facturé
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Voici comment la facture voix fonctionne concrètement. Vous parlez, l&apos;IA fait le reste.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {voiceExamples.map((ex) => (
            <div key={ex.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{ex.title}</h3>
              <div className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
                <AudioWaveform className="w-5 h-5 text-indigo-500 mb-2" />
                <p className="text-gray-700 text-sm italic">{ex.example}</p>
              </div>
              <p className="text-sm text-emerald-700 font-medium">
                → {ex.result}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BÉNÉFICES ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Pourquoi adopter la facture par la voix ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              La dictée vocale IA révolutionne la facturation pour les professionnels en mobilité.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="p-6 bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
                  <b.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-gray-600 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE (HowTo) ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Comment créer une facture avec la voix ?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            4 étapes. 30 secondes. Aucune compétence technique requise.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {howToSteps.map((step, i) => (
            <div key={step.name} className="relative bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="absolute -top-4 -left-2 w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-lg">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{step.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CAS D'USAGE ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              La facture voix pour chaque professionnel
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Des artisans aux freelances, chacun facture en parlant.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <uc.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{uc.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mt-1">{uc.description}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-sm text-indigo-700 italic">{uc.phrase}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
          Ils facturent en parlant
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
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
      </section>

      {/* ── SPECS TECHNIQUES ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Spécifications techniques
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {techSpecs.map((spec) => (
              <div key={spec.label} className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-medium text-indigo-600 mb-1">{spec.label}</p>
                <p className="text-gray-900 font-medium">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION CONTENU SEO LONGUE ── */}
      <section className="speakable-section max-w-4xl mx-auto px-4 py-16">
        <article className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Tout savoir sur la facture voix et la dictée vocale IA
          </h2>

          <p className="text-gray-700 leading-relaxed mb-4">
            La <strong>facture voix</strong> représente la rencontre entre deux révolutions
            technologiques : la <strong>reconnaissance vocale</strong> et l&apos;
            <strong>intelligence artificielle</strong>. Ensemble, elles permettent de créer une
            facture complète et conforme simplement en <strong>parlant</strong>, sans jamais toucher
            un clavier. C&apos;est la solution idéale pour les professionnels qui facturent en
            mobilité : artisans sur chantier, consultants entre deux rendez-vous, freelances
            en déplacement.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Comment fonctionne la dictée vocale pour la facturation
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Le processus de <strong>facture par la voix</strong> repose sur trois technologies
            complémentaires. D&apos;abord, le <strong>speech-to-text</strong> (reconnaissance
            automatique de la parole) convertit vos paroles en texte avec une précision supérieure
            à 98 % en français. Cette technologie est optimisée pour comprendre les accents
            régionaux, les termes techniques et les nombres.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Ensuite, le <strong>traitement du langage naturel</strong> (NLP) analyse le texte pour
            en extraire les informations structurées. Quand vous dites « facture pour la société
            Durand, 3 heures à 50 euros de l&apos;heure, TVA 20 % », l&apos;IA identifie
            automatiquement le client (Société Durand), la prestation (3 heures × 50 €), le montant
            HT (150 €), le taux de TVA (20 %) et le montant TTC (180 €).
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Enfin, le <strong>moteur de génération</strong> assemble ces données dans un document
            complet et conforme : lignes de facture détaillées, calculs de TVA, mentions légales
            obligatoires (SIRET, numéro de TVA intracommunautaire, conditions de paiement, pénalités
            de retard), et format <strong>Factur-X</strong> (EN 16931) pour la facturation
            électronique.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Facture voix : l&apos;atout majeur des artisans du BTP
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Pour les <strong>artisans du BTP</strong>, la facture voix n&apos;est pas un gadget —
            c&apos;est une nécessité. Ces professionnels passent la majorité de leur temps sur les
            chantiers, souvent sans accès à un ordinateur. Avant la facture voix, ils accumulaient
            les notes manuscrites et passaient leurs soirées à saisir des factures, avec le risque
            d&apos;erreurs et d&apos;oublis.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Avec Factu.me, l&apos;artisan dicte sa facture depuis le chantier en 30 secondes.
            L&apos;IA gère les spécificités du BTP : <strong>taux de TVA multiples</strong> (20 %
            pour le neuf, 10 % pour l&apos;amélioration, 5,5 % pour la rénovation),{' '}
            <strong>situations d&apos;avancement</strong> pour les chantiers longs,{' '}
            <strong>retenues de garantie</strong>, et <strong>attestation d&apos;assurance
            décennale</strong>. Tout est inclus automatiquement.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            La facture voix et la réforme de la facturation électronique 2026
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            La <strong>réforme de la facturation électronique</strong> qui entre en vigueur en
            France à partir de septembre 2026 impose à toutes les entreprises d&apos;émettre leurs
            factures au format électronique (Factur-X / EN 16931) et de les transmettre via une
            Plateforme de Dématérialisation Partenaire (PDP) ou le portail public de facturation (PPF).
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            La facture voix de Factu.me est <strong>nativement compatible</strong> avec cette réforme.
            Chaque facture créée par dictée vocale est automatiquement générée au format Factur-X
            (fichier XML intégré au PDF). La connexion aux PDP est intégrée dans les plans Pro et
            Business. Vous dictez, l&apos;IA crée la facture électronique conforme, et elle peut
            être transmise immédiatement — sans aucune action supplémentaire.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Les avantages concrets de la facture vocale pour les freelances
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Les <strong>freelances et consultants indépendants</strong> sont parmi les premiers
            bénéficiaires de la facture voix. Leur activité implique de gérer plusieurs clients
            simultanément, souvent avec des conditions de facturation différentes (TJM, forfaits,
            taux horaires). La dictée vocale simplifie ce processus : au lieu de mémoriser les
            tarifs de chaque client, l&apos;IA les récupère automatiquement.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Un freelance peut dicter sa facture mensuelle en 30 secondes depuis son téléphone,
            entre deux rendez-vous. L&apos;IA pré-remplit le client, le TJM, les conditions de
            paiement, calcule la TVA et génère la facture au format Factur-X. Avec la signature
            eIDAS intégrée, la facture est signée et envoyée en un clic. Le gain de temps moyen
            est de <strong>15 à 20 minutes par facture</strong>, soit plusieurs heures par mois
            pour les freelances avec 5+ clients.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Reconnaissance vocale en français : les défis relevés
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            La <strong>reconnaissance vocale en français</strong> présente des défis spécifiques :
            les accents régionaux (marseillais, toulousain, alsacien, breton), les liaisons
            phonétiques, les nombres complexes (« mille deux cents quarante-cinq euros »), et
            le vocabulaire technique des différents métiers. Factu.me a entraîné son modèle
            spécifiquement sur ces cas d&apos;usage pour atteindre une précision supérieure à 98 %.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Le modèle comprend les termes techniques du BTP (plomberie, électricité, maçonnerie,
            couverture, menuiserie), de l&apos;informatique (développement, API, cloud, DevOps),
            du juridique (consultation, rédaction, conseil), du design (maquette, UI/UX, branding)
            et de dizaines d&apos;autres secteurs. Chaque terme est associé automatiquement au bon
            code NAF/APE et au bon taux de TVA.
          </p>
        </article>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Questions fréquentes sur la facture voix
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
            Prêt à facturer en parlant ?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Rejoignez les professionnels qui dictent leurs factures. 30 secondes par facture,
            100 % conforme, signée et envoyée. Essai gratuit, sans carte bancaire.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold text-lg transition-colors"
            >
              <Mic className="w-5 h-5" />
              Commencer gratuitement
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 hover:border-indigo-500 text-gray-700 rounded-xl font-semibold text-lg transition-colors"
            >
              Voir la démo
            </Link>
          </div>
          <div className="mt-6 flex justify-center items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> 4.8/5</span>
            <span>•</span>
            <span>127 avis</span>
            <span>•</span>
            <span>Reconnaissance &gt; 98 %</span>
          </div>
        </div>
      </section>

      {/* ── MAILLAGE NEURAL (Loi 8) ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages
          pages={[
            { href: '/facture-rapide', label: 'Facture rapide — En moins de 60 secondes' },
            { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' },
            { href: '/facturation-vocale', label: 'Facturation vocale' },
            { href: '/facturation-electronique', label: 'Facturation électronique 2026' },
            { href: '/facturation-artisans', label: 'Facturation artisans' },
            { href: '/facturation-btp', label: 'Facturation BTP' },
            { href: '/facturation-freelances', label: 'Facturation freelances' },
            { href: '/facturation-auto-entrepreneur', label: 'Facturation auto-entrepreneur' },
            { href: '/facturation-developpeur', label: 'Facturation développeur' },
            { href: '/creer-facture', label: 'Créer une facture' },
            { href: '/devis-facture', label: 'Devis et factures' },
            { href: '/alternative-henrj', label: 'Alternative Henrj' },
            { href: '/alternative-tiime', label: 'Alternative Tiime' },
          ]}
        />
      </section>

      {/* ── SCHEMAS JSON-LD (Loi 6 : Schema Layering) ── */}
      <FAQSchema items={faqItems} />
      <HowToSchema
        name="Comment créer une facture avec la voix sur Factu.me"
        description="Guide étape par étape pour créer une facture par dictée vocale avec Factu.me"
        steps={howToSteps}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture Voix', url: 'https://factu.me/facture-voix' },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section', '.speakable-faq-answer']}
        url="https://factu.me/facture-voix"
        name="Facture Voix — Créez vos factures en parlant par dictée vocale IA"
        description="Comment créer des factures par la voix grâce à la dictée vocale IA sur Factu.me"
      />
      <CollectionPageSchema
        name="Facture Voix — Centre de ressources"
        description="Toutes les ressources sur la facturation vocale avec Factu.me"
        url="https://factu.me/facture-voix"
        hasPart={[
          { name: 'Facture rapide — En moins de 60 secondes', url: 'https://factu.me/facture-rapide', description: 'Créer une facture rapide avec l\'IA' },
          { name: 'Facture IA — Intelligence Artificielle', url: 'https://factu.me/facture-ia', description: 'Facture par intelligence artificielle' },
          { name: 'Facturation vocale', url: 'https://factu.me/facturation-vocale', description: 'Facturation à la voix' },
          { name: 'Facturation électronique 2026', url: 'https://factu.me/facturation-electronique', description: 'Réforme e-invoicing' },
          { name: 'Facturation artisans', url: 'https://factu.me/facturation-artisans', description: 'Dictée vocale pour artisans' },
          { name: 'Facturation BTP', url: 'https://factu.me/facturation-btp', description: 'Facture voix sur le chantier' },
          { name: 'Facturation freelances', url: 'https://factu.me/facturation-freelances', description: 'Facture vocale pour freelances' },
          { name: 'Facture gratuite', url: 'https://factu.me/facture-gratuite', description: 'Créer une facture gratuite' },
          { name: 'Générateur de facture', url: 'https://factu.me/generateur-facture', description: 'Générer une facture en ligne' },
        ]}
      />
    </main>
  );
}

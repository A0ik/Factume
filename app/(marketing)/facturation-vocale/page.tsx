import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Mic, AudioWaveform, MessageSquare, Clock, Sparkles, Volume2, Brain, Shield, ArrowRight } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { HowToSchema } from '@/components/seo/HowToSchema';
import { CollectionPageSchema } from '@/components/seo/CollectionPageSchema';
import { ExpertBadge } from '@/components/seo/ExpertBadge';

export const metadata: Metadata = {
  title: "Qu'est-ce que la Facturation Vocale ? Définition & Guide 2026 | Factu.me",
  description: "Facturation vocale : définition, fonctionnement, avantages et conformité. Comprenez comment créer une facture par la voix grâce à l'IA, et ce que ça change pour les indépendants en 2026.",
  openGraph: {
    title: "Qu'est-ce que la Facturation Vocale ? Définition 2026",
    description: "Définition, fonctionnement et avantages de la facturation vocale par IA. Le guide pour comprendre la facture à la voix en 2026.",
    url: 'https://factu.me/facturation-vocale',
    siteName: 'Factu.me',
    images: [
      {
        url: '/api/og?title=Qu%27est-ce%20que%20la%20Facturation%20Vocale&description=D%C3%A9finition%20%26%20guide%202026&theme=emerald',
        width: 1200,
        height: 630,
        alt: 'Facturation Vocale — Définition & Guide | Factu.me',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Qu'est-ce que la Facturation Vocale ? Définition 2026",
    description: "Définition, fonctionnement et avantages de la facture vocale par IA en 2026.",
    images: ['/api/og?title=Qu%27est-ce%20que%20la%20Facturation%20Vocale&description=D%C3%A9finition%202026&theme=emerald'],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-vocale',
  },
};

const benefits = [
  {
    icon: Mic,
    title: 'Dictée naturelle',
    description: 'Dites "3 jours de consulting à 600 euros pour Dupont" et votre facture est prête. Pas de formulaires.',
  },
  {
    icon: Brain,
    title: 'IA de transcription',
    description: 'Notre intelligence artificielle comprend le français naturel, les montants, les noms et les prestations.',
  },
  {
    icon: Clock,
    title: '10 secondes par facture',
    description: 'Passez de 30 minutes à 10 secondes pour créer une facture. Le gain de temps est spectaculaire.',
  },
  {
    icon: Volume2,
    title: 'Reconnaissance vocale FR',
    description: 'Optimisée pour le français : nombres en lettres, termes commerciaux, noms propres.',
  },
  {
    icon: Sparkles,
    title: 'Extraction automatique',
    description: 'L\'IA extrait client, montant, prestation et dates directement depuis votre voix.',
  },
  {
    icon: AudioWaveform,
    title: 'Mobile & desktop',
    description: 'Dictez depuis votre smartphone en déplacement ou depuis votre ordinateur au bureau.',
  },
];

const features = [
  {
    title: 'Dictée intelligente',
    items: [
      'Reconnaissance vocale en français',
      'Compréhension du langage naturel',
      'Extraction automatique des montants',
      'Détection du nom du client',
    ],
  },
  {
    title: 'Génération automatique',
    items: [
      'Création de facture instantanée',
      'Calcul TVA automatique',
      'Numérotation séquentielle',
      'Mentions légales conformes',
    ],
  },
  {
    title: 'Productivité',
    items: [
      'Historique des dictées',
      'Modèles de phrases récurrentes',
      'Export PDF immédiat',
      'Envoi par email en 1 clic',
    ],
  },
];

const testimonials = [
  {
    name: 'Alexandre P.',
    job: 'Consultant SEO freelance',
    text: 'Je dicte mes factures entre deux rendez-vous. C\'est devenu mon réflexe, impossible de revenir en arrière.',
  },
  {
    name: 'Sophie L.',
    job: 'Coach professionnelle',
    text: 'La reconnaissance vocale est bluffante. Elle comprend même les noms de mes clients sans erreur.',
  },
  {
    name: 'Karim B.',
    job: 'Développeur web',
    text: 'Je gagne 2 heures par semaine grâce à la dictée. Mes factures sont envoyées avant même de quitter le client.',
  },
];

const faqItems = [
  {
    question: 'Qu\'est-ce que la facturation vocale ?',
    answer: 'La facturation vocale est une méthode de création de factures par dictée orale. L\'utilisateur décrit sa prestation à voix haute (client, montant, durée), et une intelligence artificielle transcrit la parole en facture conforme, prête à être envoyée en PDF ou au format électronique Factur-X.',
  },
  {
    question: 'Comment fonctionne la dictée vocale pour les factures ?',
    answer: 'Vous appuyez sur le micro dans Factu.me, vous décrivez votre prestation en langage naturel (ex : "3 jours de consulting à 600 euros pour Dupont"), et l\'IA extrait automatiquement le client, le montant, la TVA et la description pour générer une facture complète en 10 secondes.',
  },
  {
    question: 'La facturation vocale est-elle conforme à la réforme 2026 ?',
    answer: 'Oui. Factu.me génère des factures au format Factur-X (Chor Facturation), le standard obligatoire de la facturation électronique en France à partir de septembre 2026. Les factures créées par dictée vocale sont conformes aux mentions légales et au format électronique requis.',
  },
  {
    question: 'La reconnaissance vocale fonctionne-t-elle en français ?',
    answer: 'Oui, la reconnaissance vocale de Factu.me est optimisée pour le français : elle comprend les montants en lettres, les termes commerciaux, les noms propres et les expressions courantes des professions indépendantes en France.',
  },
  {
    question: 'Quels professionnels utilisent la facturation vocale ?',
    answer: 'La facturation vocale est utilisée par les artisans, freelances, consultants, développeurs, coaches, auto-entrepreneurs et TPE qui créent des factures en déplacement ou entre deux rendez-vous, sans accès à un ordinateur.',
  },
  {
    question: 'La facturation vocale est-elle gratuite ?',
    answer: 'Factu.me propose 3 factures gratuites par mois, incluant la dictée vocale. Pour un usage illimité, les plans Pro et Business offrent la reconnaissance vocale illimitée avec toutes les fonctionnalités avancées.',
  },
  {
    question: 'Peut-on dicter une facture depuis un smartphone ?',
    answer: 'Oui, la facturation vocale fonctionne sur mobile et desktop. Vous pouvez dicter vos factures depuis votre smartphone en déplacement, le micro de votre appareil capture directement votre voix.',
  },
  {
    question: 'Quelle est la différence entre facture vocale et facture IA ?',
    answer: 'La facture vocale utilise votre voix comme input (dictée), tandis que la facture IA utilise du texte en langage naturel. Les deux exploitent l\'intelligence artificielle pour générer la facture. La facture vocale est idéale en déplacement, la facture IA en open-space.',
  },
];

const steps = [
  {
    step: '1',
    title: 'Appuyez sur le micro',
    description: 'Cliquez sur l\'icône micro dans l\'interface Factu.me et commencez à parler.',
  },
  {
    step: '2',
    title: 'Décrivez votre prestation',
    description: 'Dites simplement ce que vous avez facturé : client, durée, tarif, description.',
  },
  {
    step: '3',
    title: 'Vérifiez et envoyez',
    description: 'L\'IA génère votre facture. Relisez-la, ajustez si besoin et envoyez en PDF.',
  },
];

export default function FacturationVocalePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* ═══ LOI 4 : Featured Snippet Killer — Définition H2/H3 ═══ */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Qu'est-ce que la <span className="text-emerald-600">Facturation Vocale</span> ?
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 speakable-section">
              La facturation vocale, c'est la création d'une facture par la voix grâce à l'IA : vous dictez votre prestation, l'intelligence artificielle génère une facture complète et conforme. Définition, fonctionnement et avantages — <strong>le guide 2026</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Mic className="w-5 h-5 mr-2" />
                Essayer la dictée vocale
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              &bull; Reconnaissance vocale en français &bull; 3 factures gratuites par mois
            </p>
          </div>
        </div>
      </section>

      {/* ═══ LOI 4 : Section Définition — Featured Snippet Ready ═══ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6">
            Qu&apos;est-ce que la facturation vocale ?
          </h2>
          <div className="speakable-section">
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              La <strong>facturation vocale</strong> est une technologie qui permet de créer une facture complète simplement en parlant. Grâce à la <strong>reconnaissance vocale couplée à l&apos;intelligence artificielle</strong>, l&apos;utilisateur dicte sa prestation en langage naturel et le système génère automatiquement une facture conforme aux normes françaises et au format électronique Factur-X requis par la réforme de septembre 2026.
            </p>
            <ExpertBadge
              name="Équipe Factu.me"
              title="Expert en facturation électronique"
              organization="Factu.me"
            />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">
            Pourquoi utiliser la facturation vocale en 2026 ?
          </h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>Gain de temps de 80%</strong> — passez de 30 minutes à 10 secondes par facture</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>Conforme facturation électronique 2026</strong> — format Factur-X (Chor Facturation) obligatoire</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>Utilisable en déplacement</strong> — dictez depuis votre smartphone entre deux rendez-vous</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span><strong>Zéro saisie manuelle</strong> — l&apos;IA extrait client, montant, TVA et description automatiquement</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ═══ LOI 8 : Réforme 2026 ═══ */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-emerald-50 to-emerald-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Conforme réforme 2026</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
            Prêt pour la facturation électronique obligatoire
          </h2>
          <p className="text-gray-700 max-w-2xl mx-auto mb-6">
            À partir de <strong>septembre 2026</strong>, toutes les entreprises françaises doivent émettre des factures électroniques au format Factur-X. Les factures créées par dictée vocale sur Factu.me sont automatiquement conformes à cette réglementation.
          </p>
          <Link href="/facturation-electronique" className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
            En savoir plus sur la facturation électronique 2026
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La facturation par la voix, comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-emerald-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            3 étapes pour facturer par la voix
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-black mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Tout ce que la dictée vocale peut faire
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ils facturent avec leur voix
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg">
                <p className="text-gray-700 mb-6 italic">&ldquo;{testimonial.text}&rdquo;</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.job}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LOI 3 : FAQ Schema — Featured Snippet Trigger ═══ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Questions fréquentes sur la facturation vocale
          </h2>
          <div className="space-y-6">
            {faqItems.map((item, i) => (
              <details key={i} className="group rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 hover:border-emerald-200 transition-colors">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">{item.question}</h3>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-600 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Votre voix, votre facture
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Rejoignez les indépendants qui dictent leurs factures. Essai 7 jours gratuit.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Reconnaissance vocale illimitée &bull; 3 factures gratuites/mois
          </p>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages pages={[
          { href: '/facture-voix', label: 'Facture Voix — Dictée vocale IA' },
          { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' },
          { href: '/facturation-electronique', label: 'Facturation électronique 2026' },
          { href: '/facturation-artisans', label: 'Facturation artisans' },
          { href: '/facturation-freelances', label: 'Facturation freelances' },
          { href: '/facturation-auto-entrepreneur', label: 'Facturation auto-entrepreneur' },
        ]} />
      </section>

      {/* ═══ LOI 3 : JSON-LD Aggressif — 5 schemas ═══ */}
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facturation Vocale', url: 'https://factu.me/facturation-vocale' },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section']}
        url="https://factu.me/facturation-vocale"
        name="Facturation vocale — Créez vos factures à la voix"
        description="Découvrez la facturation vocale avec Factu.me : dictez vos factures grâce à l'IA"
      />
      <FAQSchema items={faqItems} />
      <HowToSchema
        name="Comment créer une facture par la voix avec Factu.me"
        description="Guide étape par étape pour dicter et générer une facture grâce à la reconnaissance vocale IA."
        steps={[
          { name: 'Appuyez sur le micro', text: 'Cliquez sur l\'icône micro dans l\'interface Factu.me et commencez à parler.' },
          { name: 'Décrivez votre prestation', text: 'Dites simplement ce que vous avez facturé : client, durée, tarif, description.' },
          { name: 'Vérifiez et envoyez', text: 'L\'IA génère votre facture. Relisez-la, ajustez si besoin et envoyez en PDF.' },
        ]}
      />
      <CollectionPageSchema
        name="Facturation Vocale — Guide Complet"
        description="Ressources sur la facturation vocale : dictée IA, reconnaissance vocale, conformité 2026"
        url="https://factu.me/facturation-vocale"
        hasPart={[
          { name: 'Facture Voix', url: 'https://factu.me/facture-voix', description: 'Page hub facture voix — dictée vocale IA' },
          { name: 'Facture IA', url: 'https://factu.me/facture-ia', description: 'Page hub facture IA — intelligence artificielle' },
          { name: 'Facturation électronique 2026', url: 'https://factu.me/facturation-electronique', description: 'Obligations et conformité facturation électronique' },
          { name: 'Facturation artisans', url: 'https://factu.me/facturation-artisans', description: 'Solution facturation pour artisans' },
          { name: 'Facturation freelances', url: 'https://factu.me/facturation-freelances', description: 'Solution facturation pour freelances' },
        ]}
      />
    </div>
  );
}

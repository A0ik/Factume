import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Mic, AudioWaveform, MessageSquare, Clock, Sparkles, Volume2, Brain } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';

export const metadata: Metadata = {
  title: 'Facturation Vocale – Créez Vos Factures par la Voix | Factu.me',
  description: 'Créez vos factures en parlant grâce à la reconnaissance vocale IA. Dictée facture instantanée, transcription automatique, gain de temps 80%. Essayez gratuitement.',
  openGraph: {
    title: 'Facturation Vocale – Créez Vos Factures par la Voix',
    description: 'Dictée vocale IA pour créer vos factures en 10 secondes. Reconnaissance vocale française, transcription automatique.',
    url: 'https://factu.me/facturation-vocale',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-facturation-vocale.png',
        width: 1200,
        height: 630,
        alt: 'Facturation Vocale par Factu.me',
      },
    ],
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
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Vocale – Créez Vos Factures par la <span className="text-violet-600">Voix</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 speakable-section">
              Dictée vocale IA : dites <strong>&ldquo;5 jours de dev à 800€ pour Acme&rdquo;</strong> et votre facture est prête. <strong>80% de temps gagné</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl hover:from-violet-700 hover:to-purple-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Mic className="w-5 h-5 mr-2" />
                Essayer la dictée vocale
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-violet-300 transition-all"
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

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La facturation par la voix, comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-violet-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
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
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black mx-auto mb-6">
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

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-violet-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Votre voix, votre facture
          </h2>
          <p className="text-xl text-violet-100 mb-8">
            Rejoignez les indépendants qui dictent leurs factures. Essai 7 jours gratuit.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-violet-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-violet-200">
            Reconnaissance vocale illimitée &bull; 3 factures gratuites/mois
          </p>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages pages={[{ href: '/facture-voix', label: 'Facture Voix — Dictée vocale IA' }, { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' }, { href: '/facturation-electronique', label: 'Facturation électronique 2026' }, { href: '/facturation-artisans', label: 'Facturation artisans' }, { href: '/facturation-freelances', label: 'Facturation freelances' }]} />
      </section>
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
    </div>
  );
}

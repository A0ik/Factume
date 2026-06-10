import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, MessageSquare, Euro, Shield, Clock, Globe, Palette, Layers } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Logiciel de Facture Freelance – Créez Vos Factures en 30 Secondes',
  description: 'Logiciel de facture pour freelances : créez des factures professionnelles en 30 secondes. Modèles personnalisables, clients internationaux, dictée vocale.',
  openGraph: {
    title: 'Logiciel de Facture Freelance – Créez Vos Factures en 30 Secondes',
    description: 'Créez des factures professionnelles en 30 secondes. Modèles personnalisables, multi-devises, dictée vocale.',
    url: 'https://factu.me/logiciel-facture-freelance',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-facture-freelance.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel de Facture Freelance',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/logiciel-facture-freelance',
  },
};

const benefits = [
  {
    icon: Clock,
    title: '30 secondes par facture',
    description: 'Sélectionnez un client, ajoutez une ligne, envoyez. Pas de formulaires interminables. Le minimum vital, bien fait.',
  },
  {
    icon: MessageSquare,
    title: 'Dictée vocale intégrée',
    description: '"Mission consulting pour 10 jours à 600 euros par jour." Votre facture est pré-remplie. Relisez et envoyez.',
  },
  {
    icon: Palette,
    title: 'Modèles personnalisables',
    description: 'Votre logo, vos couleurs, votre style. Vos factures reflètent votre marque personnelle. Plusieurs thèmes disponibles.',
  },
  {
    icon: Globe,
    title: 'Clients internationaux',
    description: 'Facturez en euros, dollars, livres ou dirhams. Coordonnées bancaires internationales (IBAN, SWIFT) incluses.',
  },
  {
    icon: Euro,
    title: 'Gratuit pour démarrer',
    description: '3 factures par mois sans payer un centime. Pas de carte bancaire, pas d\'essai limité dans le temps.',
  },
  {
    icon: Layers,
    title: 'Devis + factures',
    description: 'Créez un devis, le client accepte, convertissez en facture en un clic. Tout le cycle de vente en un seul endroit.',
  },
];

const features = [
  {
    title: 'Création rapide',
    items: [
      'Facture en 30 secondes chrono',
      'Clients enregistrés réutilisables',
      'Lignes de facture intelligentes',
      'Dupliquer une facture existante',
    ],
  },
  {
    title: 'Personnalisation',
    items: [
      'Logo et couleurs de votre marque',
      'Plusieurs modèles de facture',
      'Mentions et conditions personnalisées',
      'Numérotation automatique',
    ],
  },
  {
    title: 'Paiement & suivi',
    items: [
      'Suivi des paiements en temps réel',
      'Relances automatiques par email',
      'Tableau de bord revenus',
      'Export pour la déclaration d\'impôts',
    ],
  },
];

const testimonials = [
  {
    name: 'Léa V.',
    job: 'Consultante en stratégie digitale',
    text: 'J\'envoie mes factures entre deux calls. 30 secondes chrono. Mes clients sont impressionnés par la qualité des factures.',
  },
  {
    name: 'Antoine D.',
    job: 'Développeur fullstack freelance',
    text: 'Je travaille avec des clients aux US et au Canada. La multi-devise et les coordonnées bancaires internationales, c\'est exactement ce qu\'il fallait.',
  },
  {
    name: 'Camille R.',
    job: 'Rédactrice & content manager',
    text: 'Le fait de pouvoir dupliquer une facture existante pour un client récurrent, ça m\'épargne 5 minutes à chaque fois. Le diable est dans les détails.',
  },
];

const useCases = [
  {
    title: 'Consultants & coaches',
    description: 'Facturez vos journées de conseil, vos packages ou vos sessions. Le format s\'adapte à votre modèle de tarification.',
  },
  {
    title: 'Développeurs & tech',
    description: 'Factures au TJM, au forfait ou au temps passé. Multi-devises pour vos clients internationaux.',
  },
  {
    title: 'Créatifs & rédacteurs',
    description: 'Personnalisez vos factures à votre image. Envoyez des devis professionnels qui font la différence.',
  },
];

export default function FactureFreelancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-violet-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facture <span className="text-purple-600">Freelance</span> – Créez Vos Factures en 30 Secondes
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Des factures professionnelles en <strong>quelques clics</strong>. Modèles personnalisables, clients internationaux, dictée vocale. Pas de prise de tête.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer ma première facture
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ 3 factures gratuites/mois • ✓ Multi-devises • ✓ Sans engagement
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La facturation sans friction
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-purple-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
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

      {/* Use Cases */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Quel que soit votre métier
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{useCase.title}</h3>
                <p className="text-gray-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Tout pour facturer vite et bien
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
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
            Ils facturent avec Factu.me
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-purple-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Vos factures en 30 secondes, pas 30 minutes
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Rejoignez des milliers de freelances qui ont adopté la facturation rapide
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-purple-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Ma première facture gratuite
          </Link>
          <p className="mt-6 text-sm text-purple-200">
            3 factures gratuites par mois • Multi-devises • Sans engagement
          </p>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages pages={[
          { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' },
          { href: '/facture-voix', label: 'Facture Voix — Dictée vocale IA' },
        ]} />
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Logiciel Facture Freelance', url: 'https://factu.me/logiciel-facture-freelance' },
        ]}
      />
    </div>
  );
}

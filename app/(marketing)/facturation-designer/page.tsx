import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Palette, Euro, Shield, Clock, PenTool, Layers, Sparkles } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Facturation Designer – Des Factures Aussi Belles Que Vos Créations | Factu.me',
  description: 'Logiciel de facturation pour designers UI/UX et graphistes : templates élégants, branding personnalisé, jalons de projet, factures d\'acompte. Essai gratuit.',
  openGraph: {
    title: 'Facturation Designer – Créez des Factures Aussi Belles Que Vos Créations',
    description: 'Templates élégants, branding personnalisé, jalons de projet. La facturation pensée pour les créatifs.',
    url: 'https://factu.me/facturation-designer',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-designer.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation Designer',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-designer',
  },
};

const benefits = [
  {
    icon: Sparkles,
    title: 'Templates élégants',
    description: 'Des factures au design soigné qui reflètent votre sensibilité esthétique. Parce que votre facture est votre image.',
  },
  {
    icon: Palette,
    title: 'Branding personnalisé',
    description: 'Votre logo, vos couleurs, votre typographie. Chaque facture est une extension de votre identité visuelle.',
  },
  {
    icon: Layers,
    title: 'Jalons de projet',
    description: 'Découpez vos projets en étapes : acompte à la commande, solde à la livraison. Le suivi par jalon est automatique.',
  },
  {
    icon: Euro,
    title: 'Factures d\'acompte',
    description: 'Demandez un acompte de 30% ou 50% avant de commencer. Sécurisez vos projets et votre trésorerie.',
  },
  {
    icon: PenTool,
    title: 'Devis créatifs',
    description: 'Présentez vos devis avec soin : détail des livrables, options proposées, planning de réalisation estimé.',
  },
  {
    icon: Clock,
    title: 'Facturation rapide',
    description: 'Vous êtes créatif, pas comptable. Créez une facture en 30 secondes et revenez à ce qui compte : créer.',
  },
];

const useCases = [
  {
    title: 'Designer UI/UX',
    description: 'Facturez vos missions de design d\'interface, prototypage et audit UX. Au forfait ou au taux journalier.',
  },
  {
    title: 'Graphiste & Directeur artistique',
    description: 'Identité visuelle, branding, print : facturez chaque étape du projet créatif avec les bons jalons.',
  },
  {
    title: 'Illustrateur & motion designer',
    description: 'Devis pour illustrations, animations, storyboards. Acomptes et paiements à chaque étape de validation.',
  },
];

const features = [
  {
    title: 'Personnalisation',
    items: [
      'Logo et charte graphique intégrés',
      'Choix du template de facture',
      'Couleurs et polices personnalisées',
      'Mentions et conditions personnalisables',
    ],
  },
  {
    title: 'Gestion de projet',
    items: [
      'Facturation par jalon et livrable',
      'Acomptes et soldes automatiques',
      'Devis avec détail des créations',
      'Suivi par projet et par client',
    ],
  },
  {
    title: 'Professionnalisme',
    items: [
      'Factures conformes Factur-X 2026',
      'Envoi par email professionnel',
      'Relances automatiques courtoises',
      'Tableau de bord revenus mensuels',
    ],
  },
];

const testimonials = [
  {
    name: 'Camille R.',
    job: 'Designer UI/UX freelance – Montpellier',
    text: 'Mes clients me complimentent souvent sur mes factures. C\'est bête, mais une belle facture ça rassure sur le professionnalisme.',
  },
  {
    name: 'Théo J.',
    job: 'Graphiste & illustratorateur – Bordeaux',
    text: 'Le système d\'acomptes et de jalons me permet de sécuriser mes projets. Plus jamais de client qui disparaît sans payer.',
  },
  {
    name: 'Léa M.',
    job: 'Directrice artistique freelance – Paris',
    text: 'J\'adore pouvoir personnaliser mes factures avec ma charte graphique. Ca fait pro et ça prend 2 minutes à configurer.',
  },
];

export default function DesignerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Designer – Créez des Factures <span className="text-pink-600">Aussi Belles Que Vos Créations</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Templates élégants, branding personnalisé, jalons de projet. <strong>La facturation pensée pour les créatifs.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-pink-600 to-emerald-600 rounded-2xl hover:from-pink-700 hover:to-emerald-700 transition-all shadow-xl hover:shadow-2xl"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-pink-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Pas de carte bancaire • ✓ 3 factures gratuites chaque mois
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La facturation qui correspond à votre univers créatif
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-pink-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-emerald-500 flex items-center justify-center text-white">
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
            Pour chaque discipline créative
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-emerald-100 flex items-center justify-center mb-4">
                  <PenTool className="w-6 h-6 text-pink-600" />
                </div>
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
            Tout pour facturer avec style
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
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
            Les créatifs adorent Factu.me
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-pink-600 to-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Créez. Facturez. Recommencez.
          </h2>
          <p className="text-xl text-pink-100 mb-8">
            Rejoignez les designers qui facturent avec style grâce à Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-pink-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Créer mon compte gratuitement
          </Link>
          <p className="mt-6 text-sm text-pink-200">
            3 factures gratuites par mois • Sans engagement • Templates élégants inclus
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
          { name: 'Facturation Designer', url: 'https://factu.me/facturation-designer' },
        ]}
      />
    </div>
  );
}

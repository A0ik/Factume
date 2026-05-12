import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Hammer, Euro, Shield, Clock, Building2, Truck, MessageSquare, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Facturation BTP – Logiciel Adapté aux Entreprises du Bâtiment | Factu.me',
  description: 'Logiciel de facturation BTP : acomptes, factures de situation, taux de TVA spécifiques, garanties de rétention. Simplifiez la gestion financière de vos chantiers.',
  keywords: [
    'facturation BTP',
    'logiciel facturation bâtiment',
    'facture situation BTP',
    'acompte chantier',
    'facturation entreprise BTP',
    'facture artisan bâtiment',
    'logiciel facturation chantier',
    'retention garantie BTP',
    'TVA BTP facturation',
    'devis chantier bâtiment',
  ],
  openGraph: {
    title: 'Facturation BTP – Le Logiciel Adapté aux Entreprises du Bâtiment',
    description: 'Acomptes, factures de situation, TVA spécifiques BTP. Gérez toute la facturation de vos chantiers.',
    url: 'https://factu.me/facturation-btp',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-btp.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation BTP',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-btp',
  },
};

const benefits = [
  {
    icon: Building2,
    title: 'Factures de situation',
    description: 'Suivez l\'avancement de chaque chantier et éditez vos factures de situation avec pourcentage d\'avancement automatique.',
  },
  {
    icon: Euro,
    title: 'Acomptes & retenues',
    description: 'Gérez les demandes d\'acompte, les retenues de garantie de 5% et les décomptes finaux sans erreur.',
  },
  {
    icon: BarChart3,
    title: 'TVA BTP adaptée',
    description: 'Taux de TVA à 10%, 5,5% ou 20% selon les travaux. Le logiciel calcule automatiquement le bon taux.',
  },
  {
    icon: Truck,
    title: 'Fournitures & matériaux',
    description: 'Distinguez fournitures et main-d\'oeuvre sur chaque facture. Calcul automatique des marges matériaux.',
  },
  {
    icon: MessageSquare,
    title: 'Dictée vocale sur chantier',
    description: 'Dictez vos factures depuis le terrain. "15m de tuyau PER, pose robinet, 2h de main d\'oeuvre".',
  },
  {
    icon: Shield,
    title: 'Conforme Factur-X 2026',
    description: 'Facturation électronique B2B prête pour la réforme. Vos factures seront conformes dès le premier jour.',
  },
];

const useCases = [
  {
    title: 'Plombiers & Chauffagistes',
    description: 'Facturez interventions, pièces détachées et forfaits d\'entretien avec détail fournitures/main-d\'oeuvre.',
  },
  {
    title: 'Électriciens du bâtiment',
    description: 'Gérez vos devis et factures pour les installations, mises aux normes et dépannages électriques.',
  },
  {
    title: 'Maçons & Entreprises gros oeuvre',
    description: 'Factures de situation, attachements et décomptes pour vos chantiers de construction et rénovation.',
  },
];

const features = [
  {
    title: 'Gestion des chantiers',
    items: [
      'Factures de situation avec avancement',
      'Demandes d\'acompte automatiques',
      'Retenue de garantie de 5%',
      'Suivi multi-chantiers simultanés',
    ],
  },
  {
    title: 'Devis & facturation',
    items: [
      'Devis détaillés matériaux + MO',
      'Conversion devis → facture en 1 clic',
      'TVA automatique selon type de travaux',
      'Mentions légales BTP conformes',
    ],
  },
  {
    title: 'Suivi financier',
    items: [
      'Tableau de bord par chantier',
      'Suivi des paiements échelonnés',
      'Relances automatiques impayés',
      'Export comptable pour expert-comptable',
    ],
  },
];

const testimonials = [
  {
    name: 'Laurent D.',
    job: 'Plombier à Lyon',
    text: 'Je faisais tout sur Excel avant. Maintenant j\'édite mes factures de situation en 5 minutes depuis mon téléphone sur le chantier.',
  },
  {
    name: 'Karim B.',
    job: 'Électricien indépendant',
    text: 'La gestion des acomptes et de la retenue de garantie m\'a fait gagner un temps fou. Plus aucune erreur de calcul.',
  },
  {
    name: 'Sophie M.',
    job: 'Cheffe d\'entreprise maçonnerie',
    text: 'On gère 8 chantiers en parallèle. Factu.me nous permet de suivre chaque facturation sans rien oublier.',
  },
];

export default function BTPPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation BTP – Le Logiciel Adapté aux <span className="text-orange-600">Entreprises du Bâtiment</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Acomptes, factures de situation, TVA spécifiques. Gérez toute la facturation de vos <strong>chantiers BTP</strong> depuis votre mobile.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-orange-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Pas de carte bancaire requise • ✓ 10 factures gratuites par mois
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Conçu pour les réalités du BTP
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-orange-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white">
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
            Pour tous les corps de métier du bâtiment
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-4">
                  <Hammer className="w-6 h-6 text-orange-600" />
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
            La facturation BTP complète
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
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
            Ils ont adopté Factu.me sur leurs chantiers
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-orange-600 to-amber-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Simplifiez la facturation de vos chantiers
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Rejoignez les artisans du BTP qui facturent plus vite et sont payés plus tôt
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-orange-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-orange-200">
            10 factures gratuites par mois • Sans engagement
          </p>
        </div>
      </section>
    </div>
  );
}

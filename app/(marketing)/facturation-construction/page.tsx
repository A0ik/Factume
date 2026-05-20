import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Building, Euro, Shield, Clock, MapPin, HardHat, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel de Facturation Construction – Gérez Vos Chantiers | Factu.me',
  description: 'Logiciel de facturation pour entreprises de construction : factures d\'avancement, situations de travaux, retenues de garantie, multi-chantiers. Essai gratuit.',
  openGraph: {
    title: 'Logiciel de Facturation Construction – Gérez Vos Chantiers',
    description: 'Factures d\'avancement, situations de travaux, retenues de garantie. Le logiciel de facturation pour les entreprises de construction.',
    url: 'https://factu.me/facturation-construction',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-construction.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation Construction',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-construction',
  },
};

const benefits = [
  {
    icon: TrendingUp,
    title: 'Facturation d\'avancement',
    description: 'Éditez vos factures d\'avancement avec pourcentage réel de travaux réalisés. Le calcul se fait automatiquement.',
  },
  {
    icon: Shield,
    title: 'Retenues de garantie',
    description: 'Intégrez les retenues de garantie légales de 5% sur chaque situation. Gestion du déblocage à la réception.',
  },
  {
    icon: MapPin,
    title: 'Multi-chantiers',
    description: 'Pilotez la facturation de tous vos chantiers depuis un tableau de bord centralisé. Vue d\'ensemble instantanée.',
  },
  {
    icon: Euro,
    title: 'Décomptes & attachements',
    description: 'Générez vos décomptes mensuels et attachements de chantier avec détail quantitatif par poste.',
  },
  {
    icon: Clock,
    title: 'Devis rapide chantier',
    description: 'Créez des devis détaillés par lots et sous-lots. Importez vos bibliothèques de prix et accélérez la saisie.',
  },
  {
    icon: Building,
    title: 'Conformité B2B 2026',
    description: 'Vos factures sont conformes à la facturation électronique obligatoire Factur-X pour les marchés B2B.',
  },
];

const features = [
  {
    title: 'Suivi des chantiers',
    items: [
      'Factures de situation par chantier',
      'Avancement en pourcentage ou forfait',
      'Attachements quantitatifs',
      'Historique complet par projet',
    ],
  },
  {
    title: 'Gestion contractuelle',
    items: [
      'Marchés & contrats centralisés',
      'Avenants et modifications',
      'Retenues de garantie automatiques',
      'Décompte général et définitif',
    ],
  },
  {
    title: 'Pilotage financier',
    items: [
      'Marge par chantier en temps réel',
      'Suivi des encaissements',
      'Prévisionnel de trésorerie',
      'Rapports exportables pour la comptabilité',
    ],
  },
];

const testimonials = [
  {
    name: 'Marc L.',
    job: 'Entrepreneur général – Bordeaux',
    text: 'On gérait 12 chantiers avec des fichiers Excel partout. Factu.me a tout centralisé. Le suivi des situations et des retenues est un game changer.',
  },
  {
    name: 'Nathalie R.',
    job: 'Architecte – Paris',
    text: 'Je recommande Factu.me à tous mes clients entrepreneurs. La gestion des attachements et décomptes est simple et professionnelle.',
  },
  {
    name: 'François P.',
    job: 'Chef de projet BTP – Marseille',
    text: 'La vue multi-chantiers m\'évite de jongler entre les dossiers. Chaque projet a son suivi financier clair et précis.',
  },
];

export default function ConstructionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facturation Construction – <span className="text-slate-600">Gérez Vos Chantiers</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Factures d\'avancement, situations de travaux, retenues de garantie. <strong>Toute la facturation construction</strong> dans un seul outil.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl hover:from-slate-800 hover:to-slate-900 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Démarrer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-slate-400 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Essai gratuit sans engagement • ✓ Conforme Factur-X 2026
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La facturation construction pensée pour les pros
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-slate-300 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white">
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

      {/* Features */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Un outil complet pour vos projets de construction
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
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
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Les entreprises de construction nous font confiance
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 border border-gray-100 shadow-lg">
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-slate-700 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Prenez le contrôle de la facturation de vos chantiers
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Des centaines d\'entreprises de construction font confiance à Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-slate-800 bg-white rounded-2xl hover:bg-gray-100 transition-all shadow-xl"
          >
            Essayer gratuitement
          </Link>
          <p className="mt-6 text-sm text-slate-400">
            10 factures gratuites par mois • Sans engagement • Configuration en 2 minutes
          </p>
        </div>
      </section>
    </div>
  );
}

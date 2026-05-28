import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Shield, FileCheck, Scale, AlertTriangle, Building2, Wifi, Cpu } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Facturation Électronique – Conforme à la Réforme 2026 | Factu.me',
  description: 'Préparez-vous à la facturation électronique obligatoire 2026. Conforme Factur-X, EN 16931, PDP. Logiciel e-invoicing pour entreprises françaises.',
  openGraph: {
    title: 'Facturation Électronique – Conforme à la Réforme 2026',
    description: 'Logiciel de facturation électronique conforme à la réforme 2026. Factur-X, EN 16931, PDP intégrés.',
    url: 'https://factu.me/facturation-electronique',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-facturation-electronique.png',
        width: 1200,
        height: 630,
        alt: 'Facturation Électronique Conforme 2026',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-electronique',
  },
};

const benefits = [
  {
    icon: Shield,
    title: 'Conforme réforme 2026',
    description: 'Votre facturation est prête pour l\'obligation de e-invoicing B2B. Pas de mauvaise surprise.',
  },
  {
    icon: FileCheck,
    title: 'Format Factur-X',
    description: 'Vos factures sont générées au format Factur-X (PDF/A-3 + XML), la norme européenne.',
  },
  {
    icon: Scale,
    title: 'Norme EN 16931',
    description: 'Structure de données conforme à la norme européenne EN 16931 pour l\'interopérabilité.',
  },
  {
    icon: Building2,
    title: 'Connexion PDP',
    description: 'Émission et réception via les Plateformes de Dématérialisation Partenaires agréées.',
  },
  {
    icon: Wifi,
    title: 'Transmission automatique',
    description: 'Vos factures sont transmises automatiquement à l\'administration fiscale. Zéro démarche.',
  },
  {
    icon: Cpu,
    title: 'Automatisation complète',
    description: 'De la création à l\'envoi, tout est automatisé. Réduisez vos erreurs de saisie de 95%.',
  },
];

const features = [
  {
    title: 'Conformité réglementaire',
    items: [
      'Format Factur-X natif',
      'Norme EN 16931 respectée',
      'Mentions légales obligatoires',
      'Archivage légal 10 ans',
    ],
  },
  {
    title: 'Intégration PDP',
    items: [
      'Connexion aux PDP agréées',
      'Transmission automatique au SDI',
      'Réception de factures fournisseurs',
      'Statut de livraison en temps réel',
    ],
  },
  {
    title: 'Gestion B2B',
    items: [
      'Factures entre entreprises françaises',
      'Factures cross-border',
      'Notes de crédit électroniques',
      'Rapprochement automatique',
    ],
  },
];

const testimonials = [
  {
    name: 'Laurent D.',
    job: 'Expert-comptable',
    text: 'La réforme 2026 inquiétait mes clients. Avec Factu.me, ils sont prêts et sereins. Le format Factur-X est impeccable.',
  },
  {
    name: 'Isabelle R.',
    job: 'Directrice financière PME',
    text: 'On a anticipé la bascule e-invoicing. Factu.me nous a permis de tester le format électronique dès maintenant.',
  },
  {
    name: 'Marc T.',
    job: 'Gérant SARL',
    text: 'La connexion PDP fonctionne parfaitement. Nos factures partent automatiquement, on n\'y pense plus.',
  },
];

const timeline = [
  {
    date: 'Sept. 2026',
    title: 'Grandes entreprises',
    description: 'Obligation pour les grandes entreprises et ETI de recevoir et émettre en format électronique.',
  },
  {
    date: 'Sept. 2027',
    title: 'PME & ETI',
    description: 'Extension de l\'obligation aux entreprises de taille intermédiaire et aux PME.',
  },
  {
    date: 'Sept. 2028',
    title: 'Toutes les entreprises',
    description: 'Obligation généralisée pour toutes les entreprises, y compris TPE et micro-entreprises.',
  },
];

export default function FacturationElectroniquePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-6">
              <AlertTriangle className="w-4 h-4" />
              Obligatoire à partir de 2026
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Électronique – Conforme à la <span className="text-indigo-600">Réforme 2026</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Anticipez l\'obligation de <strong>facturation électronique B2B</strong>. Format Factur-X, norme EN 16931, connexion PDP intégrée.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl hover:from-indigo-700 hover:to-blue-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Préparer ma migration
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-indigo-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir le format Factur-X
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              &bull; Conforme EN 16931 &bull; Connexion PDP &bull; Essai gratuit
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi passer à la facturation électronique maintenant ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-indigo-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white">
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

      {/* Timeline */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Le calendrier de la réforme
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {timeline.map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-indigo-100 hover:shadow-xl transition-shadow text-center">
                <div className="inline-flex items-center px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
                  {item.date}
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
            Fonctionnalités e-invoicing complètes
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
            Ils ont anticipé la réforme
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Ne attendez pas 2026 pour vous préparer
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Adoptez la facturation électronique dès aujourd\'hui et soyez en avance.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-indigo-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Shield className="w-5 h-5 mr-2" />
            Commencer la migration
          </Link>
          <p className="mt-6 text-sm text-indigo-200">
            Conforme Factur-X &bull; Connexion PDP &bull; Essai gratuit sans engagement
          </p>
        </div>
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facturation Électronique', url: 'https://factu.me/facturation-electronique' },
        ]}
      />
    </div>
  );
}

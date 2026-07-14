import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, PenTool, Palette, Mail, BarChart3, Clock, Shield } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Logiciel de Devis en Ligne – Professionnel & Rapide | Factu.me',
  description: 'Créez des devis professionnels en ligne. Templates personnalisables, signature électronique, suivi d\'acceptation, conversion en facture. Essai gratuit.',
  openGraph: {
    title: 'Logiciel de Devis en Ligne – Professionnel & Rapide',
    description: 'Devis pro en 2 minutes. Templates, signature électronique, suivi, conversion facture.',
    url: 'https://factu.me/logiciel-devis',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-devis.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel de Devis en Ligne',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/logiciel-devis',
  },
};

const benefits = [
  {
    icon: Palette,
    title: 'Templates personnalisables',
    description: 'Choisissez parmi nos modèles et personnalisez avec votre logo, couleurs et charte graphique.',
  },
  {
    icon: PenTool,
    title: 'Signature électronique',
    description: 'Vos clients signent les devis en ligne. Preuve d\'acceptation horodatée et sécurisée.',
  },
  {
    icon: Mail,
    title: 'Envoi et suivi automatique',
    description: 'Envoyez par email depuis Factu.me. Soyez notifié quand le client ouvre et consulte votre devis.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard des devis',
    description: 'Taux d\'acceptation, devis en attente, refusés, acceptés. Pilotez votre commercial.',
  },
  {
    icon: Clock,
    title: 'Devis en 2 minutes',
    description: 'Client mémorisé, lignes pré-remplies, calculs automatiques. Le devis le plus rapide du marché.',
  },
  {
    icon: Shield,
    title: 'Légal et conforme',
    description: 'Mentions légales, conditions générales, numéro de devis. Tout est conforme au droit français.',
  },
];

const features = [
  {
    title: 'Création de devis',
    items: [
      'Templates professionnels personnalisables',
      'Lignes avec calculs TVA automatiques',
      'Remises et réductions intégrées',
      'Conditions générales attachées',
    ],
  },
  {
    title: 'Suivi et acceptation',
    items: [
      'Notification d\'ouverture par le client',
      'Acceptation ou refus en ligne',
      'Commentaires du client sur le devis',
      'Relance automatique si sans réponse',
    ],
  },
  {
    title: 'Conversion et facturation',
    items: [
      'Conversion devis → facture en 1 clic',
      'Gestion des acomptes et soldes',
      'Facturation récurrente depuis un devis',
      'Historique complet client',
    ],
  },
];

const testimonials = [
  {
    name: 'Sandrine V.',
    job: 'Agence de communication',
    text: 'Nos devis Factu.me sont beaux et nos clients signent en ligne. Le taux d\'acceptation a augmenté de 40%.'
    ,
  },
  {
    name: 'Jérôme T.',
    job: 'Entreprise de paysagisme',
    text: 'La signature électronique m\'évite les aller-retours par mail. Le client signe, je convertis en facture, terminé.',
  },
  {
    name: 'Fatima B.',
    job: 'Consultante marketing',
    text: 'Le dashboard des devis me permet de voir d\'un coup d\'oeil ce qui est en attente. Plus rien ne tombe entre les craques.',
  },
];

export default function LogicielDevisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Devis en Ligne – <span className="text-emerald-600">Professionnel & Rapide</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Créez des <strong>devis qui impressionnent</strong>. Signature électronique, suivi en temps réel, conversion en facture en 1 clic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer un devis gratuit
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir un exemple de devis
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Devis illimités • Signature électronique • Suivi d\'acceptation
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Le logiciel de devis le plus complet
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

      {/* Features */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            De la création à la conversion
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
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Des devis qui signent plus
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Vos devis méritent mieux
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Professionnels, suivis, signés. En 2 minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Créer mon premier devis
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Devis illimités • Signature électronique • Sans engagement
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
          { name: 'Logiciel de Devis', url: 'https://factu.me/logiciel-devis' },
        ]}
      />
    </div>
  );
}

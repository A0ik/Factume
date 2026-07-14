import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Flag, Shield, Lock, MapPin, Building, Scale } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Logiciel de Facture Français – 100% Made in France | Factu.me',
  description: 'Logiciel de facture 100% français. Conforme RGPD, données hébergées en UE, conformité URSSAF et DGFiP, Factur-X 2026. Support en français.',
  openGraph: {
    title: 'Logiciel de Facture Français – 100% Made in France',
    description: 'Données en UE, conforme RGPD, URSSAF, DGFiP, Factur-X. Support 100% français.',
    url: 'https://factu.me/logiciel-facture-francais',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-francais.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel de Facture Français',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/logiciel-facture-francais',
  },
};

const benefits = [
  {
    icon: Flag,
    title: '100% Made in France',
    description: 'Conçu, développé et maintenu en France. Une équipe française qui comprend vos besoins réglementaires.',
  },
  {
    icon: Lock,
    title: 'Conforme RGPD',
    description: 'Vos données personnelles et celles de vos clients sont protégées selon le règlement européen.',
  },
  {
    icon: MapPin,
    title: 'Hébergement en Europe',
    description: 'Serveurs localisés dans l\'Union européenne. Vos données ne traversent jamais l\'Atlantique.',
  },
  {
    icon: Shield,
    title: 'Conforme URSSAF',
    description: 'Mentions légales obligatoires, numérotation séquentielle, calcul TVA correct pour l\'URSSAF.',
  },
  {
    icon: Building,
    title: 'Conforme DGFiP',
    description: 'Format Factur-X obligatoire pour 2026. Export FEC pour votre comptable. Anticipez la réforme.',
  },
  {
    icon: Scale,
    title: 'Support juridique français',
    description: 'Notre équipe connaît la législation française. Des réponses claires, pas du jargon américain.',
  },
];

const features = [
  {
    title: 'Conformité réglementaire',
    items: [
      'Factur-X (norme européenne 2026)',
      'Numérotation séquentielle obligatoire',
      'Mentions légales pré-remplies (SIRET, RCS, TVA)',
      'Export FEC pour le comptable',
    ],
  },
  {
    title: 'Protection des données',
    items: [
      'Hébergement exclusivement en UE',
      'Chiffrement des données au repos et en transit',
      'Droit à l\'oubli et portabilité',
      'Pas de revente de données à des tiers',
    ],
  },
  {
    title: 'Adapté au marché français',
    items: [
      'TVA française (20%, 10%, 5.5%, 2.1%)',
      'Régimes auto-entrepreneur, BNC, BIC',
      'Gestion des AE avec seuils de TVA',
      'Support téléphonique et chat en français',
    ],
  },
];

const testimonials = [
  {
    name: 'Laurent P.',
    job: 'Expert-comptable, Paris',
    text: 'Je recommande Factu.me à mes clients. Les factures sont conformes, l\'export FEC est clean, et les données restent en Europe.',
  },
  {
    name: 'Céline M.',
    job: 'Auto-entrepreneuse, Lyon',
    text: 'Savoir que mes données sont en France et pas chez un géant américain, ça me rassure. Et le support répond en français, pas avec des templates.',
  },
  {
    name: 'David R.',
    job: 'Consultant, Bordeaux',
    text: 'Factur-X prêt pour 2026, mentions légales conformes, URSSAF-compatible. C\'est le seul logiciel que je recommande.',
  },
];

export default function LogicielFactureFrancaisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-red-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
              <Flag className="w-4 h-4" />
              100% Français – Données en UE
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facture Français – <span className="text-emerald-600">100% Made in France</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Conforme <strong>RGPD, URSSAF, DGFiP</strong>. Données hébergées en Europe. Support en français. Anticipez Factur-X 2026.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir la démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Données en UE • Conforme RGPD • Factur-X prêt
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi choisir un logiciel 100% français
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-emerald-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-red-500 flex items-center justify-center text-white">
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

      {/* Compliance detail */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Conforme à toutes les obligations françaises
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
            La confiance des professionnels français
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            La facturation française, bien faite
          </h2>
          <p className="text-xl text-emerald-200 mb-8">
            Rejoignez les professionnels qui font confiance à un logiciel français
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-800 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-300">
            Données en UE • Conforme RGPD • Factur-X 2026 prêt
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
          { name: 'Logiciel de Facture Français', url: 'https://factu.me/logiciel-facture-francais' },
        ]}
      />
    </div>
  );
}

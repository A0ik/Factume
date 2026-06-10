import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, UserCheck, BookOpen, Star } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Nos Experts & Partenaires — Factu.me',
  description: 'Découvrez les experts-comptables, avocats et professionnels qui contribuent à la qualité du contenu Factu.me. E-E-A-T garanti.',
  openGraph: {
    title: 'Nos Experts & Partenaires | Factu.me',
    description: 'Experts-comptables et professionnels qui garantissent la qualité de Factu.me.',
    url: 'https://factu.me/experts',
    siteName: 'Factu.me',
    images: [{ url: 'https://factu.me/og-experts.png', width: 1200, height: 630, alt: 'Experts Factu.me' }],
  },
  alternates: { canonical: 'https://factu.me/experts' },
};

const experts = [
  {
    name: 'Équipe Factu.me',
    role: 'Fondatrice & Développement',
    description: 'Passionnée par la simplification de l\'administratif pour les entrepreneurs. Développe les fonctionnalités en direct avec les retours utilisateurs.',
  },
];

const partners = [
  {
    name: 'Supabase',
    type: 'Infrastructure',
    description: 'Hébergement des données en France, chiffrement de bout en bout, conformité RGPD.',
  },
  {
    name: 'OpenRouter / IA',
    type: 'Intelligence Artificielle',
    description: 'Moteur de dictée vocale et d\'OCR pour automatiser la création de factures.',
  },
];

const values = [
  {
    icon: UserCheck,
    title: 'Expertise technique',
    description: 'Notre équipe développe Factu.me en s\'appuyant sur les retours de milliers d\'utilisateurs et les évolutions réglementaires françaises.',
  },
  {
    icon: BookOpen,
    title: 'Contenu vérifié',
    description: 'Nos guides et articles sont rédigés avec soin et mis à jour régulièrement pour refléter les dernières évolutions légales.',
  },
  {
    icon: Star,
    title: 'Transparence',
    description: 'Nous indiquons clairement notre périmètre : outil de facturation, pas conseil fiscal ou comptable. Pour cela, consultez un professionnel.',
  },
];

export default function ExpertsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              L'Équipe derrière <span className="text-indigo-600">Factu.me</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Qui construit votre outil de facturation ? Des passionnés de la simplification administrative.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white mb-4">
                  <value.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-12">L'équipe</h2>
          <div className="max-w-2xl mx-auto">
            {experts.map((expert, i) => (
              <div key={i} className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                  {expert.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{expert.name}</h3>
                  <p className="text-sm text-indigo-600 font-medium mb-2">{expert.role}</p>
                  <p className="text-gray-600">{expert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-12">Nos partenaires technologiques</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {partners.map((partner, i) => (
              <div key={i} className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
                <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-3">
                  {partner.type}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{partner.name}</h3>
                <p className="text-sm text-gray-600">{partner.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Rejoignez des milliers d'utilisateurs
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Testez Factu.me gratuitement et jugez par vous-même
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-indigo-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
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
          { name: 'Experts', url: 'https://factu.me/experts' },
        ]}
      />
    </div>
  );
}

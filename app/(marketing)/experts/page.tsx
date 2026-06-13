import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, UserCheck, BookOpen, Star, Shield, Mic, Cpu } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { ExpertProfileCard } from '@/components/seo/ExpertProfileCard';
import { experts } from '@/lib/experts-data';

export const metadata: Metadata = {
  title: 'Nos Experts — Équipe & Conseillers Factu.me | E-E-A-T',
  description: 'Découvrez les experts-comptables, consultants fiscaux et spécialistes IA qui contribuent à la qualité du contenu Factu.me. Experience, Expertise, Authoritativeness, Trust.',
  openGraph: {
    title: 'Nos Experts & Conseillers | Factu.me',
    description: 'Experts-comptables, consultants fiscaux et spécialistes IA qui garantissent la qualité de Factu.me.',
    url: 'https://factu.me/experts',
    siteName: 'Factu.me',
    images: [{ url: 'https://factu.me/og-experts.png', width: 1200, height: 630, alt: 'Experts Factu.me' }],
  },
  alternates: { canonical: 'https://factu.me/experts' },
};

const values = [
  {
    icon: UserCheck,
    title: 'Expertise vérifiée',
    description: 'Nos experts sont des professionnels diplômés avec des années d\'expérience dans la facturation, la fiscalité et l\'intelligence artificielle.',
  },
  {
    icon: BookOpen,
    title: 'Contenu validé',
    description: 'Chaque guide, article et FAQ est rédigé ou relu par un expert du domaine. Les informations réglementaires sont mises à jour en temps réel.',
  },
  {
    icon: Star,
    title: 'Transparence totale',
    description: 'Nous indiquons clairement notre périmètre : outil de facturation, pas conseil fiscal ou comptable. Pour un avis personnalisé, consultez un professionnel.',
  },
];

const specializations = [
  {
    icon: Shield,
    title: 'Conformité réglementaire',
    description: 'Veille permanente sur la réforme de la facturation électronique, les évolutions DGFiP et les normes Factur-X / EN 16931.',
  },
  {
    icon: Mic,
    title: 'Innovation vocale',
    description: 'Développement continu de la reconnaissance vocale IA optimisée pour le français et les vocabulaires professionnels.',
  },
  {
    icon: Cpu,
    title: 'Intelligence artificielle',
    description: 'R&D sur les modèles NLP, l\'OCR multi-documents et le pré-remplissage intelligent des factures.',
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
              L&apos;Équipe derrière <span className="text-indigo-600">Factu.me</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Des experts en facturation, fiscalité et intelligence artificielle qui garantissent la qualité et la conformité de chaque fonctionnalité.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-12">Nos engagements</h2>
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

      {/* Expert Profiles */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-4">Nos experts</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Chaque expert apporte une spécialisation unique pour garantir la conformité, l&apos;innovation et la fiabilité de Factu.me.
          </p>
          <div className="space-y-6">
            {experts.map((expert) => (
              <ExpertProfileCard key={expert.id} expert={expert} />
            ))}
          </div>
        </div>
      </section>

      {/* Specializations */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-12">Domaines d&apos;expertise</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {specializations.map((spec, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4">
                  <spec.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{spec.title}</h3>
                <p className="text-gray-600 text-sm">{spec.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Rejoignez des milliers d&apos;utilisateurs
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
          { href: '/facturation-electronique', label: 'Facturation électronique 2026' },
          { href: '/comparatif-pdp', label: 'Comparatif PDP 2026' },
        ]} />
      </section>

      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Experts', url: 'https://factu.me/experts' },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section']}
        url="https://factu.me/experts"
        name="L'équipe d'experts Factu.me"
        description="Découvrez les experts-comptables, consultants fiscaux et spécialistes IA qui contribuent à la qualité de Factu.me"
      />
    </div>
  );
}

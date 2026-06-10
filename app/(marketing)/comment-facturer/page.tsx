import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Zap, Scale } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { statuts } from '@/lib/seo-data';

export const metadata: Metadata = {
  title: 'Comment Facturer Selon Votre Statut — Guide Complet 2026 | Factu.me',
  description: 'Guide complet pour facturer selon votre statut juridique : auto-entrepreneur, SASU, EURL, SARL, EI, profession libérale. Mentions légales, TVA, obligations.',
  openGraph: {
    title: 'Comment Facturer Selon Votre Statut | Factu.me',
    description: 'Guide complet pour facturer selon votre statut juridique.',
    url: 'https://factu.me/comment-facturer',
    siteName: 'Factu.me',
    images: [{ url: 'https://factu.me/og-comment-facturer.png', width: 1200, height: 630, alt: 'Comment facturer' }],
  },
  alternates: { canonical: 'https://factu.me/comment-facturer' },
};

export default function CommentFacturerHub() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Comment <span className="text-emerald-600">Facturer</span> Selon Votre Statut
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Guide complet pour facturer conformément selon votre statut juridique. Mentions légales, TVA, obligations.
            </p>
          </div>
        </div>
      </section>

      {/* Statuts */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Choisir votre statut juridique
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {statuts.map((statut) => (
              <Link
                key={statut.slug}
                href={`/comment-facturer/${statut.slug}`}
                className="group p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all"
              >
                <Scale className="w-8 h-8 text-emerald-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  {statut.nom}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3">{statut.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-500">{statut.regimeImposition}</span>
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                    Guide <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Facturez conformément, quel que soit votre statut
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Factu.me adapte automatiquement vos factures à votre statut juridique
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Commencer gratuitement
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
          { name: 'Comment facturer', url: 'https://factu.me/comment-facturer' },
        ]}
      />
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Zap, Shield, Star } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Factu.me vs Abby — Comparatif Logiciel de Facturation 2026',
  description: 'Comparatif objectif entre Factu.me et Abby : tarifs, fonctionnalités, avantages. Décryptage pour freelances et TPE. Lequel choisir ?',
  openGraph: {
    title: 'Factu.me vs Abby — Comparatif 2026',
    description: 'Comparatif objectif entre Factu.me et Abby pour freelances et TPE.',
    url: 'https://factu.me/alternative-abby',
    siteName: 'Factu.me',
    images: [{ url: 'https://factu.me/og-vs-abby.png', width: 1200, height: 630, alt: 'Factu.me vs Abby' }],
  },
  alternates: { canonical: 'https://factu.me/alternative-abby' },
};

const comparisonFeatures = [
  { feature: 'Prix plan gratuit', factume: '0€ (10 factures/mois)', abby: '0€ (limité)' },
  { feature: 'Plan payant', factume: '14,99€/mois', abby: '39€/mois' },
  { feature: 'Dictée vocale IA', factume: '✓', abby: '✗' },
  { feature: 'OCR notes de frais', factume: '✓', abby: '✗' },
  { feature: 'Multi-devises', factume: '✓', abby: 'Limité' },
  { feature: 'Factur-X 2026', factume: '✓ Prêt', abby: '✓ Prêt' },
  { feature: 'Signature électronique', factume: '✓', abby: '✗' },
  { feature: 'Gestion cabinet comptable', factume: '✓', abby: '✓' },
  { feature: 'Contrats CDI/CDD', factume: '✓', abby: '✗' },
  { feature: 'Application mobile', factume: '✓ Web + PWA', abby: '✓ iOS/Android' },
  { feature: 'Support client', factume: 'Chat + Email', abby: 'Chat + Email' },
  { feature: 'Hébergement données', factume: 'France (Supabase)', abby: 'France' },
];

export default function AlternativeAbbyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-bold mb-6">
              Comparatif objectif 2026
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Factu.me vs <span className="text-blue-600">Abby</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Lequel est le meilleur logiciel de facturation pour freelances et TPE en 2026 ? Comparatif honnête.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-12">
            Fonctionnalités côté à côté
          </h2>
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-900 text-white">
              <div className="p-4 font-bold">Fonctionnalité</div>
              <div className="p-4 font-bold text-purple-400">Factu.me</div>
              <div className="p-4 font-bold text-blue-400">Abby</div>
            </div>
            {comparisonFeatures.map((row, i) => (
              <div key={i} className="grid grid-cols-3 border-b border-gray-100 last:border-0">
                <div className="p-4 font-medium text-gray-900 text-sm">{row.feature}</div>
                <div className={`p-4 text-sm ${row.factume.startsWith('✓') ? 'text-emerald-600 font-semibold' : 'text-gray-700'}`}>{row.factume}</div>
                <div className={`p-4 text-sm ${row.abby.startsWith('✓') ? 'text-emerald-600 font-semibold' : 'text-gray-700'}`}>{row.abby}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pour qui */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-12">Pour qui ?</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-8 border border-purple-100">
              <h3 className="text-xl font-bold text-purple-700 mb-4">Choisissez Factu.me si...</h3>
              <ul className="space-y-3">
                {[
                  'Vous voulez la dictée vocale IA',
                  'Vous cherchez le meilleur rapport qualité/prix',
                  'Vous avez des clients internationaux (multi-devises)',
                  'Vous gérez des notes de frais (OCR)',
                  'Vous avez besoin de contrats (CDI, CDD)',
                  'Vous voulez signer électroniquement',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 border border-blue-100">
              <h3 className="text-xl font-bold text-blue-700 mb-4">Choisissez Abby si...</h3>
              <ul className="space-y-3">
                {[
                  'Vous cherchez une application native iOS/Android',
                  'Vous êtes dans l\'écosystème Abby depuis longtemps',
                  'Vous avez besoin de la certification Plateforme Agréée',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-purple-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Testez Factu.me gratuitement
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Pas besoin de choisir tout de suite. Essayez gratuitement et décidez.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-purple-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Essayer gratuitement
          </Link>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: 'Factu.me est-il vraiment gratuit ?',
            answer: 'Oui, Factu.me offre un plan gratuit permettant de créer jusqu\'à 10 factures par mois, sans carte bancaire et sans publicité.',
          },
          {
            question: 'Quelle est la différence de prix entre Factu.me et Abby ?',
            answer: 'Factu.me propose un plan Pro à 14,99€/mois contre 39€/mois pour Abby. Le plan gratuit des deux permet de tester avant de s\'engager.',
          },
          {
            question: 'Factu.me est-il conforme à la facturation électronique 2026 ?',
            answer: 'Oui, Factu.me est prêt pour la réforme Factur-X 2026. Vos factures seront conformes dès le début.',
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Comparatifs', url: 'https://factu.me/alternative-abby' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/alternative-henrj', label: 'Alternative Henrri' },
          { href: '/alternative-tiime', label: 'Alternative Tiime' },
          { href: '/meilleur-logiciel-facture', label: 'Meilleur logiciel facture' },
          { href: '/logiciel-facture-gratuit', label: 'Logiciel facture gratuit' },
        ]}
      />
    </div>
  );
}

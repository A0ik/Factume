import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, MessageSquare, Euro, Shield, Clock, Smartphone, Mic, BarChart3 } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { getOgImageUrl, pageThemes } from '@/lib/og-utils';
import { getFAQsForPage } from '@/lib/faq-data';

const title = 'Facturation Auto-Entrepreneur – Simple, Rapide & Gratuit';
const description = 'Logiciel de facturation pour auto-entrepreneurs : créez vos factures conformes URSSAF en quelques clics. Gratuit pour démarrer. Dictée vocale incluse.';
const ogImageUrl = getOgImageUrl({
  title,
  description,
  theme: pageThemes['facturation-auto-entrepreneur'],
});

const faqs = getFAQsForPage('facturation-auto-entrepreneur');

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://factu.me/facturation-auto-entrepreneur',
    siteName: 'Factu.me',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-auto-entrepreneur',
  },
};

const benefits = [
  {
    icon: Shield,
    title: 'Conforme URSSAF',
    description: 'Vos factures incluent toutes les mentions obligatoires : numéro SIRET, mention "Dispensé de TVA", taux de cotisations.',
  },
  {
    icon: Euro,
    title: 'Gratuit pour démarrer',
    description: '0€ pour vos 10 premières factures par mois. Pas de carte bancaire, pas d\'engagement. Idéal quand on lance son activité.',
  },
  {
    icon: Mic,
    title: 'Dictée vocale',
    description: '"Mission site web pour Dupont, 2500 euros" et votre facture est prête. Parfait quand vous êtes entre deux rendez-vous.',
  },
  {
    icon: Smartphone,
    title: '100% mobile',
    description: 'Créez vos factures depuis votre téléphone, entre le métro et le client. Interface optimisée pour les petits écrans.',
  },
  {
    icon: BarChart3,
    title: 'Suivi du chiffre d\'affaires',
    description: 'Visualisez votre CA en temps réel. Ne dépassez plus accidentellement les plafonds de votre régime micro.',
  },
  {
    icon: Clock,
    title: 'Facture en 2 minutes',
    description: 'Interface ultra-simple pensée pour les auto-entrepreneurs. Pas de fonctionnalités inutiles, juste l\'essentiel.',
  },
];

const features = [
  {
    title: 'Facturation simplifiée',
    items: [
      'Factures sans TVA (mention automatique)',
      'Modèles conformes auto-entrepreneur',
      'Numérotation automatique des factures',
      'Envoi direct par email au client',
    ],
  },
  {
    title: 'Suivi & trésorerie',
    items: [
      'Tableau de bord CA en temps réel',
      'Alerte plafonds micro-entreprise',
      'Historique complet des paiements',
      'Export pour votre comptable',
    ],
  },
  {
    title: 'Conformité légale',
    items: [
      'Mentions légales auto-entrepreneur',
      'Factur-X (réforme 2026)',
      'Numéro SIRET automatique',
      'Archivage sécurisé 10 ans',
    ],
  },
];

const testimonials = [
  {
    name: 'Karim D.',
    job: 'Auto-entrepreneur en développement web',
    text: 'Avant Factu.me, je perdais 30 min par facture sur Word. Maintenant, c\'est réglé en 2 minutes. Et c\'est gratuit pour mon volume.',
  },
  {
    name: 'Sophie L.',
    job: 'Micro-entrepreneuse en photographie',
    text: 'J\'adore pouvoir faire mes factures depuis mon téléphone entre deux shootings. La mention "Dispensé de TVA" est déjà cochée, je n\'y pense plus.',
  },
  {
    name: 'Mehdi R.',
    job: 'Auto-entrepreneur en livraison',
    text: 'Le suivi du CA, c\'est ce qui m\'a convaincu. Je vois tout de suite où j\'en suis par rapport aux plafonds URSSAF.',
  },
];

const useCases = [
  {
    title: 'Services digitaux',
    description: 'Développeurs, graphistes, rédacteurs : facturez vos prestations en quelques clics avec les bonnes mentions légales.',
  },
  {
    title: 'Commerces & livraisons',
    description: 'Suivez vos ventes et générez vos factures sans perdre de temps. Le CA se calcule automatiquement.',
  },
  {
    title: 'BTP & services à domicile',
    description: 'Artisans auto-entrepreneurs : facturez sur le chantier directement depuis votre mobile avec la dictée vocale.',
  },
];

export default function AutoEntrepreneurPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Breadcrumb + FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://factu.me' },
                  { '@type': 'ListItem', position: 2, name: 'Facturation Auto-Entrepreneur', item: 'https://factu.me/facturation-auto-entrepreneur' },
                ],
              },
              ...(faqs.length > 0
                ? [{
                    '@type': 'FAQPage',
                    mainEntity: faqs.map((faq) => ({
                      '@type': 'Question',
                      name: faq.question,
                      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                    })),
                  }]
                : []),
            ],
          }),
        }}
      />

      {/* Breadcrumb nav */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6" aria-label="Fil d'Ariane">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li><Link href="/" className="hover:text-emerald-600 transition-colors">Accueil</Link></li>
          <li>/</li>
          <li className="text-gray-900 font-medium">Facturation Auto-Entrepreneur</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-green-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Auto-Entrepreneur – <span className="text-emerald-600">Simple, Rapide & Gratuit</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Le logiciel de facturation pensé pour les <strong>auto-entrepreneurs</strong>. Factures conformes URSSAF, sans TVA, avec dictée vocale. <strong>0€ pour démarrer.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Commencer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Pas de carte bancaire • ✓ Conforme URSSAF • ✓ Sans TVA automatique
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi les auto-entrepreneurs choisissent Factu.me ?
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

      {/* Use Cases */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Adapté à tous les auto-entrepreneurs
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
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
            Tout ce dont un auto-entrepreneur a besoin
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
            Ce que disent les auto-entrepreneurs
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
            Lancez votre activité sereinement
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Rejoignez des milliers d\'auto-entrepreneurs qui facturent simplement avec Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            3 factures gratuites par mois • Sans engagement • Conforme URSSAF
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Questions fréquentes
          </h2>
          <div className="space-y-6">
            {getFAQsForPage('facturation-auto-entrepreneur').map((faq, i) => (
              <details
                key={i}
                className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-emerald-200 transition-all"
              >
                <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-gray-900">
                  {faq.question}
                  <span className="ml-4 transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-gray-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Guides par statut — Maillage Segment→Hub */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Guides de facturation par statut juridique
          </h2>
          <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              { slug: 'auto-entrepreneur', nom: 'Auto-entrepreneur' },
              { slug: 'micro-entreprise', nom: 'Micro-entreprise' },
              { slug: 'ei', nom: 'Entreprise Individuelle' },
              { slug: 'eurl', nom: 'EURL' },
              { slug: 'sasu', nom: 'SASU' },
              { slug: 'sarl', nom: 'SARL' },
            ].map(statut => (
              <Link key={statut.slug} href={`/comment-facturer/${statut.slug}`}
                className="group p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all text-center">
                <span className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{statut.nom}</span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/comment-facturer" className="text-emerald-600 font-medium hover:underline">
              Voir tous les guides par statut →
            </Link>
          </div>
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
          { name: 'Facturation Auto-Entrepreneur', url: 'https://factu.me/facturation-auto-entrepreneur' },
        ]}
      />
    </div>
  );
}

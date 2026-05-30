import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, ArrowRight, Mic, FileCheck, PenTool, Sparkles, RefreshCcw } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Alternative Henrri – Pourquoi Choisir Factu.me | Comparatif',
  description: 'Factu.me vs Henrri : comparatif détaillé. Dictée vocale IA, Factur-X, signatures électroniques, prix plus bas. Migration facile depuis Henrri.',
  openGraph: {
    title: 'Alternative Henrri – Pourquoi Choisir Factu.me',
    description: 'IA vocale, Factur-X, signatures, prix. Découvrez pourquoi les utilisateurs Henrri migrent vers Factu.me.',
    url: 'https://factu.me/alternative-henrri',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-vs-henrri.png',
        width: 1200,
        height: 630,
        alt: 'Alternative Henrri – Factu.me',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/alternative-henrri',
  },
};

const benefits = [
  {
    icon: Mic,
    title: 'Dictée vocale IA',
    description: 'Factu.me propose la reconnaissance vocale pour créer vos factures. Henrri n\'a rien d\'équivalent.',
  },
  {
    icon: FileCheck,
    title: 'Factur-X natif',
    description: 'Conforme à la réforme 2026 de facturation électronique. Chez Henrri, c\'est encore en développement.',
  },
  {
    icon: PenTool,
    title: 'Signature électronique',
    description: 'Faites signer vos devis et contrats en ligne. Henrri ne propose pas la signature électronique.',
  },
  {
    icon: Sparkles,
    title: 'Interface moderne',
    description: 'Design 2025 contre un look plus daté. Navigation fluide, animations, expérience mobile soignée.',
  },
  {
    icon: RefreshCcw,
    title: 'Migration en 5 minutes',
    description: 'Importez vos clients et produits depuis Henrri. Pas de ressaisie, pas de perte de données.',
  },
  {
    icon: ArrowRight,
    title: 'Prix plus accessible',
    description: 'Plan gratuit pour démarrer. Le Pro coûte moins cher qu\'Henrri pour plus de fonctionnalités.',
  },
];

const features = [
  {
    title: 'Chez Factu.me',
    items: [
      'Dictée vocale IA pour facturer en parlant',
      'Factur-X 2026 intégré d\'office',
      'Signature électronique des devis',
      'Multi-devises sans surcoût',
    ],
  },
  {
    title: 'Ce que Henrri ne propose pas',
    items: [
      'Pas de reconnaissance vocale',
      'Pas de Factur-X ready',
      'Pas de signature électronique',
      'Interface datée et moins intuitive',
    ],
  },
  {
    title: 'Migration depuis Henrri',
    items: [
      'Exportez vos données depuis Henrri (CSV)',
      'Importez vos clients en 1 clic sur Factu.me',
      'Vos factures Henrri restent accessibles',
      'Support dédié pour la migration',
    ],
  },
];

const testimonials = [
  {
    name: 'Stéphanie B.',
    job: 'Consultante RH',
    text: 'J\'étais sur Henrri depuis 2 ans. La migration vers Factu.me a pris 10 minutes. L\'IA vocale m\'a définitivement convaincue.',
  },
  {
    name: 'Nicolas G.',
    job: 'Développeur freelance',
    text: 'Henrri fait le job, mais Factu.me fait mieux pour moins cher. La dictée vocale me fait gagner 20 minutes par semaine.',
  },
  {
    name: 'Pauline D.',
    job: 'Architecte',
    text: 'La signature électronique de devis n\'existait pas chez Henrri. Sur Factu.me, mes clients signent en ligne. Game changer.',
  },
];

export default function AlternativeHenrriPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-violet-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-6">
              <ArrowRight className="w-4 h-4" />
              Alternative à Henrri
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Alternative Henrri – Pourquoi Choisir <span className="text-purple-600">Factu.me</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              <strong>IA vocale, Factur-X, signatures électroniques</strong>. Découvrez pourquoi les utilisateurs Henrri passent à Factu.me.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Migrer depuis Henrri
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Comparer en démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Migration gratuite • Données conservées • Plan gratuit disponible
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Factu.me fait tout ce que Henrri fait, et plus
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-purple-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
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
            Comparaison détaillée
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
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
            Ils ont quitté Henrri pour Factu.me
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-purple-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Passez à Factu.me, c\'est simple
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Migration gratuite en 5 minutes. Gardez tout, gagnez plus.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-purple-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer la migration
          </Link>
          <p className="mt-6 text-sm text-purple-200">
            Gratuit pour démarrer • Migration aidée • Sans engagement
          </p>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: "Factu.me est-il gratuit ?",
            answer: "Oui, Factu.me offre un plan gratuit jusqu'à 10 factures par mois, sans carte bancaire et sans publicité."
          },
          {
            question: "Comment migrer de Henrri vers Factu.me ?",
            answer: "Exportez vos données depuis Henrri en CSV, importez-les dans Factu.me. La migration prend environ 5 minutes."
          },
          {
            question: "Factu.me est-il conforme à la facturation électronique 2026 ?",
            answer: "Oui, Factu.me est prêt pour la réforme Factur-X 2026 avec les formats conformes à la norme EN 16931."
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Alternative Henrri', url: 'https://factu.me/alternative-henrj' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/alternative-tiime', label: 'Alternative Tiime' },
          { href: '/alternative-abby', label: 'Alternative Abby' },
          { href: '/logiciel-facture-gratuit', label: 'Logiciel facture gratuit' },
          { href: '/meilleur-logiciel-facture', label: 'Meilleur logiciel facture' },
        ]}
      />
    </div>
  );
}

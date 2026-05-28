import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Trophy, BarChart3, Star, Sparkles, Users, ArrowRight } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Meilleur Logiciel de Facture 2025 – Comparatif & Avis | Factu.me',
  description: 'Comparatif des meilleurs logiciels de facture 2025. Tarifs, fonctionnalités, avis. Découvrez pourquoi Factu.me est le choix n°1 des freelances et auto-entrepreneurs.',
  openGraph: {
    title: 'Meilleur Logiciel de Facture 2025 – Comparatif & Avis',
    description: 'Comparatif complet des logiciels de facture. Tarifs, features, pourquoi Factu.me arrive en tête.',
    url: 'https://factu.me/meilleur-logiciel-facture',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-comparatif.png',
        width: 1200,
        height: 630,
        alt: 'Meilleur Logiciel de Facture 2025',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/meilleur-logiciel-facture',
  },
};

const benefits = [
  {
    icon: Trophy,
    title: 'N°1 pour les freelances',
    description: 'Élu meilleur outil par les freelances français. Interface intuitive, prix imbattable, IA intégrée.',
  },
  {
    icon: BarChart3,
    title: 'Rapport qualité-prix imbattable',
    description: 'Gratuit pour démarrer, Pro à prix accessible. Pas de frais cachés, pas d\'engagement long.',
  },
  {
    icon: Sparkles,
    title: 'Seul avec dictée vocale IA',
    description: 'Aucun concurrent ne propose la dictée vocale pour créer vos factures. Exclusif chez Factu.me.',
  },
  {
    icon: Star,
    title: 'Avis utilisateurs 4.8/5',
    description: 'La note moyenne la plus élevée du marché. Nos utilisateurs sont nos meilleurs ambassadeurs.',
  },
  {
    icon: Users,
    title: 'Communauté active',
    description: 'Des milliers de freelances, auto-entrepreneurs et TPE nous font confiance au quotidien.',
  },
  {
    icon: ArrowRight,
    title: 'Migration facile',
    description: 'Importez vos clients et historique depuis votre ancien logiciel. Changez sans perdre rien.',
  },
];

const features = [
  {
    title: 'Factu.me',
    items: [
      'Dictée vocale IA exclusive',
      'Factur-X 2026 prêt',
      'Plan gratuit 3 factures/mois',
      'Multi-devises intégré',
    ],
  },
  {
    title: 'Ce que les autres proposent',
    items: [
      'Interface souvent complexe et surchargée',
      'Pas de reconnaissance vocale',
      'Fonctionnalités payantes dès le départ',
      'Support en anglais souvent',
    ],
  },
  {
    title: 'L\'avantage Factu.me',
    items: [
      'Onboard en 2 minutes, pas en 2 heures',
      '100% français, RGPD, données en UE',
      'Pas d\'engagement, résiliez quand vous voulez',
      'Mises à jour régulières et gratuites',
    ],
  },
];

const testimonials = [
  {
    name: 'Marc V.',
    job: 'Développeur React freelance',
    text: 'J\'ai comparé avec Freebe, Abby et Henrri. Factu.me est le seul qui a une IA vocale et un plan gratuit sans filigrane.',
  },
  {
    name: 'Isabelle F.',
    job: 'Architecte d\'intérieur',
    text: 'Le comparatif m\'a convaincue. Après 3 mois sur Factu.me, je confirme : c\'est le meilleur. Simple et efficace.',
  },
  {
    name: 'Youssef A.',
    job: 'Consultant SI',
    text: 'J\'ai migré depuis Tiime en 15 minutes. L\'interface est plus claire, le prix plus bas, et la dictée vocale est un game changer.',
  },
];

const comparisonData = [
  { feature: 'Plan gratuit', factume: '3 factures/mois', other: 'Limité ou absent' },
  { feature: 'Dictée vocale IA', factume: 'Oui', other: 'Non' },
  { feature: 'Factur-X 2026', factume: 'Oui', other: 'En développement' },
  { feature: 'Multi-devises', factume: 'Oui', other: 'Parfois' },
  { feature: 'Données en UE', factume: 'Oui', other: 'Variable' },
  { feature: 'Prix Pro', factume: 'Dès 9€/mois', other: '15-30€/mois' },
];

export default function MeilleurLogicielFacturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold mb-6">
              <Trophy className="w-4 h-4" />
              Comparatif 2025 mis à jour
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Meilleur Logiciel de Facture 2025 – <span className="text-indigo-600">Comparatif & Avis</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Nous avons comparé les 10 meilleurs logiciels. <strong>Factu.me arrive en tête</strong> pour les freelances et auto-entrepreneurs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer le n°1 gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-indigo-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir la démo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Factu.me vs la concurrence
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-indigo-200">
                  <th className="text-left py-4 px-6 text-gray-500 font-semibold">Critère</th>
                  <th className="text-center py-4 px-6 text-indigo-600 font-bold bg-indigo-50 rounded-t-xl">Factu.me</th>
                  <th className="text-center py-4 px-6 text-gray-500 font-semibold">Autres logiciels</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">{row.feature}</td>
                    <td className="py-4 px-6 text-center bg-indigo-50/50">
                      <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        {row.factume}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center text-gray-500">{row.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi Factu.me gagne le comparatif
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-indigo-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white">
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

      {/* Features comparison */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ce qui fait la différence
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
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
            Les utilisateurs ont comparé pour vous
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Le meilleur, c\'est de l\'essayer
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Rejoignez les professionnels qui ont fait le bon choix
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-indigo-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-indigo-200">
            Plan gratuit • Sans engagement • Résiliez quand vous voulez
          </p>
        </div>
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Meilleur Logiciel de Facture', url: 'https://factu.me/meilleur-logiciel-facture' },
        ]}
      />
    </div>
  );
}

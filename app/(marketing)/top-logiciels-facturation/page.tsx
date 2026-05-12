import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Award, ListOrdered, Crown, Medal, Target, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Top Logiciels de Facturation – Classement 2025 | Factu.me',
  description: 'Le classement des meilleurs logiciels de facturation 2025. Top 5 comparé avec tarifs, fonctionnalités et avis. Factu.me n°1 pour les indépendants.',
  keywords: [
    'top logiciels facturation',
    'meilleurs logiciels facture 2025',
    'classement logiciel facturation',
    'top 5 logiciel facture',
    'comparatif logiciel facturation france',
    'meilleur logiciel facturation independant',
    'logiciel facturation top',
    'classement facturation en ligne',
    'selection logiciel facture',
    'guide logiciel facturation 2025',
  ],
  openGraph: {
    title: 'Top Logiciels de Facturation – Classement 2025',
    description: 'Le top 5 des logiciels de facturation français comparés. Tarifs, features, notre verdict.',
    url: 'https://factu.me/top-logiciels-facturation',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-top-logiciels.png',
        width: 1200,
        height: 630,
        alt: 'Top Logiciels de Facturation 2025',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/top-logiciels-facturation',
  },
};

const rankings = [
  {
    rank: 1,
    name: 'Factu.me',
    badge: 'Choix de la rédaction',
    badgeColor: 'bg-amber-100 text-amber-700',
    price: 'Gratuit / 9€',
    score: '4.8/5',
    highlights: ['Dictée vocale IA', 'Factur-X 2026', 'Plan gratuit', '100% français'],
    why: 'Le meilleur rapport qualité-prix. IA vocale unique, conformité française, interface moderne. Idéal freelances et TPE.',
  },
  {
    rank: 2,
    name: 'Tiime',
    badge: 'Solide',
    badgeColor: 'bg-slate-100 text-slate-600',
    price: 'Dès 15€/mois',
    score: '4.3/5',
    highlights: ['Bon outil comptable', 'Ocr notes de frais', 'Banque intégrée', 'Pour TPE'],
    why: 'Bon produit mais plus orienté comptabilité que facturation. Pas de dictée vocale. Prix plus élevé.',
  },
  {
    rank: 3,
    name: 'Henrri',
    badge: 'Populaire',
    badgeColor: 'bg-slate-100 text-slate-600',
    price: 'Dès 12€/mois',
    score: '4.1/5',
    highlights: ['Bon pour TPE', 'Interface classique', 'CRM intégré', 'Devis/facture'],
    why: 'Fonctionnalités complètes mais interface datée. Pas d\'IA. Pas de plan gratuit vraiment utilisable.',
  },
  {
    rank: 4,
    name: 'Freebe',
    badge: 'Correct',
    badgeColor: 'bg-slate-100 text-slate-600',
    price: 'Dès 10€/mois',
    score: '3.9/5',
    highlights: ['Simple', 'Pour micro-entreprises', 'Bon support', 'Pas cher'],
    why: 'Adapté aux micro-entrepreneurs mais limité en fonctionnalités avancées. Pas de conformité Factur-X.',
  },
  {
    rank: 5,
    name: 'Abby',
    badge: 'Basique',
    badgeColor: 'bg-slate-100 text-slate-600',
    price: 'Dès 8€/mois',
    score: '3.7/5',
    highlights: ['Interface simple', 'Pour AE', 'Rapide', 'Abordable'],
    why: 'Simple et abordable mais fonctionnalités limitées. Pas de multi-devises ni de dictée vocale.',
  },
];

const comparisonTable = [
  { feature: 'Dictée vocale IA', factume: true, others: false },
  { feature: 'Factur-X 2026', factume: true, others: false },
  { feature: 'Plan gratuit', factume: true, others: false },
  { feature: 'Multi-devises', factume: true, others: false },
  { feature: 'Signature électronique', factume: true, others: false },
  { feature: '100% français/RGPD', factume: true, others: false },
];

const testimonials = [
  {
    name: 'Audrey G.',
    job: 'Graphiste freelance',
    text: 'J\'ai testé les 5 du classement. Factu.me est le seul où je me sens vraiment à l\'aise. L\'IA vocale, c\'est le futur.',
  },
  {
    name: 'Romain L.',
    job: 'Développeur fullstack',
    text: 'Ce classement est honnête. J\'étais sur Henrri avant et Factu.me est clairement en avance sur l\'IA et le prix.',
  },
  {
    name: 'Vanessa T.',
    job: 'Coach business',
    text: 'Je recommande Factu.me à tous mes clients freelances. Le rapport qualité-prix est imbattable.',
  },
];

export default function TopLogicielsFacturationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-gray-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold mb-6">
              <ListOrdered className="w-4 h-4" />
              Classement 2025
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Top Logiciels de Facturation – <span className="text-slate-700">Classement 2025</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Nous avons testé et classé les <strong>5 meilleurs logiciels</strong> de facturation pour les indépendants français.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl hover:from-slate-800 hover:to-slate-900 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer le n°1
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-slate-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir la démo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Rankings */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Notre classement 2025
          </h2>
          <div className="space-y-6">
            {rankings.map((item) => (
              <div key={item.rank} className={`rounded-3xl p-8 border ${item.rank === 1 ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-lg' : 'bg-white border-gray-100 shadow'}`}>
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black ${item.rank === 1 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {item.rank === 1 ? <Crown className="w-7 h-7" /> : item.rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-2xl font-black text-gray-900">{item.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.badgeColor}`}>{item.badge}</span>
                      <span className="text-sm text-gray-500">Prix : {item.price}</span>
                      <span className="text-sm text-amber-600 font-semibold">{item.score}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.highlights.map((h, j) => (
                        <span key={j} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">{h}</span>
                      ))}
                    </div>
                    <p className="text-gray-600">{item.why}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Factu.me vs le reste du top 5
          </h2>
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-6 text-gray-500 font-semibold">Fonctionnalité</th>
                  <th className="text-center py-4 px-6 font-bold text-slate-700 bg-slate-50">Factu.me</th>
                  <th className="text-center py-4 px-6 text-gray-500 font-semibold">Concurrents</th>
                </tr>
              </thead>
              <tbody>
                {comparisonTable.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 px-6 text-gray-700">{row.feature}</td>
                    <td className="py-3 px-6 text-center bg-slate-50/50">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                    </td>
                    <td className="py-3 px-6 text-center text-gray-400">
                      {row.others ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ils ont fait leur choix
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-slate-700 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Testez le n°1 du classement
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Rejoignez les professionnels qui ont fait le bon choix
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-slate-800 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-slate-400">
            Plan gratuit • Sans engagement • N°1 du classement 2025
          </p>
        </div>
      </section>
    </div>
  );
}

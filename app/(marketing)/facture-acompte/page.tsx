import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Wallet, TrendingUp, FileSpreadsheet, Landmark, HandCoins, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Facture d\'Acompte – Gerez Vos Paiements Partiels | Factu.me',
  description: 'Creez des factures d\'acompte professionnelles. Gerez les paiements partiels, les situations, la TVA sur acomptes. Mention "pour acompte" automatique.',
  openGraph: {
    title: 'Facture d\'Acompte – Gerez Vos Paiements Partiels',
    description: 'Factures d\'acompte conformes, TVA geree, suivi des paiements partiels. Securisez vos projets.',
    url: 'https://factu.me/facture-acompte',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-facture-acompte.png',
        width: 1200,
        height: 630,
        alt: 'Facture d\'Acompte – Factu.me',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facture-acompte',
  },
};

const benefits = [
  {
    icon: Wallet,
    title: 'Tresorerie securisee',
    description: 'Encaissez un acompte avant de demarrer. Fini les projets commences sans garantie de paiement.',
  },
  {
    icon: TrendingUp,
    title: 'Financement de projet',
    description: 'Financez vos achats de materiaux ou vos frais en cours de mission grace aux paiements echelonnes.',
  },
  {
    icon: HandCoins,
    title: 'Paiements partiels simplifies',
    description: 'Decoupez votre facturation en acompte, situations et soldes. Chaque paiement est trace.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Mentions "pour acompte" auto',
    description: 'La mention "pour acompte" s\'ajoute automatiquement. Le lien avec la facture finale est conserve.',
  },
  {
    icon: Landmark,
    title: 'TVA sur acomptes geree',
    description: 'La TVA est calculee sur chaque acompte selon les regles fiscales en vigueur. Conforme et sans erreur.',
  },
  {
    icon: Clock,
    title: 'Factures de situation',
    description: 'Suivez l\'avancement de vos chantiers avec des factures de situation progressives et detaillees.',
  },
];

const features = [
  {
    title: 'Creation d\'acompte',
    items: [
      'Facture d\'acompte avec montant personnalise',
      'Pourcentage ou montant fixe du devis',
      'Mention "pour acompte" automatique',
      'Lien avec le devis ou la facture finale',
    ],
  },
  {
    title: 'Gestion TVA & fiscal',
    items: [
      'TVA calculee sur chaque acompte',
      'Exigibilite TVA a l\'encaissement ou au debit',
      'Acompte HT pour franchise de base',
      'Comptabilisation automatique',
    ],
  },
  {
    title: 'Suivi des paiements',
    items: [
      'Tableau de suivi acomptes vs total',
      'Statut : en attente, paye, partiel',
      'Relance automatique des acomptes impayes',
      'Export comptable complet',
    ],
  },
];

const testimonials = [
  {
    name: 'Nadia K.',
    job: 'Agence de communication',
    text: 'On demande systematiquement 30% d\'acompte. Avec Factu.me, c\'est une facture propre, pas un accord verbal. Et nos clients paient plus vite.',
  },
  {
    name: 'David P.',
    job: 'Artisan plaquiste',
    text: 'Les factures de situation me permettent de facturer au fur et a mesure du chantier. Ma tresorerie n\'a jamais ete aussi saine.',
  },
  {
    name: 'Sophie V.',
    job: 'Developpeuse freelance',
    text: 'Je facture 50% a la commande et 50% a la livraison. Factu.me gere les deux factures et relie le tout au devis initial.',
  },
];

export default function FactureAcomptePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-yellow-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-6">
              <Wallet className="w-4 h-4" />
              Paiements partiels
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facture d\'Acompte – <span className="text-amber-600">Gerez Vos Paiements Partiels</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              <strong>Acomptes, situations, paiements echelonnes</strong>. Mention "pour acompte" automatique, TVA geree, suivi complet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl hover:from-amber-700 hover:to-amber-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Creer une facture d\'acompte
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-amber-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir un exemple
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Mention "pour acompte" auto • TVA geree • Suivi des paiements
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Securisez vos projets avec des acomptes
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-amber-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white">
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

      {/* Acompte vs Situation explainer */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Acompte, situation ou solde ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <HandCoins className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Facture d\'acompte</h3>
              <p className="text-gray-600">
                Paiement anticipe demande avant le debut des travaux. Securise l\'engagement du client et finance le lancement du projet.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Facture de situation</h3>
              <p className="text-gray-600">
                Facturation a chaque etape avancee du projet. Ideale pour les chantiers BTP, les missions longues et les prestations echelonnees.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Facture de solde</h3>
              <p className="text-gray-600">
                Facture finale deduisant les acomptes et situations deja verses. Montant restant du apres soustraction des paiements anterieurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Outils complets pour vos paiements partiels
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
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
            Ils securisent leurs projets avec des acomptes
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-amber-600 to-amber-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Securisez vos paiements avec des acomptes
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Mention automatique, TVA geree, suivi complet des paiements partiels
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-amber-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Creer ma facture d\'acompte
          </Link>
          <p className="mt-6 text-sm text-amber-200">
            Acompte • Situation • Solde • Sans engagement
          </p>
        </div>
      </section>
    </div>
  );
}

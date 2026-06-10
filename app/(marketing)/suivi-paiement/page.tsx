import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Bell, AlertTriangle, DollarSign, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Suivi de Paiement – Relancez Automatiquement vos Impayés | Factu.me',
  description: 'Suivez vos paiements et relancez automatiquement les impayés. Tableau de bord des échéances, alertes retard, relances email automatiques.',
  openGraph: {
    title: 'Suivi de Paiement – Relancez Automatiquement vos Impayés',
    description: 'Ne perdez plus d\'argent. Alertes retard, relances auto, tableau de bord des paiements.',
    url: 'https://factu.me/suivi-paiement',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-suivi-paiement.png',
        width: 1200,
        height: 630,
        alt: 'Suivi de Paiement – Factu.me',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/suivi-paiement',
  },
};

const benefits = [
  {
    icon: Bell,
    title: 'Alertes de retard',
    description: 'Recevez une notification dès qu\'une facture dépasse sa date d\'échéance. Plus jamais de retard passé inaperçu.',
  },
  {
    icon: AlertTriangle,
    title: 'Relances automatiques',
    description: 'Emails de relance envoyés automatiquement à J+7, J+14, J+30. Vous n\'avez rien à faire.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard des paiements',
    description: 'Vue d\'ensemble : payé, en attente, en retard. Votre trésorerie d\'un coup d\'oeil.',
  },
  {
    icon: DollarSign,
    title: 'Suivi des encaissements',
    description: 'Marquez les factures comme payées. Suivez votre chiffre d\'affaires réel vs facturé.',
  },
  {
    icon: TrendingUp,
    title: 'Indicateurs de santé',
    description: 'Délai moyen de paiement, taux d\'impayés, clients à risque. Pilotez votre entreprise.',
  },
  {
    icon: Clock,
    title: 'Gain de temps',
    description: 'Fini les fichiers Excel pour suivre les paiements. Tout est automatisé dans Factu.me.',
  },
];

const features = [
  {
    title: 'Suivi en temps réel',
    items: [
      'Statut de chaque facture (envoyée, vue, payée)',
      'Dates d\'échéance automatiques',
      'Alertes email et notification in-app',
      'Calendrier des encaissements prévus',
    ],
  },
  {
    title: 'Relances intelligentes',
    items: [
      'Relance automatique à J+7 après échéance',
      'Relance plus ferme à J+14',
      'Mise en demeure à J+30',
      'Personnalisation des messages de relance',
    ],
  },
  {
    title: 'Reporting financier',
    items: [
      'Chiffre d\'affaires par mois / trimestre',
      'Délai moyen de paiement clients',
      'Top des clients retardataires',
      'Export des données pour le comptable',
    ],
  },
];

const testimonials = [
  {
    name: 'Benoît P.',
    job: 'Consultant SI freelance',
    text: 'Avant Factu.me, j\'avais 3000€ d\'impayés dont je ne me souvenais pas. Les relances auto m\'ont tout récupéré.',
  },
  {
    name: 'Sarah L.',
    job: 'Agence de design',
    text: 'Le dashboard des paiements, c\'est mon écran préféré. Je sais exactement où j\'en suis avec chaque client.',
  },
  {
    name: 'Philippe G.',
    job: 'Formateur indépendant',
    text: 'Les alertes de retard m\'ont sauvé. Un client avait "oublié" 2500€. La relance auto a réglé ça en 48h.',
  },
];

export default function SuiviPaiementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-red-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 text-rose-700 text-sm font-semibold mb-6">
              <AlertTriangle className="w-4 h-4" />
              Ne perdez plus d\'argent
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Suivi de Paiement – <span className="text-rose-600">Relancez Automatiquement vos Impayés</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              <strong>Alertes de retard, relances automatiques, dashboard des paiements</strong>. Ne laissez plus passer un seul impayé.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 rounded-2xl hover:from-rose-700 hover:to-red-700 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Commencer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-rose-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir la démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Relances automatiques • Dashboard temps réel • Alertes email
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ne laissez plus rien passer
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-rose-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white">
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

      {/* Payment status overview */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Vue d\'ensemble de vos paiements
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'Payé', value: 'Vert', desc: 'Factures réglées à temps', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
              { label: 'En attente', value: 'Bleu', desc: 'Envoyées, pas encore dues', color: 'bg-blue-100 text-blue-700 border-blue-200' },
              { label: 'En retard', value: 'Orange', desc: 'Échéance dépassée', color: 'bg-orange-100 text-orange-700 border-orange-200' },
              { label: 'Critique', value: 'Rouge', desc: 'Plus de 30 jours de retard', color: 'bg-red-100 text-red-700 border-red-200' },
            ].map((status, i) => (
              <div key={i} className={`rounded-2xl p-6 border ${status.color} text-center`}>
                <p className="font-bold text-lg mb-1">{status.label}</p>
                <p className="text-sm opacity-80">{status.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Outils de suivi complets
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
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
            Ils ont récupéré leurs impayés
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-rose-600 to-red-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Récupérez vos impayés automatiquement
          </h2>
          <p className="text-xl text-rose-100 mb-8">
            Ne laissez plus l\'argent sur la table
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-rose-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-rose-200">
            Relances auto • Dashboard temps réel • Sans engagement
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
          { name: 'Suivi de Paiement', url: 'https://factu.me/suivi-paiement' },
        ]}
      />
    </div>
  );
}

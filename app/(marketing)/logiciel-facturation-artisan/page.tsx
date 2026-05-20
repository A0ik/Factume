import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, MessageSquare, Euro, Shield, Clock, Smartphone, Mic, HardHat } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel de Facturation Artisan – Gérez Votre Activité Simplement',
  description: 'Logiciel de facturation pour artisans : devis chantier, factures d\'acompte, de situation et de solde. Gestion TVA, SIRET automatique. Gratuit pour démarrer.',
  openGraph: {
    title: 'Logiciel de Facturation Artisan – Gérez Votre Activité Simplement',
    description: 'Devis chantier, acomptes, situations, TVA : tout est géré automatiquement. Factu.me simplifie la facturation artisanale.',
    url: 'https://factu.me/logiciel-facturation-artisan',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-artisan.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel de Facturation pour Artisans',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/logiciel-facturation-artisan',
  },
};

const benefits = [
  {
    icon: Mic,
    title: 'Dictée vocale sur chantier',
    description: '"Pose de 12 mètres de canalisation, 850 euros." Pas besoin de taper, parlez et votre facture se crée. Même avec les mains sales.',
  },
  {
    icon: Smartphone,
    title: 'Facture depuis le téléphone',
    description: 'Finissez votre intervention, ouvrez Factu.me sur votre mobile, envoyez la facture. Votre client la reçoit avant que vous ne quittiez les lieux.',
  },
  {
    icon: Euro,
    title: 'Gestion des acomptes',
    description: 'Facturez en plusieurs versements : acompte à la commande, solde à la fin. Suivez ce que chaque client vous doit.',
  },
  {
    icon: HardHat,
    title: 'Suivi par chantier',
    description: 'Organisez vos factures et devis par chantier. Retrouvez en un clic l\'historique complet de chaque projet.',
  },
  {
    icon: Shield,
    title: 'Mentions légales artisanales',
    description: 'SIRET, garantie décennale, assurance RC Pro : toutes les mentions obligatoires sont incluses automatiquement.',
  },
  {
    icon: Clock,
    title: 'Devis en 5 minutes',
    description: 'Créez un devis sur place, le client signe, vous le convertissez en facture. Plus besoin de rentrer au bureau pour envoyer les devis.',
  },
];

const features = [
  {
    title: 'Chantier & matériaux',
    items: [
      'Devis détaillé main d\'oeuvre + fournitures',
      'Factures d\'acompte et de situation',
      'Suivi par chantier avec historique',
      'Catalogue de prestations réutilisable',
    ],
  },
  {
    title: 'Mobilité & terrain',
    items: [
      'Interface mobile optimisée',
      'Dictée vocale pour les factures',
      'Fonctionnement hors ligne',
      'Envoi instantané par email ou SMS',
    ],
  },
  {
    title: 'Administratif & conformité',
    items: [
      'Mentions légales artisans automatiques',
      'Garantie décennale sur les devis',
      'Factur-X (réforme 2026)',
      'Export pour le comptable',
    ],
  },
];

const testimonials = [
  {
    name: 'Étienne R.',
    job: 'Charpentier, Savoie',
    text: 'Je faisais tout sur Word avant. Maintenant mes devis de charpente sont impeccables, avec les postes détaillés. Mes clients signent plus vite.',
  },
  {
    name: 'Fatima B.',
    job: 'Boulangère-pâtissière, Lyon',
    text: 'La gestion des TVA différentes selon les produits (patisserie, restaurant) était un casse-tête. Factu.me gère tout automatiquement.',
  },
  {
    name: 'Laurent G.',
    job: 'Métallier soudeur, Marseille',
    text: 'Les factures d\'acompte et de situation m\'ont sauvé la vie sur un chantier de 6 mois. Je facture au fur et à mesure, sans stress.',
  },
];

const useCases = [
  {
    title: 'Plombiers & chauffagistes',
    description: 'Facturez vos interventions, pièces et main d\'oeuvre. Gérez les contrats d\'entretien annuels avec les factures récurrentes.',
  },
  {
    title: 'Electriciens',
    description: 'Devis détaillés avec matériaux et câblage. Conformité des attestations et suivi des chantiers en cours.',
  },
  {
    title: 'Peintres & carreleurs',
    description: 'Factures avec détail des surfaces et fournitures. Acomptes et factures de situation pour les gros chantiers.',
  },
];

export default function ArtisanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facturation Artisan – <span className="text-amber-600">Gérez Votre Activité Simplement</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Devis de chantier, factures d\'acompte, situations, TVA : tout est <strong>automatique</strong>. Concentrez-vous sur votre métier, pas sur la paperasse.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl hover:from-amber-700 hover:to-amber-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-amber-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Dictée vocale • ✓ Factures d\'acompte • ✓ Catalogue prestations
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi les artisans adoptent Factu.me ?
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

      {/* Use Cases */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pour tous les corps de métier
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
            L\'outil qu\'il vous faut sur le terrain
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
            Ce que disent les artisans
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
            Facturez sur le chantier, pas au bureau
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Rejoignez les artisans qui gagnent du temps avec Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-amber-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-amber-200">
            Dictée vocale • Factures d\'acompte • Catalogue prestations
          </p>
        </div>
      </section>
    </div>
  );
}

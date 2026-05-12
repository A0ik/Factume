import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Plug, Euro, Shield, Clock, Car, MessageSquare, ClipboardList } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Facturation Électricien – Votre Logiciel de Facturation Mobile | Factu.me',
  description: 'Logiciel de facturation pour électriciens : rapports d\'intervention, tarifs matériaux, taux horaires, frais de déplacement. Facturez depuis votre smartphone.',
  keywords: [
    'facturation électricien',
    'logiciel facturation electricien',
    'facture electricien en ligne',
    'devis installation électrique',
    'logiciel artisan électricien',
    'facture intervention électrique',
    'devis mise aux normes',
    'facturation dépannage électrique',
    'rapport intervention électricien',
    'logiciel auto-entrepreneur electricien',
  ],
  openGraph: {
    title: 'Facturation Électricien – Votre Logiciel de Facturation Mobile',
    description: 'Rapports d\'intervention, tarifs matériaux, taux horaires, frais de déplacement. Le logiciel mobile pour électriciens.',
    url: 'https://factu.me/facturation-electricien',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-electricien.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation Électricien',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-electricien',
  },
};

const benefits = [
  {
    icon: ClipboardList,
    title: 'Rapports d\'intervention',
    description: 'Transformez chaque intervention en facture détaillée : diagnostic, pièces remplacées, temps passé, mise aux normes.',
  },
  {
    icon: Plug,
    title: 'Tarifs matériaux à jour',
    description: 'Enregistrez vos tarifs de câbles, disjoncteurs, prises et tableaux électriques. Saisie accélérée à chaque intervention.',
  },
  {
    icon: MessageSquare,
    title: 'Dictée vocale terrain',
    description: 'Dictez depuis le chantier : "Installation tableau divisionnaire 12 modules, 3h de pose, 280 euros de matériel". C\'est facturé.',
  },
  {
    icon: Car,
    title: 'Frais de déplacement',
    description: 'Ajoutez automatiquement les frais de déplacement selon la zone. Tarifs zone A, B, C pré-configurables.',
  },
  {
    icon: Euro,
    title: 'Taux horaires flexibles',
    description: 'Tarifs différents pour le dépannage, l\'installation neuve, la mise aux normes et la vérification. Tout est paramétrable.',
  },
  {
    icon: Shield,
    title: 'Conformité garantie',
    description: 'Mentions légales, assurance décennale, numéro de qualification : tout est inclus pour des factures irréprochables.',
  },
];

const useCases = [
  {
    title: 'Dépannage électrique',
    description: 'Facturez les interventions d\'urgence : coupures, courts-circuits, remplacement de disjoncteur. Rapide et précis.',
  },
  {
    title: 'Installation neuve',
    description: 'Devis et factures pour les chantiers d\'installation complète : logement, local commercial, rénovation électrique.',
  },
  {
    title: 'Mise aux normes',
    description: 'Facturez les mises en conformité NF C 15-100 avec détail des travaux par pièce et par circuit.',
  },
];

const features = [
  {
    title: 'Facturation interventions',
    items: [
      'Facture en moins d\'une minute',
      'Détail matériaux + pose',
      'Frais de déplacement automatiques',
      'Coefficient urgence / nuit / week-end',
    ],
  },
  {
    title: 'Devis électricité',
    items: [
      'Devis par pièce et par circuit',
      'Bibliothèque de composants électriques',
      'Photos avant/après jointes',
      'Validation client numérique',
    ],
  },
  {
    title: 'Administration',
    items: [
      'Suivi des paiements',
      'Relances automatiques',
      'Carnet clients avec historique',
      'Export FEC pour le comptable',
    ],
  },
];

const testimonials = [
  {
    name: 'Stéphane C.',
    job: 'Électricien indépendant – Lille',
    text: 'Je facture maintenant directement depuis ma camionnette entre deux chantiers. Le client reçoit la facture avant que je sois parti.',
  },
  {
    name: 'Catherine M.',
    job: 'Électricienne bâtiment – Grenoble',
    text: 'Les frais de déplacement étaient un casse-tête. Maintenant c\'est automatique selon la zone. Plus rien à calculer.',
  },
  {
    name: 'Lucas D.',
    job: 'Artisan électricien – Rennes',
    text: 'Factu.me m\'a permis de professionnaliser mon image. Mes devis sont clairs, mes factures nickel. Les clients font confiance.',
  },
];

export default function ElectricienPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-amber-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Électricien – Votre Logiciel de Facturation <span className="text-yellow-600">Mobile</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Rapports d\'intervention, tarifs matériaux, frais de déplacement. <strong>Facturez depuis votre smartphone</strong> en sortant du chantier.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl hover:from-yellow-600 hover:to-amber-600 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essai gratuit
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-yellow-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Pas de carte bancaire • ✓ 10 factures gratuites chaque mois
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            L\'outil de facturation pensé pour les électriciens
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-yellow-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-white">
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
            Tous types d\'interventions électriques
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center mb-4">
                  <Plug className="w-6 h-6 text-yellow-600" />
                </div>
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
            Fonctionnalités électri-ciennes
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
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
            Électriciens satisfaits
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-yellow-500 to-amber-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Éteignez les papiers, branchez Factu.me
          </h2>
          <p className="text-xl text-yellow-100 mb-8">
            Électriciens de toute la France : simplifiez votre facturation dès aujourd\'hui
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-yellow-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Démarrer gratuitement
          </Link>
          <p className="mt-6 text-sm text-yellow-100">
            10 factures gratuites par mois • Sans engagement • 100% mobile
          </p>
        </div>
      </section>
    </div>
  );
}

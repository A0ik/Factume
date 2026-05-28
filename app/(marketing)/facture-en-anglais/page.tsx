import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Globe, Languages, ArrowRightLeft, Banknote, MapPin, FileOutput } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Facture en Anglais – Créez des Invoices pour Vos Clients Internationaux',
  description: 'Créez des factures bilingues français-anglais pour vos clients internationaux. Multi-devises (EUR, USD, GBP), modèles professionnels. Essai gratuit.',
  openGraph: {
    title: 'Facture en Anglais – Créez des Invoices pour Vos Clients Internationaux',
    description: 'Factures bilingues, multi-devises, modèles professionnels. Conquérez le marché international.',
    url: 'https://factu.me/facture-en-anglais',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-english-invoice.png',
        width: 1200,
        height: 630,
        alt: 'Facture en Anglais – Invoices Internationales',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facture-en-anglais',
  },
};

const benefits = [
  {
    icon: Languages,
    title: 'Factures bilingues',
    description: 'Générez des factures en français et en anglais sur le même document. Vos termes y sont traduits automatiquement : "Invoice", "Due date", "Subtotal".',
  },
  {
    icon: ArrowRightLeft,
    title: 'Multi-devises',
    description: 'Facturez en euros, dollars américains, livres sterling ou dans 30+ devises. Le taux de change du jour est intégré automatiquement.',
  },
  {
    icon: Globe,
    title: 'Clients internationaux',
    description: 'Gérez des adresses dans le monde entier. Numéros de TVA intracommunautaire, tax ID, EORI : tous les champs sont prévus.',
  },
  {
    icon: Banknote,
    title: 'Paiements transfrontaliers',
    description: 'Indiquez votre IBAN, SWIFT/BIC et les coordonnées bancaires internationales. Vos clients vous paient sans friction.',
  },
  {
    icon: MapPin,
    title: 'TVA intracommunautaire',
    description: 'Numéro de TVA UE vérifié automatiquement via le service VIES. Autoliquidation et reverse charge gérés sans effort.',
  },
  {
    icon: FileOutput,
    title: 'Export conforme',
    description: 'Vos factures internationales sont conformes aux exigences douanières et fiscales françaises et européennes.',
  },
];

const features = [
  {
    title: 'Modèles bilingues',
    items: [
      'Template Invoice / Facture complet',
      'Traduction automatique des termes',
      'Choix de la langue par client',
      'Mentions légales adaptées au pays',
    ],
  },
  {
    title: 'Multi-devises',
    items: [
      '30+ devises supportées (EUR, USD, GBP...)',
      'Taux de change du jour auto-importé',
      'Conversion affichée sur la facture',
      'Rapprochement comptable multi-devises',
    ],
  },
  {
    title: 'Conformité internationale',
    items: [
      'Vérification TVA VIES automatique',
      'Autoliquidation reverse charge',
      'Numéro EORI pour l\'export',
      'Mentions Incoterms si nécessaire',
    ],
  },
];

const testimonials = [
  {
    name: 'Romain L.',
    job: 'Développeur freelance, clients US & UK',
    text: 'Mes clients américains ne comprenaient rien à mes factures en français. Depuis que j\'utilise Factu.me, ils reçoivent des invoices en dollars, claires et professionnelles. Les paiements arrivent plus vite.',
  },
  {
    name: 'Isabelle M.',
    job: 'Agence de traduction, clients européens',
    text: 'On facture en euros, en livres et en couronnes suédoises. Avant c\'était un cauchemar de gestion. Maintenant le taux de change est automatique et nos clients reçoivent des factures dans leur devise.',
  },
  {
    name: 'David C.',
    job: 'Consultant export, clients Moyen-Orient',
    text: 'Le reverse charge et l\'autoliquidation TVA pour mes clients hors UE étaient un casse-tête. Factu.me gère tout. Je me concentre sur mon business.',
  },
];

const useCases = [
  {
    title: 'Freelances internationaux',
    description: 'Développeurs, designers, consultants travaillant avec des clients anglophones : facturez en anglais avec des devises adaptées.',
  },
  {
    title: 'Entreprises exportatrices',
    description: 'PME qui vendent en Europe et dans le monde : factures intracommunautaires, TVA VIES, export hors UE.',
  },
  {
    title: 'Agences multi-pays',
    description: 'Agences avec des filiales ou clients dans plusieurs pays : gérez toutes vos devises et langues depuis un seul outil.',
  },
];

export default function FactureEnAnglaisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facture en Anglais – <span className="text-sky-600">Créez des Invoices</span> pour Vos Clients Internationaux
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Factures bilingues, multi-devises, TVA intracommunautaire : <strong>conquérez le monde</strong> sans quitter votre bureau.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl hover:from-sky-600 hover:to-blue-700 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer une invoice
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-sky-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir un exemple
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Bilingue FR/EN automatique &bull; ✓ 30+ devises &bull; ✓ TVA VIES vérifiée
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Vos clients étrangers méritent des factures impeccables
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-sky-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white">
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
            Pour tous ceux qui facturent à l\'international
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
            L\'international, sans la complexité
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
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
            Ils facturent partout dans le monde
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-sky-500 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Vos clients internationaux n\'attendent plus
          </h2>
          <p className="text-xl text-sky-100 mb-8">
            Créez votre première invoice bilingue en 2 minutes
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-sky-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-sky-100">
            3 factures gratuites par mois &bull; Multi-devises inclus &bull; Sans engagement
          </p>
        </div>
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture en Anglais', url: 'https://factu.me/facture-en-anglais' },
        ]}
      />
    </div>
  );
}

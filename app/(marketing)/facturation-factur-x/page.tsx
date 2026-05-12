import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Shield, FileCheck, Network, Clock, Scale, ScanLine } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Factur-X 2026 – Logiciel Conforme à la Norme EN 16931',
  description: 'Générez des factures Factur-X hybrides (PDF+XML) conformes à la norme EN 16931. Transmission via PDP, compatible Chorus Pro et le mandat B2B 2026.',
  keywords: [
    'factur-x',
    'facture electronique 2026',
    'norme en 16931',
    'facture electronique b2b',
    'pdp facturation',
    'chorus pro',
    'facture hybride pdf xml',
    'logiciel factur-x',
    'facturation electronique obligatoire',
    'conformite facture 2026',
    'facture norme europeenne',
    'plateforme de dematerialisation',
  ],
  openGraph: {
    title: 'Factur-X 2026 – Logiciel Conforme à la Norme EN 16931',
    description: 'Générez des factures Factur-X hybrides (PDF+XML) conformes EN 16931. Compatible PDP, Chorus Pro et mandat B2B 2026.',
    url: 'https://factu.me/facturation-factur-x',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-factur-x.png',
        width: 1200,
        height: 630,
        alt: 'Factur-X 2026 – Logiciel Conforme EN 16931',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-factur-x',
  },
};

const benefits = [
  {
    icon: FileCheck,
    title: 'Factur-X hybride PDF+XML',
    description: 'Chaque facture contient un PDF lisible et un fichier XML structuré. Un seul document pour tout le monde.',
  },
  {
    icon: Shield,
    title: 'Conforme EN 16931',
    description: 'Respect total de la norme européenne. Vos factures passent les contrôles sans erreur ni rejet.',
  },
  {
    icon: Network,
    title: 'Transmission via PDP',
    description: 'Envoyez automatiquement vos factures via une Plateforme de Dématérialisation Partenaire agréée.',
  },
  {
    icon: ScanLine,
    title: 'Génération automatique',
    description: 'Le XML se crée tout seul à partir de votre facture. Pas besoin de saisie double ni de formatage technique.',
  },
  {
    icon: Scale,
    title: 'Compatible Chorus Pro',
    description: 'Facturez les collectivités et l\'État sans friction. Conforme au portail Chorus Pro.',
  },
  {
    icon: Clock,
    title: 'Prêt pour le mandat 2026',
    description: 'Anticipez l\'obligation de facturation électronique B2B. Soyez en règle avant tout le monde.',
  },
];

const features = [
  {
    title: 'Conformité réglementaire',
    items: [
      'Norme EN 16931 (factur-X)',
      'Profils minimum, basic WL, extended',
      'Mentions légales obligatoires intégrées',
      'Mise à jour automatique des normes',
    ],
  },
  {
    title: 'Transmission & échange',
    items: [
      'Envoi via PDP certifiées',
      'Compatible Chorus Pro',
      'Réception de factures fournisseurs',
      'Archivage légal 10 ans',
    ],
  },
  {
    title: 'Intégration comptable',
    items: [
      'Export comptable FEC natif',
      'Imports vers votre expert-comptable',
      'Rapprochement automatique',
      'Tableau de bord conformité',
    ],
  },
];

const testimonials = [
  {
    name: 'Sophie R.',
    job: 'Expert-comptable',
    text: 'Factur-X était un casse-tête pour mes clients. Factu.me génère tout automatiquement, plus aucune erreur de conformité.',
  },
  {
    name: 'Marc D.',
    job: 'DSI PME',
    text: 'On devait se mettre en conformité pour 2026. En 2 jours on était opérationnels grâce à Factu.me.',
  },
  {
    name: 'Laurence P.',
    job: 'Responsable achats collectivité',
    text: 'Enfin des factures propres qui passent Chorus Pro du premier coup. Nos fournisseurs sont ravis.',
  },
];

export default function FacturXPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-cyan-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Factur-X 2026 – Logiciel Conforme à la Norme <span className="text-teal-600">EN 16931</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Générez des factures <strong>hybrides PDF+XML</strong> conformes à la réforme de facturation électronique B2B. Compatible PDP, Chorus Pro et toutes les obligations 2026.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-teal-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une facture Factur-X
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Conforme EN 16931 • ✓ Compatible PDP • ✓ Prêt pour le mandat 2026
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La conformité Factur-X sans la complexité
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-teal-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white">
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
            Tout pour être en conformité
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
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ils ont adopté Factur-X avec Factu.me
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 shadow-lg">
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-teal-600 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Anticipez la réforme 2026 dès aujourd&apos;hui
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Rejoignez les entreprises déjà conformes à la norme Factur-X EN 16931
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-teal-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-teal-200">
            Conforme EN 16931 • Compatible PDP et Chorus Pro • Sans engagement
          </p>
        </div>
      </section>
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Camera, BrainCircuit, Receipt, FolderOpen, Calculator, Sparkles, Download } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'OCR Facturation – Numérisez Vos Reçus avec l\'IA',
  description: 'Photographiez vos reçus et factures : l\'IA extrait automatiquement les montants, dates, TVA et catégories. Export fiscal prêt en 1 clic.',
  openGraph: {
    title: 'OCR Facturation – Numérisez Vos Reçus avec l\'IA',
    description: 'Photographiez vos reçus : l\'IA extrait montants, TVA et catégories automatiquement. Export fiscal en 1 clic.',
    url: 'https://factu.me/facturation-ocr',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-ocr.png',
        width: 1200,
        height: 630,
        alt: 'OCR Facturation – Numérisez avec l\'IA',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-ocr',
  },
};

const benefits = [
  {
    icon: Camera,
    title: 'Photo → facture instantanée',
    description: 'Prenez en photo un reçu ou une facture papier. L\'IA lit et extrait tout en quelques secondes.',
  },
  {
    icon: BrainCircuit,
    title: 'Extraction IA précise',
    description: 'Montants HT/TTC, TVA, dates, fournisseurs, numéros de SIRET : rien ne lui échappe.',
  },
  {
    icon: FolderOpen,
    title: 'Auto-catégorisation',
    description: 'Repas, transports, fournitures, services... Chaque dépense est classée automatiquement.',
  },
  {
    icon: Receipt,
    title: 'Notes de frais simplifiées',
    description: 'Fini les feuilles Excel interminables. Vos notes de frais se remplissent toutes seules.',
  },
  {
    icon: Calculator,
    title: 'TVA récupérée',
    description: 'La TVA de chaque reçu est identifiée et isolée pour votre déclaration. Pas de centime perdu.',
  },
  {
    icon: Download,
    title: 'Export fiscal prêt',
    description: 'Exportez vos dépenses au format comptable. Compatible FEC, expert-comptable et impôts.',
  },
];

const features = [
  {
    title: 'Numérisation intelligente',
    items: [
      'Photo depuis le smartphone',
      'Import PDF et images',
      'Reconnaissance multi-langues',
      'Traitement par lot (10+ reçus)',
    ],
  },
  {
    title: 'Gestion des dépenses',
    items: [
      'Catégories personnalisables',
      'Suivi HT/TTC/TVA',
      'Rapprochement avec factures',
      'Alertes dépassement budget',
    ],
  },
  {
    title: 'Export & comptabilité',
    items: [
      'Export CSV, PDF, FEC',
      'Envoi direct au comptable',
      'Rapports mensuels automatiques',
      'Archivage légal sécurisé',
    ],
  },
];

const testimonials = [
  {
    name: 'Amina K.',
    job: 'Auto-entrepreneuse',
    text: 'Je snappe mes tickets de resto et mes achats, et tout est classé. Ma comptable est impressionnée.',
  },
  {
    name: 'David L.',
    job: 'Commercial itinérant',
    text: 'Mes notes de frais me prenaient 2h par mois. Maintenant c\'est réglé en 10 minutes.',
  },
  {
    name: 'Claire V.',
    job: 'Expert-comptable',
    text: 'Je recommande Factu.me à tous mes clients. Les reçus sont propres, la TVA bien isolée. Un gain de temps énorme.',
  },
];

export default function OcrFacturationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              OCR Facturation – Numérisez Vos Reçus avec <span className="text-emerald-600">l&apos;IA</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Photographiez vos reçus et factures papier. L&apos;IA extrait <strong>montants, TVA, dates et catégories</strong> automatiquement. Export fiscal en 1 clic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir la démo OCR
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ IA de reconnaissance • ✓ Multi-formats • ✓ Export comptable prêt
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La numérisation intelligente de vos dépenses
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

      {/* Features */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            De la photo au rapport comptable
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
            Ils ont simplifié leurs notes de frais
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Fini la saisie manuelle de reçus
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Photographez, c&apos;est classé. Rejoignez des milliers d&apos;utilisateurs qui gagnent des heures chaque mois.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Essayer l&apos;OCR gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            10 scans gratuits par mois • Sans engagement
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
          { name: 'OCR Facturation', url: 'https://factu.me/facturation-ocr' },
        ]}
      />
    </div>
  );
}

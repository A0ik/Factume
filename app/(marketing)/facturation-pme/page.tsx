import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Users, BarChart3, Shield, Clock, Globe, Settings, Download } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Logiciel de Facturation PME – Gérez Toute Votre Facturation',
  description: 'Logiciel de facturation pour PME et TPE : multi-utilisateurs, CRM intégré, export comptable, Factur-X 2026. Gérez votre équipe et vos clients en un seul outil.',
  openGraph: {
    title: 'Logiciel de Facturation PME – Gérez Toute Votre Facturation',
    description: 'Logiciel de facturation PME : multi-utilisateurs, CRM, export comptable, Factur-X. Tout pour gérer la facturation de votre entreprise.',
    url: 'https://factu.me/facturation-pme',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-pme.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel de Facturation PME',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-pme',
  },
};

const benefits = [
  {
    icon: Users,
    title: 'Multi-utilisateurs',
    description: 'Créez des comptes pour chaque membre de votre équipe. Définissez les rôles et permissions : admin, commercial, comptable.',
  },
  {
    icon: BarChart3,
    title: 'CRM intégré',
    description: 'Gérez vos clients, prospects et historique commercial directement dans le logiciel. Pas besoin d\'outil supplémentaire.',
  },
  {
    icon: Download,
    title: 'Export comptable',
    description: 'Exportez vos données au format FEC ou CSV pour votre expert-comptable. Intégration simplifiée avec tous les logiciels comptables.',
  },
  {
    icon: Shield,
    title: 'Factur-X prêt',
    description: 'Anticipez la réforme de facturation électronique B2B de 2026. Vos factures sont déjà au format Factur-X.',
  },
  {
    icon: Globe,
    title: 'Multi-devises',
    description: 'Facturez en euros, dollars, livres sterling ou dirhams. Idéal pour les PME qui travaillent à l\'international.',
  },
  {
    icon: Clock,
    title: 'Automatisation',
    description: 'Factures récurrentes, relances automatiques, rappels de paiement. Votre équipe gagne des heures chaque mois.',
  },
];

const features = [
  {
    title: 'Gestion commerciale',
    items: [
      'Devis, factures, avoirs et acomptes',
      'Pipeline de ventes intégré',
      'Suivi des opportunités',
      'Conversion devis → facture en 1 clic',
    ],
  },
  {
    title: 'Équipe & permissions',
    items: [
      'Comptes illimités par entreprise',
      'Rôles personnalisables (admin, vente, compta)',
      'Journal d\'activité par utilisateur',
      'Tableau de bord par commercial',
    ],
  },
  {
    title: 'Comptabilité & conformité',
    items: [
      'Export FEC pour l\'expert-comptable',
      'Factur-X (réforme 2026)',
      'TVA automatique par pays',
      'Archivage légal 10 ans',
    ],
  },
];

const testimonials = [
  {
    name: 'Nadia B.',
    job: 'Directrice, agence de communication (8 pers.)',
    text: 'On est passé de 3 outils différents à Factu.me. CRM, facturation, relances : tout est au même endroit. L\'équipe commerciale adore.',
  },
  {
    name: 'François P.',
    job: 'Gérant, PME de services informatiques',
    text: 'L\'export comptable a transformé notre relation avec l\'expert-comptable. On lui envoie tout au format FEC, il est ravi.',
  },
  {
    name: 'Amina K.',
    job: 'Responsable admin & financier, SARL',
    text: 'Les relances automatiques ont réduit nos impayés de 40%. Le ROI était évident dès le premier mois.',
  },
];

const useCases = [
  {
    title: 'Agences & ESN',
    description: 'Gérez les factures de vos consultants, les temps passés et les contrats récurrents. Chaque commercial a son propre tableau de bord.',
  },
  {
    title: 'Commerce & distribution',
    description: 'Factures B2B, avoirs, acomptes et relances. Conforme à la réforme 2026 pour tous vos échanges professionnels.',
  },
  {
    title: 'Services aux entreprises',
    description: 'Facturation au temps passé ou au forfait. Suivi des contrats, renouvellements automatiques et CRM intégré.',
  },
];

export default function PMEPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facturation <span className="text-blue-600">PME</span> – Gérez Toute Votre Facturation
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Multi-utilisateurs, CRM intégré, export comptable. <strong>Un seul outil</strong> pour toute votre équipe commerciale et administrative.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essai gratuit équipe
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Demander une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Multi-utilisateurs • ✓ CRM intégré • ✓ Export comptable
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi les PME passent à Factu.me ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-blue-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
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
            Pour tous les types de PME
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
            Un outil complet pour votre entreprise
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
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
            Ce que disent les dirigeants de PME
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Centralisez toute votre facturation
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les PME qui ont simplifié leur gestion commerciale avec Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-blue-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Démarrer l\'essai gratuit
          </Link>
          <p className="mt-6 text-sm text-blue-200">
            Multi-utilisateurs • CRM intégré • Export comptable
          </p>
        </div>
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facturation PME', url: 'https://factu.me/facturation-pme' },
        ]}
      />
    </div>
  );
}

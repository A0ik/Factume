import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Users, BarChart3, Shield, Building2, Lock, ArrowRight } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Logiciel de Facturation PME – La Solution Complète pour Votre Entreprise',
  description: 'Logiciel de facturation pour PME : multi-utilisateurs, CRM intégré, export comptable, Factur-X 2026. Gérez votre facturation d\'équipe en toute simplicité.',
  openGraph: {
    title: 'Logiciel de Facturation PME – La Solution Complète pour Votre Entreprise',
    description: 'Multi-utilisateurs, CRM intégré, export comptable, Factur-X 2026. La facturation PME complète.',
    url: 'https://factu.me/logiciel-facturation-pme',
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
    canonical: 'https://factu.me/logiciel-facturation-pme',
  },
};

const benefits = [
  {
    icon: Users,
    title: 'Multi-utilisateurs',
    description: 'Créez des comptes pour chaque membre de votre équipe. Chacun facture sous l\'identité de l\'entreprise.',
  },
  {
    icon: Lock,
    title: 'Gestion des rôles',
    description: 'Admin, commercial, comptable : attribuez les bons droits à chaque collaborateur. Sécurité renforcée.',
  },
  {
    icon: BarChart3,
    title: 'CRM intégré',
    description: 'Centralisez vos contacts, historiques commerciaux et opportunités. Pilotez votre activité depuis un tableau de bord.',
  },
  {
    icon: Shield,
    title: 'Factur-X 2026',
    description: 'Format Factur-X prêt pour la réforme de facturation électronique. Vos flux B2B sont conformes sans effort.',
  },
  {
    icon: Building2,
    title: 'Export comptable',
    description: 'Exportez vos écritures en FEC ou vers votre expert-comptable. Fini la double saisie et les erreurs.',
  },
  {
    icon: ArrowRight,
    title: 'Automatisation',
    description: 'Factures récurrentes, relances automatiques, numérotation séquentielle. Votre process tourne tout seul.',
  },
];

const features = [
  {
    title: 'Collaboration d\'équipe',
    items: [
      'Comptes illimités pour votre équipe',
      'Rôles : admin, commercial, lecteur',
      'Journal d\'activité par utilisateur',
      'Approbation de factures avant envoi',
    ],
  },
  {
    title: 'CRM & pipeline',
    items: [
      'Fichier clients et prospects complet',
      'Pipeline de vente visuel',
      'Suivi des opportunités par commercial',
      'Rapports CA par équipe et par client',
    ],
  },
  {
    title: 'Comptabilité & conformité',
    items: [
      'Export FEC pour l\'administration',
      'Factur-X (facture électronique 2026)',
      'TVA collectée et déductible automatisée',
      'Tableau de bord fiscal en temps réel',
    ],
  },
];

const testimonials = [
  {
    name: 'Nadia K.',
    job: 'Directrice générale, PME services (25 salariés)',
    text: 'On est passés de 3 outils différents à Factu.me seulement. L\'équipe commerciale valide les devis, la compta exporte directement. Tout le monde y gagne.',
  },
  {
    name: 'Olivier P.',
    job: 'Expert-comptable, cabinet Dupont & Associés',
    text: 'J\'ai recommandé Factu.me à 12 de mes clients PME. L\'export FEC est propre, les écritures sont justes. Ça me fait gagner 2 heures par client en fin de mois.',
  },
  {
    name: 'Catherine M.',
    job: 'Responsable administrative, entreprise de transport',
    text: 'Avec 8 commerciaux sur la route, il nous fallait un outil centralisé. Factu.me permet à chacun de facturer et la compta suit en temps réel.',
  },
];

const useCases = [
  {
    title: 'PME de services',
    description: 'Agences, cabinets, ESN : gérez vos facturations par projet, par client et par collaborateur en toute transparence.',
  },
  {
    title: 'PME du commerce',
    description: 'Grossistes, distributeurs : factures en masse, bons de commande, livraisons et avoirs centralisés.',
  },
  {
    title: 'Cabinets comptables',
    description: 'Offrez Factu.me à vos clients. Accédez à leurs données, exportez les FEC et pilotez leur conformité.',
  },
];

export default function LogicielFacturationPMEPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-white" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facturation PME – <span className="text-indigo-600">La Solution Complète</span> pour Votre Entreprise
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Multi-utilisateurs, CRM intégré, export comptable et <strong>Factur-X 2026</strong>. Un seul outil pour toute votre équipe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essai gratuit équipe
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-indigo-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Demander une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Multi-utilisateurs inclus &bull; ✓ Export comptable &bull; ✓ Factur-X prêt
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La puissance d\'un ERP, la simplicité d\'un SaaS
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-indigo-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white">
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
            Pour chaque type de PME
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
            Fonctionnalités pensées pour les PME
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
            Ce que disent nos clients PME
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Propulsez la facturation de votre entreprise
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Démarrez votre essai gratuit et invitez votre équipe en quelques clics
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-indigo-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer l\'essai gratuit
          </Link>
          <p className="mt-6 text-sm text-indigo-200">
            Multi-utilisateurs inclus &bull; Sans engagement &bull; Support dédié PME
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
          { name: 'Logiciel Facturation PME', url: 'https://factu.me/logiciel-facturation-pme' },
        ]}
      />
    </div>
  );
}

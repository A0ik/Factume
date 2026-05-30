import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, ArrowRight, Brain, Users, Handshake, FileSearch, Wallet } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Alternative Tiime – La Facturation Intelligente | Factu.me',
  description: 'Factu.me vs Tiime : comparatif complet. Dictée vocale IA, contrats, CRM, prix inférieur. Découvrez pourquoi choisir Factu.me plutôt que Tiime.',
  openGraph: {
    title: 'Alternative Tiime – La Facturation Intelligente',
    description: 'IA vocale, contrats, CRM, prix imbattable. Pourquoi les utilisateurs Tiime passent à Factu.me.',
    url: 'https://factu.me/alternative-tiime',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-vs-tiime.png',
        width: 1200,
        height: 630,
        alt: 'Alternative Tiime – Factu.me',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/alternative-tiime',
  },
};

const benefits = [
  {
    icon: Brain,
    title: 'IA et dictée vocale',
    description: 'Factu.me intègre l\'intelligence artificielle pour créer vos factures à la voix. Tiime reste sur une approche classique.',
  },
  {
    icon: Handshake,
    title: 'Contrats et devis signés',
    description: 'Gérez contrats et devis avec signature électronique. Tiime se concentre sur la comptabilité, pas la gestion commerciale.',
  },
  {
    icon: Users,
    title: 'CRM clients intégré',
    description: 'Historique, notes, segmentation. Factu.me gère la relation client, pas seulement la facturation.',
  },
  {
    icon: FileSearch,
    title: 'Factur-X 2026 prêt',
    description: 'Conformité complète à la réforme de facturation électronique. Tiime a des retards sur ce sujet.',
  },
  {
    icon: Wallet,
    title: 'Prix plus accessible',
    description: 'Gratuit pour démarrer, Pro moins cher que Tiime. Pas de surprise à l\'abonnement.',
  },
  {
    icon: ArrowRight,
    title: 'Migration simple',
    description: 'Exportez vos données Tiime et importez-les dans Factu.me. Notre support vous accompagne gratuitement.',
  },
];

const features = [
  {
    title: 'Factu.me excelle sur',
    items: [
      'Dictée vocale IA – aucun concurrent',
      'Gestion de contrats avec signature',
      'CRM clients et historique complet',
      'Multi-devises sans surcoût',
    ],
  },
  {
    title: 'Tiime est bon pour',
    items: [
      'Comptabilité générale (si vous en avez besoin)',
      'Notes de frais avec OCR',
      'Connexion bancaire automatique',
      'Gestion de la TVA avancée',
    ],
  },
  {
    title: 'Pourquoi les gens migrent',
    items: [
      'Interface Tiime complexe pour les freelances',
      'Prix Tiime plus élevé pour moins de features facturation',
      'Pas de dictée vocale chez Tiime',
      'Factu.me plus adapté aux indépendants',
    ],
  },
];

const testimonials = [
  {
    name: 'Alexandre M.',
    job: 'Consultant data',
    text: 'Tiime est bien pour la compta, mais pour la facturation pure, Factu.me est devant. L\'IA vocale m\'a fait migrer.',
  },
  {
    name: 'Léa P.',
    job: 'Designer produit',
    text: 'J\'avais Tiime via mon comptable mais c\'était trop compliqué pour juste faire des factures. Factu.me est pile ce qu\'il me fallait.',
  },
  {
    name: 'Omar S.',
    job: 'Formateur indépendant',
    text: 'Le CRM clients et la signature de devis, Tiime ne l\'a pas. Pour mon activité, Factu.me est le bon choix.',
  },
];

export default function AlternativeTiimePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-cyan-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold mb-6">
              <ArrowRight className="w-4 h-4" />
              Alternative à Tiime
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Alternative Tiime – <span className="text-teal-600">La Facturation Intelligente</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              <strong>IA, contrats, CRM, prix inférieur</strong>. Si Tiime est trop comptable pour vous, Factu.me est la réponse.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer Factu.me
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-teal-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir la démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Migration gratuite depuis Tiime • Plan gratuit disponible
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Là où Factu.me surpasse Tiime
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

      {/* Comparison */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Comparaison honnête
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
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
            Ils sont passés de Tiime à Factu.me
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-teal-600 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Prêt à quitter Tiime ?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Facturation intelligente, IA intégrée, prix accessible
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-teal-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-teal-200">
            Migration aidée • Plan gratuit • Sans engagement
          </p>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: "Quelle différence entre Factu.me et Tiime ?",
            answer: "Factu.me propose la dictée vocale IA, la signature électronique, le CRM et les contrats de travail. Tiime est plus orienté comptabilité."
          },
          {
            question: "Factu.me est-il moins cher que Tiime ?",
            answer: "Oui, le plan Pro Factu.me est à 29,99€/mois avec plus de fonctionnalités que Tiime. Le plan gratuit permet de tester sans engagement."
          },
          {
            question: "Puis-je migrer de Tiime vers Factu.me ?",
            answer: "Oui, la migration est simple et gratuite. Exportez vos données Tiime et importez-les dans Factu.me."
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Alternative Tiime', url: 'https://factu.me/alternative-tiime' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/alternative-henrj', label: 'Alternative Henrri' },
          { href: '/alternative-abby', label: 'Alternative Abby' },
          { href: '/logiciel-facture-gratuit', label: 'Logiciel facture gratuit' },
        ]}
      />
    </div>
  );
}

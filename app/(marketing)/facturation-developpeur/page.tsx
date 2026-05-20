import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Code, Euro, Shield, Clock, Globe, Terminal, Layers } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Facturation Développeur – Pour les Pros du Code | Factu.me',
  description: 'Logiciel de facturation pour développeurs web et mobile : facturation au forfait ou au temps passé, multi-devise, clients internationaux. Essai gratuit.',
  openGraph: {
    title: 'Facturation Développeur – Pour les Pros du Code',
    description: 'Facturation au TJM ou au forfait, multi-devise, clients internationaux. Le logiciel de facturation pensé pour les devs.',
    url: 'https://factu.me/facturation-developpeur',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-developpeur.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation Développeur',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-developpeur',
  },
};

const benefits = [
  {
    icon: Clock,
    title: 'Facturation au TJM',
    description: 'Saisissez vos jours travaillés, le TJM est appliqué automatiquement. Fini les calculs manuels de taux journalier.',
  },
  {
    icon: Globe,
    title: 'Multi-devise intégrée',
    description: 'Facturez en euros, dollars, livres sterling ou francs suisses. Le taux de change est mis à jour automatiquement.',
  },
  {
    icon: Layers,
    title: 'Forfait ou régie',
    description: 'Alternez entre facturation au forfait (prix fixe par projet) et en régie (temps passé). Les deux modes cohabitent.',
  },
  {
    icon: Terminal,
    title: 'Interface rapide',
    description: 'Pas de formulaires interminables. Saisissez, envoyez, passez au suivant. Conçu pour aller vite, comme un bon CLI.',
  },
  {
    icon: Euro,
    title: 'Clients internationaux',
    description: 'Gérez vos clients US, UK, Suisse ou japonais avec les bonnes mentions fiscales et le bon format de facture.',
  },
  {
    icon: Shield,
    title: 'Factur-X 2026',
    description: 'Format de facture électronique obligatoire prêt. Vos factures B2B seront conformes à la réforme de 2026.',
  },
];

const useCases = [
  {
    title: 'Développeur web freelance',
    description: 'Facturez vos missions React, Next.js, Node.js au TJM. Suivez vos jours et générez la facture de fin de mois.',
  },
  {
    title: 'Développeur mobile',
    description: 'Projets iOS, Android ou Flutter au forfait. Créez des factures avec jalons de paiement liés aux livrables.',
  },
  {
    title: 'DevOps & infra',
    description: 'Facturez vos prestations de migration cloud, CI/CD, monitoring. Au temps passé ou au forfait de mission.',
  },
];

const features = [
  {
    title: 'Facturation projet',
    items: [
      'Facturation au TJM ou au forfait',
      'Jalons et livrables par projet',
      'Acomptes et soldes automatiques',
      'Historique par mission complète',
    ],
  },
  {
    title: 'International',
    items: [
      'Multi-devise avec taux en temps réel',
      'Mentions fiscales par pays',
      'Factures bilingues (FR/EN)',
      'Numéro de TVA intracommunautaire',
    ],
  },
  {
    title: 'Productivité',
    items: [
      'Dictée vocale : "3 jours à 600"',
      'Templates de factures récurrentes',
      'Dupliquer une facture en 1 clic',
      'Export comptable FEC automatique',
    ],
  },
];

const testimonials = [
  {
    name: 'Antoine L.',
    job: 'Développeur React freelance – Paris',
    text: 'Je facture mes missions en multi-devise car j\'ai des clients à Londres et Zurich. Factu.me gère les conversions tout seul.',
  },
  {
    name: 'Sarah K.',
    job: 'Développeuse Flutter – Remote',
    text: 'Le TJM est pré-rempli, je clique sur les jours du mois et la facture est prête. 30 secondes chrono, comme un bon déploiement.',
  },
  {
    name: 'Maxime B.',
    job: 'DevOps freelance – Lyon',
    text: 'Je passe de la régie au forfait selon les missions. Avoir les deux modes dans le même outil, c\'est exactement ce qu\'il fallait.',
  },
];

export default function DeveloppeurPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-green-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Développeur – Pour les Pros <span className="text-emerald-600">du Code</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              TJM, forfait, multi-devise, clients internationaux. <strong>La facturation pensée pour les développeurs</strong> web et mobile.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-xl hover:shadow-2xl"
              >
                <Code className="w-5 h-5 mr-2" />
                Commencer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ 10 factures gratuites par mois • ✓ Multi-devise inclus
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi les devs choisissent Factu.me ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-emerald-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white">
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
            Quel que soit votre stack, on vous couvre
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center mb-4">
                  <Code className="w-6 h-6 text-emerald-600" />
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
            Feature-complete, comme votre code
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
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ce que disent les devs
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Votre temps est précieux. Ne le gaspillez pas en admin.
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Des centaines de développeurs freelances facturent en 30 secondes avec Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            npm install factu-me
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            10 factures gratuites par mois • Sans engagement • Multi-devise
          </p>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: "Comment facturer en TJM ?",
            answer: "Avec Factu.me, configurez votre taux journalier moyen une seule fois dans votre profil. Ensuite, indiquez le nombre de jours travaillés dans le mois et la facture est calculée automatiquement. Vous pouvez aussi utiliser la dictée vocale : '3 jours à 600€ de TJM'.",
          },
          {
            question: "Puis-je utiliser l'API Factu.me ?",
            answer: "Factu.me est conçu comme une application web intuitive qui ne nécessite aucune intégration technique. Cependant, l'export automatique via FEC et les webhooks permettent une intégration facile avec vos outils existants.",
          },
          {
            question: "Comment exporter pour mon expert-comptable ?",
            answer: "Factu.me propose un export FEC (Fichier des Ecritures Comptables) en un clic, compatible avec tous les logiciels comptables français. Vous pouvez aussi partager un accès lecture avec votre expert-comptable.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facturation Developpeur', url: 'https://factu.me/facturation-developpeur' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/facturation-freelances', label: 'Facturation Freelances' },
          { href: '/logiciel-facture-gratuit', label: 'Logiciel Facture Gratuit' },
        ]}
      />
    </div>
  );
}

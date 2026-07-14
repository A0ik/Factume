import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Briefcase, Clock, TrendingUp, FileSpreadsheet, Plane, Milestone } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Facturation Consultant – Facturez Vos Prestations en un Clic',
  description: 'Logiciel de facturation pour consultants : taux journaliers, gestion de missions, frais de déplacement, facturation par étapes. Essai gratuit.',
  openGraph: {
    title: 'Facturation Consultant – Facturez Vos Prestations en un Clic',
    description: 'Taux journaliers, missions, frais, facturation par étapes. Le logiciel fait pour les consultants.',
    url: 'https://factu.me/facturation-consultant',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-consultant.png',
        width: 1200,
        height: 630,
        alt: 'Facturation Consultant',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-consultant',
  },
};

const benefits = [
  {
    icon: Briefcase,
    title: 'Taux journalier (TJM)',
    description: 'Renseignez votre TJM une seule fois. Vos factures se calculent automatiquement en fonction des jours travaillés.',
  },
  {
    icon: Milestone,
    title: 'Facturation par étapes',
    description: 'Découpez vos missions en jalons. Facturez 30% à la signature, 40% à la livraison, 30% à la réception.',
  },
  {
    icon: Plane,
    title: 'Frais & dépenses',
    description: 'Ajoutez vos frais de déplacement, repas, hébergement sur chaque facture. Vos notes de frais deviennent des lignes de facture.',
  },
  {
    icon: Clock,
    title: 'Suivi du temps',
    description: 'Enregistrez vos heures par mission et par client. Transformez votre timesheet en facture en un clic.',
  },
  {
    icon: TrendingUp,
    title: 'Pilotage CA',
    description: 'Suivez votre chiffre d\'affaires par client, par mission et par mois. Anticipez vos revenus et vos creux.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Export comptable',
    description: 'Transmettez vos écritures à votre expert-comptable en FEC. Fini les tableurs Excel manuels.',
  },
];

const features = [
  {
    title: 'Gestion de missions',
    items: [
      'Création de missions avec périmètre',
      'Découpage en jalons facturables',
      'Suivi d\'avancement par mission',
      'Alerte quand le budget approche',
    ],
  },
  {
    title: 'Facturation consultant',
    items: [
      'TJM ou forfait, au choix',
      'Lignes détaillées par jour ou semaine',
      'Notes de frais intégrées',
      'Numérotation séquentielle conforme',
    ],
  },
  {
    title: 'Relation client',
    items: [
      'Portail client pour consulter les factures',
      'Envoi automatique par email',
      'Relances programmées pour les impayés',
      'Historique complet par client',
    ],
  },
];

const testimonials = [
  {
    name: 'Stéphane D.',
    job: 'Consultant en management, Paris',
    text: 'Je facture au TJM et j\'avais toujours des erreurs de calcul sur les jours. Avec Factu.me, je rentre mes jours de mission et la facture est prête. Zéro stress.',
  },
  {
    name: 'Amina T.',
    job: 'Consultante SI, Bordeaux',
    text: 'La facturation par jalons a changé ma vie. Ma mission de 18 mois est découpée, je facture chaque étape automatiquement. Mon cash flow est prévisible.',
  },
  {
    name: 'Hugo V.',
    job: 'Consultant stratégie, Lyon',
    text: 'Avant je passais 2h par mois sur mes factures entre les frais de déplacement, les TJM différents selon les clients. Maintenant c\'est réglé en 15 minutes.',
  },
];

const useCases = [
  {
    title: 'Consultants en management',
    description: 'Interventions courtes, TJM élevé, frais de déplacement : facturez précisément chaque mission sans perdre de temps.',
  },
  {
    title: 'Consultants IT',
    description: 'Missions longues, régies ou forfaits : suivez le temps passé, facturez par étapes et pilotez votre taux d\'occupation.',
  },
  {
    title: 'Consultants en stratégie',
    description: 'Audit, diagnostic, plan d\'action : structurez votre facturation autour des phases de votre méthodologie.',
  },
];

export default function FacturationConsultantPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-white" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Consultant – <span className="text-emerald-600">Facturez Vos Prestations en un Clic</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              TJM, missions, frais, jalons : un logiciel qui comprend <strong>les spécificités du conseil</strong>. Pas de bullshit, juste de l\'efficacité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-600 rounded-2xl hover:from-emerald-700 hover:to-emerald-700 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essai gratuit
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
              ✓ Gestion TJM & forfaits &bull; ✓ Notes de frais intégrées &bull; ✓ 3 factures gratuites/mois
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Le seul outil pensé pour les consultants
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

      {/* Use Cases */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pour chaque type de conseil
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
            Tout pour piloter votre activité de conseil
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
            Consultants satisfaits
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Facturez vos prestations sans effort
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Rejoignez des centaines de consultants qui ont automatisé leur facturation
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Démarrer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            3 factures gratuites par mois &bull; Sans engagement &bull; Aucune CB requise
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
          { name: 'Facturation Consultant', url: 'https://factu.me/facturation-consultant' },
        ]}
      />
    </div>
  );
}

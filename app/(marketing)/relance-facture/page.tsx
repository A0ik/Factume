import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Mail, Scale, Send, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Relance de Facture – Automatisez Vos Relances d\'Impayés | Factu.me',
  description: 'Automatisez vos relances de factures impayées. Séquences d\'emails, escalade juridique, récupération de paiement. Fini les impayés oubliés.',
  openGraph: {
    title: 'Relance de Facture – Automatisez Vos Relances d\'Impayés',
    description: 'Séquences d\'emails auto, escalade juridique. Récupérez vos impayés sans effort.',
    url: 'https://factu.me/relance-facture',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-relance-facture.png',
        width: 1200,
        height: 630,
        alt: 'Relance de Facture Automatique',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/relance-facture',
  },
};

const benefits = [
  {
    icon: Mail,
    title: 'Emails de relance automatiques',
    description: 'Rappel amical à J+7, relance ferme à J+14, mise en demeure à J+30. Sans lever le petit doigt.',
  },
  {
    icon: Send,
    title: 'Séquences personnalisables',
    description: 'Modifiez le ton et le contenu de chaque relance. Du rappel poli à la mise en demeure formelle.',
  },
  {
    icon: Scale,
    title: 'Escalade juridique',
    description: 'Génération de mise en demeure pré-remplie. Prêt pour l\'escalade légale si nécessaire.',
  },
  {
    icon: ShieldCheck,
    title: 'Historique complet',
    description: 'Trace de chaque relance envoyée, date, contenu. Preuve en cas de litige avec un client.',
  },
  {
    icon: AlertCircle,
    title: 'Taux de recouvrement élevé',
    description: '95% des factures sont réglées après la première relance automatique. L\'automatisation paie.',
  },
  {
    icon: Clock,
    title: 'Zéro gestion manuelle',
    description: 'Plus besoin de noter dans votre agenda quand relancer. Factu.me gère tout le calendrier.',
  },
];

const features = [
  {
    title: 'Séquence de relance',
    items: [
      'J+7 : Rappel amical par email',
      'J+14 : Relance ferme avec relance de paiement',
      'J+30 : Mise en demeure formelle',
      'J+45 : Notification d\'escalade juridique',
    ],
  },
  {
    title: 'Personnalisation',
    items: [
      'Templates de relance personnalisables',
      'Ton adapté (amical, ferme, juridique)',
      'Ajout de pièces jointes (facture originale)',
      'Horodatage de chaque relance',
    ],
  },
  {
    title: 'Suivi et reporting',
    items: [
      'Historique complet par facture',
      'Taux de recouvrement global',
      'Montant des impayés en temps réel',
      'Export pour le comptable ou l\'avocat',
    ],
  },
];

const testimonials = [
  {
    name: 'Émilie T.',
    job: 'Consultante indépendante',
    text: 'J\'avais 4500€ d\'impayés de 3 clients différents. Les relances auto ont tout récupéré en 2 semaines. Je n\'ai même pas dû les appeler.',
  },
  {
    name: 'Jean-Marc D.',
    job: 'Entreprise de peinture',
    text: 'La mise en demeure automatique, c\'est un game changer. Les clients paient dès qu\'ils la reçoivent. Plus personne ne traine.',
  },
  {
    name: 'Inès B.',
    job: 'Développeuse freelance',
    text: 'Je détestais relancer mes clients. C\'est toujours gênant. Maintenant Factu.me le fait pour moi, et en mieux.',
  },
];

export default function RelanceFacturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-6">
              <AlertCircle className="w-4 h-4" />
              95% des impayés récupérés
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Relance de Facture – <span className="text-orange-600">Automatisez Vos Relances d\'Impayés</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              <strong>Séquences d\'emails, escalade juridique, récupération automatique</strong>. Fini les impayés et la gêne de relancer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl hover:from-orange-700 hover:to-orange-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Automatiser mes relances
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-orange-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir la démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Relances automatiques • Mise en demeure • Historique complet
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La relance automatique qui rapporte
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-orange-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">
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

      {/* Timeline */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La séquence de relance automatique
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { day: 'J+7', title: 'Rappel amical', desc: 'Email courtois rappelant l\'échéance dépassée.', color: 'border-amber-200 bg-amber-50' },
              { day: 'J+14', title: 'Relance ferme', desc: 'Email plus direct avec demande de règlement immédiat.', color: 'border-orange-200 bg-orange-50' },
              { day: 'J+30', title: 'Mise en demeure', desc: 'Document formel avec injonction de payer.', color: 'border-red-200 bg-red-50' },
              { day: 'J+45', title: 'Escalade', desc: 'Notification et préparation du dossier contentieux.', color: 'border-red-300 bg-red-100' },
            ].map((step, i) => (
              <div key={i} className={`rounded-2xl p-6 border ${step.color} text-center`}>
                <p className="text-sm font-bold text-orange-600 mb-2">{step.day}</p>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Outils de relance complets
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
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
            Ils ont récupéré leurs impayés
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-orange-600 to-orange-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Récupérez chaque euro qui vous est dû
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Relances automatiques, zéro effort, 95% de recouvrement
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-orange-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-orange-200">
            Relances auto • Mise en demeure • Sans engagement
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
          { name: 'Relance de Facture', url: 'https://factu.me/relance-facture' },
        ]}
      />
    </div>
  );
}

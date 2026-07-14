import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Repeat, Send, FileCheck, Clock, Eye, ArrowRight } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Devis et Facture – Créez, Envoyez, Convertissez | Factu.me',
  description: 'Gérez vos devis et factures dans un seul outil. Créez des devis pro, suivez leur acceptation, convertissez en facture en 1 clic. Essai gratuit.',
  openGraph: {
    title: 'Devis et Facture – Créez, Envoyez, Convertissez',
    description: 'Devis pro, suivi d\'acceptation, conversion en facture en 1 clic. Tout dans un seul outil.',
    url: 'https://factu.me/devis-facture',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-devis-facture.png',
        width: 1200,
        height: 630,
        alt: 'Devis et Facture – Factu.me',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/devis-facture',
  },
};

const benefits = [
  {
    icon: FileText,
    title: 'Devis professionnels',
    description: 'Créez des devis esthétiques avec votre logo, vos couleurs. Vos clients voient votre professionnalisme dès le premier contact.',
  },
  {
    icon: Eye,
    title: 'Suivi d\'ouverture',
    description: 'Sachez quand votre client ouvre votre devis. Plus besoin de deviner s\'il l\'a reçu ou ignoré.',
  },
  {
    icon: FileCheck,
    title: 'Acceptation en ligne',
    description: 'Votre client accepte ou refuse directement en ligne. Fini les "oui" oraux qu\'on oublie.',
  },
  {
    icon: Repeat,
    title: 'Conversion en 1 clic',
    description: 'Devis accepté ? Cliquez sur "Convertir en facture". Les données se reportent automatiquement.',
  },
  {
    icon: Send,
    title: 'Envoi par email intégré',
    description: 'Envoyez devis et factures depuis Factu.me. Suivi d\'envoi, accusé de réception, relances auto.',
  },
  {
    icon: Clock,
    title: 'Gain de temps massif',
    description: 'De devis à facture en 2 minutes au lieu de 30. Automatisez le travail répétitif.',
  },
];

const features = [
  {
    title: 'Workflow devis',
    items: [
      'Création en moins de 2 minutes',
      'Templates personnalisables',
      'Numérotation automatique',
      'Conditions générales intégrées',
    ],
  },
  {
    title: 'Suivi et conversion',
    items: [
      'Notification d\'ouverture par le client',
      'Acceptation ou refus en ligne',
      'Conversion en facture en 1 clic',
      'Relance automatique si sans réponse',
    ],
  },
  {
    title: 'Facturation liée',
    items: [
      'Données devis reportées sur la facture',
      'Acomptes et soldes',
      'Factures récurrentes automatiques',
      'Suivi des paiements et impayés',
    ],
  },
];

const testimonials = [
  {
    name: 'Clément R.',
    job: 'Agence web',
    text: 'Le workflow devis → acceptation → facture est fluide. Mes clients sont impressionnés par le suivi en ligne.',
  },
  {
    name: 'Hélène F.',
    job: 'Coach professionnelle',
    text: 'Avant je faisais mes devis sur Word et mes factures sur Excel. Maintenant tout est dans Factu.me, et la conversion est automatique.',
  },
  {
    name: 'Mehdi K.',
    job: 'Entreprise de rénovation',
    text: 'L\'acceptation en ligne des devis m\'évite des allers-retours. Le client clique "Accepter" et je facture.',
  },
];

export default function DevisFacturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Devis et Facture – <span className="text-emerald-600">Créez, Envoyez, Convertissez</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Gérez vos <strong>devis et factures dans un seul outil</strong>. Suivi d\'acceptation, conversion en 1 clic, relances automatiques.
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
                Voir la démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Devis illimités • Conversion en 1 clic • Suivi d\'acceptation
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Le workflow complet, du devis à l\'encaissement
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

      {/* Workflow visual */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Devis à facture, en 3 étapes
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Créez votre devis', desc: 'Remplissez les prestations, ajoutez vos conditions. PDF pro généré.', icon: FileText },
              { step: '2', title: 'Le client accepte', desc: 'Il reçoit un lien, consulte et accepte en ligne. Vous êtes notifié.', icon: FileCheck },
              { step: '3', title: 'Convertissez en facture', desc: '1 clic et votre devis devient une facture. Les données se reportent.', icon: ArrowRight },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8" />
                </div>
                <div className="text-sm font-bold text-emerald-500 mb-2">Étape {item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Tout pour gérer devis et factures
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
            Ils gèrent devis et factures avec Factu.me
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
            Simplifiez votre cycle devis-facture
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Un seul outil, du premier contact au paiement
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Devis illimités • Conversion 1 clic • Sans engagement
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
          { name: 'Devis et Facture', url: 'https://factu.me/devis-facture' },
        ]}
      />
    </div>
  );
}

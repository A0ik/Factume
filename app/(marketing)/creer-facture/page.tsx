import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Rocket, Bot, FileDown, Mail, CreditCard, ListChecks } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Créer une Facture – En 30 Secondes avec l\'IA',
  description: 'Créez une facture professionnelle en 30 secondes : l\'IA remplit automatiquement les champs, génère le PDF et l\'envoie par email. Suivi de paiement inclus.',
  keywords: [
    'creer facture',
    'creer une facture',
    'creer facture en ligne',
    'creer facture gratuite',
    'creer facture rapidement',
    'creer facture ia',
    'faire une facture',
    'creer facture pdf',
    'creer facture auto entrepreneur',
    'creer facture freelance',
    'comment creer une facture',
    'creer facture professionnelle',
  ],
  openGraph: {
    title: 'Créer une Facture – En 30 Secondes avec l\'IA',
    description: 'L\'IA remplit les champs, génère le PDF et envoie par email. Suivi de paiement inclus.',
    url: 'https://factu.me/creer-facture',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-creer-facture.png',
        width: 1200,
        height: 630,
        alt: 'Créer une Facture en 30 Secondes avec l\'IA',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/creer-facture',
  },
};

const benefits = [
  {
    icon: Rocket,
    title: '30 secondes, pas plus',
    description: 'De zéro à facture envoyée en un demi-tour. Pas de formulaires interminables, pas de paramétrage.',
  },
  {
    icon: Bot,
    title: 'Auto-remplissage IA',
    description: 'L\'IA pré-remplit client, montants, TVA et mentions légales à partir de votre description.',
  },
  {
    icon: FileDown,
    title: 'PDF instantané',
    description: 'Votre facture est générée en PDF professionnel dès que vous cliquez sur Créer. Aucune attente.',
  },
  {
    icon: Mail,
    title: 'Envoi email intégré',
    description: 'Envoyez directement depuis Factu.me. Votre client reçoit un email propre avec la facture en pièce jointe.',
  },
  {
    icon: CreditCard,
    title: 'Suivi de paiement',
    description: 'Sachez quand votre client ouvre la facture. Relances automatiques si le délai est dépassé.',
  },
  {
    icon: ListChecks,
    title: 'Étapes guidées',
    description: 'Interface pas-à-pas : client, prestation, vérification, envoi. Impossible de se tromper.',
  },
];

const features = [
  {
    title: 'Création rapide',
    items: [
      'Auto-remplissage par l\'IA',
      'Base de clients mémorisée',
      'Lignes de prestation prédéfinies',
      'Duplication de factures existantes',
    ],
  },
  {
    title: 'Document professionnel',
    items: [
      'PDF haute qualité sans filigrane',
      'Logo et couleurs personnalisés',
      'Mentions légales conformes',
      'Numérotation automatique',
    ],
  },
  {
    title: 'Envoi & suivi',
    items: [
      'Envoi par email en 1 clic',
      'Lien de paiement en ligne intégré',
      'Alerte d\'ouverture par le client',
      'Relance automatique à J+15, J+30',
    ],
  },
];

const testimonials = [
  {
    name: 'Mélanie D.',
    job: 'Traductrice freelance',
    text: '30 secondes, c\'est le temps qu\'il me faut maintenant. Avant c\'était 15 minutes sur Word. Le jour et la nuit.',
  },
  {
    name: 'Hugo R.',
    job: 'Développeur mobile',
    text: 'L\'auto-remplissage IA me bluffe. Je commence à taper le nom du client et tout se remplit tout seul.',
  },
  {
    name: 'Fatima A.',
    job: 'Auto-entrepreneuse e-commerce',
    text: 'Le suivi de paiement est un game changer. Je sais exactement qui a ouvert sa facture et qui est en retard.',
  },
];

export default function CreerFacturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Créer une Facture – En <span className="text-green-600">30 Secondes</span> avec l&apos;IA
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              L&apos;IA <strong>remplit les champs, génère le PDF et l&apos;envoie par email</strong>. Suivi de paiement et relances automatiques inclus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-2xl hover:from-green-700 hover:to-green-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer ma facture gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-green-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir comment ça marche
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ 30 secondes chrono • ✓ IA auto-remplissage • ✓ PDF + email inclus
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Créer une facture n&apos;a jamais été aussi simple
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-green-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
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
            De la création au paiement, tout est automatisé
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
            Ils créent leurs factures en un éclair
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Créez votre première facture maintenant
          </h2>
          <p className="text-xl text-green-100 mb-8">
            30 secondes. C&apos;est tout ce qu&apos;il vous faut. Essai gratuit, sans carte bancaire.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-green-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Rocket className="w-5 h-5 mr-2" />
            Créer ma facture – c&apos;est gratuit
          </Link>
          <p className="mt-6 text-sm text-green-200">
            10 factures gratuites par mois • IA auto-remplissage • Suivi de paiement
          </p>
        </div>
      </section>
    </div>
  );
}

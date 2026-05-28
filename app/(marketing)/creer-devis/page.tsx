import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Timer, MessageSquare, Calculator, Download, Send, Rocket } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Créer un Devis – En Moins de 2 Minutes | Factu.me',
  description: 'Créez un devis professionnel en moins de 2 minutes. IA assistée, calculs automatiques, PDF professionnel, envoi par email. Essai gratuit.',
  openGraph: {
    title: 'Créer un Devis – En Moins de 2 Minutes',
    description: 'IA assistée, calculs auto, PDF pro. Votre devis prêt en 120 secondes.',
    url: 'https://factu.me/creer-devis',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-creer-devis.png',
        width: 1200,
        height: 630,
        alt: 'Créer un Devis en 2 Minutes',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/creer-devis',
  },
};

const benefits = [
  {
    icon: Timer,
    title: 'Moins de 2 minutes',
    description: 'De la page blanche au devis envoyé en 120 secondes chrono. Pas de formulaire à rallonge.',
  },
  {
    icon: MessageSquare,
    title: 'Assistance IA vocale',
    description: 'Dites "Refonte site web, 5 pages, 3000 euros HT" et vos lignes se remplissent comme par magie.',
  },
  {
    icon: Calculator,
    title: 'Calculs automatiques',
    description: 'TVA, remises, totaux, HT, TTC : tout se calcule tout seul. Zéro erreur de calcul possible.',
  },
  {
    icon: Download,
    title: 'PDF professionnel',
    description: 'Un PDF propre avec votre logo, vos couleurs, vos mentions légales. Envoyez-le fièrement.',
  },
  {
    icon: Send,
    title: 'Envoi par email intégré',
    description: 'Pas besoin d\'ouvrir Gmail. Envoyez depuis Factu.me et suivez l\'ouverture par le client.',
  },
  {
    icon: Rocket,
    title: 'Zéro configuration',
    description: 'Inscrivez-vous, ajoutez votre nom et adresse, et créez votre premier devis. C\'est tout.',
  },
];

const features = [
  {
    title: 'Création express',
    items: [
      'Sélection client en 1 clic (ou nouveau client)',
      'Lignes de devis avec quantité et prix',
      'TVA calculée automatiquement',
      'Conditions de validité pré-remplies',
    ],
  },
  {
    title: 'Personnalisation',
    items: [
      'Logo et couleurs de votre marque',
      'Texte d\'introduction personnalisable',
      'Conditions générales en pièce jointe',
      'Mentions légales conformes',
    ],
  },
  {
    title: 'Envoi et suivi',
    items: [
      'Envoi par email en 1 clic',
      'Lien de consultation en ligne',
      'Notification quand le client ouvre',
      'Relance auto si sans réponse à J+3',
    ],
  },
];

const testimonials = [
  {
    name: 'Lucas M.',
    job: 'Développeur web freelance',
    text: '2 minutes chrono, je l\'ai chronométré. Mon devis était envoyé avant que le client raccroche l\'appel.',
  },
  {
    name: 'Camille D.',
    job: 'Photographe mariage',
    text: 'La dictée vocale, c\'est dingue. Je dicte mes formules mariage et le devis est prêt. Mes collègues sont jaloux.',
  },
  {
    name: 'Antoine L.',
    job: 'Plombier indépendant',
    text: 'Je fais mes devis sur mon téléphone entre deux chantiers. Rapide, propre, et les calculs sont toujours justes.',
  },
];

export default function CreerDevisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold mb-6">
              <Timer className="w-4 h-4" />
              En moins de 2 minutes
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Créer un Devis – <span className="text-green-600">En Moins de 2 Minutes</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Assistance <strong>IA, calculs automatiques, PDF professionnel</strong>. De la page blanche au devis envoyé en un clin d\'oeil.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-2xl hover:from-green-700 hover:to-green-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer mon devis maintenant
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-green-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir un exemple
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Gratuit • Devis illimités
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Le devis le plus rapide du marché
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
            Créer, personnaliser, envoyer
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
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
            Ils créent leurs devis en un éclair
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Votre devis est prêt dans 2 minutes
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Inscrivez-vous et créez votre premier devis maintenant
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-green-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Créer mon devis gratuit
          </Link>
          <p className="mt-6 text-sm text-green-200">
            Gratuit • Devis illimités
          </p>
        </div>
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Créer un Devis', url: 'https://factu.me/creer-devis' },
        ]}
      />
    </div>
  );
}

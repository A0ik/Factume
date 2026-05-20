import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, CreditCard, Gift, Shield, Clock, Star, TrendingUp } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Logiciel de Facture Gratuit – Jusqu\'à 10 Factures par Mois | Factu.me',
  description: 'Logiciel de facture gratuit sans carte bancaire. Créez jusqu\'à 10 factures par mois, devis, suivi clients. Passez au pro quand vous êtes prêt.',
  openGraph: {
    title: 'Logiciel de Facture Gratuit – Jusqu\'à 10 Factures par Mois',
    description: 'Facturez gratuitement sans carte bancaire. 10 factures/mois, devis, suivi clients inclus.',
    url: 'https://factu.me/logiciel-facture-gratuit',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-gratuit.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel de Facture Gratuit',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/logiciel-facture-gratuit',
  },
};

const benefits = [
  {
    icon: Gift,
    title: 'Vraiment gratuit',
    description: '10 factures par mois sans payer un centime. Aucune fonctionnalité cachée derrière un paywall.',
  },
  {
    icon: CreditCard,
    title: 'Sans carte bancaire',
    description: 'Inscrivez-vous en 30 secondes. Pas de numéro de carte, pas d\'essai qui expire.',
  },
  {
    icon: Zap,
    title: 'Factures en 30 secondes',
    description: 'Remplissez, envoyez, c\'est terminé. Interface pensée pour aller droit au but.',
  },
  {
    icon: Star,
    title: 'Fonctionnalités complètes',
    description: 'Même en gratuit : devis, suivi clients, PDF pro, multi-devises, mentions légales.',
  },
  {
    icon: Shield,
    title: 'Conforme loi française',
    description: 'Numérotation séquentielle, mentions légales, Factur-X. Votre facture est légale dès le premier jour.',
  },
  {
    icon: TrendingUp,
    title: 'Évoluez à votre rythme',
    description: 'Quand votre activité grandit, passez au plan Pro en un clic. Vos données restent intactes.',
  },
];

const features = [
  {
    title: 'Ce qui est inclus gratuitement',
    items: [
      '10 factures par mois sans limite de temps',
      'Devis illimités avec conversion en facture',
      'Gestion de vos clients et historique',
      'Envoi par email directement depuis l\'app',
      'PDF professionnel avec votre logo',
      'Tableau de bord avec chiffre d\'affaires',
    ],
  },
  {
    title: 'Pourquoi c\'est vraiment gratuit',
    items: [
      'Pas de publicités dans vos factures',
      'Pas de filigrane "Factu.me"',
      'Pas de limite sur le nombre de clients',
      'Pas de collecte de données revendue',
      'Pas d\'essai qui se transforme en abonnement',
      'Pas de carte bancaire demandée',
    ],
  },
  {
    title: 'Le passage au Pro',
    items: [
      'Factures illimitées pour les entreprises en croissance',
      'Dictée vocale IA pour facturer encore plus vite',
      'Factures récurrentes automatiques',
      'Relances automatiques d\'impayés',
      'Signature électronique des devis',
      'Support prioritaire par chat',
    ],
  },
];

const testimonials = [
  {
    name: 'Sophie L.',
    job: 'Auto-entrepreneuse, vente en ligne',
    text: 'Je faisais mes factures sur Word avant. Factu.me m\'a coûté 0€ et mes factures sont 10x plus pro.',
  },
  {
    name: 'Karim B.',
    job: 'Photographe indépendant',
    text: 'Le plan gratuit est largement suffisant pour commencer. J\'ai pris le Pro quand j\'ai dépassé 10 factures.',
  },
  {
    name: 'Emma R.',
    job: 'Professeure de yoga',
    text: 'Pas de carte bancaire, pas de stress. Je facture mes cours en 2 minutes et je passe à autre chose.',
  },
];

export default function LogicielFactureGratuitPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-green-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
              <Gift className="w-4 h-4" />
              100% Gratuit – Sans carte bancaire
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facture Gratuit – Jusqu&apos;à <span className="text-emerald-600">10 Factures par Mois</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Créez des factures professionnelles sans débourser un centime. <strong>Aucune carte bancaire requise</strong>, aucune mauvaise surprise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
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
              Pas de carte bancaire • Pas de publicité • Pas de filigrane
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Un logiciel gratuit qui ne fait pas cheap
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

      {/* Free vs Pro */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ce que vous avez, et ce qui vous attend
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
            Ils ont commencé gratuitement
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
            Votre première facture est gratuite
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Rejoignez les auto-entrepreneurs et freelances qui facturent sans payer
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement – 0€ pour toujours
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Pas de carte bancaire • 10 factures/mois • Sans engagement
          </p>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: "Est-ce vraiment gratuit ?",
            answer: "Oui, le plan gratuit de Factu.me vous permet de créer jusqu'à 10 factures par mois, sans limite de durée. Il n'y a aucune fonctionnalité cachée derrière un paywall, pas de publicité et pas de filigrane sur vos factures.",
          },
          {
            question: "Combien de factures puis-je créer gratuitement ?",
            answer: "Vous pouvez créer jusqu'à 10 factures par mois avec le plan gratuit. Ce nombre se réinitialise chaque mois. Les devis et les avoirs sont illimités, même en gratuit.",
          },
          {
            question: "Dois-je entrer ma carte bancaire ?",
            answer: "Non, aucune carte bancaire n'est requise pour utiliser le plan gratuit. Vous pouvez vous inscrire en 30 secondes avec simplement votre email et commencer à facturer immédiatement.",
          },
          {
            question: "Comment passer au plan payant ?",
            answer: "Vous pouvez passer au plan Pro à tout moment en un clic depuis votre tableau de bord. Le passage est progressif : vos données, clients et factures existantes sont conservées intactes.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Logiciel de facture gratuit', url: 'https://factu.me/logiciel-facture-gratuit' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/facturation-auto-entrepreneur', label: 'Facturation Auto-entrepreneur' },
          { href: '/facturation-btp', label: 'Facturation BTP' },
          { href: '/demo', label: 'Voir une demo' },
        ]}
      />
    </div>
  );
}

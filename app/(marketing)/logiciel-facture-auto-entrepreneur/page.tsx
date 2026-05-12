import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, MessageSquare, Euro, Shield, Clock, Smartphone, Mic, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel de Facture Auto-Entrepreneur – 100% Conforme & Gratuit',
  description: 'Logiciel de facturation auto-entrepreneur : factures sans TVA (art. 293B), mentions URSSAF obligatoires, format conforme. 100% gratuit pour démarrer.',
  keywords: [
    'logiciel facture auto-entrepreneur',
    'facture auto-entrepreneur gratuit',
    'générer facture auto-entrepreneur',
    'créer facture micro-entrepreneur',
    'modèle facture auto-entrepreneur',
    'facture sans TVA',
    'facture conforme URSSAF',
    'logiciel facture micro-entreprise',
    'facture auto-entrepreneur en ligne',
    'outil facture auto-entrepreneur',
    'facture auto-entrepreneur mobile',
    'facturation vocale auto-entrepreneur',
  ],
  openGraph: {
    title: 'Logiciel de Facture Auto-Entrepreneur – 100% Conforme & Gratuit',
    description: 'Factures sans TVA, mentions URSSAF, article 293B : tout est automatique. Gratuit pour démarrer.',
    url: 'https://factu.me/logiciel-facture-auto-entrepreneur',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-facture-auto-entrepreneur.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel de Facture Auto-Entrepreneur',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/logiciel-facture-auto-entrepreneur',
  },
};

const benefits = [
  {
    icon: Shield,
    title: 'Conforme URSSAF sans effort',
    description: 'Mentions légales, numéro SIRET, "Dispensé de TVA article 293 B du CGI" : tout est pré-rempli. Vous ne risquez plus aucune erreur.',
  },
  {
    icon: Euro,
    title: 'Gratuit pour commencer',
    description: 'Pas de frais cachés, pas d\'engagement. 10 factures gratuites chaque mois. Évoluez seulement quand votre activité grandit.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-first',
    description: 'Créez et envoyez vos factures depuis votre smartphone, entre deux clients. L\'interface est conçue pour les écrans tactiles.',
  },
  {
    icon: Mic,
    title: 'Parlez, c\'est facturé',
    description: 'Dites "Prestation de conseil pour la société Martin, 3 heures à 80 euros" et votre facture est prête à envoyer.',
  },
  {
    icon: TrendingUp,
    title: 'Suivi du chiffre d\'affaires',
    description: 'Visualisez votre CA mois par mois. Anticipez les plafonds de votre régime micro et évitez les mauvaises surprises.',
  },
  {
    icon: Clock,
    title: 'Zéro prise de tête',
    description: 'Pas de TVA à calculer, pas de comptabilité complexe. Le micro-entreprise, c\'est simple. Votre facture aussi.',
  },
];

const features = [
  {
    title: 'Facture en quelques clics',
    items: [
      'Modèle pré-configuré auto-entrepreneur',
      'Mention "Dispensé de TVA" automatique',
      'Numérotation chronologique',
      'Envoi par email en un clic',
    ],
  },
  {
    title: 'Suivi & organisation',
    items: [
      'Tableau de bord CA en temps réel',
      'Alerte dépassement plafonds URSSAF',
      'Historique complet par client',
      'Export PDF et comptable',
    ],
  },
  {
    title: 'Conformité légale',
    items: [
      'Toutes les mentions obligatoires incluses',
      'Factur-X (réforme 2026)',
      'Archivage légal 10 ans',
      'Portail de dématérialisation (PDP)',
    ],
  },
];

const testimonials = [
  {
    name: 'Mélanie D.',
    job: 'Auto-entrepreneuse, développement web',
    text: 'Quand j\'ai commencé mon activité, je ne savais même pas ce qu\'était l\'article 293B. Factu.me a géré toutes les mentions légales pour moi. Ma première facture était conforme du premier coup.',
  },
  {
    name: 'Karim B.',
    job: 'Auto-entrepreneur, photographie événementielle',
    text: 'Je ne facturais pas assez parce que c\'était galère. Maintenant je sors une facture entre deux shoots, depuis mon téléphone. Mon CA a augmenté de 30% rien qu\'en facturant plus régulièrement.',
  },
  {
    name: 'Claire F.',
    job: 'Auto-entrepreneuse, cours particuliers',
    text: 'L\'alerte de plafond de CA m\'a sauvée. J\'allais dépasser les 77 700€ sans m\'en rendre compte. J\'ai pu anticiper mon passage en entreprise individuelle.',
  },
];

const useCases = [
  {
    title: 'Services numériques',
    description: 'Community managers, développeurs, graphistes : facturez vos missions avec les bonnes mentions légales auto-entrepreneur.',
  },
  {
    title: 'Formation & coaching',
    description: 'Cours particuliers, coaching sportif, formations en ligne : chaque session peut générer sa facture en quelques secondes.',
  },
  {
    title: 'Services à la personne',
    description: 'Ménage, jardinage, aide à domicile : facturez simplement avec les mentions conformes au régime micro-entreprise.',
  },
];

export default function FactureAutoEntrepreneurPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facture Auto-Entrepreneur – <span className="text-emerald-600">100% Conforme &amp; Gratuit</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Mention art. 293B, SIRET, URSSAF : <strong>tout est automatique</strong>. Créez des factures conformes en 2 minutes, sans rien connaître à la comptabilité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer ma facture gratuite
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
              ✓ Conforme URSSAF • ✓ Sans TVA automatique • ✓ Gratuit pour démarrer
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La facturation auto-entrepreneur, enfin simple
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
            Pour tous les auto-entrepreneurs
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
            L\'essentiel pour le micro-entrepreneur
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
            Ils ont commencé comme vous
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
            Votre première facture en 2 minutes
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Rejoignez les auto-entrepreneurs qui facturent sans stress avec Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Conforme URSSAF • Sans TVA • 10 factures gratuites par mois
          </p>
        </div>
      </section>
    </div>
  );
}

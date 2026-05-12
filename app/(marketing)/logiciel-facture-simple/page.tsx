import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, MousePointer, MessageSquare, Shield, Clock, Smile, Layers } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel de Facture Simple – Pas de Prise de Tête | Factu.me',
  description: 'Logiciel de facture le plus simple du marché. Interface épurée, dictée vocale, zéro complexité. Créez vos factures en quelques clics.',
  keywords: [
    'logiciel facture simple',
    'facture simple en ligne',
    'logiciel facturation simple',
    'facture facile',
    'creer facture facilement',
    'logiciel facture sans prise de tete',
    'facture en ligne simple',
    'outil facturation simple',
    'facture rapide',
    'logiciel facture intuitif',
  ],
  openGraph: {
    title: 'Logiciel de Facture Simple – Pas de Prise de Tête',
    description: 'L\'interface la plus simple pour vos factures. Dictée vocale, 3 clics, c\'est envoyé.',
    url: 'https://factu.me/logiciel-facture-simple',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-simple.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel de Facture Simple',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/logiciel-facture-simple',
  },
};

const benefits = [
  {
    icon: MousePointer,
    title: '3 clics suffisent',
    description: 'Choisissez un client, ajoutez vos lignes, envoyez. Pas de formulaires à rallonge, pas de paramétrage lourd.',
  },
  {
    icon: MessageSquare,
    title: 'Dictée vocale IA',
    description: 'Dites "3 jours de consulting à 600 euros" et votre facture se remplit toute seule. Magique.',
  },
  {
    icon: Smile,
    title: 'Zéro courbe d\'apprentissage',
    description: 'Vous savez utiliser un formulaire ? Vous savez utiliser Factu.me. Pas de formation nécessaire.',
  },
  {
    icon: Layers,
    title: 'Pas de bloatware',
    description: 'Pas de stock, pas de CRM usine à gaz, pas de compta complexe. Juste de la facturation, bien faite.',
  },
  {
    icon: Clock,
    title: 'Onboard en 2 minutes',
    description: 'Inscription, nom, adresse, et vous facturez. Pas d\'assistant de configuration en 15 étapes.',
  },
  {
    icon: Shield,
    title: 'Simple mais complet',
    description: 'Simple ne veut pas dire basique : devis, multi-devises, PDF pro, Factur-X, mentions légales.',
  },
];

const features = [
  {
    title: 'Interface épurée',
    items: [
      'Design minimaliste et moderne',
      'Navigation en moins de 3 clics',
      'Aucun menu caché ou submenu',
      'Recherche instantanée partout',
    ],
  },
  {
    title: 'Automatisations malignes',
    items: [
      'Clients mémorisés automatiquement',
      'Taux de TVA pré-remplis',
      'Numérotation séquentielle auto',
      'Duplication de factures en 1 clic',
    ],
  },
  {
    title: 'Pour les non-tech',
    items: [
      'Aucune compétence comptable requise',
      'Aide contextuelle à chaque étape',
      'Messages d\'erreur clairs en français',
      'Support réactif par chat',
    ],
  },
];

const testimonials = [
  {
    name: 'Nadia K.',
    job: 'Fleuriste indépendante',
    text: 'Je suis pas du tout à l\'aise avec l\'informatique, mais Factu.me c\'est vraiment simple. Même ma mère pourrait l\'utiliser.',
  },
  {
    name: 'François D.',
    job: 'Coach sportif',
    text: 'J\'ai testé 5 logiciels avant. Factu.me est le seul où j\'ai compris comment faire une facture sans lire un tutoriel.',
  },
  {
    name: 'Amina T.',
    job: 'Traiteur à domicile',
    text: 'La dictée vocale change la vie. Je dicte ma facture entre deux préparations et c\'est réglé.',
  },
];

export default function LogicielFactureSimplePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facture Simple – <span className="text-sky-600">Pas de Prise de Tête</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              L\'interface la plus simple du marché. <strong>Pas de fonctionnalités inutiles</strong>, pas de paramétrage sans fin. Juste vos factures, vite fait.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-sky-600 to-sky-700 rounded-2xl hover:from-sky-700 hover:to-sky-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer – c\'est simple
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-sky-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir la démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Inscription en 2 minutes • Aucun tutoriel nécessaire
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi Factu.me est le plus simple
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-sky-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white">
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

      {/* Workflow */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Votre facture en 3 étapes
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Choisissez un client', desc: 'Sélectionnez un client existant ou ajoutez-en un nouveau en 10 secondes.' },
              { step: '2', title: 'Ajoutez vos lignes', desc: 'Tapez ou dictez vos prestations. Les montants se calculent tout seuls.' },
              { step: '3', title: 'Envoyez', desc: 'PDF professionnel généré automatiquement. Envoyez par email en 1 clic.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-3xl font-black mx-auto mb-4">
                  {item.step}
                </div>
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
            Simple, pas basique
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
            Ce que disent nos utilisateurs
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-sky-600 to-sky-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            La facturation, ça doit être simple
          </h2>
          <p className="text-xl text-sky-100 mb-8">
            Rejoignez ceux qui en ont fini avec les logiciels compliqués
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-sky-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Essayer gratuitement
          </Link>
          <p className="mt-6 text-sm text-sky-200">
            Inscription en 2 minutes • Aucune carte bancaire • 10 factures gratuites/mois
          </p>
        </div>
      </section>
    </div>
  );
}

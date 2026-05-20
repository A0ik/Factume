import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Droplets, Euro, Shield, Clock, Phone, MessageSquare, Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logiciel de Facturation Plomberie – Simple & Mobile | Factu.me',
  description: 'Logiciel de facturation pour plombiers : interventions d\'urgence, pièces et main-d\'oeuvre, dictée vocale depuis le terrain. Facture en 30 secondes.',
  openGraph: {
    title: 'Logiciel de Facturation Plomberie – Simple & Mobile',
    description: 'Facturez vos interventions d\'urgence depuis votre téléphone. Pièces + main-d\'oeuvre, dictée vocale, facture en 30 secondes.',
    url: 'https://factu.me/facturation-plomberie',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-plomberie.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation Plomberie',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-plomberie',
  },
};

const benefits = [
  {
    icon: Phone,
    title: 'Facture depuis le terrain',
    description: 'En sortant d\'une intervention, ouvrez Factu.me et facturez en 30 secondes. Plus besoin d\'attendre le soir.',
  },
  {
    icon: MessageSquare,
    title: 'Dictée vocale mobile',
    description: '"Remplacement robinet mitigeur, 45 euros de pièces, 1h30 de main d\'oeuvre à 50 euros". Voilà, la facture est prête.',
  },
  {
    icon: Droplets,
    title: 'Pièces + main-d\'oeuvre',
    description: 'Structurez chaque facture avec le détail des pièces remplacées et le temps passé. Vos clients savent exactement ce qu\'ils paient.',
  },
  {
    icon: Zap,
    title: 'Urgences & dépannages',
    description: 'Facturez les interventions d\'urgence, week-ends et fêtes avec le bon coefficient. Tarifs majorés pré-enregistrés.',
  },
  {
    icon: Euro,
    title: 'Devis express',
    description: 'Envoyez un devis avant de commencer les travaux. Le client valide, vous convertissez en facture en un clic.',
  },
  {
    icon: Clock,
    title: 'Historique client',
    description: 'Retrouvez toutes les interventions passées par client. Idéal pour l\'entretien annuel et la fidélisation.',
  },
];

const features = [
  {
    title: 'Interventions',
    items: [
      'Facture en 30 secondes après intervention',
      'Tarifs urgence / week-end pré-configurés',
      'Détail pièces et fournitures',
      'Main-d\'oeuvre au temps passé ou forfait',
    ],
  },
  {
    title: 'Devis plomberie',
    items: [
      'Devis détaillé par poste de travail',
      'Photos du problème jointes au devis',
      'Signature client sur mobile',
      'Conversion automatique en facture',
    ],
  },
  {
    title: 'Gestion & suivi',
    items: [
      'Carnet clients complet',
      'Historique d\'interventions',
      'Relances de paiements auto',
      'Tableau de bord chiffre d\'affaires',
    ],
  },
];

const testimonials = [
  {
    name: 'David H.',
    job: 'Plombier itinérant – Toulouse',
    text: 'Avant je facturais le soir, assis dans mon camion. Maintenant je le fais directement chez le client, en sortant de l\'intervention.',
  },
  {
    name: 'Isabelle F.',
    job: 'Chauffagiste – Strasbourg',
    text: 'La dictée vocale m\'a changé la vie. Je dicte les pièces et le temps, et la facture est nickel. Plus aucune erreur de calcul.',
  },
  {
    name: 'Mehdi A.',
    job: 'Plombier sanitaire – Nice',
    text: 'Les clients sont impressionnés quand je leur envoie la facture dans la minute. Ca donne un côté hyper pro.',
  },
];

export default function PlomberiePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facturation Plomberie – <span className="text-blue-600">Simple & Mobile</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Facturez vos interventions depuis votre téléphone. <strong>Pièces, main-d\'oeuvre, urgence</strong> : tout est géré en 30 secondes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Commencer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ 10 factures gratuites par mois • ✓ Fonctionne sur mobile
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pensé pour la réalité du plombier sur le terrain
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-blue-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
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
            La facturation plomberie de A à Z
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
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
            Plombiers et chauffagistes témoignent
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 border border-gray-100 shadow-lg">
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Facturez plus vite, soyez payé plus tôt
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les plombiers qui ont simplifié leur facturation avec Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-blue-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Créer mon compte gratuit
          </Link>
          <p className="mt-6 text-sm text-blue-200">
            10 factures gratuites par mois • Sans engagement • Mobile-friendly
          </p>
        </div>
      </section>
    </div>
  );
}

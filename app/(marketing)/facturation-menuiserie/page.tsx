import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Ruler, Euro, Shield, Clock, Camera, MessageSquare, Wrench } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Facturation Menuiserie – Créez Vos Factures Rapidement | Factu.me',
  description: 'Logiciel de facturation pour menuisiers : devis sur mesure, détail matériaux et main-d\'oeuvre, dictée vocale sur chantier, photos joints. Essai gratuit.',
  openGraph: {
    title: 'Facturation Menuiserie – Créez Vos Factures Rapidement',
    description: 'Devis sur mesure, détail bois et fournitures, dictée vocale depuis l\'atelier. Le logiciel pensé pour les menuisiers.',
    url: 'https://factu.me/facturation-menuiserie',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-menuiserie.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation Menuiserie',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-menuiserie',
  },
};

const benefits = [
  {
    icon: Ruler,
    title: 'Devis sur mesure',
    description: 'Créez des devis détaillés pour chaque projet unique : escaliers, cuisines, dressing, parquets. Distinguez bois, quincaillerie et pose.',
  },
  {
    icon: MessageSquare,
    title: 'Dictée vocale à l\'atelier',
    description: 'Dictiez depuis l\'atelier : "Placard chêne massif 240x90, 3 étagères, pose complète, 1800 euros". La facture est prête.',
  },
  {
    icon: Camera,
    title: 'Photos jointes aux devis',
    description: 'Ajoutez des photos du projet ou de l\'espace à aménager directement dans vos devis pour un rendu professionnel.',
  },
  {
    icon: Euro,
    title: 'Matériaux + Main-d\'oeuvre',
    description: 'Séparez clairement le coût des matériaux (bois, colle, vis, quincaillerie) et la main-d\'oeuvre sur chaque ligne.',
  },
  {
    icon: Clock,
    title: 'Devis en 3 minutes',
    description: 'Grâce à vos devis types et la bibliothèque de prix, créez un devis menuiserie complet en quelques clics.',
  },
  {
    icon: Shield,
    title: 'Mentions légales conformes',
    description: 'Assurance décennale, SIRET, numéro de TVA intracommunautaire : tout est pré-rempli automatiquement.',
  },
];

const useCases = [
  {
    title: 'Menuisier ébéniste',
    description: 'Facturez vos créations sur mesure : meubles, tables, buffets. Valorisez le travail artisanal avec des devis détaillés.',
  },
  {
    title: 'Menuisier agenceur',
    description: 'Cuisines, dressings, bibliothèques sur mesure. Gérez les devis complexes avec plans et photos jointes.',
  },
  {
    title: 'Charpentier traditionnel',
    description: 'Devis et factures pour charpentes, extensions ossature bois et couvertures. Suivi des projets longue durée.',
  },
];

const features = [
  {
    title: 'Devis & factures menuiserie',
    items: [
      'Devis détaillés par ouvrage',
      'Séparation matériaux / pose',
      'Photos et plans joints au devis',
      'Conversion devis → facture en 1 clic',
    ],
  },
  {
    title: 'Bibliothèque de prix',
    items: [
      'Prix du bois par essence',
      'Quincaillerie et fournitures',
      'Taux horaires personnalisables',
      'Modèles de devis par type de projet',
    ],
  },
  {
    title: 'Gestion client',
    items: [
      'Historique par client',
      'Relances automatiques',
      'Suivi des commandes en cours',
      'Export comptable pour le comptable',
    ],
  },
];

const testimonials = [
  {
    name: 'Pierre V.',
    job: 'Menuisier ébéniste – Dordogne',
    text: 'Mes clients adorent recevoir un devis avec les photos de l\'espace avant travaux. Ca donne un côté pro qui fait la différence.',
  },
  {
    name: 'Élodie G.',
    job: 'Agenceuse cuisine – Nantes',
    text: 'Avant je passais des heures sur mes devis de cuisine. Maintenant avec ma bibliothèque de prix, c\'est réglé en 5 minutes.',
  },
  {
    name: 'Jean-Marc T.',
    job: 'Charpentier – Alsace',
    text: 'La dictée vocale depuis le chantier, c\'est exactement ce qu\'il me fallait. Plus besoin d\'attendre d\'être au bureau pour facturer.',
  },
];

export default function MenuiseriePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-yellow-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Menuiserie – Créez Vos Factures <span className="text-amber-600">Rapidement</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Devis sur mesure, détail matériaux et main-d\'oeuvre, dictée vocale depuis l\'atelier. <strong>Le logiciel pensé pour les menuisiers.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-amber-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Pas de carte bancaire • ✓ 3 factures gratuites par mois
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Le compagnon de facturation du menuisier
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-amber-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white">
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
            Adapté à chaque spécialité du bois
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-4">
                  <Wrench className="w-6 h-6 text-amber-600" />
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
            Tout pour la facturation menuiserie
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{feature.title}</h3>
                <ul className="space-y-3">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
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
            Les menuisiers parlent de Factu.me
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-amber-500 to-yellow-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Passez moins de temps sur les devis, plus à l\'atelier
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Des menuisiers partout en France simplifient leur facturation avec Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-amber-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Créer mon compte gratuit
          </Link>
          <p className="mt-6 text-sm text-amber-100">
            3 factures gratuites par mois • Sans engagement
          </p>
        </div>
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facturation Menuiserie', url: 'https://factu.me/facturation-menuiserie' },
        ]}
      />
    </div>
  );
}

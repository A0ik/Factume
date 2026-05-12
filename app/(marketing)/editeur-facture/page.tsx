import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Pencil, ImagePlus, Paintbrush, Eye, Save, MousePointerClick } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Éditeur de Facture en Ligne – Créez et Personnalisez',
  description: 'Éditeur de facture WYSIWYG en ligne : glissez votre logo, choisissez vos couleurs, prévisualisez en direct et sauvegardez vos templates.',
  keywords: [
    'editeur facture en ligne',
    'editeur facture',
    'creer facture en ligne',
    'personnaliser facture',
    'editeur facture wysiwyg',
    'designer sa facture',
    'facture personnalisee',
    'editeur facture gratuit',
    'facture avec logo',
    'facture couleur personnalisee',
    'modifier modele facture',
    'creer template facture',
  ],
  openGraph: {
    title: 'Éditeur de Facture en Ligne – Créez et Personnalisez',
    description: 'Éditeur WYSIWYG : glissez votre logo, choisissez vos couleurs, prévisualisez en direct. Sauvegardez vos templates.',
    url: 'https://factu.me/editeur-facture',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-editeur-facture.png',
        width: 1200,
        height: 630,
        alt: 'Éditeur de Facture en Ligne – Créez et Personnalisez',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/editeur-facture',
  },
};

const benefits = [
  {
    icon: Pencil,
    title: 'Éditeur visuel WYSIWYG',
    description: 'Ce que vous voyez est ce que vos clients reçoivent. Modifiez directement sur la facture, en temps réel.',
  },
  {
    icon: ImagePlus,
    title: 'Glissez-déposez votre logo',
    description: 'Uploadez votre logo par glisser-déposer. Position, taille et alignement ajustables en 1 clic.',
  },
  {
    icon: Paintbrush,
    title: 'Couleurs sur mesure',
    description: 'Appliquez votre charte graphique : couleur principale, secondaire, fond, texte. Marque blanche incluse.',
  },
  {
    icon: Eye,
    title: 'Aperçu en direct',
    description: 'Visualisez chaque modification instantanément. Plus besoin d\'exporter pour vérifier le rendu.',
  },
  {
    icon: Save,
    title: 'Sauvegardez vos templates',
    description: 'Créez plusieurs modèles pour différents clients ou activités. Réutilisez-les en un clic.',
  },
  {
    icon: MousePointerClick,
    title: 'Zéro technique requise',
    description: 'Interface drag-and-drop intuitive. Pas besoin de savoir coder ou designer pour obtenir un résultat pro.',
  },
];

const features = [
  {
    title: 'Mise en page',
    items: [
      'Glisser-déposer logo et éléments',
      'Zones de texte éditables en clic',
      'Colonnes et tableaux ajustables',
      'Marges et espacements personnalisables',
    ],
  },
  {
    title: 'Design & branding',
    items: [
      'Palette de couleurs illimitée',
      'Choix de polices d\'écriture',
      'Bandeau et pied de page custom',
      'Thème clair ou sombre',
    ],
  },
  {
    title: 'Templates & réutilisation',
    items: [
      'Sauvegarde de modèles illimitée',
      'Duplication d\'une facture existante',
      'Templates par type de client',
      'Partage de modèles en équipe',
    ],
  },
];

const testimonials = [
  {
    name: 'Lucas T.',
    job: 'Agence web – Fondateur',
    text: 'L\'éditeur visuel m\'a permis de créer une facture aux couleurs de mon agence en 10 minutes. Impressionnant.',
  },
  {
    name: 'Sarah N.',
    job: 'Photographe professionnelle',
    text: 'J\'adore pouvoir glisser mon logo et changer les couleurs. Mes factures ressemblent enfin à mon site web.',
  },
  {
    name: 'Pierre H.',
    job: 'Consultant SEO',
    text: 'J\'ai deux templates : un pour les clients francophones, un pour l\'international. L\'éditeur est ultra fluide.',
  },
];

export default function EditeurFacturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Éditeur de Facture en Ligne – <span className="text-violet-600">Créez et Personnalisez</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Éditeur <strong>WYSIWYG intuitif</strong> : glissez votre logo, choisissez vos couleurs, prévisualisez en direct. Sauvegardez vos templates et réutilisez-les.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl hover:from-violet-700 hover:to-violet-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Ouvrir l&apos;éditeur gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-violet-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Éditeur drag-and-drop • ✓ Aperçu en direct • ✓ Templates illimités
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Votre facture, votre identité visuelle
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-violet-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white">
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
            Un éditeur complet pour des factures sur mesure
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
            Ils ont customisé leurs factures en quelques minutes
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-violet-600 to-violet-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Donnez vie à vos factures
          </h2>
          <p className="text-xl text-violet-100 mb-8">
            Ouvrez l&apos;éditeur, personnalisez, téléchargez. Essai gratuit, aucun engagement.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-violet-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Ouvrir l&apos;éditeur gratuitement
          </Link>
          <p className="mt-6 text-sm text-violet-200">
            Éditeur WYSIWYG • Templates illimités • Sans inscription obligatoire
          </p>
        </div>
      </section>
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Layout, Palette, Download, Eye, Type, Wand2 } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Modèle de Facture – Templates Professionnels Gratuit',
  description: 'Téléchargez des modèles de facture professionnels gratuits : classique, moderne, minimal. Personnalisez et exportez en PDF en quelques clics.',
  openGraph: {
    title: 'Modèle de Facture – Templates Professionnels Gratuit',
    description: 'Modèles de facture gratuits : classique, moderne, minimal. Personnalisez et téléchargez en PDF.',
    url: 'https://factu.me/modele-facture',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-modele-facture.png',
        width: 1200,
        height: 630,
        alt: 'Modèle de Facture – Templates Professionnels Gratuit',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/modele-facture',
  },
};

const benefits = [
  {
    icon: Layout,
    title: '3 styles professionnels',
    description: 'Classique, moderne ou minimal : choisissez le modèle qui correspond à l\'image de votre activité.',
  },
  {
    icon: Palette,
    title: 'Personnalisation totale',
    description: 'Logo, couleurs, polices, disposition. Chaque modèle s\'adapte à votre charte graphique.',
  },
  {
    icon: Download,
    title: 'Téléchargement PDF gratuit',
    description: 'Exportez votre facture en PDF haute qualité. Aucun filigrane, prêt à envoyer.',
  },
  {
    icon: Type,
    title: 'Mentions légales intégrées',
    description: 'SIRET, RCS, numéro TVA, conditions de paiement : toutes les mentions obligatoires sont pré-remplies.',
  },
  {
    icon: Eye,
    title: 'Aperçu en temps réel',
    description: 'Visualisez votre facture au fur et à mesure que vous la remplissez. Zéro mauvaise surprise.',
  },
  {
    icon: Wand2,
    title: 'Remplissage intelligent',
    description: 'Vos informations client et vos tarifs sont mémorisés. Remplissez moins, facturez plus.',
  },
];

const features = [
  {
    title: 'Modèles de facture',
    items: [
      'Style classique – sobre et efficace',
      'Style moderne – coloré et dynamique',
      'Style minimal – épuré et élégant',
      'Ajout de votre logo en 1 clic',
    ],
  },
  {
    title: 'Personnalisation',
    items: [
      'Couleurs personnalisables',
      'Choix de la police d\'écriture',
      'Notes et conditions personnalisées',
      'Numérotation automatique',
    ],
  },
  {
    title: 'Export & partage',
    items: [
      'Téléchargement PDF gratuit',
      'Envoi par email intégré',
      'Lien de partage sécurisé',
      'Duplication pour recurrentes',
    ],
  },
];

const testimonials = [
  {
    name: 'Élodie M.',
    job: 'Graphiste freelance',
    text: 'Le modèle minimal correspond parfaitement à mon style. Mes clients sentent la différence avec une facture soignée.',
  },
  {
    name: 'Karim B.',
    job: 'Formateur indépendant',
    text: 'J\'ai téléchargé mon premier modèle et envoyé ma facture en 5 minutes. Pas besoin de regarder un tutoriel.',
  },
  {
    name: 'Nathalie F.',
    job: 'Coach professionnelle',
    text: 'Le style classique est exactement ce qu\'il fallait pour mon activité. Professionnel sans en faire trop.',
  },
];

export default function ModeleFacturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Modèle de Facture – Templates <span className="text-indigo-600">Professionnels Gratuit</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Choisissez parmi nos <strong>3 styles de facture</strong> gratuits : classique, moderne ou minimal. Personnalisez, téléchargez en PDF et envoyez.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer ma facture gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-indigo-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir les modèles
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ 3 modèles gratuits • ✓ Sans filigrane • ✓ Export PDF immédiat
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Des modèles de facture qui donnent une image professionnelle
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-indigo-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white">
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
            Tout pour créer la facture parfaite
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
            Ils utilisent nos modèles au quotidien
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Créez une facture professionnelle en 2 minutes
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Choisissez votre modèle, remplissez, téléchargez. C&apos;est gratuit et sans inscription.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-indigo-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Choisir un modèle gratuit
          </Link>
          <p className="mt-6 text-sm text-indigo-200">
            3 styles disponibles • PDF sans filigrane • Gratuit
          </p>
        </div>
      </section>
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Modèle de Facture', url: 'https://factu.me/modele-facture' },
        ]}
      />
    </div>
  );
}

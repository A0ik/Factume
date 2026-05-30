import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, Sparkles, MessageSquareText, Calculator, Send, Clock, Brain } from 'lucide-react';
import { GenerateurForm } from './GenerateurForm';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { VisualBreadcrumbs } from '@/components/seo/VisualBreadcrumbs';

export const metadata: Metadata = {
  title: 'Générateur de Facture – Créez Vos Factures Instantanément',
  description: 'Générateur de facture IA : décrivez votre prestation en texte, l\'IA crée la facture complète. Calculs automatiques, envoi instantané.',
  openGraph: {
    title: 'Générateur de Facture – Créez Vos Factures Instantanément',
    description: 'Décrivez votre prestation, l\'IA génère la facture complète. Calculs auto, envoi instantané.',
    url: 'https://factu.me/generateur-facture',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-generateur-facture.png',
        width: 1200,
        height: 630,
        alt: 'Générateur de Facture – Créez Instantanément avec l\'IA',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/generateur-facture',
  },
};

const benefits = [
  {
    icon: MessageSquareText,
    title: 'Décrivez → facture générée',
    description: 'Tapez "3 jours de consulting à 600€/jour pour Dupont" et votre facture apparaît, complète et prête.',
  },
  {
    icon: Brain,
    title: 'IA qui comprend le français',
    description: 'Reconnaissance naturelle du langage. Pas de formulaire à remplir : parlez comme vous pensez.',
  },
  {
    icon: Calculator,
    title: 'Calculs automatiques',
    description: 'HT, TTC, TVA, remises, totaux : l\'IA calcule tout sans erreur. Jamais une ligne de trop ou de moins.',
  },
  {
    icon: Sparkles,
    title: 'Un seul clic pour envoyer',
    description: 'Générez, vérifiez et envoyez par email. De la description au paiement en moins d\'une minute.',
  },
  {
    icon: Clock,
    title: '30 secondes chrono',
    description: 'Le temps de décrire votre prestation, votre facture est prête. Plus rapide que n\'importe quel logiciel.',
  },
  {
    icon: Send,
    title: 'Suivi intégré',
    description: 'Sachez quand votre client ouvre la facture. Relances automatiques pour les retardataires.',
  },
];

const features = [
  {
    title: 'Génération IA',
    items: [
      'Description en langage naturel',
      'Reconnaissance des montants et TVA',
      'Détection automatique du client',
      'Suggestions de lignes prédéfinies',
    ],
  },
  {
    title: 'Calculs & conformité',
    items: [
      'TVA multi-taux (20%, 10%, 5.5%, 2.1%)',
      'Remises et acomptes gérés',
      'Mentions légales auto-générées',
      'Numérotation séquentielle',
    ],
  },
  {
    title: 'Envoi & suivi',
    items: [
      'Envoi email en 1 clic',
      'Lien de paiement en ligne',
      'Notification d\'ouverture',
      'Relances automatiques',
    ],
  },
];

const testimonials = [
  {
    name: 'Antoine G.',
    job: 'Développeur freelance',
    text: 'Je tape "5j de dev React à 650€" et la facture est prête. L\'IA comprend même le taux de TVA à appliquer.',
  },
  {
    name: 'Isabelle W.',
    job: 'Consultante RH',
    text: 'Le générateur m\'a fait gagner 2 heures par semaine. Je décris ma prestation, la facture est nickel.',
  },
  {
    name: 'Romain C.',
    job: 'Coach sportif',
    text: 'Je suis pas du tout à l\'aise avec la paperasse. Là je tape un texte et ça sort une vraie facture pro.',
  },
];

export default function GenerateurFacturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <VisualBreadcrumbs
          items={[
            { label: 'Accueil', href: '/' },
            { label: 'Générateur de facture', href: '/generateur-facture' },
          ]}
        />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-green-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Générateur de Facture – Créez Vos Factures <span className="text-emerald-600">Instantanément</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Décrivez votre prestation en texte, l&apos;<strong>IA génère la facture complète</strong>. Calculs automatiques, mentions légales, envoi en 1 clic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Générer une facture gratuitement
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
              ✓ Propulsé par l&apos;IA • ✓ Calculs sans erreur • ✓ Envoi instantané
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            L&apos;IA qui transforme vos mots en factures
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

      {/* Features */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Génération, calculs et suivi : tout automatisé
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
            Ils facturent plus vite grâce au générateur IA
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Générez votre prochaine facture en 30 secondes
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Décrivez, générez, envoyez. L&apos;IA s&apos;occupe du reste.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Essayer le générateur IA
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            10 factures IA gratuites par mois • Sans engagement
          </p>
        </div>
      </section>

      {/* Free Generator Tool */}
      <GenerateurForm />

      <FAQSchema
        items={[
          {
            question: "Comment créer une facture gratuitement avec Factu.me ?",
            answer: "Remplissez le formulaire ci-dessus avec vos informations, celles de votre client, ajoutez vos prestations et cliquez sur 'Télécharger en PDF'. Aucune inscription n'est requise pour utiliser le générateur gratuit."
          },
          {
            question: "La facture générée est-elle conforme à la loi française ?",
            answer: "Oui, les factures générées incluent toutes les mentions obligatoires : numéro séquentiel, dates, informations du vendeur et du client, détail des prestations, TVA, et conditions de paiement."
          },
          {
            question: "Puis-je personnaliser ma facture gratuite ?",
            answer: "Le générateur gratuit vous permet de saisir toutes les informations nécessaires. Pour personnaliser le design, ajouter votre logo et accéder aux modèles professionnels, créez un compte gratuit sur Factu.me."
          },
          {
            question: "Y a-t-il une limite de factures avec le générateur gratuit ?",
            answer: "Le générateur gratuit ci-dessus est sans limite d'utilisation. Avec un compte Factu.me, vous bénéficiez en plus de la sauvegarde, du suivi et de l'envi par email — gratuitement jusqu'à 10 factures par mois."
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Générateur de facture', url: 'https://factu.me/generateur-facture' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/facture-gratuite', label: 'Facture gratuite en ligne' },
          { href: '/modeles-facture', label: 'Modèles de facture par métier' },
          { href: '/mentions-obligatoires-facture', label: 'Mentions obligatoires' },
          { href: '/editeur-facture', label: 'Éditeur de facture' },
        ]}
      />
    </div>
  );
}

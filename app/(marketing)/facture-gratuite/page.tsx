import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, FileText, Download, Mail, Shield, Star, ArrowRight, Zap } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { VisualBreadcrumbs } from '@/components/seo/VisualBreadcrumbs';

export const metadata: Metadata = {
  title: 'Facture Gratuite en Ligne – Créez vos Factures PDF Gratuitement',
  description: 'Créez des factures professionnelles gratuites en PDF. Sans inscription, sans limite. Modèles conformes, TVA automatique, envoi par email. Essayez maintenant !',
  openGraph: {
    title: 'Facture Gratuite en Ligne – Créez vos Factures PDF Gratuitement',
    description: 'Créez des factures professionnelles gratuites en PDF. Sans inscription, sans limite.',
    url: 'https://factu.me/facture-gratuite',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-facture-gratuite.png',
        width: 1200,
        height: 630,
        alt: 'Facture Gratuite en Ligne',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facture-gratuite',
  },
};

const features = [
  {
    icon: FileText,
    title: 'Modèles professionnels',
    description: 'Designs modernes et conformes à la législation française',
  },
  {
    icon: Download,
    title: 'Export PDF instantané',
    description: 'Téléchargez votre facture en un clic',
  },
  {
    icon: Mail,
    title: 'Envoi par email',
    description: 'Envoyez directement à votre client',
  },
  {
    icon: Shield,
    title: '100% conforme',
    description: 'Mentions légales, TVA, numérotation obligatoire',
  },
];

const steps = [
  {
    number: '1',
    title: 'Remplissez le formulaire',
    description: 'Client, prestation, montant, TVA... tout est simple et intuitif',
  },
  {
    number: '2',
    title: 'Personnalisez',
    description: 'Ajoutez votre logo, vos couleurs, vos conditions de paiement',
  },
  {
    number: '3',
    title: 'Téléchargez ou envoyez',
    description: 'Export PDF ou envoi direct par email à votre client',
  },
];

const benefits = [
  'Zéro inscription requise',
  'Nombre illimité de factures',
  'Design professionnel',
  'Conforme législation française',
  'TVA calculée automatiquement',
  'Numérotation automatique',
  'Support client réactif',
  'Mises à jour gratuites',
];

const comparison = [
  { feature: 'Factures par mois', us: '10 gratuites', others: 'Limité' },
  { feature: 'Design moderne', us: '✓', others: '✗' },
  { feature: 'Export PDF', us: '✓', others: '✓' },
  { feature: 'Dictée vocale', us: '✓ Unique', others: '✗' },
  { feature: 'Factur-X 2026', us: '✓ Prêt', others: '✗' },
  { feature: 'Sans inscription', us: '✓', others: 'Souvent non' },
  { feature: 'Support français', us: '✓', others: 'Variable' },
];

export default function FactureGratuitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <VisualBreadcrumbs
          items={[
            { label: 'Accueil', href: '/' },
            { label: 'Facture gratuite', href: '/facture-gratuite' },
          ]}
        />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6">
              <Star className="w-4 h-4 fill-current" />
              Plus de 50 000 factures créées
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facture <span className="text-emerald-600">Gratuite</span> en Ligne
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Créez des factures professionnelles en PDF. Sans inscription, sans limite, sans carte bancaire.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/generateur-facture#generateur"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer ma facture maintenant
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Créer un compte gratuit
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Gratuit jusqu\'à 10 factures/mois • ✓ Prêt en 30 secondes
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi choisir notre facture gratuite ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white mb-4">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Créez votre facture en 3 étapes
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 h-full">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-xl font-black mb-6">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-emerald-300">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
              Tout est inclus, gratuitement
            </h2>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-lg">
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Factu.me vs les autres
          </h2>
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-900 text-white">
              <div className="p-4 font-bold">Fonctionnalité</div>
              <div className="p-4 font-bold text-emerald-400">Factu.me</div>
              <div className="p-4 font-bold text-gray-400">Autres</div>
            </div>
            {comparison.map((row, i) => (
              <div key={i} className="grid grid-cols-3 border-b border-gray-100 last:border-0">
                <div className="p-4 font-medium text-gray-900">{row.feature}</div>
                <div className="p-4 text-emerald-600 font-semibold">{row.us}</div>
                <div className="p-4 text-gray-400">{row.others}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Créez votre première facture maintenant
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Rejoignez des milliers d&apos;utilisateurs satisfaits
          </p>
          <Link
            href="/generateur-facture#generateur"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Créer ma facture gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Sans inscription • Sans limite • PDF professionnel
          </p>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: "Comment faire une facture gratuitement ?",
            answer: "Utilisez notre générateur de facture gratuit : remplissez vos informations, celles de votre client, ajoutez vos prestations et téléchargez le PDF. Aucune inscription requise."
          },
          {
            question: "La facture gratuite est-elle conforme à la loi ?",
            answer: "Oui, les factures générées avec Factu.me incluent toutes les mentions obligatoires : numéro unique, dates, TVA, informations vendeur et client, conditions de paiement."
          },
          {
            question: "Combien de factures puis-je créer gratuitement ?",
            answer: "Le générateur en ligne est sans limite d'utilisation. Avec un compte gratuit, vous bénéficiez en plus de 10 factures sauvegardées par mois avec suivi et relances."
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture gratuite', url: 'https://factu.me/facture-gratuite' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/generateur-facture', label: 'Générateur de facture' },
          { href: '/modeles-facture', label: 'Modèles de facture' },
          { href: '/mentions-obligatoires-facture', label: 'Mentions obligatoires' },
          { href: '/comment-facturer', label: 'Comment facturer' },
        ]}
      />
    </div>
  );
}

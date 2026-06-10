import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, ArrowRight, Shield, FileText, AlertTriangle } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { VisualBreadcrumbs } from '@/components/seo/VisualBreadcrumbs';

export const metadata: Metadata = {
  title: 'Mentions Obligatoires sur une Facture — Guide Complet 2026 | Factu.me',
  description: 'Liste complète des mentions obligatoires sur une facture en France en 2026 : vendeur, client, TVA, pénalités. Évitez les amendes avec notre vérificateur gratuit.',
  openGraph: {
    title: 'Mentions Obligatoires sur une Facture — Guide 2026',
    description: 'Liste complète des mentions obligatoires pour être en règle. Évitez les amendes.',
    url: 'https://factu.me/mentions-obligatoires-facture',
    siteName: 'Factu.me',
    images: [{ url: 'https://factu.me/og-mentions-obligatoires.png', width: 1200, height: 630, alt: 'Mentions obligatoires facture' }],
  },
  alternates: { canonical: 'https://factu.me/mentions-obligatoires-facture' },
};

const mentionsVendeur = [
  'Nom et prénom (ou dénomination sociale)',
  'Adresse du siège social ou du domicile',
  'Numéro SIRET (14 chiffres)',
  'Numéro RCS ou RM',
  'Forme juridique (SARL, SAS, EI, etc.)',
  'Capital social (pour les sociétés)',
  'Mention "Auto-entrepreneur" le cas échéant',
  'Numéro de TVA intracommunautaire (si assujetti)',
];

const mentionsClient = [
  'Nom et adresse du client (ou dénomination sociale)',
  'Numéro SIRET du client (pour les professionnels)',
  'Numéro de TVA intracommunautaire du client (si B2B)',
];

const mentionsTransaction = [
  'Numéro de facture unique et séquentiel',
  'Date d\'émission de la facture',
  'Date de la transaction ou d\'achèvement',
  'Description précise de chaque prestation/produit',
  'Quantité et prix unitaire HT par ligne',
  'Montant total HT',
  'Taux de TVA applicable par ligne',
  'Montant total de la TVA',
  'Montant total TTC',
  'Date d\'échéance du paiement',
  'Conditions d\'escompte pour paiement anticipé',
  'Taux des pénalités de retard',
  'Indemnité forfaitaire de recouvrement (40€)',
];

const mentionsSpecifiques = [
  { statut: 'Auto-entrepreneur', mention: '"TVA non applicable, article 293 B du CGI"', href: '/comment-facturer/auto-entrepreneur' },
  { statut: 'Micro-entreprise', mention: '"TVA non applicable, article 293 B du CGI"', href: '/comment-facturer/micro-entreprise' },
  { statut: 'Artisan BTP', mention: 'Mention "Autoliquidation de la TVA" + numéro d\'assurance décennale', href: '/facturation-btp' },
  { statut: 'SARL/SAS', mention: 'Capital social + ville du greffe + mention de la forme juridique', href: '/comment-facturer/sarl' },
  { statut: 'EI/EIRL', mention: '"Entrepreneur individuel" + mention EIRL le cas échéant', href: '/comment-facturer/ei' },
  { statut: 'Profession libérale', mention: 'Titre professionnel + numéro d\'inscription', href: '/comment-facturer/profession-liberale' },
];

const sanctions = [
  'Amende de 15€ par mention manquante',
  'Minimum de 15% du montant de la facture',
  'Facture refusée par le client professionnel',
  'Risque de contrôle fiscal approfondi',
];

export default function MentionsObligatoiresPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <VisualBreadcrumbs
          items={[
            { label: 'Accueil', href: '/' },
            { label: 'Mentions obligatoires facture', href: '/mentions-obligatoires-facture' },
          ]}
        />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-bold mb-6">
              <Shield className="w-4 h-4" />
              Guide conforme loi 2026
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Mentions <span className="text-amber-600">Obligatoires</span> sur une Facture
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              La liste complète des mentions légales à faire figurer sur chaque facture en France. Oublier une mention = amende.
            </p>
          </div>
        </div>
      </section>

      {/* Sanctions */}
      <section className="py-8 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-bold text-red-800">Risques en cas de mentions manquantes</h2>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2">
              {sanctions.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Mentions vendeur */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Mentions concernant le vendeur/prestataire
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Votre facture doit identifier votre entreprise avec ces informations obligatoires.
          </p>
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 sm:p-12 border border-blue-100 shadow-lg">
              <div className="grid sm:grid-cols-2 gap-4">
                {mentionsVendeur.map((mention, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium">{mention}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mentions client */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Mentions concernant le client
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-8 sm:p-12 border border-purple-100 shadow-lg">
              <div className="space-y-4">
                {mentionsClient.map((mention, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium">{mention}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mentions transaction */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Mentions sur la transaction et le paiement
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Le cœur de la facture : tout ce qui concerne la prestation, les prix et les conditions de paiement.
          </p>
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-8 sm:p-12 border border-emerald-100 shadow-lg">
              <div className="grid sm:grid-cols-2 gap-4">
                {mentionsTransaction.map((mention, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium">{mention}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mentions spécifiques par statut */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Mentions spécifiques selon votre statut
          </h2>
          <div className="max-w-4xl mx-auto space-y-4">
            {mentionsSpecifiques.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                    {item.statut}
                  </span>
                  <span className="text-gray-700 text-sm">{item.mention}</span>
                </div>
                <Link
                  href={item.href}
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm flex-shrink-0 ml-4"
                >
                  Guide →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-amber-600 to-amber-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Factu.me ajoute les mentions automatiquement
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Toutes les mentions légales sont pré-remplies selon votre statut. Créez des factures conformes sans y penser.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-amber-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Créer ma facture conforme
          </Link>
          <p className="mt-6 text-sm text-amber-200">
            Gratuit jusqu'à 10 factures/mois • Conforme loi 2026
          </p>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: "Quelles sont les mentions obligatoires sur une facture en France ?",
            answer: "Une facture en France doit contenir : nom et adresse du vendeur, SIRET, numéro RCS/RM, nom et adresse du client, numéro de facture séquentiel, date, description des prestations, prix HT et TTC, taux de TVA, conditions de paiement, pénalités de retard et indemnité forfaitaire de recouvrement de 40€."
          },
          {
            question: "Quelle amende pour mentions manquantes sur facture ?",
            answer: "L'amende est de 15€ par mention manquante, avec un minimum de 15% du montant de la facture. En cas d'absence totale de facture, l'amende peut atteindre 50% du montant de la transaction."
          },
          {
            question: "Quelle mention pour un auto-entrepreneur sur sa facture ?",
            answer: "L'auto-entrepreneur doit ajouter la mention 'TVA non applicable, article 293 B du CGI' s'il est en franchise de TVA. Il doit aussi mentionner 'Auto-entrepreneur' et 'Entreprise individuelle'."
          },
          {
            question: "Les pénalités de retard sont-elles obligatoires sur une facture ?",
            answer: "Oui, depuis 2013, toute facture doit mentionner le taux des pénalités de retard (taux directeur BCE + 10 points) et l'indemnité forfaitaire pour frais de recouvrement de 40€."
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Mentions obligatoires facture', url: 'https://factu.me/mentions-obligatoires-facture' },
        ]}
      />
      <RelatedPages
        pages={[
          { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' },
          { href: '/facture-voix', label: 'Facture Voix — Dictée vocale IA' },
          { href: '/comment-facturer', label: 'Comment facturer selon votre statut' },
          { href: '/modeles-facture', label: 'Modèles de facture par métier' },
          { href: '/facture-gratuite', label: 'Facture gratuite en ligne' },
          { href: '/securite', label: 'Sécurité & conformité' },
        ]}
      />
    </div>
  );
}

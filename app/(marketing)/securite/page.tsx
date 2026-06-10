import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, Server, Eye, FileCheck, ArrowRight } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';

export const metadata: Metadata = {
  title: 'Sécurité & Protection des Données — Factu.me',
  description: 'Découvrez comment Factu.me protège vos données : chiffrement, hébergement en France, conformité RGPD, sauvegardes automatiques.',
  openGraph: {
    title: 'Sécurité & Protection des Données | Factu.me',
    description: 'Chiffrement, hébergement France, RGPD, sauvegardes.',
    url: 'https://factu.me/securite',
    siteName: 'Factu.me',
    images: [{ url: 'https://factu.me/og-securite.png', width: 1200, height: 630, alt: 'Sécurité Factu.me' }],
  },
  alternates: { canonical: 'https://factu.me/securite' },
};

const securityFeatures = [
  {
    icon: Lock,
    title: 'Chiffrement des données',
    description: 'Toutes vos données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Vos factures et informations clients sont protégées.',
  },
  {
    icon: Server,
    title: 'Hébergement en France',
    description: 'Vos données sont hébergées sur des serveurs localisés en France (Supabase), soumis au droit français et européen.',
  },
  {
    icon: Shield,
    title: 'Conformité RGPD',
    description: 'Nous respectons le Règlement Général sur la Protection des Données. Droit d\'accès, de rectification et de suppression garantis.',
  },
  {
    icon: Eye,
    title: 'Accès sécurisé',
    description: 'Authentification sécurisée, sessions chiffrées, vérification d\'email. Personne d\'autre ne peut accéder à vos factures.',
  },
  {
    icon: FileCheck,
    title: 'Sauvegardes automatiques',
    description: 'Sauvegardes quotidiennes automatiques. Vos données sont protégées contre toute perte, même en cas de panne.',
  },
];

export default function SecuritePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-bold mb-6">
              <Shield className="w-4 h-4" />
              Vos données sont en sécurité
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Sécurité & <span className="text-green-600">Protection des Données</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Votre facturation contient des données sensibles. Nous les protégeons comme les nôtres.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Périmètre */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-amber-800 mb-4">Notre périmètre</h2>
            <p className="text-amber-900 mb-4">
              Factu.me est un <strong>outil de facturation</strong>. Nous vous aidons à créer, envoyer et suivre vos factures et devis de manière conforme et efficace.
            </p>
            <p className="text-amber-900">
              Pour toute question d'ordre <strong>fiscal, comptable ou juridique</strong>, nous vous recommandons de consulter un expert-comptable ou un avocat. Factu.me ne remplace pas le conseil professionnel.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Facturez en toute sécurité
          </h2>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-green-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages pages={[
          { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' },
          { href: '/facture-voix', label: 'Facture Voix — Dictée vocale IA' },
        ]} />
      </section>

      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Sécurité', url: 'https://factu.me/securite' },
        ]}
      />
    </div>
  );
}

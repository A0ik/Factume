import { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield, Users, Award, Globe, Lock, Server, FileCheck,
  Heart, ArrowRight, CheckCircle2, Building2, Headphones,
  Sparkles, Zap, Eye, Scale
} from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { FAQSchema } from '@/components/seo/FAQSchema';

export const metadata: Metadata = {
  title: 'À Propos de Factu.me – L\'Équipe, la Sécurité, la Mission',
  description: 'Factu.me est l\'assistant administratif IA pour indépendants et TPE françaises. Découvrez notre équipe, notre infrastructure sécurisée (Supabase, Vercel), notre engagement conformité Factur-X 2026.',
  openGraph: {
    title: 'À Propos de Factu.me – Assistant Admin IA pour Indépendants',
    description: 'L\'équipe derrière Factu.me, l\'assistant administratif IA. Infrastructure sécurisée, conformité Factur-X 2026, support humain.',
    url: 'https://factu.me/a-propos',
    siteName: 'Factu.me',
    type: 'website',
    images: [
      {
        url: 'https://factu.me/og-a-propos.png',
        width: 1200,
        height: 630,
        alt: 'À Propos de Factu.me – Assistant Admin IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'À Propos de Factu.me – Assistant Admin IA',
    description: 'L\'équipe derrière Factu.me, l\'assistant administratif IA pour indépendants et TPE.',
  },
  alternates: {
    canonical: 'https://factu.me/a-propos',
  },
};

const values = [
  {
    icon: Heart,
    title: 'Conçu pour les indépendants',
    description: 'Nous construisons Factu.me parce que nous connaissons la réalité des artisans, freelances et TPE. Pas de jargon comptable, pas de fonctionnalités inutiles.',
  },
  {
    icon: Zap,
    title: 'La voix comme interface',
    description: 'Notre conviction : la facturation doit être aussi simple que parler. La dictée vocale IA supprime la barrière technologique pour les entrepreneurs sur le terrain.',
  },
  {
    icon: Shield,
    title: 'Conformité par défaut',
    description: 'Factur-X, EN 16931, mentions légales, archivage 10 ans : la conformité n\'est pas une option payante, c\'est le standard de chaque facture.',
  },
  {
    icon: Eye,
    title: 'Transparence totale',
    description: 'Pas de frais cachés, pas d\'augmentation surprise. Nos tarifs sont clairs et notre roadmap est publique.',
  },
];

const infrastructure = [
  {
    icon: Server,
    title: 'Hébergement Vercel',
    description: 'Infrastructure edge mondiale, certifiée SOC 2 Type II. Déploiement en France (eu-west). CDN pour des temps de chargement < 200ms.',
    detail: 'ISO 27001 compliant',
  },
  {
    icon: Lock,
    title: 'Base de données Supabase',
    description: 'PostgreSQL hébergé en Europe. Chiffrement AES-256 au repos, TLS 1.3 en transit. Row-Level Security sur chaque table.',
    detail: 'RGPD natif',
  },
  {
    icon: FileCheck,
    title: 'Factur-X certifié',
    description: 'Génération PDF/A-3 avec XML conforme EN 16931. Tests de validation automatiques sur chaque facture produite.',
    detail: 'Norme EN 16931',
  },
  {
    icon: Globe,
    title: 'Signature eIDAS',
    description: 'Signature électronique de niveau Simple conforme au règlement eIDAS (art. 25). Preuve d\'acceptation horodatée de l\'acte.',
    detail: 'Niveau Simple',
  },
];

const security = [
  'Chiffrement AES-256 des données au repos',
  'TLS 1.3 pour toutes les communications',
  'Row-Level Security (RLS) sur chaque table',
  'Authentification multi-facteurs disponible',
  'Sauvegardes automatiques quotidiennes',
  'Audit de sécurité régulier',
  'Conformité RGPD complète',
  'Données hébergées en Europe (France)',
  'Politique de rétention transparente',
  'Suppression de compte et données sur demande',
];

const stats = [
  { value: '2 500+', label: 'Entreprises actives' },
  { value: '50 000+', label: 'Factures générées' },
  { value: '99.9%', label: 'Disponibilité (uptime)' },
  { value: '< 200ms', label: 'Temps de réponse moyen' },
];

const faqItems = [
  {
    question: 'Qui est derrière Factu.me ?',
    answer: 'Factu.me est développé par une équipe française spécialisée dans les outils SaaS pour indépendants et TPE. Notre mission est de rendre la gestion administrative accessible à tous les entrepreneurs, quel que soit leur niveau technique.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer: 'Oui. Vos données sont chiffrées (AES-256 au repos, TLS 1.3 en transit), hébergées en France sur des serveurs certifiés ISO 27001. Chaque utilisateur bénéficie d\'une isolation complète de ses données via Row-Level Security.',
  },
  {
    question: 'Factu.me est-il conforme au RGPD ?',
    answer: 'Oui, entièrement. Nous respectons le Règlement Général sur la Protection des Données. Vous pouvez exporter, modifier ou supprimer vos données à tout moment depuis votre compte.',
  },
  {
    question: 'Comment contacter le support ?',
    answer: 'Vous pouvez nous joindre par email à contact@factu.me ou via le chat intégré dans l\'application. Nous répondons en moins de 24h ouvrées.',
  },
  {
    question: 'Factu.me fonctionne-t-il hors connexion ?',
    answer: 'Oui. Factu.me est une Progressive Web App (PWA). Vous pouvez créer des factures hors ligne depuis votre smartphone ou tablette. Elles seront synchronisées automatiquement dès que la connexion sera rétablie.',
  },
];

export default function AProposPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-6">
              <Users className="w-4 h-4" />
              Qui sommes-nous
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Factu.me — L&apos;assistant administratif{' '}
              <span className="text-emerald-600">IA pour indépendants</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Nous croyons que la gestion administrative ne devrait jamais freiner un entrepreneur.
              Notre mission :{' '}
              <strong>supprimer la friction entre le travail et la paperasse</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-emerald-600">{stat.value}</div>
                <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ce qui nous guide
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, i) => (
              <div key={i} className="flex gap-5 p-6 rounded-2xl bg-white border border-gray-100 hover:border-emerald-200 transition-all shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                  <value.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure & Sécurité */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
              Infrastructure & sécurité de niveau entreprise
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              La même infrastructure utilisée par les plus grandes entreprises françaises, accessible aux indépendants.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {infrastructure.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{item.detail}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>

          <h3 className="text-2xl font-black text-gray-900 mb-8 text-center">
            Mesures de sécurité détaillées
          </h3>
          <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
            {security.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conformité légale */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Scale className="w-8 h-8 text-indigo-600" />
              <h2 className="text-3xl font-black text-gray-900">Conformité légale</h2>
            </div>
            <div className="space-y-6 text-gray-700">
              <p>
                Factu.me est édité et exploité dans le respect des lois françaises et européennes.
                Nous assurons la conformité avec les obligations réglementaires suivantes :
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Réforme facturation électronique 2026</strong> — Format Factur-X (PDF/A-3 + XML), norme EN 16931, connexion PDP</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>RGPD</strong> — Protection des données personnelles, droit à l&apos;oubli, portabilité des données</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Règlement eIDAS</strong> — Signature électronique de niveau Simple (art. 25), avec preuve d&apos;acceptation horodatée</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Code de commerce</strong> — Mentions légales obligatoires sur chaque facture, archivage 10 ans</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Directive européenne DAC7</strong> — Transparence des plateformes numériques</span>
                </li>
              </ul>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Consultez nos{' '}
                <Link href="/legal/cgu" className="text-indigo-600 hover:underline">conditions générales d&apos;utilisation</Link>
                {' '}et notre{' '}
                <Link href="/legal/confidentialite" className="text-indigo-600 hover:underline">politique de confidentialité</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Support & Contact */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Un support humain, pas un bot
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
              <Headphones className="w-8 h-8 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Email</h3>
              <a href="mailto:contact@factu.me" className="text-emerald-600 hover:underline text-sm">contact@factu.me</a>
              <p className="text-xs text-gray-500 mt-2">Réponse en moins de 24h ouvrées</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
              <Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Chat intégré</h3>
              <p className="text-sm text-gray-600">Support directement dans l&apos;application</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
              <Building2 className="w-8 h-8 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Centre d&apos;aide</h3>
              <p className="text-sm text-gray-600">Guides et tutoriels vidéo disponibles</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-gray-100">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">{faq.question}</h3>
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-emerald-600 group-open:rotate-45 transition-transform text-xl font-light">+</span>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Rejoignez les entrepreneurs qui nous font confiance
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Essai gratuit, sans carte bancaire. Commencez à facturer en 30 secondes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
            >
              <Zap className="w-5 h-5 mr-2" />
              Créer mon compte gratuit
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white border-2 border-white/30 rounded-2xl hover:bg-white/10 transition-all"
            >
              Voir la démo
            </Link>
          </div>
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
          { name: 'À Propos', url: 'https://factu.me/a-propos' },
        ]}
      />
      <FAQSchema items={faqItems} />
    </div>
  );
}

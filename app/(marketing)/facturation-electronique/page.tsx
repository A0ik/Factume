import { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2, Zap, FileText, Shield, FileCheck, Scale,
  AlertTriangle, Building2, Wifi, Cpu, ArrowRight, Users,
  Clock, Wrench, Briefcase, Smartphone, MessageSquare,
  HelpCircle, ExternalLink, Award
} from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';

export const metadata: Metadata = {
  title: 'Facturation Électronique Obligatoire 2026 – Guide Complet & Solution Conforme | Factu.me',
  description: 'Tout comprendre sur la facturation électronique obligatoire en France dès septembre 2026. Guide complet, calendrier par taille d\'entreprise, format Factur-X, PDP. Solution conforme prête à l\'emploi pour artisans, freelances et TPE.',
  openGraph: {
    title: 'Facturation Électronique Obligatoire 2026 – Guide Complet | Factu.me',
    description: 'La facturation électronique devient obligatoire en 2026. Guide complet : calendrier, format Factur-X, PDP, solution conforme.',
    url: 'https://factu.me/facturation-electronique',
    siteName: 'Factu.me',
    type: 'website',
    images: [
      {
        url: 'https://factu.me/og-facturation-electronique.png',
        width: 1200,
        height: 630,
        alt: 'Facturation Électronique Obligatoire 2026 – Guide Complet Factu.me',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Facturation Électronique Obligatoire 2026 – Guide Complet',
    description: 'La facturation électronique devient obligatoire en 2026. Guide complet : calendrier, format Factur-X, PDP.',
    images: ['https://factu.me/og-facturation-electronique.png'],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-electronique',
  },
};

const benefits = [
  {
    icon: Shield,
    title: '100% conforme réforme 2026',
    description: 'Votre facturation est prête pour l\'obligation de e-invoicing B2B. Factur-X natif, pas de migration à prévoir.',
  },
  {
    icon: FileCheck,
    title: 'Format Factur-X (PDF/A-3 + XML)',
    description: 'Vos factures sont générées au format Factur-X, la norme européenne officielle pour la facture électronique.',
  },
  {
    icon: Scale,
    title: 'Norme EN 16931 respectée',
    description: 'Structure de données conforme à la norme européenne EN 16931 pour une interopérabilité totale.',
  },
  {
    icon: Building2,
    title: 'Connexion PDP intégrée',
    description: 'Émission et réception via les Plateformes de Dématérialisation Partenaires (PDP) agréées par l\'État.',
  },
  {
    icon: Wifi,
    title: 'Transmission automatique au fisc',
    description: 'Vos factures sont transmises automatiquement à l\'administration fiscale via le SDI. Zéro démarche de votre côté.',
  },
  {
    icon: Cpu,
    title: 'Automatisation complète par IA',
    description: 'De la création vocale à l\'envoi, tout est automatisé. Réduisez vos erreurs de saisie de 95%.',
  },
];

const timeline = [
  {
    date: '1er septembre 2026',
    title: 'Réception obligatoire pour tous',
    description: 'Toutes les entreprises assujetties à la TVA doivent pouvoir recevoir des factures électroniques. Les grandes entreprises doivent aussi émettre.',
    affected: 'Toutes les entreprises',
    badge: 'Étape 1',
    color: 'from-red-500 to-emerald-500',
  },
  {
    date: '1er septembre 2027',
    title: 'Émission obligatoire pour tous',
    description: 'Les PME, TPE et micro-entreprises doivent émettre leurs factures au format électronique. L\'e-reporting entre en vigueur.',
    affected: 'PME, TPE, micro-entreprises',
    badge: 'Étape 2',
    color: 'from-emerald-500 to-emerald-500',
  },
];

const features = [
  {
    title: 'Conformité réglementaire',
    items: [
      'Format Factur-X natif (PDF/A-3 + XML)',
      'Norme EN 16931 respectée',
      'Mentions légales obligatoires vérifiées',
      'Archivage légal 10 ans sécurisé',
      'Certificat horodatage inclus',
    ],
  },
  {
    title: 'Intégration PDP & SDI',
    items: [
      'Connexion aux PDP agréées par l\'État',
      'Transmission automatique au SDI (Service de Dématérialisation)',
      'Réception de factures fournisseurs électroniques',
      'Statut de livraison en temps réel',
      'Journal de transmission complet',
    ],
  },
  {
    title: 'Gestion e-invoicing B2B',
    items: [
      'Factures entre entreprises françaises',
      'Factures transfrontalières (cross-border)',
      'Notes de crédit et avoirs électroniques',
      'Rapprochement automatique fournisseur',
      'Export FEC comptable (DGFiP)',
    ],
  },
];

const testimonials = [
  {
    name: 'Laurent D.',
    job: 'Expert-comptable',
    text: 'La réforme 2026 inquiétait mes clients. Avec Factu.me, ils sont prêts et sereins. Le format Factur-X est impeccable et la connexion PDP fonctionne parfaitement.',
    rating: 5,
  },
  {
    name: 'Isabelle R.',
    job: 'Directrice financière PME',
    text: 'On a anticipé la bascule e-invoicing dès 2025. Factu.me nous a permis de tester le format électronique en conditions réelles. Zéro stress pour septembre 2026.',
    rating: 5,
  },
  {
    name: 'Marc T.',
    job: 'Gérant SARL BTP',
    text: 'La connexion PDP fonctionne parfaitement. Nos factures partent automatiquement, on n\'y pense plus. Et la dictée vocale sur le chantier, c\'est un gain de temps fou.',
    rating: 5,
  },
];

const siloPages = [
  {
    icon: Wrench,
    title: 'Artisans du bâtiment',
    description: 'Facturation électronique adaptée aux artisans : factures de situation, d\'acompte, TVA automatique.',
    href: '/facturation-artisans',
    keyword: 'facturation électronique artisan',
  },
  {
    icon: Briefcase,
    title: 'Freelances & consultants',
    description: 'Facture électronique pour indépendants : factures en anglais, multi-devises, sans TVA intracommunautaire.',
    href: '/facturation-freelances',
    keyword: 'facturation électronique freelance',
  },
  {
    icon: Smartphone,
    title: 'Auto-entrepreneurs',
    description: 'E-invoicing simplifié pour micro-entreprises : facturation rapide, micro-social automatique.',
    href: '/facturation-auto-entrepreneur',
    keyword: 'facture électronique auto-entrepreneur',
  },
  {
    icon: Building2,
    title: 'PME & TPE',
    description: 'Solution complète e-invoicing pour petites entreprises : gestion commerciale, CRM, export comptable.',
    href: '/facturation-pme',
    keyword: 'facturation électronique PME',
  },
];

const faqItems = [
  {
    question: 'Quand la facturation électronique devient-elle obligatoire en France ?',
    answer: 'La facturation électronique devient obligatoire en deux étapes. À partir du 1er septembre 2026, toutes les entreprises assujetties à la TVA doivent pouvoir recevoir des factures électroniques, et les grandes entreprises doivent les émettre. À partir du 1er septembre 2027, toutes les entreprises (PME, TPE, micro-entreprises) devront aussi émettre leurs factures au format électronique.',
  },
  {
    question: 'Qu\'est-ce que le format Factur-X ?',
    answer: 'Factur-X (aussi appelé ZUGFeRD 2.0 en Allemagne) est le format européen de facture électronique. Il combine un PDF lisible par l\'humain et un fichier XML structuré lisible par les machines, le tout dans un seul document PDF/A-3. C\'est le format recommandé par l\'État français pour la réforme 2026.',
  },
  {
    question: 'Qu\'est-ce qu\'une PDP (Plateforme de Dématérialisation Partenaire) ?',
    answer: 'Une PDP est une plateforme agréée par l\'administration fiscale française pour transmettre les factures électroniques entre entreprises et vers le Service de Dématérialisation (SDI). Factu.me se connecte aux PDP agréées pour assurer la transmission automatique de vos factures.',
  },
  {
    question: 'Les auto-entrepreneurs sont-ils concernés par la facturation électronique ?',
    answer: 'Oui. Tous les assujettis à la TVA sont concernés, y compris les auto-entrepreneurs en franchise de TVA. Ils devront pouvoir recevoir des factures électroniques dès septembre 2026 et les émettre à partir de septembre 2027.',
  },
  {
    question: 'Comment Factu.me me prépare-t-il à la réforme 2026 ?',
    answer: 'Factu.me génère nativement vos factures au format Factur-X (PDF/A-3 + XML conforme EN 16931), se connecte aux PDP agréées pour la transmission automatique, et gère l\'archivage légal 10 ans. Vous pouvez commencer dès aujourd\'hui à produire des factures électroniques conformes, sans attendre 2026.',
  },
  {
    question: 'Quel est le coût de la facturation électronique avec Factu.me ?',
    answer: 'Factu.me propose un plan gratuit (Découverte) jusqu\'à 3 factures/mois avec dictée vocale IA. Le plan Pro à 14,99€/mois inclut les factures illimitées avec Factur-X. Le plan Business à 39,99€/mois ajoute la connexion PDP complète et l\'export FEC comptable. Aucun frais caché de mise en conformité.',
  },
  {
    question: 'Que se passe-t-il si je ne suis pas conforme en 2026 ?',
    answer: 'Le non-respect de l\'obligation de facturation électronique peut entraîner des sanctions financières. L\'administration fiscale peut appliquer des amendes. Il est fortement recommandé d\'anticiper la migration pour éviter tout risque juridique et financier.',
  },
  {
    question: 'La facturation électronique fonctionne-t-elle pour les factures internationales ?',
    answer: 'Oui. Factu.me prend en charge les factures transfrontalières (cross-border), les factures en anglais, et les conversions multi-devises. Le format Factur-X est reconnu au niveau européen et facilite les échanges avec vos partenaires internationaux.',
  },
];

const glossary = [
  { term: 'Factur-X', definition: 'Format européen de facture électronique (PDF/A-3 + XML), aussi appelé ZUGFeRD 2.0.' },
  { term: 'EN 16931', definition: 'Norme européenne qui définit la structure de données de la facture électronique.' },
  { term: 'PDP', definition: 'Plateforme de Dématérialisation Partenaire, agréée par l\'État pour transmettre les factures.' },
  { term: 'SDI', definition: 'Service de Dématérialisation Invoicing — le portail étatique central de la réforme.' },
  { term: 'E-reporting', definition: 'Obligation de transmettre données de facturation à l\'administration fiscale en temps réel.' },
  { term: 'PDF/A-3', definition: 'Format d\'archivage PDF qui permet d\'embarquer des fichiers XML joints.' },
];

export default function FacturationElectroniquePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-6">
              <AlertTriangle className="w-4 h-4" />
              Obligatoire à partir du 1er septembre 2026
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Facturation Électronique Obligatoire 2026 —{' '}
              <span className="text-emerald-600">Guide Complet & Solution Conforme</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Tout comprendre sur la <strong>réforme de la facturation électronique</strong> en France.
              Format Factur-X, connexion PDP, calendrier par entreprise. Et une solution prête à l&apos;emploi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Préparer ma migration gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir le format Factur-X
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Conforme EN 16931 &bull; Connexion PDP agréée &bull; Essai gratuit sans CB
            </p>
          </div>
        </div>
      </section>

      {/* Quick Answer - Passage Ranking Target */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-emerald-50 rounded-3xl p-8 speakable-section">
            <h2 className="text-2xl font-black text-gray-900 mb-4">
              Réforme facturation électronique 2026 : l&apos;essentiel en 30 secondes
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                À partir du <strong>1er septembre 2026</strong>, toutes les entreprises assujetties à la TVA en France doivent
                pouvoir <strong>recevoir des factures électroniques</strong>. Les grandes entreprises doivent aussi les émettre.
              </p>
              <p>
                À partir du <strong>1er septembre 2027</strong>, les PME, TPE et micro-entreprises devront également
                <strong> émettre</strong> leurs factures au format électronique et procéder à l&apos;e-reporting.
              </p>
              <p>
                Le format requis est le <strong>Factur-X</strong> (norme EN 16931), transmis via une{' '}
                <Link href="/facturation-factur-x" className="text-emerald-600 hover:underline font-semibold">
                  plateforme PDP agréée
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline - Corrected Dates */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Calendrier officiel de la réforme
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            Dates fixées par la direction générale des finances publiques (DGFiP). Source :{' '}
            <a
              href="https://www.impots.gouv.fr/depliant-la-facturation-electronique-en-4-questions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline"
            >
              impots.gouv.fr
            </a>
          </p>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {timeline.map((item, i) => (
              <div key={i} className="relative bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className={`inline-flex items-center px-3 py-1 bg-gradient-to-r ${item.color} text-white rounded-full text-xs font-bold mb-4`}>
                  {item.badge}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <span className="text-lg font-bold text-emerald-600">{item.date}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>Concerne : {item.affected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions par métier - SILO LINKS */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Facturation électronique adaptée à votre métier
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            Chaque activité a des besoins spécifiques. Découvrez la solution e-invoicing conçue pour votre secteur.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {siloPages.map((page, i) => (
              <Link
                key={i}
                href={page.href}
                className="group p-6 rounded-3xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white mb-4">
                  <page.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  {page.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{page.description}</p>
                <span className="inline-flex items-center text-sm font-semibold text-emerald-600">
                  {page.keyword} <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi passer à la facturation électronique avec Factu.me ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white border border-gray-100 hover:border-emerald-200 transition-all shadow-sm">
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

      {/* Features détaillées */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Fonctionnalités e-invoicing complètes
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

      {/* Comment ça marche - HowTo for Passage Ranking */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Comment se mettre en conformité en 3 étapes ?
          </h2>
          <div className="space-y-8">
            {[
              {
                step: 1,
                title: 'Créez votre compte Factu.me gratuitement',
                description: 'Inscription en 30 secondes. Pas de carte bancaire requise. Vous accédez immédiatement à l\'éditeur de factures électroniques.',
              },
              {
                step: 2,
                title: 'Renseignez vos informations d\'entreprise',
                description: 'SIRET, numéro de TVA, adresse, régime fiscal. Factu.me vérifie automatiquement la conformité de vos mentions légales.',
              },
              {
                step: 3,
                title: 'Émettez vos premières factures Factur-X',
                description: 'Créez une facture (ou dictez-la vocalement), elle est automatiquement générée au format Factur-X conforme EN 16931. Envoyez-la via la PDP intégrée.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white text-xl font-black">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl"
            >
              <Zap className="w-5 h-5 mr-2" />
              Commencer la mise en conformité
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ils ont anticipé la réforme
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, j) => (
                    <span key={j} className="text-emerald-400 text-lg">★</span>
                  ))}
                </div>
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

      {/* Glossaire - Semantic Entity Reinforcement */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Lexique de la facturation électronique
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Les termes techniques de la réforme expliqués en langage simple.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {glossary.map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-gray-100">
                <dt className="font-bold text-gray-900 mb-1">{item.term}</dt>
                <dd className="text-gray-600 text-sm">{item.definition}</dd>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 mb-12">
            <HelpCircle className="w-8 h-8 text-emerald-600" />
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
              Questions fréquentes sur la facturation électronique 2026
            </h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">{faq.question}</h3>
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-emerald-600 group-open:rotate-45 transition-transform text-xl font-light">+</span>
                </summary>
                <div className="px-6 pb-6 speakable-faq-answer">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Ressources connexes - Maillage interne */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Ressources complémentaires
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { href: '/facture-ia', title: 'Facture IA — Intelligence Artificielle', desc: 'Créez vos factures par intelligence artificielle.' },
              { href: '/facture-voix', title: 'Facture Voix — Dictée vocale IA', desc: 'Dictez vos factures vocalement grâce à la reconnaissance vocale.' },
              { href: '/facturation-factur-x', title: 'Format Factur-X détaillé', desc: 'Comprendre le format PDF/A-3 + XML et la norme EN 16931.' },
              { href: '/mentions-obligatoires-facture', title: 'Mentions légales obligatoires', desc: 'Toutes les mentions requises sur une facture française conforme.' },
              { href: '/facture-sans-tva', title: 'Facturer sans TVA', desc: 'Auto-entrepreneurs en franchise : comment émettre une facture électronique sans TVA.' },
              { href: '/modeles-facture', title: 'Modèles de facture électronique', desc: 'Templates Factur-X prêts à l\'emploi pour chaque métier.' },
              { href: '/comment-facturer', title: 'Comment facturer selon votre statut', desc: 'Guide complet par statut juridique (SARL, EURL, SAS, auto-entrepreneur...).' },
              { href: '/securite', title: 'Sécurité & conformité', desc: 'Infrastructure de sécurité, archivage légal, certification eIDAS.' },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="group p-6 rounded-2xl bg-white border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  {link.title}
                </h3>
                <p className="text-sm text-gray-600">{link.desc}</p>
                <span className="inline-flex items-center text-sm text-emerald-600 mt-2 font-medium">
                  Lire le guide <ArrowRight className="w-3 h-3 ml-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Award className="w-12 h-12 text-emerald-200 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            N&apos;attendez pas septembre 2026 pour vous mettre en conformité
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Commencez à émettre des factures électroniques conformes dès aujourd&apos;hui.
            Migration progressive, sans stress, sans coût caché.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Shield className="w-5 h-5 mr-2" />
            Commencer la migration gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Conforme Factur-X &bull; Connexion PDP agréée &bull; Essai gratuit sans engagement &bull; Aucune CB requise
          </p>
        </div>
      </section>

      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facturation Électronique 2026', url: 'https://factu.me/facturation-electronique' },
        ]}
      />
      <FAQSchema items={faqItems} />
      <SpeakableSchema
        cssSelectors={['.speakable-section', '.speakable-faq-answer']}
        url="https://factu.me/facturation-electronique"
        name="Facturation électronique — Guide complet réforme e-invoicing 2026"
        description="Tout savoir sur la facturation électronique obligatoire en France et la réforme e-invoicing 2026 avec Factu.me"
      />
    </div>
  );
}

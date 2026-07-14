import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, MessageSquare, Euro, Shield, Clock, Smartphone } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';

export const metadata: Metadata = {
  title: 'Logiciel Facturation Artisans – Simple, Rapide & Gratuit',
  description: 'Logiciel de facturation pour artisans : créez vos factures et devis en 30 secondes grâce à la dictée vocale. Gratuit jusqu\'à 3 factures/mois. Factur-X 2026 prêt.',
  openGraph: {
    title: 'Logiciel Facturation Artisans – Simple, Rapide & Gratuit',
    description: 'Logiciel de facturation pour artisans : créez vos factures et devis en 30 secondes grâce à la dictée vocale. Gratuit jusqu\'à 3 factures/mois.',
    url: 'https://factu.me/facturation-artisans',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-artisan.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation Artisans',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-artisans',
  },
};

const benefits = [
  {
    icon: MessageSquare,
    title: 'Dictée vocale',
    description: 'Créez vos factures en parlant. Plus besoin de taper, vous gagnez 10 min par facture.',
  },
  {
    icon: Zap,
    title: '30 secondes chrono',
    description: 'De la prise de commande à l\'envoi de la facture, tout se fait en un clin d\'œil.',
  },
  {
    icon: Euro,
    title: 'Gratuit pour démarrer',
    description: '0€ pour vos 10 premières factures par mois. Pas de CB requise.',
  },
  {
    icon: Shield,
    title: 'Factur-X 2026 prêt',
    description: 'Conforme à la réforme de facturation électronique de septembre 2026.',
  },
  {
    icon: Smartphone,
    title: 'Sur le chantier',
    description: 'Fonctionne sur smartphone. Créez vos factures directement depuis le terrain.',
  },
  {
    icon: Clock,
    title: 'Relances automatiques',
    description: 'Ne perdez plus de temps avec les relances. Le système s\'en charge pour vous.',
  },
];

const features = [
  {
    title: 'Devis professionnels',
    items: [
      'Modèles adaptés au bâtiment',
      'Conversion devis → facture en 1 clic',
      'Mention "BON POUR ACCORD" intégrée',
      'Suivi des devis (envoyé, accepté, refusé)',
    ],
  },
  {
    title: 'Facturation chantier',
    items: [
      'Factures d\'acompte',
      'Factures de situation',
      'Factures de solde',
      'Calcul automatique de la TVA',
    ],
  },
  {
    title: 'Gestion clients',
    items: [
      'Fichier clients illimité',
      'Historique complet par client',
      'Statistiques de chiffre d\'affaires',
      'Export comptable (FEC)',
    ],
  },
];

const testimonials = [
  {
    name: 'Marc D.',
    job: 'Menuisier',
    text: 'Je ne retourne pas aux logiciels classiques. La dictée vocale change tout sur les chantiers.',
  },
  {
    name: 'Sophie L.',
    job: 'Électricienne',
    text: 'Simple et efficace. Je fais mes devis en 5 minutes sur mon téléphone.',
  },
  {
    name: 'Pierre M.',
    job: 'Plombier',
    description: 'Enfin un logiciel fait pour les artisans du bâtiment. Pas besoin de formation.',
  },
];

export default function ArtisanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facturation pour <span className="text-emerald-600">Artisans</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 speakable-section">
              Créez vos factures et devis en <strong>30 secondes</strong> grâce à la dictée vocale. Gratuit jusqu\'à 3 factures/mois.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Pas de carte bancaire requise • ✓ Prêt à l\'emploi en 2 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi les artisans choisissent Factu.me ?
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
            Tout ce dont vous avez besoin
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
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
            Ce que disent les artisans
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
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
            Prêt à simplifier votre facturation ?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Rejoignez des milliers d\'artisans qui utilisent Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            3 factures gratuites par mois • Sans engagement
          </p>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: "Factu.me fonctionne-t-il sur chantier ?",
            answer: "Oui, Factu.me est une application web responsive qui fonctionne parfaitement sur smartphone et tablette depuis le chantier. Vous pouvez créer vos factures et devis directement sur le terrain, même avec la dictée vocale.",
          },
          {
            question: "Comment utiliser la dictée vocale ?",
            answer: "Appuyez simplement sur le micro dans Factu.me et dictez votre facture. Par exemple : '5 mètres de tuyau PER, pose robinet, 2 heures de main d'oeuvre'. L'IA transforme votre voix en ligne de facture automatiquement.",
          },
          {
            question: "Les factures sont-elles conformes pour les artisans ?",
            answer: "Oui, toutes les factures générées par Factu.me incluent les mentions légales obligatoires pour les artisans : numéro SIRET, assurance décennale, TVA adaptée à votre activité et conformité Factur-X 2026.",
          },
          {
            question: "Puis-je gérer mes acomptes ?",
            answer: "Oui, Factu.me permet de créer des factures d'acompte, de situation et de solde. Vous pouvez suivre les paiements échelonnés de vos chantiers et configurer des demandes d'acompte automatiques.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facturation Artisans', url: 'https://factu.me/facturation-artisans' },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section']}
        url="https://factu.me/facturation-artisans"
        name="Facturation artisans — Logiciel de facture pour artisans"
        description="Logiciel de facturation pour artisans avec Factu.me"
      />
      {/* Modèles par métier — Maillage Segment→Hub */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Modèles de facture par métier d'artisan
          </h2>
          <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {[
              { slug: 'plombier', nom: 'Plombier' },
              { slug: 'electricien', nom: 'Électricien' },
              { slug: 'menuisier', nom: 'Menuisier' },
              { slug: 'peintre', nom: 'Peintre' },
              { slug: 'carreleur', nom: 'Carreleur' },
              { slug: 'chauffagiste', nom: 'Chauffagiste' },
              { slug: 'couvreur', nom: 'Couvreur' },
              { slug: 'macon', nom: 'Maçon' },
            ].map(metier => (
              <Link key={metier.slug} href={`/modeles-facture/${metier.slug}`}
                className="group p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all text-center">
                <span className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Facture {metier.nom}</span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/modeles-facture" className="text-emerald-600 font-medium hover:underline">
              Voir tous les modèles de facture →
            </Link>
          </div>
        </div>
      </section>

      <RelatedPages
        pages={[
          { href: '/facture-rapide', label: 'Facture rapide — En moins de 60 secondes' },
          { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' },
          { href: '/facture-voix', label: 'Facture Voix — Dictée vocale' },
          { href: '/modeles-facture', label: 'Tous les modèles de facture' },
          { href: '/comment-facturer', label: 'Guides par statut juridique' },
          { href: '/facture-gratuite', label: 'Facture gratuite en ligne' },
          { href: '/mentions-obligatoires-facture', label: 'Mentions obligatoires' },
        ]}
      />
    </div>
  );
}

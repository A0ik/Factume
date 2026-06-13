import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Zap, FileText, MessageSquare, Euro, Shield, Clock, Globe, Calendar } from 'lucide-react';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';

export const metadata: Metadata = {
  title: 'Logiciel Facturation Freelances – Simple, Rapide & Gratuit',
  description: 'Logiciel de facturation pour freelances : créez vos factures en 30 secondes grâce à la dictée vocale. Gratuit jusqu\'à 3 factures/mois. Factur-X 2026 prêt.',
  openGraph: {
    title: 'Logiciel Facturation Freelances – Simple, Rapide & Gratuit',
    description: 'Logiciel de facturation pour freelances : créez vos factures en 30 secondes grâce à la dictée vocale. Gratuit jusqu\'à 3 factures/mois.',
    url: 'https://factu.me/facturation-freelances',
    siteName: 'Factu.me',
    images: [
      {
        url: 'https://factu.me/og-freelance.png',
        width: 1200,
        height: 630,
        alt: 'Logiciel Facturation Freelances',
      },
    ],
  },
  alternates: {
    canonical: 'https://factu.me/facturation-freelances',
  },
};

const benefits = [
  {
    icon: MessageSquare,
    title: 'Dictée vocale',
    description: 'Créez vos factures en parlant. "5 jours de dev à 800€" et c\'est parti.',
  },
  {
    icon: Clock,
    title: 'Gain de temps',
    description: 'Passez 10 min au lieu de 30 min sur l\'administratif. Facturez plus vite, soyez payé plus tôt.',
  },
  {
    icon: Euro,
    title: 'Gratuit pour démarrer',
    description: '0€ pour vos 10 premières factures par mois. Idéal pour tester.',
  },
  {
    icon: Shield,
    title: 'Factur-X 2026 prêt',
    description: 'Conforme à la réforme de facturation électronique B2B de 2026.',
  },
  {
    icon: Globe,
    title: 'Clients internationaux',
    description: 'Factures en euros, dollars, livres. Gérez facilement vos clients étrangers.',
  },
  {
    icon: Calendar,
    title: 'Factures récurrentes',
    description: 'Automatisez vos abonnements mensuels. Vos factures se créent toutes seules.',
  },
];

const features = [
  {
    title: 'Devis & factures',
    items: [
      'Conversion devis → facture en 1 clic',
      'Personnalisation complète du design',
      'Logo et couleurs de votre marque',
      'Envoi par email en un clic',
    ],
  },
  {
    title: 'Gestion clients',
    items: [
      'Base de clients illimitée',
      'Historique complet par client',
      'Suivi des impayés',
      'Tableau de bord CA par client',
    ],
  },
  {
    title: 'Conformité',
    items: [
      'Factur-X (réforme 2026)',
      'Portail dématérialisation (PDP)',
      'Export comptable (FEC)',
      'Mentions légales conformes',
    ],
  },
];

const testimonials = [
  {
    name: 'Thomas B.',
    job: 'Développeur freelance',
    text: 'Je ne retourne pas aux Excel. La dictée vocale, c\'est magique pour facturer vite.',
  },
  {
    name: 'Marie C.',
    job: 'Designer UI/UX',
    text: 'Simple, beau, efficace. Mes clients me font souvent des compliments sur mes factures.',
  },
  {
    name: 'Julien M.',
    job: 'Consultant indépendant',
    text: 'Enfin un logiciel qui comprend les freelances. Pas de fonctionnalités inutiles.',
  },
];

const useCases = [
  {
    title: 'Développeurs / Consultants',
    description: 'Facturez au temps passé ou au forfait. Gérez facilement vos demi-journées ou jours.',
  },
  {
    title: 'Designers / Créatifs',
    description: 'Valorisez votre travail avec des factures professionnelles qui reflètent votre marque.',
  },
  {
    title: 'Formateurs / Coaches',
    description: 'Créez des factures pour vos sessions, formations ou accompagnements.',
  },
];

export default function FreelancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Logiciel de Facturation pour <span className="text-purple-600">Freelances</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 speakable-section">
              Créez vos factures en <strong>30 secondes</strong> grâce à la dictée vocale. Concentrez-vous sur votre travail, pas sur l\'admin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-xl hover:shadow-2xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir une démo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ Pas de carte bancaire requise • ✓ 3 factures gratuites par mois
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi les freelances adorent Factu.me ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-purple-200 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
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
            Adapté à tous les profils de freelances
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
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
            Tout ce dont vous avez besoin
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
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Ce que disent les freelances
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-purple-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Passez moins de temps sur l\'administratif
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Rejoignez des milliers de freelances qui utilisent Factu.me
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-purple-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            Commencer gratuitement
          </Link>
          <p className="mt-6 text-sm text-purple-200">
            3 factures gratuites par mois • Sans engagement
          </p>
        </div>
      </section>

      <FAQSchema
        items={[
          {
            question: "Comment facturer en TJM avec Factu.me ?",
            answer: "Avec Factu.me, vous pouvez configurer votre taux journalier moyen (TJM) une seule fois. Ensuite, il vous suffit d'indiquer le nombre de jours travaillés et la facture est calculée automatiquement. Vous pouvez aussi utiliser la dictée vocale : '3 jours à 600€ TJM'.",
          },
          {
            question: "Puis-je facturer en devises étrangères ?",
            answer: "Oui, Factu.me supporte la facturation multi-devises : euros, dollars, livres sterling, francs suisses et bien d'autres. Le taux de change est mis à jour automatiquement pour vos factures internationales.",
          },
          {
            question: "Comment fonctionnent les relances automatiques ?",
            answer: "Factu.me envoie automatiquement des relances à vos clients lorsque vos factures arrivent à échéance. Vous pouvez configurer le nombre de relances, l'intervalle entre chacune et le ton du message.",
          },
          {
            question: "Le plan gratuit est-il vraiment gratuit ?",
            answer: "Oui, le plan gratuit de Factu.me permet de créer jusqu'à 3 factures par mois sans aucune carte bancaire, sans publicité et sans filigrane. Vous pouvez passer au plan Pro quand votre activité le nécessite.",
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facturation Freelances', url: 'https://factu.me/facturation-freelances' },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section']}
        url="https://factu.me/facturation-freelances"
        name="Facturation freelances — Logiciel de facture pour indépendants"
        description="Logiciel de facturation pour freelances et indépendants avec Factu.me"
      />
      {/* Modèles par métier — Maillage Segment→Hub */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Modèles de facture par métier freelance
          </h2>
          <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {[
              { slug: 'developpeur', nom: 'Développeur' },
              { slug: 'designer', nom: 'Designer' },
              { slug: 'consultant', nom: 'Consultant' },
              { slug: 'coach', nom: 'Coach' },
              { slug: 'photographe', nom: 'Photographe' },
              { slug: 'redacteur', nom: 'Rédacteur' },
              { slug: 'traducteur', nom: 'Traducteur' },
              { slug: 'graphiste', nom: 'Graphiste' },
            ].map(metier => (
              <Link key={metier.slug} href={`/modeles-facture/${metier.slug}`}
                className="group p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all text-center">
                <span className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Facture {metier.nom}</span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/modeles-facture" className="text-purple-600 font-medium hover:underline">
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

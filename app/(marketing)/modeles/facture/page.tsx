import { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText, ArrowRight, CheckCircle2, Zap, Download,
  MessageSquare, Shield, Clock, HelpCircle, Sparkles
} from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { FAQSchema } from '@/components/seo/FAQSchema';

export const metadata: Metadata = {
  title: 'Modèle de Facture Gratuit — Templates PDF Conformes 2026',
  description: 'Téléchargez un modèle de facture gratuit et conforme. Templates PDF personnalisables pour artisans, freelances, auto-entrepreneurs. Mentions légales incluses, format Factur-X prêt.',
  openGraph: {
    title: 'Modèle de Facture Gratuit — Templates Conformes 2026 | Factu.me',
    description: 'Modèles de facture gratuits et conformes pour chaque métier. PDF personnalisable, mentions légales incluses.',
    url: 'https://factu.me/modeles/facture',
    siteName: 'Factu.me',
    type: 'website',
  },
  alternates: {
    canonical: 'https://factu.me/modeles/facture',
  },
};

const templates = [
  {
    title: 'Facture artisan BTP',
    description: 'Avec calcul TVA automatique, facture d\'acompte et de situation. Adapté aux artisans du bâtiment.',
    tags: ['BTP', 'TVA 10% / 20%', 'Acompte'],
    href: '/facturation-artisans',
  },
  {
    title: 'Facture freelance / consultant',
    description: 'Facture sans TVA (auto-entrepreneur) ou avec TVA. Format professionnel adapté aux consultants.',
    tags: ['Sans TVA', 'Multi-devises', 'Anglais'],
    href: '/facturation-freelances',
  },
  {
    title: 'Facture auto-entrepreneur',
    description: 'Template avec mention "TVA non applicable, article 293B du CGI" pré-remplie. Simplifié au maximum.',
    tags: ['Micro-entreprise', '293B CGI', 'Simple'],
    href: '/facturation-auto-entrepreneur',
  },
  {
    title: 'Facture PME / SARL / SAS',
    description: 'Modèle complet avec SIRET, numéro de TVA, conditions de paiement et pénalités de retard.',
    tags: ['SIRET', 'TVA intracommunautaire', 'Pénalités'],
    href: '/facturation-pme',
  },
];

const mandatoryMentions = [
  'Date d\'émission de la facture',
  'Numéro de facture unique et chronologique',
  'Date de la vente ou de la prestation',
  'Nom et adresse du vendeur / prestataire',
  'Nom et adresse du client',
  'Numéro SIRET de l\'entreprise',
  'Numéro de TVA intracommunautaire (si assujetti)',
  'Désignation précise des produits / services',
  'Prix unitaire HT et quantité',
  'Taux de TVA applicable et montant de TVA',
  'Total HT et total TTC',
  'Conditions de paiement et pénalités de retard',
  'Mention "TVA non applicable" si franchise de TVA (art. 293B CGI)',
];

const faqItems = [
  {
    question: 'Quelles mentions légales sont obligatoires sur une facture française ?',
    answer: 'Une facture française doit contenir au minimum : le numéro de facture unique, la date d\'émission, les coordonnées du vendeur et du client, le numéro SIRET, la désignation des prestations, les prix HT et TTC, le taux de TVA, et les conditions de paiement. En cas de franchise de TVA (auto-entrepreneur), la mention "TVA non applicable, article 293B du CGI" est obligatoire.',
  },
  {
    question: 'Comment créer une facture gratuite en ligne ?',
    answer: 'Avec Factu.me, créez une facture gratuite en 3 étapes : inscrivez-vous (sans carte bancaire), remplissez les informations de votre client et les prestations, puis téléchargez votre facture PDF. Vous pouvez aussi la dicter vocalement grâce à l\'IA intégrée.',
  },
  {
    question: 'Un auto-entrepreneur doit-il facturer avec TVA ?',
    answer: 'Non, en principe. Les auto-entrepreneurs en franchise de base de TVA ne facturent pas la TVA. Ils doivent en revanche ajouter la mention "TVA non applicable, article 293B du CGI" sur chaque facture. Cependant, ils peuvent opter pour le paiement de la TVA s\'ils le souhaitent.',
  },
  {
    question: 'Quel format de facture utiliser pour la réforme 2026 ?',
    answer: 'La réforme de la facturation électronique impose le format Factur-X (PDF/A-3 avec XML intégré), conforme à la norme européenne EN 16931. Factu.me génère nativement vos factures dans ce format, vous n\'avez rien à configurer.',
  },
  {
    question: 'Comment numéroter mes factures correctement ?',
    answer: 'La numérotation doit être unique et chronologique, sans trou. Le format recommandé est : AAAA-NNN (ex: 2026-001, 2026-002). Vous pouvez aussi préfixer par client ou projet. Factu.me gère la numérotation automatiquement.',
  },
];

export default function ModeleFacturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
              <Download className="w-4 h-4" />
              Modèles gratuits
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Modèles de Facture Gratuits —{' '}
              <span className="text-blue-600">Conformes & Personnalisables</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Templates de facture pour chaque métier. Mentions légales pré-remplies,
              format Factur-X 2026 prêt. Créez votre facture en 30 secondes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl hover:from-blue-700 hover:to-indigo-800 transition-all shadow-xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer ma facture gratuitement
              </Link>
              <Link
                href="/modeles-facture"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-300 transition-all"
              >
                <FileText className="w-5 h-5 mr-2" />
                Voir tous les modèles par métier
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Modèles de facture adaptés à votre activité
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {templates.map((template, i) => (
              <Link
                key={i}
                href={template.href}
                className="group p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {template.title}
                </h3>
                <p className="text-gray-600 mb-4">{template.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags.map((tag, j) => (
                    <span key={j} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center text-sm font-semibold text-blue-600">
                  Voir le modèle <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mentions légales obligatoires */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Mentions légales obligatoires sur une facture
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Toute facture émise en France doit contenir ces éléments. Nos modèles les incluent automatiquement.
          </p>
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="grid md:grid-cols-2 gap-3">
              {mandatoryMentions.map((mention, i) => (
                <div key={i} className="flex items-start gap-3 p-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{mention}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <Link
                href="/mentions-obligatoires-facture"
                className="inline-flex items-center text-blue-600 hover:underline font-semibold text-sm"
              >
                Guide complet des mentions obligatoires <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi Factu.me */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi utiliser Factu.me plutôt qu&apos;un modèle Excel ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: 'Dictée vocale IA',
                desc: 'Dictez votre facture, l\'IA la crée. Plus rapide qu\'un tableur.',
              },
              {
                icon: Shield,
                title: 'Conforme par défaut',
                desc: 'Mentions légales, TVA, SIRET — tout est vérifié automatiquement.',
              },
              {
                icon: Sparkles,
                title: 'Factur-X 2026 prêt',
                desc: 'Format électronique conforme sans configuration supplémentaire.',
              },
              {
                icon: Clock,
                title: 'Numérotation automatique',
                desc: 'Plus besoin de gérer les numéros de facture à la main.',
              },
              {
                icon: FileText,
                title: 'Conversion devis → facture',
                desc: 'Transformez un devis en facture en un clic.',
              },
              {
                icon: Zap,
                title: 'Gratuit pour démarrer',
                desc: '3 factures/mois gratuites. Pas de carte bancaire requise.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 mb-12">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
              Questions fréquentes
            </h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-gray-100">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">{faq.question}</h3>
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-blue-600 group-open:rotate-45 transition-transform text-xl font-light">+</span>
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Créez votre facture en 30 secondes
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Pas de modèle à télécharger. Pas d&apos;Excel à configurer. Juste votre facture, prête et conforme.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-blue-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Créer ma première facture
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
          { name: 'Modèles', url: 'https://factu.me/modeles/facture' },
          { name: 'Modèle Facture', url: 'https://factu.me/modeles/facture' },
        ]}
      />
      <FAQSchema items={faqItems} />
    </div>
  );
}

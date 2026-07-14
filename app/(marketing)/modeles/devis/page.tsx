import { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText, ArrowRight, CheckCircle2, Zap, HelpCircle,
  MessageSquare, Shield, Clock, Sparkles
} from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { FAQSchema } from '@/components/seo/FAQSchema';

export const metadata: Metadata = {
  title: 'Modèle de Devis Gratuit — Template PDF Conforme pour Artisans & Freelances',
  description: 'Créez un devis professionnel gratuit et conforme. Templates PDF pour artisans BTP, freelances, auto-entrepreneurs. Conversion devis → facture en 1 clic. Essai gratuit.',
  openGraph: {
    title: 'Modèle de Devis Gratuit — Templates Conformes | Factu.me',
    description: 'Modèles de devis gratuits et professionnels pour chaque métier. Conversion en facture en 1 clic.',
    url: 'https://factu.me/modeles/devis',
    siteName: 'Factu.me',
    type: 'website',
  },
  alternates: {
    canonical: 'https://factu.me/modeles/devis',
  },
};

const devisTypes = [
  {
    title: 'Devis artisan BTP',
    description: 'Avec détail des matériaux, main d\'œuvre, TVA différenciée (10% rénovation, 20% neuf). Mention "Bon pour accord" intégrée.',
    tags: ['BTP', 'TVA différenciée', 'Matériaux + MO'],
  },
  {
    title: 'Devis freelance / consultant',
    description: 'Template professionnel avec TJM (taux journalier), durée estimée, conditions de mission. Format adapté aux consultants IT.',
    tags: ['TJM', 'Forfait', 'Mission'],
  },
  {
    title: 'Devis auto-entrepreneur',
    description: 'Simplifié au maximum. Mention "TVA non applicable" pré-remplie. Parfait pour les micro-entreprises de service.',
    tags: ['Sans TVA', 'Simple', 'Service'],
  },
  {
    title: 'Devis PME / entreprise',
    description: 'Complet avec conditions générales, délais d\'exécution, clauses de révision de prix. Adapté aux appels d\'offres.',
    tags: ['CGV', 'Appel d\'offres', 'Complet'],
  },
];

const advantages = [
  {
    icon: Sparkles,
    title: 'Conversion devis → facture en 1 clic',
    desc: 'Votre devis est accepté ? Transformez-le en facture en un clic. Les données client et prestations sont déjà pré-remplies.',
  },
  {
    icon: MessageSquare,
    title: 'Dictée vocale du devis',
    desc: 'Dictez votre devis à voix haute : "Plomberie salle de bain, remplacement robinet, 150 euros". L\'IA crée le devis.',
  },
  {
    icon: Shield,
    title: 'Mentions légales automatiques',
    desc: 'SIRET, TVA, assurance décennale (BTP), conditions de paiement — tout est pré-rempli selon votre profil.',
  },
  {
    icon: Clock,
    title: 'Suivi en temps réel',
    desc: 'Savoir si votre devis a été ouvert, lu, accepté ou refusé. Relance automatique si pas de réponse après 7 jours.',
  },
];

const faqItems = [
  {
    question: 'Quelle est la différence entre un devis et une facture ?',
    answer: 'Un devis est un document informatif qui détaille le coût prévisionnel d\'une prestation avant sa réalisation. Il n\'a pas de valeur comptable. Une facture est le document officiel qui constate la vente et déclenche le paiement. Le devis doit être signé par le client ("Bon pour accord") avant le début des travaux.',
  },
  {
    question: 'Un devis est-il obligatoire en France ?',
    answer: 'Le devis est obligatoire pour les prestations de services entre professionnels (B2B) dès lors que le montant dépasse 25€ TTC. Pour les artisans du BTP, le devis est toujours obligatoire. Pour les particuliers, il est fortement recommandé et constitue une protection juridique.',
  },
  {
    question: 'Quelles mentions doit contenir un devis ?',
    answer: 'Un devis doit contenir : votre nom/adresse/SIRET, le nom/adresse du client, la date, la description détaillée des prestations, le prix HT et TTC, le taux de TVA, les conditions de paiement, la durée de validité de l\'offre, et la mention "Devis" en titre. Pour le BTP, ajoutez l\'assurance décennale.',
  },
  {
    question: 'Comment convertir un devis en facture ?',
    answer: 'Avec Factu.me, un seul clic suffit. Le devis accepté est transformé en facture avec un numéro unique, les mêmes prestations et le même client. Les mentions légales sont mises à jour automatiquement. Vous gagnez un temps considérable sur chaque mission.',
  },
  {
    question: 'Combien de temps un devis est-il valable ?',
    answer: 'En principe, un devis est valable pendant la durée indiquée sur le document (souvent 30 jours). Si aucune durée n\'est précisée, la jurisprudence considère qu\'il est valable un temps "raisonnable" (généralement 1 à 3 mois). Il est recommandé de toujours indiquer une date de validité.',
  },
];

export default function ModeleDevisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-6">
              <FileText className="w-4 h-4" />
              Modèles de devis gratuits
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Modèles de Devis Gratuits —{' '}
              <span className="text-emerald-600">Professionnels & Conformes</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Créez un devis professionnel en 30 secondes. Templates PDF pour artisans, freelances, auto-entrepreneurs.
              Conversion en facture en 1 clic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-600 rounded-2xl hover:from-emerald-700 hover:to-emerald-700 transition-all shadow-xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer mon devis gratuitement
              </Link>
              <Link
                href="/logiciel-devis"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                Logiciel de devis complet
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Types de devis */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Un modèle de devis pour chaque activité
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {devisTypes.map((type, i) => (
              <div key={i} className="p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{type.title}</h3>
                <p className="text-gray-600 mb-4">{type.description}</p>
                <div className="flex flex-wrap gap-2">
                  {type.tags.map((tag, j) => (
                    <span key={j} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Avantages Factu.me */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Pourquoi utiliser Factu.me pour vos devis ?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {advantages.map((adv, i) => (
              <div key={i} className="flex gap-5 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
                  <adv.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{adv.title}</h3>
                  <p className="text-gray-600">{adv.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment faire un devis */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            Comment créer un devis en 3 étapes ?
          </h2>
          <div className="space-y-8">
            {[
              { step: 1, title: 'Inscrivez-vous gratuitement', desc: '30 secondes, sans carte bancaire. Renseignez vos informations d\'entreprise.' },
              { step: 2, title: 'Créez votre devis', desc: 'Ajoutez votre client, les prestations et les prix. Ou dictez-le vocalement.' },
              { step: 3, title: 'Envoyez et suivez', desc: 'Envoyez par email ou lien. Suivez en temps réel : ouvert, lu, accepté, refusé.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white text-xl font-black">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-600 rounded-2xl hover:from-emerald-700 hover:to-emerald-700 transition-all shadow-xl"
            >
              <Zap className="w-5 h-5 mr-2" />
              Créer mon devis maintenant
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 mb-12">
            <HelpCircle className="w-8 h-8 text-emerald-600" />
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
              Questions fréquentes sur les devis
            </h2>
          </div>
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

      {/* Liens connexes */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-8">
            Ressources complémentaires
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { href: '/modeles/facture', title: 'Modèle de facture', desc: 'Templates de facture gratuits et conformes pour chaque métier.' },
              { href: '/devis-facture', title: 'Devis et facture', desc: 'Tout comprendre sur le devis et la facturation en France.' },
              { href: '/creer-devis', title: 'Créer un devis', desc: 'Guide complet pour créer un devis professionnel pas à pas.' },
            ].map((link, i) => (
              <Link key={i} href={link.href} className="group p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-emerald-200 transition-all">
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">{link.title}</h3>
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
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Vos devis professionnels commencent ici
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Création, envoi, suivi — tout est automatisé. Essai gratuit sans engagement.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Commencer gratuitement
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
          { name: 'Modèles', url: 'https://factu.me/modeles/devis' },
          { name: 'Modèle Devis', url: 'https://factu.me/modeles/devis' },
        ]}
      />
      <FAQSchema items={faqItems} />
    </div>
  );
}

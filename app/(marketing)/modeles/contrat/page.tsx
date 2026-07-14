import { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText, ArrowRight, CheckCircle2, Zap, HelpCircle,
  Shield, PenTool, Users, Scale
} from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { FAQSchema } from '@/components/seo/FAQSchema';

export const metadata: Metadata = {
  title: 'Modèles de Contrat de Travail CDI & CDD — Templates Conformes au Code du Travail',
  description: 'Modèles de contrat de travail CDI et CDD conformes au Code du travail français. Rédaction assistée par IA, signature électronique eIDAS gratuite. Pour PME, TPE et associations.',
  openGraph: {
    title: 'Modèles Contrat CDI & CDD — Conformes Code du Travail | Factu.me',
    description: 'Contrats de travail CDI et CDD conformes. Rédaction IA, signature eIDAS gratuite.',
    url: 'https://factu.me/modeles/contrat',
    siteName: 'Factu.me',
    type: 'website',
  },
  alternates: {
    canonical: 'https://factu.me/modeles/contrat',
  },
};

const contractTypes = [
  {
    title: 'Contrat CDI à temps plein',
    description: 'Contrat à durée indéterminée, temps complet. Conforme aux conventions collectives. Clause de non-concurrence optionnelle.',
    tags: ['CDI', '35h', 'Conforme'],
  },
  {
    title: 'Contrat CDI à temps partiel',
    description: 'CDI avec horaires aménagés. Mention obligatoire de la répartition de la durée du travail entre les jours de la semaine.',
    tags: ['CDI', 'Temps partiel', 'Horaires'],
  },
  {
    title: 'Contrat CDD classique',
    description: 'Contrat à durée déterminée pour remplacement, accroissement d\'activité ou mission. Motif obligatoire. Prime de précarité 10%.',
    tags: ['CDD', 'Motif', 'Précarité'],
  },
  {
    title: 'Contrat CDD d\'usage',
    description: 'Pour les secteurs où le CDD est d\'usage constant (spectacle, événementiel, HCR). Sans prime de précarité si renouvellement.',
    tags: ['CDD d\'usage', 'Secteur', 'Hors précarité'],
  },
];

const clauses = [
  'Identité des parties (employeur et salarié)',
  'Fonction et qualification',
  'Rémunération (salaire brut, primes)',
  'Durée du travail (heures, planning)',
  'Lieu de travail',
  'Congés payés',
  'Période d\'essai (durée et conditions)',
  'Convention collective applicable',
  'Mutuelle et prévoyance d\'entreprise',
  'Clause de confidentialité',
  'Clause de non-concurrence (optionnelle)',
  'Modalités de rupture',
];

const faqItems = [
  {
    question: 'Quelles sont les mentions obligatoires dans un contrat de travail ?',
    answer: 'Un contrat de travail doit mentionner : l\'identité des parties, la date de début, la fonction et la qualification, la rémunération, la durée du travail, le lieu de travail, les congés payés, la période d\'essai, la convention collective applicable, et les modalités de notification du congé. Pour un CDD, le motif de recours et la date de fin sont obligatoires.',
  },
  {
    question: 'Quelle est la durée maximale d\'un CDD en France ?',
    answer: 'Un CDD ne peut excéder 18 mois en principe (renouvellement inclus). La durée maximale est de 9 mois pour les contrats d\'usage, et 24 mois dans certains cas spécifiques (remplacement d\'un salarié en congé, commande exceptionnelle à l\'export). Le CDD ne peut être renouvelé qu\'une seule fois.',
  },
  {
    question: 'La signature électronique d\'un contrat est-elle légale ?',
    answer: 'Oui. Factu.me propose une signature électronique de niveau Simple (eIDAS art. 25), gratuite, avec preuve d\'acceptation horodatée de l\'acte. Elle garantit l\'intégrité du document et l\'identification du signataire. Pour une valeur juridique renforcée (niveau Qualifié, équivalent à la signature manuscrite), Factu.me s\'appuie sur un partenaire certifié (Universign, Yousign).',
  },
  {
    question: 'Comment Factu.me aide-t-il à rédiger un contrat ?',
    answer: 'Factu.me vous guide pas à pas dans la rédaction de votre contrat. L\'IA pré-remplit les clauses selon votre secteur d\'activité et la convention collective. Vous vérifiez, personnalisez, et signez électroniquement — le tout en quelques minutes.',
  },
  {
    question: 'Un contrat de travail peut-il être modifié après signature ?',
    answer: 'Un contrat peut être modifié par avenant, avec l\'accord des deux parties. La modification du contrat de travail (fonction, rémunération, lieu) nécessite l\'accord exprès du salarié. En cas de refus, l\'employeur peut maintenir les anciennes conditions ou engager une procédure de licenciement.',
  },
];

export default function ModeleContratPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-6">
              <PenTool className="w-4 h-4" />
              Contrats de travail
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6">
              Modèles de Contrat de Travail —{' '}
              <span className="text-emerald-600">CDI & CDD Conformes</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">
              Rédaction assistée par IA. Signature électronique eIDAS gratuite.
              Conformes au Code du travail et aux conventions collectives.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-600 rounded-2xl hover:from-emerald-700 hover:to-emerald-700 transition-all shadow-xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Créer mon contrat
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-300 transition-all"
              >
                Voir la démo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Types de contrat */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            Un modèle pour chaque type de contrat
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {contractTypes.map((type, i) => (
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

      {/* Clauses obligatoires */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Clauses essentielles d&apos;un contrat de travail
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Nos modèles incluent toutes ces clauses, pré-remplies selon votre secteur.
          </p>
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="grid md:grid-cols-2 gap-3">
              {clauses.map((clause, i) => (
                <div key={i} className="flex items-start gap-3 p-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{clause}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi Factu.me */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-16">
            La gestion RH simplifiée pour les TPE
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: PenTool,
                title: 'Rédaction assistée par IA',
                desc: 'L\'IA pré-remplit les clauses selon votre secteur d\'activité et la convention collective applicable.',
              },
              {
                icon: Shield,
                title: 'Signature eIDAS gratuite',
                desc: 'Signature électronique de niveau Simple (eIDAS art. 25), avec preuve d\'acceptation horodatée de l\'acte.',
              },
              {
                icon: Scale,
                title: 'Conforme Code du travail',
                desc: 'Dernières mises à jour légales intégrées. Period d\'essai, congés, rupture — tout est à jour.',
              },
              {
                icon: Users,
                title: 'Gestion des employés',
                desc: 'Tableau de bord RH : contrats, avenants, rappels de fin de période d\'essai.',
              },
              {
                icon: FileText,
                title: 'Modèles personnalisables',
                desc: 'Adaptez chaque clause à vos besoins. Ajoutez des clauses spécifiques à votre secteur.',
              },
              {
                icon: Zap,
                title: 'En quelques minutes',
                desc: 'De la création à la signature, tout se fait en ligne. Plus besoin d\'imprimer et scanner.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
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
            <HelpCircle className="w-8 h-8 text-emerald-600" />
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
              Questions fréquentes sur les contrats de travail
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

      {/* Ressources */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-8">
            Ressources complémentaires
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { href: '/modeles/facture', title: 'Modèles de facture', desc: 'Templates de facture conformes pour chaque métier.' },
              { href: '/modeles/devis', title: 'Modèles de devis', desc: 'Templates de devis professionnels et gratuits.' },
              { href: '/securite', title: 'Sécurité & signature eIDAS', desc: 'Comment fonctionne la signature électronique légale.' },
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

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
            Rédigez votre contrat de travail en 5 minutes
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            IA + signature électronique eIDAS. Conforme au Code du travail. Essai gratuit.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-emerald-700 bg-white rounded-2xl hover:bg-gray-50 transition-all shadow-xl"
          >
            <Zap className="w-5 h-5 mr-2" />
            Créer mon contrat
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
          { name: 'Modèles', url: 'https://factu.me/modeles/contrat' },
          { name: 'Modèle Contrat', url: 'https://factu.me/modeles/contrat' },
        ]}
      />
      <FAQSchema items={faqItems} />
    </div>
  );
}

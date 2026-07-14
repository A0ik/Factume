import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Brain,
  Mic,
  FileText,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  BarChart3,
  Globe,
  AlertTriangle,
  Calculator,
  Scale,
} from 'lucide-react';

import { getProfession, getAllProfessionSlugs, professions } from '@/lib/seo-data';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { HowToSchema } from '@/components/seo/HowToSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { VisualBreadcrumbs } from '@/components/seo/VisualBreadcrumbs';

export const revalidate = 86400;
export const dynamicParams = false;

interface Props {
  params: Promise<{ profession: string }>;
}

export async function generateStaticParams() {
  return getAllProfessionSlugs().map((profession) => ({ profession }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { profession: slug } = await params;
  const data = getProfession(slug);
  if (!data) return {};

  const title = `Facture IA pour ${data.nom} — Créez vos factures par IA | Factu.me`;
  const description = `Logiciel de facture IA pour ${data.nomLower}. Générez vos factures par intelligence artificielle avec Factu.me. Dictée vocale, TVA ${data.tva.taux}%, conformité Factur-X, signature eIDAS. Essai gratuit.`;
  const url = `https://factu.me/facture-ia/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Factu.me',
      type: 'website',
      locale: 'fr_FR',
      images: [
        {
          url: `/api/og?title=Facture%20IA%20${encodeURIComponent(data.nom)}&description=${encodeURIComponent(`Facture IA pour ${data.nomLower}`)}&theme=emerald`,
          width: 1200,
          height: 630,
          alt: `Facture IA pour ${data.nom} — Factu.me`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function FactureIAProfessionPage({ params }: Props) {
  const { profession: slug } = await params;
  const data = getProfession(slug);
  if (!data) notFound();

  const similarProfessions = data.metiersSimilaires
    .map((s) => professions.find((p) => p.slug === s))
    .filter(Boolean);

  const howToSteps = [
    {
      name: `Dictez votre facture de ${data.nomLower}`,
      text: `Ouvrez Factu.me et dictez votre facture en langage naturel. Exemple : « Facture pour ${data.lignesExemple[0]?.description || 'prestation'}, ${data.lignesExemple[0]?.quantite || 1} à ${data.lignesExemple[0]?.prixUnitaire || 100} € HT. » L'IA comprend votre vocabulaire de ${data.nomLower}.`,
    },
    {
      name: "L'IA génère la facture complète",
      text: `L'intelligence artificielle analyse votre demande, applique la TVA à ${data.tva.taux}%${data.tva.franchise ? ' (ou la franchise de TVA si applicable)' : ''}, ajoute les mentions légales ${data.obligations.length > 0 ? `(${data.obligations[0].toLowerCase()})` : 'obligatoires'} et génère une facture au format Factur-X conforme.`,
    },
    {
      name: 'Vérifiez et validez en un clic',
      text: `Relisez la facture pré-remplie par l'IA. Modifiez si nécessaire. Chaque champ est vérifié automatiquement : TVA ${data.tva.taux}%, coordonnées, montants, échéance de paiement, ${data.tva.franchise ? 'mention de franchise, ' : ''}mentions légales.`,
    },
    {
      name: 'Signez et envoyez',
      text: 'Signez électroniquement votre facture avec une signature eIDAS niveau Simple, art. 25 (gratuite sur Factu.me, preuve d\'acceptation horodatée). Envoyez par email ou partagez un lien sécurisé. Le suivi de paiement est automatique.',
    },
  ];

  const benefits = [
    {
      icon: Clock,
      title: '90 % de temps gagné',
      description: `L'IA pré-remplit votre facture de ${data.nomLower} en quelques secondes. Plus besoin de saisir manuellement les taux de TVA à ${data.tva.taux}%${data.tva.franchise ? ' ou la mention de franchise' : ''} et les mentions légales.`,
    },
    {
      icon: Shield,
      title: '100 % conforme légalement',
      description: `Chaque facture IA respecte les mentions obligatoires du Code de commerce${data.obligations.length > 0 ? `, y compris ${data.obligations[0].toLowerCase()}` : ''} et le standard européen Factur-X (EN 16931).`,
    },
    {
      icon: Mic,
      title: 'Dictée vocale intégrée',
      description: `Créez vos factures de ${data.nomLower} en parlant, directement depuis votre téléphone. Parfait pour les ${data.secteur === 'artisan' ? 'artisans sur chantier' : data.secteur === 'freelance' ? 'freelances en déplacement' : 'professionnels en déplacement'}.`,
    },
    {
      icon: Zap,
      title: 'Envoi instantané',
      description: 'Signez électroniquement (eIDAS) et envoyez votre facture en 1 clic. Le suivi de paiement et les relances sont automatisés.',
    },
    {
      icon: Brain,
      title: 'Apprentissage continu',
      description: `Plus vous utilisez Factu.me, plus l'IA comprend vos habitudes de ${data.nomLower}. Elle pré-remplit vos tarifs${data.secteur === 'freelance' ? ' (TJM)' : ''}, vos clients récurrents et vos conditions de paiement.`,
    },
    {
      icon: BarChart3,
      title: 'Insights financiers',
      description: `L'IA analyse vos flux de facturation de ${data.nomLower} pour vous alerter sur les retards de paiement et les opportunités de trésorerie.`,
    },
  ];

  const faqItems = [
    {
      question: `Comment créer une facture IA pour ${data.nomLower} ?`,
      answer: `Pour créer une facture IA pour ${data.nomLower} sur Factu.me, il suffit de dicter ou décrire votre facture en langage naturel. L'IA génère automatiquement la facture avec la TVA à ${data.tva.taux}%${data.tva.franchise ? ' (ou la mention de franchise si applicable)' : ''}, les mentions légales et le format Factur-X conforme. Aucune saisie manuelle nécessaire.`,
    },
    {
      question: `Quelle TVA appliquer sur une facture IA de ${data.nomLower} ?`,
      answer: data.tva.franchise
        ? `En tant que ${data.nomLower} en franchise de TVA (micro-entreprise), vous n'êtes pas assujetti. La facture IA de Factu.me ajoute automatiquement la mention "${data.tva.mentionSpecifique}". Si vous dépassez les seuils, l'IA bascule sur le taux de ${data.tva.taux}%.`
        : `Le taux de TVA applicable pour un(e) ${data.nomLower} est de ${data.tva.taux}%. La facture IA de Factu.me applique automatiquement ce taux et calcule les montants HT et TTC.`,
    },
    {
      question: `La facture IA est-elle adaptée aux spécificités de ${data.nomLower} ?`,
      answer: `Oui, la facture IA de Factu.me est spécifiquement adaptée aux ${data.nomLower}s. Elle gère la TVA à ${data.tva.taux}%${data.tva.franchise ? ' et la franchise de TVA' : ''}, ${data.obligations[0]?.toLowerCase() || 'les obligations légales'}, et les mentions légales propres à votre activité${data.secteur === 'artisan' ? ' (garantie décennale, certification RGE, etc.)' : ''}.`,
    },
    {
      question: data.tva.franchise
        ? `Peut-on utiliser la facture IA en tant que ${data.nomLower} auto-entrepreneur ?`
        : `Quelles sont les obligations comptables d'un(e) ${data.nomLower} avec la facture IA ?`,
      answer: data.tva.franchise
        ? `Oui, la facture IA est parfaitement adaptée aux ${data.nomLower}s auto-entrepreneurs. Elle ajoute automatiquement la mention "${data.tva.mentionSpecifique}" et ne facture pas de TVA. Le régime micro-entreprise est géré nativement.`
        : `La facture IA de Factu.me vous aide à respecter vos obligations de ${data.nomLower} : facturation avec TVA à ${data.tva.taux}%, mentions légales complètes, conservation 10 ans, export FEC comptable. ${data.regimes.includes('réel simplifié') ? 'Compatible avec le régime réel simplifié.' : ''}`,
    },
    {
      question: `Combien coûte la facture IA pour ${data.nomLower} ?`,
      answer: `La facture IA pour ${data.nomLower} sur Factu.me est accessible dès 0 € (plan Découverte, 3 factures/mois). Le plan Pro à 14,99 €/mois offre des factures illimitées, la dictée vocale IA et l'export comptable. Essai gratuit sans carte bancaire.`,
    },
    {
      question: `La facture IA est-elle conforme à la facturation électronique 2026 pour les ${data.nomLower}s ?`,
      answer: `Oui. Chaque facture IA générée pour votre activité de ${data.nomLower} est au format Factur-X (XML + PDF), conforme à la norme EN 16931. Elle est prête pour la transmission via PDP (Plateforme de Dématérialisation Partenaire) exigée par la réforme 2026.`,
    },
  ];

  // Profession-specific voice examples
  const voiceExample =
    data.secteur === 'artisan'
      ? `« Facture ${data.lignesExemple[0]?.description || 'chantier'}, ${data.lignesExemple[0]?.quantite || 1} à ${data.lignesExemple[0]?.prixUnitaire || 100} euros, TVA ${data.tva.taux} % »`
      : data.secteur === 'freelance'
        ? `« Facture mensuelle pour ${data.lignesExemple[0]?.description || 'mission'}, ${data.lignesExemple[0]?.quantite || 1} jour${(data.lignesExemple[0]?.quantite || 1) > 1 ? 's' : ''} à ${data.lignesExemple[0]?.prixUnitaire || 500} euros, TVA ${data.tva.taux} % »`
        : data.secteur === 'sante'
          ? `« Facture ${data.lignesExemple[0]?.description || 'consultation'}, ${data.lignesExemple[0]?.quantite || 1} séance à ${data.lignesExemple[0]?.prixUnitaire || 60} euros »`
          : `« Facture ${data.lignesExemple[0]?.description || 'prestation'}, ${data.lignesExemple[0]?.quantite || 1} à ${data.lignesExemple[0]?.prixUnitaire || 100} euros HT, TVA ${data.tva.taux} % »`;

  return (
    <div className="min-h-screen bg-white">
      {/* Visual Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <VisualBreadcrumbs
          items={[
            { label: 'Accueil', href: '/' },
            { label: 'Facture IA', href: '/facture-ia' },
            { label: `Facture IA ${data.nom}`, href: `/facture-ia/${slug}` },
          ]}
        />
      </div>

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex items-center gap-2 mb-6">
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-medium">
              Intelligence Artificielle + {data.nom}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Facture IA pour{' '}
            <span className="text-emerald-400">{data.nom}</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mb-8 leading-relaxed">
            Le logiciel de <strong>facture IA</strong> conçu pour les{' '}
            {data.nomLower}s. Générez vos factures par intelligence artificielle
            — dictée vocale, TVA {data.tva.taux}%
            {data.tva.franchise ? ' ou franchise' : ''}, conformité Factur-X,
            signature eIDAS. <strong>Essai gratuit sans carte bancaire.</strong>
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-lg transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Essayer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-colors"
            >
              Voir la démo
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> TVA{' '}
              {data.tva.taux}% auto
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Conforme
              Factur-X 2026
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Signature
              eIDAS gratuite
            </span>
          </div>
        </div>
      </section>

      {/* ── DÉFINITION AEO ── */}
      <section className="speakable-section max-w-6xl mx-auto px-4 py-16">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Qu&apos;est-ce qu&apos;une facture IA pour {data.nomLower} ?
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            Une <strong>facture IA pour {data.nomLower}</strong> est une facture
            générée automatiquement par un logiciel d&apos;intelligence
            artificielle, adaptée aux spécificités de votre activité. L&apos;IA
            comprend vos instructions en langage naturel — par texte ou par la
            voix — et crée une facture complète avec la TVA à{' '}
            {data.tva.taux}%
            {data.tva.franchise
              ? ` (ou la mention "${data.tva.mentionSpecifique}" si vous êtes en franchise)`
              : ''},{' '}
            {data.obligations.length > 0
              ? `${data.obligations[0].toLowerCase()}, `
              : ''}
            et toutes les mentions légales obligatoires.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Factu.me est le premier logiciel de facture IA qui gère les
            spécificités des {data.nomLower}s :{' '}
            {data.conseilsFacturation[0]
              ?.toLowerCase()
              .substring(0, 120)
              .replace(/\.?$/, '…')}
            . Tout est automatisé, de la dictée vocale à la signature
            électronique eIDAS.
          </p>
        </div>
      </section>

      {/* ── BÉNÉFICES ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Pourquoi utiliser l&apos;IA pour vos factures de {data.nomLower} ?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            La facture IA révolutionne la facturation des {data.nomLower}s.
            Découvrez les avantages concrets pour votre activité.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="p-6 rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <b.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {b.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE (HowTo) ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Comment créer une facture IA pour {data.nomLower} ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              4 étapes simples pour passer de l&apos;idée à la facture envoyée.
              Aucune compétence technique requise.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howToSteps.map((step, i) => (
              <div
                key={step.name}
                className="relative bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="absolute -top-4 -left-2 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                  {step.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXEMPLE DICTÉE VOCALE ── */}
      <section className="speakable-section max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-gray-900 to-emerald-900 rounded-2xl p-8 sm:p-12 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="w-6 h-6 text-emerald-300" />
            <span className="text-emerald-300 font-medium">
              Exemple de dictée vocale
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            Dites-le simplement, l&apos;IA fait le reste
          </h2>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
            <p className="text-lg text-emerald-100 italic leading-relaxed">
              {voiceExample}
            </p>
          </div>
          <p className="text-emerald-100 leading-relaxed mb-6">
            L&apos;IA comprend votre vocabulaire de {data.nomLower}, identifie
            le client, calcule la TVA à {data.tva.taux}%
            {data.tva.franchise ? ' (ou applique la franchise)' : ''}, ajoute{' '}
            {data.obligations[0]?.toLowerCase() || 'les mentions légales'} et
            génère la facture complète au format Factur-X en quelques secondes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
          >
            Essayer la dictée vocale gratuitement
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── CONSEILS DE FACTURATION IA ── */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
          Conseils de facturation IA pour {data.nomLower}
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          {data.description}
        </p>
        <div className="space-y-6">
          {data.conseilsFacturation.map((conseil, i) => (
            <div
              key={i}
              className="flex gap-4 p-6 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-600 font-bold text-sm">
                  {i + 1}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed">{conseil}</p>
            </div>
          ))}
          <div className="flex gap-4 p-6 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-gray-700 leading-relaxed">
              <strong>Avec la facture IA de Factu.me,</strong> tous ces conseils
              sont appliqués automatiquement. L&apos;IA vérifie les taux de TVA,
              les mentions légales et la conformité de chaque facture de{' '}
              {data.nomLower}. Vous vous concentrez sur votre métier.
            </p>
          </div>
        </div>
      </section>

      {/* ── TVA & RÉGIME ── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
            TVA et régime fiscal pour {data.nomLower} — gérés par l&apos;IA
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm">
              <Calculator className="w-10 h-10 text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Taux de TVA applicable
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Taux applicable</span>
                  <span className="font-bold text-emerald-600">
                    {data.tva.taux}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Franchise de TVA</span>
                  <span
                    className={`font-bold ${data.tva.franchise ? 'text-emerald-600' : 'text-gray-500'}`}
                  >
                    {data.tva.franchise ? 'Oui (sous seuil)' : 'Non'}
                  </span>
                </div>
                {data.tva.franchise && (
                  <p className="text-sm text-gray-600 pt-2 italic">
                    {data.tva.mentionSpecifique}
                  </p>
                )}
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl">
                  <p className="text-sm text-emerald-700">
                    <strong>Facture IA :</strong> le taux de TVA et la mention de
                    franchise sont appliqués automatiquement selon votre régime.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm">
              <Scale className="w-10 h-10 text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Régimes compatibles
              </h3>
              <ul className="space-y-3">
                {data.regimes.map((regime, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700">{regime}</span>
                  </li>
                ))}
                {data.statuts.map((statut, i) => (
                  <li key={`s-${i}`} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <Link
                      href={`/comment-facturer/${statut}`}
                      className="text-gray-700 hover:text-emerald-600 transition-colors"
                    >
                      Statut : {statut}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── ERREURS À ÉVITER ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-4">
            Erreurs de facturation que l&apos;IA évite pour les {data.nomLower}s
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            La facture IA de Factu.me détecte et corrige automatiquement ces
            erreurs courantes chez les {data.nomLower}s.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {data.erreursCourantes.map((erreur, i) => (
              <div
                key={i}
                className="flex gap-3 p-5 bg-gradient-to-br from-red-50 to-white rounded-2xl border border-red-100"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-700 leading-relaxed">{erreur}</p>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    ✓ Corrigé automatiquement par l&apos;IA
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONFORMITÉ 2026 ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-2xl p-8 sm:p-12 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-6 h-6 text-emerald-300" />
            <span className="text-emerald-300 font-medium">
              Réforme e-invoicing 2026
            </span>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Facture IA {data.nom} — prêt pour 2026
          </h2>
          <p className="text-emerald-100 text-lg mb-6 leading-relaxed max-w-3xl">
            La facturation électronique devient obligatoire. En tant que{' '}
            {data.nomLower}, chaque facture IA est générée au format{' '}
            <strong>Factur-X</strong> (EN 16931), signée électroniquement
            (eIDAS), et transmissible via les <strong>PDP</strong> — sans action
            supplémentaire.
          </p>
          <Link
            href="/facturation-electronique"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
          >
            En savoir plus sur la réforme 2026
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── MÉTIERS SIMILAIRES ── */}
      {similarProfessions.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 mb-12">
              Facture IA pour des métiers similaires
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {similarProfessions.map(
                (prof) =>
                  prof && (
                    <Link
                      key={prof.slug}
                      href={`/facture-ia/${prof.slug}`}
                      className="group p-6 bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all"
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                        Facture IA {prof.nom}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        TVA {prof.tva.taux}% &bull; {prof.secteur}
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600 mt-3 font-medium">
                        Voir la page <ArrowRight className="w-4 h-4" />
                      </span>
                    </Link>
                  )
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section id="faq" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Questions fréquentes — Facture IA {data.nom}
          </h2>
          <div className="space-y-4">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors font-medium text-gray-900">
                  {item.question}
                  <ArrowRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-5 pb-5 text-gray-600 leading-relaxed speakable-faq-answer">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Prêt à essayer la facture IA pour {data.nomLower} ?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Rejoignez les {data.nomLower}s qui ont déjà adopté la facturation par
            intelligence artificielle. Essai gratuit, sans carte bancaire, sans
            engagement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-lg transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              Commencer gratuitement
            </Link>
            <Link
              href={`/modeles-facture/${slug}`}
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-300 hover:border-emerald-500 text-gray-700 rounded-xl font-semibold text-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              Voir le modèle facture {data.nom}
            </Link>
          </div>
          <div className="mt-6 flex justify-center items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" /> 4.8/5
            </span>
            <span>&bull;</span>
            <span>127 avis</span>
            <span>&bull;</span>
            <span>Factur-X conforme</span>
          </div>
        </div>
      </section>

      {/* ── MAILLAGE NEURAL ── */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages
          pages={[
            { href: '/facture-ia', label: 'Facture IA — Présentation' },
            { href: '/facture-voix', label: 'Facture Voix — Dictée vocale' },
            { href: `/modeles-facture/${slug}`, label: `Modèle facture ${data.nom}` },
            { href: '/facturation-electronique', label: 'Facturation électronique 2026' },
            { href: '/creer-facture', label: 'Créer une facture' },
            { href: '/mentions-obligatoires-facture', label: 'Mentions obligatoires' },
            ...similarProfessions.map(
              (p) =>
                p && {
                  href: `/facture-ia/${p.slug}`,
                  label: `Facture IA ${p.nom}`,
                }
            ),
          ].filter(Boolean) as { href: string; label: string }[]}
        />
      </section>

      {/* ── SCHEMAS JSON-LD ── */}
      <FAQSchema items={faqItems} />
      <HowToSchema
        name={`Comment créer une facture IA pour ${data.nomLower} avec Factu.me`}
        description={`Guide étape par étape pour créer une facture par intelligence artificielle pour ${data.nomLower} avec Factu.me`}
        steps={howToSteps}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture IA', url: 'https://factu.me/facture-ia' },
          {
            name: `Facture IA ${data.nom}`,
            url: `https://factu.me/facture-ia/${slug}`,
          },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section', '.speakable-faq-answer']}
        url={`https://factu.me/facture-ia/${slug}`}
        name={`Facture IA pour ${data.nom} — Factu.me`}
        description={`Comment créer des factures par intelligence artificielle pour ${data.nomLower} avec Factu.me. TVA ${data.tva.taux}%, conformité Factur-X, signature eIDAS.`}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: `Factu.me — Facture IA pour ${data.nom}`,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'EUR',
            },
            description: `Logiciel de facture IA pour ${data.nomLower}. TVA ${data.tva.taux}%, mentions légales pré-remplies, dictée vocale, format Factur-X. Gratuit jusqu'à 3 factures/mois.`,
            featureList: data.conseilsFacturation
              .slice(0, 3)
              .join(' ; '),
          }),
        }}
      />
    </div>
  );
}

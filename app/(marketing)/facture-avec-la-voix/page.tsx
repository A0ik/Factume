import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Mic,
  ListChecks,
  ShieldCheck,
  Clock,
  Wallet,
  Building2,
  Hammer,
  Code2,
  Store,
  ArrowRight,
  CheckCircle2,
  WifiOff,
  FileSignature,
} from 'lucide-react';

import { FAQSchema } from '@/components/seo/FAQSchema';
import { HowToSchema } from '@/components/seo/HowToSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';
import { CollectionPageSchema } from '@/components/seo/CollectionPageSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { ExpertBadge } from '@/components/seo/ExpertBadge';

/* ──────────────────────────── SEO METADATA ──────────────────────────── */

export const metadata: Metadata = {
  title: 'Facture avec la Voix — Comment Faire une Facture en Parlant | Factu.me',
  description:
    'Faites une facture avec la voix : dictez ce que vous voulez facturer, l\'IA génère une facture conforme (Factur-X, signature eIDAS) en 30 secondes. Guide complet pour parler et facturer en 2026.',
  alternates: {
    canonical: 'https://factu.me/facture-avec-la-voix',
  },
  openGraph: {
    title: 'Facture avec la Voix — Le Guide pour Facturer en Parlant',
    description:
      'Dictez votre facture, l\'IA fait le reste : TVA, mentions légales, Factur-X, signature. Le guide pratique pour créer une facture avec la voix en 2026.',
    url: 'https://factu.me/facture-avec-la-voix',
    type: 'website',
    locale: 'fr_FR',
    images: [
      {
        url: '/api/og?title=Facture%20avec%20la%20Voix&description=Comment%20faire%20une%20facture%20en%20parlant&theme=emerald',
        width: 1200,
        height: 630,
        alt: 'Facture avec la Voix — Guide pratique | Factu.me',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Facture avec la Voix — Comment facturer en parlant',
    description:
      'Dictez, l\'IA facture. Le guide complet pour créer une facture avec la voix en 2026.',
  },
};

/* ──────────────────────────── DATA ──────────────────────────── */

const faqItems = [
  {
    question: 'Comment faire une facture avec la voix ?',
    answer:
      'Pour faire une facture avec la voix, ouvrez Factu.me sur votre téléphone ou ordinateur, appuyez sur le microphone et dictez naturellement ce que vous voulez facturer (client, prestation, quantité, prix). L\'intelligence artificielle transforme votre voix en facture complète, avec TVA calculée, mentions légales et format Factur-X, prête à signer et envoyer en 30 secondes.',
  },
  {
    question: 'Faire une facture avec la voix, est-ce légal en France ?',
    answer:
      'Oui. Une facture créée avec la voix a exactement la même valeur légale qu\'une facture saisie manuellement, dès lors qu\'elle contient les mentions obligatoires (numéro SIRET, TVA intracommunautaire, conditions de paiement, pénalités de retard). Factu.me génère automatiquement ces mentions et produit un fichier Factur-X (EN 16931) conforme à la facturation électronique 2026.',
  },
  {
    question: 'Quel est le meilleur outil pour faire une facture avec la voix ?',
    answer:
      'Factu.me est le seul logiciel français dédié à la facture vocale, avec une reconnaissance vocale optimisée pour le français et les métiers (BTP, freelance, services), le format Factur-X, la signature eIDAS gratuite et le suivi de paiement. Il fonctionne sur mobile, ordinateur et en mode hors-ligne.',
  },
  {
    question: 'La reconnaissance vocale comprend-elle le français et les accents ?',
    answer:
      'Oui. Le modèle vocal de Factu.me est entraîné sur le français et atteint plus de 98 % de précision. Il comprend les accents régionaux, les nombres et montants dictés en toutes lettres ou en chiffres, ainsi que le vocabulaire technique des métiers (plomberie, électricité, informatique, juridique).',
  },
  {
    question: 'Peut-on faire une facture avec la voix sur iPhone ou Android ?',
    answer:
      'Oui. Factu.me est une application web progressive (PWA) qui fonctionne sur iPhone, Android et ordinateur, directement depuis le navigateur. Vous dictez votre facture avec le micro du téléphone, même sur un chantier ou en déplacement.',
  },
  {
    question: 'Comment dicter une facture avec plusieurs lignes ?',
    answer:
      'Il suffit de le dire. Par exemple : « Facture pour Durand. Ligne 1 : 3 jours de maçonnerie à 350 euros HT, TVA 10 %. Ligne 2 : fournitures 200 euros ht, TVA 20 %. Remise 5 %. » L\'IA crée une facture multi-lignes, multi-taux de TVA, avec remise et total calculés automatiquement.',
  },
  {
    question: 'Peut-on faire une facture avec la voix sans internet ?',
    answer:
      'Vous pouvez préparer et enregistrer vos factures sans connexion grâce au mode hors-ligne de Factu.me (PWA). Elles sont synchronisées et envoyées dès le retour du réseau. La dictée vocale, en revanche, nécessite une connexion internet pour transmettre l\'audio à l\'IA.',
  },
  {
    question: 'La facture avec la voix fonctionne-t-elle pour les artisans du BTP ?',
    answer:
      'C\'est l\'usage idéal. Les artisans facturent souvent sur le chantier, sans ordinateur ni le temps de saisir. Avec la voix, ils dictent la facture en 30 secondes depuis leur téléphone et l\'envoient avant de quitter le client. L\'IA gère automatiquement les taux de TVA multiples du BTP (20 %, 10 %, 5,5 %).',
  },
  {
    question: 'La facture vocale est-elle conforme à la réforme e-invoicing 2026 ?',
    answer:
      'Oui. Chaque facture dictée est générée au format Factur-X (PDF + XML), conforme à la norme européenne EN 16931. Elle peut être transmise via une Plateforme de Dématérialisation Partenaire (PDP) dès sa création, ce qui vous met en conformité avec la réforme de la facturation électronique 2026.',
  },
  {
    question: 'Combien de temps faut-il pour faire une facture avec la voix ?',
    answer:
      'En moyenne 30 secondes : vous dictez votre instruction, l\'IA génère la facture en 2 à 3 secondes, vous vérifiez puis envoyez. Comparé à 10 à 20 minutes de saisie manuelle, c\'est un gain de temps d\'environ 95 %.',
  },
  {
    question: 'Peut-on faire un devis ou un contrat avec la voix aussi ?',
    answer:
      'Oui. La dictée vocale fonctionne pour les devis, les factures d\'acompte et les contrats de travail (CDI, CDD). Vous pouvez dicter un devis, le faire valider par le client, puis le convertir en facture en un seul clic sans rien ressaisir.',
  },
  {
    question: 'Que se passe-t-il si l\'IA n\'a pas bien compris ma dictée ?',
    answer:
      'Vous gardez toujours le contrôle : l\'IA pré-remplit la facture et vous la présente pour validation avant envoi. Vous pouvez corriger n\'importe quel champ. En pratique, le taux de compréhension dépasse 98 % et les corrections sont rares.',
  },
];

const howToSteps = [
  {
    name: 'Ouvrez Factu.me et activez le microphone',
    text: 'Lancez Factu.me sur votre téléphone ou ordinateur. Appuyez sur le bouton micro pour activer la dictée vocale. Aucun matériel supplémentaire n\'est nécessaire — le micro de votre appareil suffit.',
  },
  {
    name: 'Dictez votre facture naturellement',
    text: 'Parlez comme à un assistant : « Crée une facture pour Martin Dupont, 5 heures de plomberie à 45 euros de l\'heure, TVA 20 %. » L\'IA comprend le langage naturel, les montants et le vocabulaire de votre métier.',
  },
  {
    name: 'L\'IA structure, calcule et met en conformité',
    text: 'En 2 à 3 secondes, l\'intelligence artificielle crée la facture : lignes détaillées, sous-totaux, TVA calculée, mentions légales, numéro unique, format Factur-X (EN 16931). Tout est pré-rempli.',
  },
  {
    name: 'Vérifiez le résultat pré-rempli',
    text: 'Relisez la facture générée. Corrigez si besoin n\'importe quel champ — l\'IA ne verrouille rien. C\'est vous qui validez avant envoi.',
  },
  {
    name: 'Signez électroniquement et envoyez',
    text: 'Signez avec une signature électronique eIDAS (niveau Simple, art. 25, gratuite, avec preuve d\'acceptation horodatée), puis envoyez par email ou par lien de paiement. Le suivi d\'encaissement est automatique.',
  },
];

const benefits = [
  {
    icon: Clock,
    title: '30 secondes par facture',
    text: 'Dicter une facture prend environ 30 secondes, contre 10 à 20 minutes pour une saisie manuelle. Soit un gain de temps d\'environ 95 %.',
  },
  {
    icon: WifiOff,
    title: 'Mains libres, sur le terrain',
    text: 'Idéal sur un chantier, au volant ou entre deux rendez-vous. Vous parlez, vous ne tapez pas. Le micro du téléphone suffit.',
  },
  {
    icon: ShieldCheck,
    title: 'Conformité automatique',
    text: 'Mentions légales, TVA, numéro SIRET, format Factur-X, signature eIDAS : tout est généré et conforme à la facturation électronique 2026.',
  },
  {
    icon: Wallet,
    title: 'Zéro oubli, zéro erreur',
    text: 'L\'IA calcule les totaux, applique les bons taux de TVA et ajoute les mentions obligatoires. Fini les oublis qui coûtent cher en redressement.',
  },
];

const useCases = [
  {
    icon: Hammer,
    title: 'Artisans du BTP',
    text: 'Plombiers, électriciens, maçons : facturez sur le chantier en 30 secondes, TVA multiples gérées automatiquement.',
  },
  {
    icon: Code2,
    title: 'Freelances & consultants',
    text: 'Entre deux missions, dictez facture ou devis. Le CRM retient vos clients pour aller encore plus vite.',
  },
  {
    icon: Building2,
    title: 'Auto-entrepreneurs',
    text: 'Franchise en base de TVA, mention « article 293 B du CGI » : l\'application l\'insère pour vous, sans y penser.',
  },
  {
    icon: Store,
    title: 'Commerciaux & TPE',
    text: 'Sur la route, dictez votre facture et encaissez par carte via le lien de paiement avant même de quitter le client.',
  },
];

const relatedPages = [
  { href: '/facture-voix', label: 'Facture Voix — le logiciel' },
  { href: '/facture-ia', label: 'Facture IA' },
  { href: '/facture-rapide', label: 'Facture rapide' },
  { href: '/facturation-vocale', label: 'Qu\'est-ce que la facturation vocale ?' },
  { href: '/creer-facture', label: 'Créer une facture' },
  { href: '/logiciel-facture-francais', label: 'Logiciel de facture français' },
];

/* ──────────────────────────── PAGE ──────────────────────────── */

export default function FactureAvecLaVoixPage() {
  return (
    <main id="landing" className="min-h-screen bg-white text-gray-900 antialiased overflow-x-hidden">
      <FAQSchema items={faqItems} />
      <HowToSchema
        name="Comment faire une facture avec la voix sur Factu.me"
        description="Guide étape par étape pour créer une facture en parlant, de l'activation du micro à l'envoi signé."
        steps={howToSteps}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Facture avec la voix', url: 'https://factu.me/facture-avec-la-voix' },
        ]}
      />
      <SpeakableSchema
        cssSelectors={['.seo-definition', '.howto-step-name']}
        url="https://factu.me/facture-avec-la-voix"
        name="Facture avec la voix — Comment faire une facture en parlant"
        description="Guide pratique pour créer une facture avec la voix grâce à la dictée vocale IA sur Factu.me."
      />
      <CollectionPageSchema
        name="Facture avec la voix — Guide"
        description="Toutes les ressources pour faire une facture avec la voix sur Factu.me"
        url="https://factu.me/facture-avec-la-voix"
        hasPart={[
          { name: 'Facture Voix — le logiciel', url: 'https://factu.me/facture-voix', description: 'Logiciel de facture vocale IA' },
          { name: 'Facture IA', url: 'https://factu.me/facture-ia', description: 'Facture par intelligence artificielle' },
          { name: 'Facture rapide', url: 'https://factu.me/facture-rapide', description: 'Créer une facture en moins de 60 secondes' },
          { name: 'Facturation vocale', url: 'https://factu.me/facturation-vocale', description: "Qu'est-ce que la facturation vocale" },
        ]}
      />

      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-teal-500/10 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-6">
            <Mic className="w-3.5 h-3.5" /> Guide pratique · 2026
          </div>
          <h1 className="text-[clamp(2.2rem,7vw,3.5rem)] md:text-5xl 2xl:text-6xl font-bold tracking-tight leading-[1.08]">
            Faire une <span className="text-emerald-400">facture avec la voix</span>
          </h1>
          <p className="seo-definition mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Faire une facture avec la voix, c'est dicter à une intelligence artificielle ce que vous voulez facturer.
            L'IA transforme votre parole en facture complète, conforme et signée — sans rien saisir, en 30 secondes.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400"
            >
              Essayer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/facture-voix"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Voir le logiciel facture voix
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">Sans carte bancaire · 3 factures offertes · Données hébergées en France</p>
        </div>
      </section>

      {/* ─────────── AEO DÉFINITION COURTE ─────────── */}
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-6">
          <ExpertBadge name="Équipe Factu.me" title="Expert en facturation électronique 2026" organization="Factu.me" />
          <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Qu'est-ce qu'une facture avec la voix ?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
            Une <strong>facture avec la voix</strong> est une facture créée par dictée vocale : vous parlez naturellement
            (« facture pour Martin, 5 heures à 45 euros ») et une intelligence artificielle transforme vos mots en
            document de facturation complet. Aussi appelée <em>facture vocale</em> ou <em>facture dictée</em>, elle a
            la même valeur légale qu'une facture classique dès lors qu'elle respecte les mentions obligatoires et le
            format <Link href="/facturation-electronique" className="text-emerald-600 hover:underline">Factur-X</Link>.
          </p>
        </div>
      </section>

      {/* ─────────── HOWTO ─────────── */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Comment faire une facture avec la voix, étape par étape
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Cinq étapes, environ 30 secondes au total.</p>
          </div>
          <ol className="space-y-5">
            {howToSteps.map((step, i) => (
              <li key={i} className="group flex gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <h3 className="howto-step-name text-lg font-bold text-gray-900">{step.name}</h3>
                  <p className="mt-1.5 text-gray-600 leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm text-emerald-900 leading-relaxed">
              <ListChecks className="inline w-4 h-4 mr-1.5 -mt-0.5 text-emerald-600" />
              <strong>Exemple de dictée :</strong> « Crée une facture pour la société Durand. Ligne 1 : 3 jours de
              maçonnerie à 350 € HT, TVA 10 %. Ligne 2 : fournitures 200 € HT, TVA 20 %. Remise 5 %. » → L'IA produit
              une facture multi-lignes, multi-TVA, remise appliquée, total TTC calculé, conforme Factur-X.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── BÉNÉFICES ─────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Pourquoi créer sa facture avec la voix
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-gray-200 p-6 transition-colors hover:border-emerald-300">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <b.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">{b.title}</h3>
                <p className="mt-1.5 text-gray-600 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CAS D'USAGE ─────────── */}
      <section className="bg-slate-950 py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Faire une facture avec la voix, selon votre métier
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {useCases.map((u) => (
              <div key={u.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <u.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{u.title}</h3>
                <p className="mt-1.5 text-slate-300 leading-relaxed">{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 text-center mb-10">
            Questions fréquentes sur la facture avec la voix
          </h2>
          <div className="space-y-3">
            {faqItems.map((f) => (
              <details key={f.question} className="group rounded-xl border border-gray-200 bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-gray-900 list-none">
                  {f.question}
                  <span className="text-emerald-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-gray-600 leading-relaxed">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── ARTICLE LONG (profondeur sémantique) ─────────── */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <article className="mx-auto max-w-3xl px-6 prose-custom">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Tout savoir sur la facture avec la voix en 2026
          </h2>

          <h3 className="mt-8 text-xl font-bold text-gray-900">La voix, nouveau standard de la facturation</h3>
          <p className="mt-3 text-gray-600 leading-relaxed">
            La saisie manuelle d'une facture reste un point de friction pour des millions d'indépendants et d'artisans
            français : entre 10 et 20 minutes par document, des oublis de mentions, des erreurs de TVA. La
            reconnaissance vocale, couplée à l'intelligence artificielle, permet désormais de <strong>parler pour
            facturer</strong>. Ce que l'on faisait péniblement au clavier se dit en quelques secondes, et l'IA se charge
            de structurer, calculer et mettre en conformité.
          </p>

          <h3 className="mt-8 text-xl font-bold text-gray-900">Valeur légale et conformité</h3>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Une facture dictée à la voix n'est pas une « facture allégée ». Dès l'instant où elle contient les mentions
            obligatoires prévues par l'article 242 nonies A de l'annexe II au CGI — numéro SIRET, TVA intracommunautaire,
            date d'échéance, taux de pénalités de retard — elle a la même valeur juridique qu'une facture saisie à la
            main. Factu.me génère automatiquement ces mentions et produit un fichier au format <Link href="/facturation-factur-x" className="text-emerald-600 hover:underline">Factur-X</Link> (norme européenne EN 16931),
            qui vous met d'ores et déjà en conformité avec la <Link href="/facturation-electronique" className="text-emerald-600 hover:underline">réforme de la facturation électronique 2026</Link>.
          </p>

          <h3 className="mt-8 text-xl font-bold text-gray-900">Signature électronique eIDAS</h3>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Pour aller plus loin que la simple conformité, chaque facture vocale peut être signée électroniquement au
            niveau Simple défini par le règlement européen eIDAS (art. 25). Cette signature garantit l'intégrité du
            document et l'identification du signataire, avec une preuve d'acceptation horodatée, ce qui renforce la
            valeur probante de la facture auprès de votre client et de votre comptable. Sur Factu.me, cette signature
            est gratuite et automatique. Pour une valeur juridique renforcée (niveau Qualifié, équivalent à la signature
            manuscrite), Factu.me s'appuie sur un partenaire certifié (Universign, Yousign).
          </p>

          <h3 className="mt-8 text-xl font-bold text-gray-900">Faire une facture avec la voix vs saisie manuelle</h3>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Le tableau est sans appel : là où la saisie manuelle demande un ordinateur, un tableur ou un logiciel, de la
            rigueur sur les calculs et les mentions, la voix ramène la facturation à un acte naturel — parler. Sur le
            terrain, là où l'ordinateur n'est pas disponible, la voix reste utilisable : le micro du téléphone suffit.
            Et parce que l'IA applique les bons taux de TVA et ajoute les mentions obligatoires, le risque d'erreur ou
            d'oubli chute drastiquement.
          </p>

          <h3 className="mt-8 text-xl font-bold text-gray-900">Pour quels professionnels ?</h3>
          <p className="mt-3 text-gray-600 leading-relaxed">
            La facture vocale s'adresse d'abord à ceux pour qui la saisie est le plus coûteuse : les artisans du BTP qui
            facturent sur le chantier, les auto-entrepreneurs qui cumulent activités, les freelances pressés, les
            commerciaux de terrain. Mais elle convient aussi à toute TPE qui souhaite réduire la charge
            administrative. Quel que soit votre métier, le principe reste le même : vous dictez, l'IA facture.
          </p>

          <div className="mt-10 rounded-2xl bg-emerald-600 p-8 text-center text-white">
            <FileSignature className="w-8 h-8 mx-auto mb-3" />
            <h3 className="text-xl font-bold">Prêt à facturer avec la voix ?</h3>
            <p className="mt-2 text-emerald-50 max-w-md mx-auto">
              Dictez votre première facture en 30 secondes. Sans carte bancaire, conforme Factur-X, signée eIDAS.
            </p>
            <Link
              href="/register"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-50"
            >
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      </section>

      {/* ─────────── RELATED ─────────── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <RelatedPages pages={relatedPages} />
        </div>
      </section>
    </main>
  );
}

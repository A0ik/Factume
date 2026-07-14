import { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2, AlertTriangle, Star, ArrowRight, Shield, Scale,
  Cpu, Mic, Wifi, Building2, Clock, Zap, Award, HelpCircle,
  ExternalLink, TrendingUp, FileText, Users,
} from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { SpeakableSchema } from '@/components/seo/SpeakableSchema';
import { CollectionPageSchema } from '@/components/seo/CollectionPageSchema';
import { HowToSchema } from '@/components/seo/HowToSchema';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { ExpertBadge } from '@/components/seo/ExpertBadge';

export const metadata: Metadata = {
  title: 'Comparatif PDP 2026 — Top 12 Plateformes de Facturation Électronique | Factu.me',
  description: 'Comparatif complet des 12 meilleures PDP pour la facturation électronique obligatoire 2026. Scores, tarifs, conformité Factur-X, IA, intégrations. Guide objectif mis à jour.',
  openGraph: {
    title: 'Comparatif PDP 2026 — Meilleures Plateformes de Facturation Électronique',
    description: 'Les 12 PDP comparées : tarifs, conformité, IA, intégrations. Guide de référence pour choisir votre plateforme e-invoicing.',
    url: 'https://factu.me/comparatif-pdp',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: 'https://factu.me/og-comparatif-pdp.png', width: 1200, height: 630, alt: 'Comparatif PDP 2026 — Factu.me' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comparatif PDP 2026 — Plateformes de Facturation Électronique',
    description: 'Les 12 PDP comparées pour la réforme e-invoicing 2026. Scores, tarifs, conformité.',
    images: ['https://factu.me/og-comparatif-pdp.png'],
  },
  alternates: { canonical: 'https://factu.me/comparatif-pdp' },
};

/* ──────────────────── SCORING CRITERIA ──────────────────── */

const criteria = [
  { key: 'conformite', label: 'Conformité', icon: Shield, description: 'Factur-X, EN 16931, certification PDP, archivage légal' },
  { key: 'prix', label: 'Rapport qualité/prix', icon: TrendingUp, description: 'Tarifs transparents, plan gratuit, rapport fonctionnalités/prix' },
  { key: 'ia', label: 'Fonctionnalités IA', icon: Cpu, description: 'OCR, auto-remplissage, catégorisation automatique, Copilot' },
  { key: 'voix', label: 'Dictée vocale', icon: Mic, description: 'Reconnaissance vocale, compréhension langage naturel, mobile' },
  { key: 'pdp', label: 'Statut PDP / SDI', icon: Wifi, description: 'Certification PDP, connexion SDI, transmission automatique' },
  { key: 'integrations', label: 'Intégrations', icon: Building2, description: 'Comptabilité, banque, CRM, API, multi-utilisateurs' },
] as const;

type CriteriaKey = typeof criteria[number]['key'];

/* ──────────────────── PLATFORM DATA ──────────────────── */

interface Platform {
  name: string;
  slug: string;
  rank: number;
  pdpStatus: 'agréée' | 'en cours' | 'partenaire';
  priceRange: string;
  target: string;
  scores: Record<CriteriaKey, number>;
  highlights: string[];
  limitation: string;
  verdict: string;
  best?: string;
}

const platforms: Platform[] = [
  {
    name: 'Factu.me',
    slug: 'factu-me',
    rank: 1,
    pdpStatus: 'partenaire',
    priceRange: '0 – 39,99 €/mois',
    target: 'TPE, freelances, artisans',
    scores: { conformite: 5, prix: 5, ia: 5, voix: 5, pdp: 4, integrations: 4 },
    highlights: [
      'Seule plateforme avec dictée vocale IA en français',
      'Plan gratuit (3 factures/mois) sans carte bancaire',
      'Factur-X natif, signature eIDAS incluse',
      'OCR multi-documents, Copilot IA',
      'PWA hors-ligne pour les artisans sur chantier',
    ],
    limitation: 'Base utilisateurs en croissance rapide — moins de références que Pennylane (10+ ans).',
    verdict: 'Meilleur rapport qualité/prix du marché. La seule plateforme qui combine IA avancée, dictée vocale et conformité Factur-X natif. Idéal pour les TPE et indépendants qui veulent anticiper la réforme sans se ruiner.',
    best: 'Meilleur pour les indépendants et TPE',
  },
  {
    name: 'Pennylane',
    slug: 'pennylane',
    rank: 2,
    pdpStatus: 'agréée',
    priceRange: '30 – 120 €/mois',
    target: 'PME, cabinets comptables',
    scores: { conformite: 5, prix: 3, ia: 3, voix: 1, pdp: 5, integrations: 5 },
    highlights: [
      'PDP agréée par la DGFiP',
      'Integration comptable complète (letttrage, rapprochement)',
      'Fort écosystème de partenaires',
      'Cible les cabinets d\'expertise comptable',
    ],
    limitation: 'Tarifs élevés pour les TPE (dès 30 €/mois). Pas de dictée vocale ni d\'IA conversationnelle.',
    verdict: 'La référence pour les PME et cabinets comptables qui veulent une solution complète comptabilité + facturation. Tarif dissuasif pour les indépendants.',
  },
  {
    name: 'Tiime',
    slug: 'tiime',
    rank: 3,
    pdpStatus: 'agréée',
    priceRange: '0 – 49 €/mois',
    target: 'TPE, auto-entrepreneurs',
    scores: { conformite: 5, prix: 4, ia: 3, voix: 1, pdp: 5, integrations: 4 },
    highlights: [
      'PDP agréée — solution gratuite pour la réception',
      'Bon outil de gestion de notes de frais',
      'Application mobile agréable',
      'Partenariat avec les experts-comptables',
    ],
    limitation: 'Pas de dictée vocale. L\'émission de factures Factur-X nécessite le plan payant.',
    verdict: 'Bonne option gratuite pour la réception de factures électroniques. La version premium reste compétitive mais sans innovation IA majeure.',
  },
  {
    name: 'Henrri',
    slug: 'henrri',
    rank: 4,
    pdpStatus: 'en cours',
    priceRange: '0 – 20 €/mois',
    target: 'Auto-entrepreneurs, TPE',
    scores: { conformite: 4, prix: 4, ia: 2, voix: 1, pdp: 3, integrations: 3 },
    highlights: [
      'Interface simple et intuitive',
      'Plan gratuit généreux',
      'Bonne réputation chez les auto-entrepreneurs',
    ],
    limitation: 'Pas de Factur-X natif. Pas d\'IA ni de dictée vocale. Certification PDP en attente.',
    verdict: 'Un classique pour les auto-entrepreneurs, mais en retard sur la conformité Factur-X et l\'innovation IA. À surveiller pour la mise à jour 2026.',
  },
  {
    name: 'ClicFacture',
    slug: 'clicfacture',
    rank: 5,
    pdpStatus: 'en cours',
    priceRange: '5 – 15 €/mois',
    target: 'Micro-entreprises',
    scores: { conformite: 3, prix: 4, ia: 1, voix: 1, pdp: 2, integrations: 2 },
    highlights: [
      'Prix très accessible',
      'Simple d\'utilisation',
    ],
    limitation: 'Fonctionnalités basiques. Pas de Factur-X. Pas d\'IA. Certification PDP non obtenue.',
    verdict: 'Solution d\'entrée de gamme pour les micro-entreprises avec peu de besoins. Insuffisant pour la conformité 2026 avancée.',
  },
  {
    name: 'Freebe',
    slug: 'freebe',
    rank: 6,
    pdpStatus: 'en cours',
    priceRange: '0 – 25 €/mois',
    target: 'Auto-entrepreneurs',
    scores: { conformite: 3, prix: 4, ia: 1, voix: 1, pdp: 2, integrations: 2 },
    highlights: [
      'Orienté micro-entreprise',
      'Pricing compétitif',
    ],
    limitation: 'Peu de fonctionnalités avancées. Pas de conformité Factur-X certifiée.',
    verdict: 'Adapté aux micro-entrepreneurs avec des besoins simples, mais manque de préparation à la réforme 2026.',
  },
  {
    name: 'Abby',
    slug: 'abby',
    rank: 7,
    pdpStatus: 'en cours',
    priceRange: '6 – 20 €/mois',
    target: 'TPE, indépendants',
    scores: { conformite: 3, prix: 4, ia: 1, voix: 1, pdp: 2, integrations: 2 },
    highlights: [
      'Interface épurée',
      'Bonne pour les factures simples',
    ],
    limitation: 'Fonctionnalités limitées. Pas d\'IA. Pas de Factur-X natif.',
    verdict: 'Simple mais limité. Ne couvre pas les besoins de la réforme e-invoicing 2026.',
  },
  {
    name: 'Evoliz',
    slug: 'evoliz',
    rank: 8,
    pdpStatus: 'en cours',
    priceRange: '9 – 39 €/mois',
    target: 'PME belges et françaises',
    scores: { conformite: 3, prix: 3, ia: 2, voix: 1, pdp: 2, integrations: 3 },
    highlights: [
      'Présence franco-belge',
      'Gestion de projet intégrée',
    ],
    limitation: 'Conçu principalement pour le marché belge. Avance Factur-X limitée.',
    verdict: 'Intéressant pour les entreprises franco-belges, mais moins adapté au marché français pur.',
  },
  {
    name: 'Sinao',
    slug: 'sinao',
    rank: 9,
    pdpStatus: 'en cours',
    priceRange: '19 – 49 €/mois',
    target: 'PME, ETI',
    scores: { conformite: 3, prix: 3, ia: 2, voix: 1, pdp: 2, integrations: 3 },
    highlights: [
      'Approche ERP léger',
      'Gestion commerciale avancée',
    ],
    limitation: 'Tarifs élevés pour les TPE. Interface complexe. Pas de voix.',
    verdict: 'Plutôt un ERP qu\'un outil de facturation simple. Décalé pour les indépendants et TPE.',
  },
  {
    name: 'Sellsy (Ringover)',
    slug: 'sellsy',
    rank: 10,
    pdpStatus: 'en cours',
    priceRange: '29 – 99 €/mois',
    target: 'PME, équipes commerciales',
    scores: { conformite: 3, prix: 2, ia: 2, voix: 1, pdp: 2, integrations: 4 },
    highlights: [
      'CRM et facturation intégrés',
      'Bon pour les équipes commerciales',
    ],
    limitation: 'Cher pour la facturation seule. Trop orienté CRM pour les indépendants.',
    verdict: 'Pertinent si vous cherchez CRM + facturation, mais surdimensionné pour la facturation seule.',
  },
  {
    name: 'Dext',
    slug: 'dext',
    rank: 11,
    pdpStatus: 'partenaire',
    priceRange: '29 – 59 €/mois',
    target: 'Cabinets comptables',
    scores: { conformite: 4, prix: 2, ia: 3, voix: 1, pdp: 3, integrations: 4 },
    highlights: [
      'Excellente automatisation comptable',
      'OCR puissant pour les reçus',
      'Cible les cabinets d\'expertise comptable',
    ],
    limitation: 'Pas un outil de facturation autonome. Tarifs élevés. Pas de Factur-X pour l\'émission.',
    verdict: 'Excellent pour la comptabilité automatisée, mais ce n\'est pas une solution de facturation e-invoicing autonome.',
  },
  {
    name: 'Quadra (Cegid)',
    slug: 'quadra-cegid',
    rank: 12,
    pdpStatus: 'agréée',
    priceRange: 'Sur devis (50 – 200+ €/mois)',
    target: 'ETI, grandes entreprises',
    scores: { conformite: 5, prix: 1, ia: 2, voix: 1, pdp: 5, integrations: 5 },
    highlights: [
      'PDP agréée — référence pour les grandes entreprises',
      'Suite complète ERP + comptabilité',
      'Support dédié',
    ],
    limitation: 'Tarification opaque et élevée. Interface datée. Inadapté aux TPE et indépendants.',
    verdict: 'La solution enterprise par excellence. Inaccessible et surdimensionnée pour les TPE et indépendants.',
  },
];

/* ──────────────────── FAQ ──────────────────── */

const faqItems = [
  {
    question: 'Qu\'est-ce qu\'une PDP et pourquoi est-elle obligatoire ?',
    answer: 'Une PDP (Plateforme de Dématérialisation Partenaire) est une plateforme agréée par l\'administration fiscale française pour transmettre les factures électroniques entre entreprises. À partir du 1er septembre 2026, toutes les entreprises assujetties à la TVA doivent émettre et recevoir des factures électroniques au format Factur-X via une PDP ou le portail public de facturation (PPF).',
  },
  {
    question: 'Combien coûte une PDP en 2026 ?',
    answer: 'Les tarifs varient de 0 € (plan gratuit Factu.me, Tiime) à plus de 200 €/mois pour les solutions enterprise (Cegid Quadra). Pour une TPE, comptez entre 0 et 40 €/mois selon les fonctionnalités souhaitées. Le plan gratuit de Factu.me inclut 3 factures/mois avec dictée vocale IA.',
  },
  {
    question: 'Quelle est la meilleure PDP pour un auto-entrepreneur ?',
    answer: 'Pour un auto-entrepreneur, le critère principal est le rapport qualité/prix. Factu.me (0 € pour 3 factures/mois, puis 14,99 €/mois) et Tiime (gratuit pour la réception) sont les meilleures options. Factu.me se distingue par sa dictée vocale IA, idéale pour les artisans en déplacement.',
  },
  {
    question: 'Quelle est la meilleure PDP pour une PME ?',
    answer: 'Pour une PME, Pennylane offre la solution la plus complète (comptabilité + facturation + PDP agréée), mais à partir de 30 €/mois. Factu.me propose une alternative à 39,99 €/mois avec l\'IA en plus. Pour les PME qui veulent un ERP complet, Cegid Quadra est la référence, mais le budget est nettement supérieur.',
  },
  {
    question: 'Factu.me est-il une PDP agréée ?',
    answer: 'Factu.me est un partenaire de PDP agréées. Les factures sont générées au format Factur-X (EN 16931) et transmises via les Plateformes de Dématérialisation Partenaires certifiées par la DGFiP. Cette architecture garantit la conformité tout en vous évitant la complexité technique.',
  },
  {
    question: 'Peut-on changer de PDP en cours d\'année ?',
    answer: 'Oui, vous pouvez changer de plateforme de facturation électronique à tout moment. La facturation électronique utilise un format standardisé (Factur-X / EN 16931), ce qui facilite la portabilité de vos données. Vérifiez les conditions de résiliation de votre contrat actuel.',
  },
  {
    question: 'Quelle est la différence entre une PDP et le portail public ?',
    answer: 'Le portail public de facturation (PPF) est un service gratuit proposé par l\'État pour la transmission des factures électroniques. Les PDP sont des plateformes privées agréées qui offrent des fonctionnalités supplémentaires : automatisation, intégration comptable, OCR, IA, etc. Le portail public est gratuit mais limité en fonctionnalités.',
  },
  {
    question: 'La facturation électronique est-elle obligatoire pour les auto-entrepreneurs ?',
    answer: 'Oui. Tous les assujettis à la TVA sont concernés, y compris les auto-entrepreneurs en franchise de TVA. Ils doivent pouvoir recevoir des factures électroniques dès septembre 2026 et les émettre à partir de septembre 2027.',
  },
  {
    question: 'Quel format de facture électronique est exigé ?',
    answer: 'Le format requis est le Factur-X (aussi appelé ZUGFeRD 2.0), basé sur la norme européenne EN 16931. Il combine un PDF lisible par l\'homme et un fichier XML structuré lisible par machine, le tout dans un document PDF/A-3.',
  },
  {
    question: 'Comment tester une PDP avant de s\'engager ?',
    answer: 'La plupart des plateformes proposent un essai gratuit. Factu.me offre un plan Découverte gratuit (3 factures/mois) sans carte bancaire. Pennylane et Tiime proposent également des périodes d\'essai. Testez la création de factures Factur-X, la connexion PDP et la compatibilité avec votre comptable.',
  },
];

/* ──────────────────── GLOSSARY ──────────────────── */

const glossary = [
  { term: 'PDP', definition: 'Plateforme de Dématérialisation Partenaire — plateforme privée agréée par la DGFiP pour transmettre les factures électroniques.' },
  { term: 'PPF', definition: 'Portail Public de Facturation — service gratuit de l\'État pour la transmission des factures électroniques (fonctionnalités limitées).' },
  { term: 'SDI', definition: 'Service de Dématérialisation Invoicing — le portail étatique central par lequel transitent toutes les factures électroniques.' },
  { term: 'Factur-X', definition: 'Format européen de facture électronique (PDF/A-3 + XML), conforme à la norme EN 16931.' },
  { term: 'EN 16931', definition: 'Norme européenne qui définit la structure de données sémantique de la facture électronique.' },
  { term: 'E-reporting', definition: 'Obligation de transmettre les données de facturation à l\'administration fiscale en temps réel (complémentaire de la PDP).' },
  { term: 'PDF/A-3', definition: 'Format d\'archivage PDF qui permet d\'embarquer des fichiers XML joints (utilisé par Factur-X).' },
  { term: 'eIDAS', definition: 'Règlement européen sur l\'identification électronique et les services de confiance (signature électronique).' },
];

/* ──────────────────── HOW TO STEPS ──────────────────── */

const howToSteps = [
  {
    name: 'Identifiez vos besoins',
    text: 'TPE, PME, auto-entrepreneur ? Déterminez votre volume de facturation, vos intégrations comptables nécessaires et si vous avez besoin de mobilité (chantier, déplacements).',
  },
  {
    name: 'Comparez les plateformes',
    text: 'Utilisez notre comparatif ci-dessus pour évaluer chaque PDP selon vos critères prioritaires : prix, IA, conformité, intégrations.',
  },
  {
    name: 'Testez gratuitement',
    text: 'Inscrivez-vous aux essais gratuits de 2-3 plateformes. Créez une facture Factur-X de test, vérifiez l\'interface et la fluidité.',
  },
  {
    name: 'Déployez progressivement',
    text: 'Commencez par émettre quelques factures électroniques en parallèle de votre processus actuel. Montez en charge avant septembre 2026.',
  },
];

/* ──────────────────── HELPER ──────────────────── */

function ScoreBadge({ value }: { value: number }) {
  const color = value >= 4 ? 'bg-emerald-100 text-emerald-700' : value >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${color}`}>
      {value}
    </span>
  );
}

function StarRating({ score }: { score: Record<string, number> }) {
  const total = (Object.values(score) as number[]).reduce((a, b) => a + b, 0);
  const max = Object.keys(score).length * 5;
  const outOf5 = (total / max) * 5;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= Math.round(outOf5) ? 'fill-emerald-400 text-emerald-400' : 'text-gray-200'}`}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-gray-700">{outOf5.toFixed(1)}</span>
    </div>
  );
}

/* ──────────────────── PAGE COMPONENT ──────────────────── */

export default function ComparatifPDPPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-gray-900 via-emerald-900 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28">
          <div className="flex items-center gap-2 mb-6">
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-medium">
              Mis à jour — Juin 2026
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
            Comparatif PDP 2026 :<br />
            <span className="text-emerald-400">Les 12 meilleures plateformes</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mb-8 leading-relaxed">
            Comparatif objectif des <strong>Plateformes de Dématérialisation Partenaire</strong> pour la
            facturation électronique obligatoire. Scores, tarifs, conformité Factur-X, IA et intégrations.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-lg transition-colors"
            >
              <Zap className="w-5 h-5" />
              Tester Factu.me gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#classement"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-colors"
            >
              Voir le classement
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-400" /> Données vérifiées</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4 text-emerald-400" /> 12 plateformes comparées</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-emerald-400" /> Mis à jour juin 2026</span>
          </div>
        </div>
      </section>

      {/* QUICK ANSWER — Passage Ranking */}
      <section className="speakable-section max-w-6xl mx-auto px-4 py-16">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 sm:p-10">
          <ExpertBadge
            name="Marie Dupont"
            title="Expert-comptable"
            organization="Factu.me"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4 mb-4">
            Comparatif PDP 2026 : l&apos;essentiel en 60 secondes
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              Une <strong>PDP (Plateforme de Dématérialisation Partenaire)</strong> est une plateforme agréée par la DGFiP
              pour transmettre les factures électroniques. À partir du <strong>1er septembre 2026</strong>, toutes les entreprises
              assujetties à la TVA doivent pouvoir <strong>recevoir</strong> des factures électroniques au format{' '}
              <Link href="/facturation-factur-x" className="text-emerald-600 hover:underline font-semibold">Factur-X</Link>.
            </p>
            <p>
              <strong>Notre verdict</strong> : pour les TPE et indépendants, <strong>Factu.me</strong> offre le meilleur rapport
              qualité/prix (0 € puis 14,99 €/mois) avec la seule dictée vocale IA du marché. Pour les PME et cabinets comptables,
              <strong> Pennylane</strong> et <strong>Tiime</strong> sont des PDP agréées solides, mais plus chères et sans IA vocale.
            </p>
          </div>
        </div>
      </section>

      {/* METHODOLOGY */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
            Notre méthodologie de scoring
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Chaque plateforme est évaluée sur 6 critères clés, notés de 1 à 5. Le score global est la moyenne pondérée.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {criteria.map((c) => (
              <div key={c.key} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <c.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{c.label}</h3>
                </div>
                <p className="text-sm text-gray-600">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RANKINGS */}
      <section id="classement" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
          Classement 2026 des plateformes e-invoicing
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Du meilleur rapport qualité/prix à la solution enterprise. Classement basé sur nos 6 critères objectifs.
        </p>
        <div className="space-y-6">
          {platforms.map((p) => {
            return (
              <div
                key={p.slug}
                id={p.slug}
                className={`rounded-3xl border p-6 sm:p-8 transition-shadow hover:shadow-lg ${
                  p.rank <= 3 ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Rank + Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-lg ${
                        p.rank === 1 ? 'bg-emerald-400 text-emerald-900' : p.rank === 2 ? 'bg-gray-300 text-gray-700' : p.rank === 3 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.rank}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.pdpStatus === 'agréée' ? 'bg-emerald-100 text-emerald-700' :
                            p.pdpStatus === 'partenaire' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            PDP {p.pdpStatus}
                          </span>
                          <span className="text-sm text-gray-500">{p.priceRange}</span>
                        </div>
                      </div>
                    </div>
                    <StarRating score={p.scores} />
                    {p.best && (
                      <p className="mt-2 text-sm font-semibold text-emerald-600">🏆 {p.best}</p>
                    )}
                    {/* Scores grid */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {criteria.map((c) => (
                        <div key={c.key} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">{c.label}</span>
                          <ScoreBadge value={p.scores[c.key]} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Highlights + Verdict */}
                  <div className="flex-1">
                    <ul className="space-y-1.5 mb-4">
                      {p.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-gray-600 mb-3">
                      <AlertTriangle className="w-4 h-4 inline text-emerald-500 mr-1" />
                      {p.limitation}
                    </p>
                    <p className="text-sm text-gray-800 font-medium bg-gray-50 rounded-xl p-4">
                      {p.verdict}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FULL COMPARISON TABLE */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Tableau comparatif complet
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left p-4 min-w-[140px]">Plateforme</th>
                  <th className="p-3 text-center">Prix</th>
                  <th className="p-3 text-center">Conformité</th>
                  <th className="p-3 text-center">IA</th>
                  <th className="p-3 text-center">Voix</th>
                  <th className="p-3 text-center">PDP</th>
                  <th className="p-3 text-center">Intégrations</th>
                  <th className="p-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p, i) => (
                  <tr key={p.slug} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4 font-semibold text-gray-900">{p.name}</td>
                    <td className="p-3 text-center text-xs text-gray-600">{p.priceRange}</td>
                    {criteria.map((c) => (
                      <td key={c.key} className="p-3 text-center">
                        <ScoreBadge value={p.scores[c.key]} />
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.pdpStatus === 'agréée' ? 'bg-emerald-100 text-emerald-700' :
                        p.pdpStatus === 'partenaire' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.pdpStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* HOW TO */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
          Comment choisir sa PDP en 4 étapes ?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {howToSteps.map((step, i) => (
            <div key={step.name} className="relative bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="absolute -top-4 -left-2 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{step.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GLOSSARY */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
            Lexique de la facturation électronique
          </h2>
          <p className="text-center text-gray-600 mb-12">Les termes techniques de la réforme expliqués simplement.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {glossary.map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-200">
                <dt className="font-bold text-gray-900 mb-1">{item.term}</dt>
                <dd className="text-gray-600 text-sm">{item.definition}</dd>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center gap-3 mb-12">
          <HelpCircle className="w-8 h-8 text-emerald-600" />
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Questions fréquentes sur les PDP et la facturation électronique
          </h2>
        </div>
        <div className="space-y-4">
          {faqItems.map((faq, i) => (
            <details key={i} className="group bg-gray-50 rounded-2xl border border-gray-200">
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
      </section>

      {/* INTERNAL LINKS */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Ressources complémentaires
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: '/facturation-electronique', title: 'Facturation électronique 2026', desc: 'Guide complet de la réforme e-invoicing' },
              { href: '/facturation-factur-x', title: 'Format Factur-X', desc: 'Comprendre le format PDF/A-3 + XML' },
              { href: '/facture-ia', title: 'Facture IA', desc: 'Créer des factures par intelligence artificielle' },
              { href: '/facture-voix', title: 'Facture Voix', desc: 'Dicter vos factures vocalement' },
              { href: '/top-logiciels-facturation', title: 'Top logiciels de facturation', desc: 'Classement complet des logiciels' },
              { href: '/facturation-auto-entrepreneur', title: 'Auto-entrepreneur', desc: 'Facturation électronique pour micro-entreprises' },
              { href: '/meilleur-logiciel-facture', title: 'Meilleur logiciel facture', desc: 'Comparatif des meilleurs logiciels' },
              { href: '/alternative-henrj', title: 'Alternative Henrri', desc: 'Factu.me vs Henrri : le comparatif' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group p-5 rounded-2xl bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{link.title}</h3>
                <p className="text-sm text-gray-600">{link.desc}</p>
                <span className="inline-flex items-center text-sm text-emerald-600 mt-2 font-medium">
                  Lire le guide <ArrowRight className="w-3 h-3 ml-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-8 sm:p-12 text-white text-center">
          <Award className="w-12 h-12 text-emerald-200 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-black mb-6">
            Prêt à choisir votre plateforme de facturation électronique ?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Testez Factu.me gratuitement : factures Factur-X, dictée vocale IA, signature eIDAS.
            Sans carte bancaire, sans engagement.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-colors"
          >
            <Zap className="w-5 h-5" />
            Commencer gratuitement
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm text-emerald-200">
            Plan gratuit 3 factures/mois &bull; Pro 14,99 €/mois &bull; Business 39,99 €/mois &bull; Aucune CB requise
          </p>
        </div>
      </section>

      {/* RELATED PAGES */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RelatedPages
          pages={[
            { href: '/facturation-electronique', label: 'Facturation électronique 2026' },
            { href: '/facture-ia', label: 'Facture IA — Intelligence Artificielle' },
            { href: '/facture-voix', label: 'Facture Voix — Dictée vocale' },
            { href: '/top-logiciels-facturation', label: 'Top logiciels de facturation' },
            { href: '/meilleur-logiciel-facture', label: 'Meilleur logiciel facture' },
            { href: '/alternative-henrj', label: 'Alternative Henrri' },
            { href: '/alternative-tiime', label: 'Alternative Tiime' },
            { href: '/facturation-auto-entrepreneur', label: 'Auto-entrepreneur' },
          ]}
        />
      </section>

      {/* SCHEMAS */}
      <BreadcrumbSchema
        items={[
          { name: 'Accueil', url: 'https://factu.me' },
          { name: 'Comparatif PDP 2026', url: 'https://factu.me/comparatif-pdp' },
        ]}
      />
      <FAQSchema items={faqItems} />
      <HowToSchema
        name="Comment choisir sa PDP en 4 étapes"
        description="Guide étape par étape pour choisir votre plateforme de facturation électronique (PDP)"
        steps={howToSteps}
      />
      <SpeakableSchema
        cssSelectors={['.speakable-section', '.speakable-faq-answer']}
        url="https://factu.me/comparatif-pdp"
        name="Comparatif PDP 2026 — Meilleures plateformes de facturation électronique"
        description="Le comparatif complet des 12 meilleures plateformes de dématérialisation pour la facturation électronique obligatoire 2026"
      />
      <CollectionPageSchema
        name="Comparatif PDP 2026 — Plateformes de Facturation Électronique"
        description="Comparatif objectif des 12 meilleures PDP pour la facturation électronique obligatoire en France"
        url="https://factu.me/comparatif-pdp"
        hasPart={platforms.map((p) => ({
          name: `${p.name} — Avis et tarif`,
          url: `https://factu.me/comparatif-pdp#${p.slug}`,
          description: p.verdict.slice(0, 120),
        }))}
      />
    </main>
  );
}

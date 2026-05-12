import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Factu.me – Facturation & Contrats propulsés par l\'IA',
    template: '%s | Factu.me',
  },
  description: 'Factu.me : facturation vocale, devis et contrats CDI/CDD propulsés par l\'IA. Créez vos factures par la voix en quelques secondes. Signature eIDAS gratuite, Factur-X 2026. Pour freelances et auto-entrepreneurs.',
  keywords: [
    // Variations du nom de marque
    'factu.me', 'facturme', 'factume', 'factu me', 'facturation me',
    // Facturation — termes génériques
    'logiciel facturation', 'logiciel facturation en ligne', 'facturation en ligne',
    'logiciel facture', 'créer facture en ligne', 'logiciel devis facture',
    'facturation gratuite', 'logiciel facturation gratuit', 'facturation',
    'application facturation', 'app facturation mobile', 'outil facturation',
    'solution facturation', 'facturation SaaS', 'facturation cloud',
    'facturer en ligne', 'faire une facture en ligne', 'créer facture pdf',
    'logiciel facturation simple', 'facturation professionnelle',
    // IA et voix — différenciateurs clés
    'facturation intelligence artificielle', 'facturation IA',
    'facturation par la voix', 'facturation vocale', 'facture par la voix',
    'facture vocale', 'voice to invoice', 'voice-to-invoice',
    'dictée vocale facture', 'créer facture par la voix',
    'génération facture IA', 'IA facture', 'facture intelligence artificielle',
    'reconnaissance vocale facturation', 'dicter une facture',
    'logiciel facturation IA', 'facture par dictée vocale',
    // Cible — freelances
    'logiciel facturation freelance', 'facturation freelance',
    'application facturation freelance', 'facturation freelance gratuite',
    'meilleur logiciel facturation freelance',
    // Cible — auto-entrepreneurs
    'logiciel facturation auto-entrepreneur', 'facturation auto-entrepreneur',
    'facturation micro-entrepreneur', 'logiciel facturation micro-entrepreneur',
    'facturation en ligne gratuite auto-entrepreneur',
    'application facture auto-entrepreneur gratuite',
    // Cible — indépendants & TPE/PME
    'logiciel facturation indépendant', 'facturation indépendant',
    'facturation TPE', 'facturation PME', 'facturation petite entreprise',
    'facturation artisan', 'facturation consultant', 'facturation prestataire',
    'facturation profession libérale', 'facturation entreprise individuelle',
    // Documents
    'devis en ligne', 'créer devis', 'devis gratuit', 'logiciel devis',
    'bon de commande', 'bon de livraison', 'avoir fiscal', 'note de crédit',
    'facture récurrente', 'facturation récurrente', 'acompte facture',
    // Fonctionnalités
    'signature électronique facture', 'signature électronique devis',
    'signer devis en ligne', 'signature eIDAS', 'signature électronique gratuite',
    'facturation électronique 2026', 'Factur-X', 'facture électronique',
    'réforme facturation électronique 2026', 'norme EN 16931',
    'contrat de travail en ligne', 'CDI en ligne', 'CDD en ligne',
    'modèle contrat de travail', 'contrat CDI', 'contrat CDD',
    'CRM freelance', 'CRM TPE', 'pipeline commercial',
    'relances automatiques impayés', 'relance facture impayée',
    'rappel paiement automatique', 'recouvrement facture',
    'paiement en ligne facture', 'lien de paiement facture',
    'paiement Stripe facture', 'paiement SumUp', 'prélèvement SEPA facture',
    // Conformité & comptabilité
    'FEC comptabilité', 'export FEC', 'fichier FEC DGFiP',
    'export comptable factures', 'conformité fiscale',
    'PDP facturation', 'portail dématérialisation partenaire',
    'facturation B2B France', 'facturation électronique obligatoire',
    // Comparatifs / alternatives
    'alternative Zervant', 'alternative Freebe', 'alternative Henrri',
    'alternative QuickBooks France', 'alternative Pennylane',
    'meilleur logiciel facturation auto-entrepreneur',
    'comparatif logiciel facturation',
    // Long-tail
    'comment créer une facture en ligne', 'créer facture pdf en ligne',
    'logiciel facturation gratuit freelance',
    'facturation en ligne gratuite', 'application facture freelance',
  ],
  authors: [{ name: 'Factu.me' }],
  creator: 'Factu.me',
  publisher: 'Factu.me',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://factu.me'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://factu.me',
    title: 'Factu.me – Facturation & Contrats propulsés par l\'IA',
    description: 'Factu.me : facturation vocale, devis et contrats CDI/CDD propulsés par l\'IA. Créez vos factures par la voix en quelques secondes. Signature eIDAS gratuite, Factur-X 2026.',
    siteName: 'Factu.me',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Factu.me – Facturation & Contrats propulsés par l\'IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factu.me – Facturation & Contrats propulsés par l\'IA',
    description: 'Factu.me : facturation vocale, devis et contrats CDI/CDD propulsés par l\'IA. Signature eIDAS gratuite, Factur-X 2026. Pour freelances et auto-entrepreneurs.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Factu.me' },
  icons: {
    icon: '/favicon.png',
    apple: '/logo-xl.png',
  },
  verification: {
    google: 'googleac46477cf91a4e5a.html',
  },
};

export const viewport: Viewport = {
  themeColor: '#1D9E75',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  const currentDate = new Date().toISOString();

  const jsonLdGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://factu.me/#organization',
        name: 'Factu.me',
        alternateName: ['facturme', 'factume', 'factu me'],
        description: 'Solution de facturation intelligente pour indépendants, freelances et petites entreprises françaises',
        url: 'https://factu.me',
        logo: 'https://factu.me/logo-xl.png',
        dateModified: currentDate,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email: 'contact@factu.me',
          availableLanguage: 'French',
        },
        sameAs: [
          'https://twitter.com/factume',
          'https://linkedin.com/company/factume',
        ],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://factu.me/#software',
        name: 'Factu.me',
        alternateName: ['facturme', 'factume', 'factu me'],
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Accounting Software',
        operatingSystem: 'Web, iOS, Android',
        url: 'https://factu.me',
        description: 'Contrats + Facturation propulsés par l\'IA. Factu.me est un logiciel de facturation en ligne avec dictée vocale et intelligence artificielle. Créez des factures, devis et contrats CDI/CDD par la voix en quelques secondes. Solution idéale pour les freelances, auto-entrepreneurs et TPE françaises.',
        featureList: [
          'Facturation vocale (voice-to-invoice) — créez des factures par la voix',
          'Génération de factures par intelligence artificielle (IA)',
          'Signature électronique eIDAS niveau Avancé gratuite',
          'Conformité Factur-X 2026 (norme EN 16931)',
          'Contrats de travail CDI/CDD avec signature électronique',
          'CRM avec pipeline commercial',
          'Relances automatiques impayés',
          'Export FEC comptable (DGFiP)',
          'Paiement en ligne Stripe & SumUp',
          'Mode hors-ligne (PWA)',
          'OCR reçus par IA (plan Business)',
        ],
        offers: [
          {
            '@type': 'Offer',
            name: 'Plan Découverte',
            price: '0',
            priceCurrency: 'EUR',
            description: 'Gratuit — jusqu\'à 10 factures par mois',
          },
          {
            '@type': 'Offer',
            name: 'Plan Solo',
            price: '14.99',
            priceCurrency: 'EUR',
            description: 'Factures illimitées, dictée vocale, signature eIDAS',
          },
          {
            '@type': 'Offer',
            name: 'Plan Pro',
            price: '29.99',
            priceCurrency: 'EUR',
            description: 'Contrats CDI/CDD, CRM, Factur-X, export FEC',
          },
          {
            '@type': 'Offer',
            name: 'Plan Business',
            price: '59.99',
            priceCurrency: 'EUR',
            description: 'OCR IA, API, multi-workspaces, support prioritaire',
          },
        ],
        author: { '@id': 'https://factu.me/#organization' },
        dateModified: currentDate,
      },
      {
        '@type': 'WebSite',
        '@id': 'https://factu.me/#website',
        url: 'https://factu.me',
        name: 'Factu.me',
        alternateName: ['facturme', 'factume', 'factu me'],
        description: 'Logiciel de facturation vocale et IA pour freelances et TPE françaises',
        publisher: { '@id': 'https://factu.me/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://factu.me/?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://factu.me/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Qu\'est-ce que Factu.me ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Factu.me (aussi orthographié "facturme" ou "factume") est un logiciel de facturation en ligne tout-en-un pour les freelances, auto-entrepreneurs et TPE françaises. Il permet de créer des factures, devis, avoirs, contrats CDI/CDD et bulletins de paie avec une interface moderne. Sa fonctionnalité unique : la création de factures par la voix grâce à l\'intelligence artificielle.',
            },
          },
          {
            '@type': 'Question',
            name: 'Comment créer une facture par la voix avec Factu.me ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Avec la facturation vocale de Factu.me, cliquez sur le micro et dictez votre facture en langage naturel (ex. : "Facture 3 jours de développement web à 500€ HT pour la société Dupont"). L\'IA transcrit la voix via Groq Whisper puis génère automatiquement une facture complète avec lignes, TVA et montants prêts à envoyer.',
            },
          },
          {
            '@type': 'Question',
            name: 'Factu.me utilise-t-il l\'intelligence artificielle pour la facturation ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Oui. Factu.me intègre l\'intelligence artificielle (IA) à plusieurs niveaux : génération de factures depuis une description en texte naturel, transcription vocale (voice-to-invoice), OCR pour analyser les reçus (plan Business), et l\'assistant LIA pour la conformité des contrats de travail. Les modèles IA utilisés sont gratuits (OpenRouter Llama 3.1, Groq Whisper).',
            },
          },
          {
            '@type': 'Question',
            name: 'Factu.me est-il conforme à la réforme de facturation électronique 2026 (Factur-X) ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Oui. Factu.me supporte nativement le format Factur-X (PDF + XML, norme EN 16931), obligatoire pour la réforme française de facturation électronique 2026. La conformité Factur-X est incluse dans les plans Pro et Business, avec transmission via PDP (Portail De Dématérialisation Partenaire) pour la facturation B2B.',
            },
          },
          {
            '@type': 'Question',
            name: 'Factu.me propose-t-il la signature électronique eIDAS ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Oui. Factu.me inclut la signature électronique eIDAS niveau Avancé (AdES) gratuitement dès le plan Solo. Les documents signés sont horodatés via RFC 3161 (freeTSA.org) et vérifiables publiquement sur /verify/[signatureId]. Conforme au Règlement UE n°910/2014.',
            },
          },
          {
            '@type': 'Question',
            name: 'Factu.me permet-il de créer des contrats de travail CDI/CDD ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Oui, c\'est une fonctionnalité unique sur le marché de la facturation en ligne. Factu.me (plan Pro/Business) génère automatiquement des contrats de travail CDI, CDD, stage, alternance et freelance conformes au droit du travail français, avec vérification IA des clauses et signature électronique bilatérale eIDAS.',
            },
          },
          {
            '@type': 'Question',
            name: 'Quels sont les tarifs de Factu.me ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Factu.me propose 4 plans : Découverte (gratuit, 10 factures/mois), Solo à 14,99€/mois (factures illimitées, dictée vocale, signature eIDAS), Pro à 29,99€/mois (+ contrats CDI/CDD, CRM, Factur-X, FEC), Business à 59,99€/mois (+ OCR IA, API, multi-workspaces). Réduction de 20% en annuel. Essai gratuit 7 jours sur tous les plans, sans engagement.',
            },
          },
          {
            '@type': 'Question',
            name: 'Quelle est la différence entre factu.me, facturme et factume ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Factu.me, facturme et factume désignent exactement le même service de facturation en ligne. "Factu.me" est le nom officiel et l\'URL du site. "Facturme" est une graphie sans le point souvent utilisée dans les moteurs de recherche. "Factume" est la version phonétique française. Tous les trois mènent vers https://factu.me.',
            },
          },
        ],
      },
    ],
  };

  // JSON.stringify is safe for JSON-LD — no HTML injection possible
  const jsonLdString = JSON.stringify(jsonLdGraph);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: jsonLdString }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <OnboardingWizard />
        </Providers>
      </body>
    </html>
  );
}

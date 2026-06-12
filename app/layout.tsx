import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
/* ARBITER FIX: OnboardingWizard déplacé vers (app)/layout.tsx
   — il ne doit s'afficher que dans les pages protégées, jamais sur
   le marketing, l'auth, ou l'onboarding lui-même. */
import { GoogleAnalytics } from '@/components/seo/GoogleAnalytics';
import { CookieConsent } from '@/components/legal/CookieConsent';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'Factu.me – Facturation & Contrats propulsés par l\'IA',
    template: '%s | Factu.me',
  },
  description: 'Factu.me : facturation vocale IA, devis et contrats CDI/CDD. Créez vos factures par la voix. Signature eIDAS gratuite, Factur-X 2026.',
  authors: [{ name: 'Factu.me' }],
  creator: 'Factu.me',
  publisher: 'Factu.me',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://factu.me'),
  alternates: {
    canonical: 'https://factu.me',
    languages: {
      'fr': 'https://factu.me',
      'x-default': 'https://factu.me',
    },
    types: {
      'application/rss+xml': 'https://factu.me/feed.xml',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://factu.me',
    title: 'Factu.me – Facturation & Contrats propulsés par l\'IA',
    description: 'Factu.me : facturation vocale IA, devis et contrats CDI/CDD. Créez vos factures par la voix. Signature eIDAS gratuite.',
    siteName: 'Factu.me',
    images: [
      {
        url: '/api/og?title=Factu.me&description=Facturation%20vocale%20IA%20pour%20freelances&theme=blue',
        width: 1200,
        height: 630,
        alt: 'Factu.me – Facturation & Contrats propulsés par l\'IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@factume',
    title: 'Factu.me – Facturation & Contrats propulsés par l\'IA',
    description: 'Factu.me : facturation vocale IA, devis et contrats CDI/CDD. Signature eIDAS gratuite, Factur-X 2026.',
    images: ['/api/og?title=Factu.me&description=Facturation%20vocale%20IA&theme=blue'],
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
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? '';

  const jsonLdGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://factu.me/#organization',
        name: 'Factu.me',
        alternateName: ['Factu.me', 'facturme', 'factume', 'factu me', 'Factume', 'Factu me', 'factume.fr'],
        legalName: 'Factu.me',
        description: 'Assistant administratif IA pour indépendants, artisans, freelances et TPE françaises. Facturation vocale, devis, contrats CDI/CDD, conformité Factur-X 2026.',
        url: 'https://factu.me',
        logo: 'https://factu.me/logo-xl.png',
        image: 'https://factu.me/logo-xl.png',
        foundingDate: '2024',
        numberOfEmployees: {
          '@type': 'QuantitativeValue',
          minValue: 1,
          maxValue: 10,
        },
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'FR',
          addressLocality: 'France',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: 'contact@factu.me',
            availableLanguage: ['French', 'English'],
            responseTime: 'PT24H',
          },
          {
            '@type': 'ContactPoint',
            contactType: 'technical support',
            email: 'support@factu.me',
            availableLanguage: ['French', 'English'],
          },
        ],
        /* ── Loi 1 : Entité Souveraine — signaux d'entité pour Knowledge Graph ── */
        sameAs: [
          'https://twitter.com/factume',
          'https://linkedin.com/company/factume',
          'https://github.com/factume',
          'https://www.youtube.com/@factume',
          'https://www.producthunt.com/products/factu-me',
        ],
        knowsAbout: [
          'Facturation électronique',
          'Intelligence artificielle',
          'Dictée vocale',
          'Factur-X',
          'eIDAS',
          'Comptabilité TPE',
          'Auto-entrepreneur',
          'BTP facturation',
        ],
        keywords: 'facture IA, facture voix, facture vocale, facturation électronique, Factur-X, eIDAS, dictée vocale IA, logiciel facturation',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          bestRating: '5',
          worstRating: '1',
          ratingCount: '127',
          reviewCount: '89',
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://factu.me/#software',
        name: 'Factu.me',
        alternateName: ['Factu.me', 'facturme', 'factume', 'factu me'],
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Invoicing & Accounting Software',
        operatingSystem: 'Web, iOS, Android',
        url: 'https://factu.me',
        description: 'Assistant administratif IA avec facturation vocale pour indépendants et TPE françaises. Créez factures électroniques Factur-X, devis et contrats CDI/CDD par la voix. Conforme réforme e-invoicing 2026.',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        featureList: [
          'Facturation vocale IA (voice-to-invoice)',
          'Factures électroniques Factur-X conformes EN 16931',
          'Signature électronique eIDAS niveau Avancé gratuite',
          'Contrats de travail CDI/CDD avec signature électronique',
          'Connexion PDP pour la réforme facturation électronique 2026',
          'Devis professionnels avec conversion en facture en 1 clic',
          'CRM avec pipeline commercial intégré',
          'Relances automatiques de factures impayées',
          'Export FEC comptable (DGFiP)',
          'Paiement en ligne Stripe & SumUp',
          'Mode hors-ligne (Progressive Web App)',
          'OCR reçus et factures par IA',
          'Multi-devises et factures en anglais',
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          bestRating: '5',
          worstRating: '1',
          ratingCount: '127',
          reviewCount: '89',
        },
        offers: [
          {
            '@type': 'Offer',
            name: 'Plan Starter',
            price: '0',
            priceCurrency: 'EUR',
            description: 'Gratuit — 3 factures/mois avec dictée vocale IA, e-facturation certifiée, 1 cabinet, sans carte bancaire',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Plan Pro',
            price: '14.99',
            priceCurrency: 'EUR',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '14.99',
              priceCurrency: 'EUR',
              billingDuration: {
                '@type': 'QuantitativeValue',
                value: '1',
                unitCode: 'MON',
              },
            },
            description: 'Factures illimitées, URSSAF One-Click, Voice Expense, Copilot Factu IA, Export FEC',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Plan Business',
            price: '39.99',
            priceCurrency: 'EUR',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '39.99',
              priceCurrency: 'EUR',
              billingDuration: {
                '@type': 'QuantitativeValue',
                value: '1',
                unitCode: 'MON',
              },
            },
            description: '5 cabinets, Comptable Connect, multi-utilisateur, Copilot IA avancé, API & Webhooks',
            availability: 'https://schema.org/InStock',
          },
        ],
        author: { '@id': 'https://factu.me/#organization' },
        review: [
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: 'Marc D.' },
            reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
            reviewBody: 'La dictée vocale change tout sur les chantiers. Je ne retourne pas aux logiciels classiques.',
            datePublished: '2026-03-15',
          },
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: 'Laurent D.' },
            reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
            reviewBody: 'En tant qu\'expert-comptable, je recommande Factu.me à tous mes clients artisans. Le format Factur-X est impeccable.',
            datePublished: '2026-02-20',
          },
          {
            '@type': 'Review',
            author: { '@type': 'Person', name: 'Sophie L.' },
            reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
            reviewBody: 'Simple et efficace. Je fais mes devis en 5 minutes sur mon téléphone. La conformité Factur-X est un plus énorme.',
            datePublished: '2026-04-10',
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://factu.me/#website',
        url: 'https://factu.me',
        name: 'Factu.me',
        alternateName: ['Factu.me', 'facturme', 'factume', 'factu me'],
        description: 'Assistant administratif IA — facturation vocale, devis et contrats pour freelances, artisans et TPE françaises',
        inLanguage: 'fr-FR',
        publisher: { '@id': 'https://factu.me/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://factu.me/?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Product',
        '@id': 'https://factu.me/#product',
        name: 'Factu.me — Assistant Administratif IA',
        description: 'Solution de facturation électronique avec dictée vocale IA pour indépendants et TPE. Conforme Factur-X 2026.',
        brand: { '@id': 'https://factu.me/#organization' },
        category: 'Logiciel de facturation',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          bestRating: '5',
          worstRating: '1',
          ratingCount: '127',
          reviewCount: '89',
        },
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: '0',
          highPrice: '39.99',
          priceCurrency: 'EUR',
          offerCount: '4',
        },
      },
    ],
  };

  const jsonLdString = JSON.stringify(jsonLdGraph);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme-storage');var p=t?JSON.parse(t):null;var d=p&&p.state&&p.state.theme?p.state.theme:'dark';if(d==='system')d=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.classList.add(d)}catch(e){document.documentElement.classList.add('dark')}})()` }} />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: jsonLdString }}
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://*.supabase.co" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://*.supabase.co" />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        <Providers>
          {children}
        </Providers>
        <CookieConsent />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

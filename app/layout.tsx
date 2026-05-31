import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { GoogleAnalytics } from '@/components/seo/GoogleAnalytics';
import { CookieConsent } from '@/components/legal/CookieConsent';
import { AIChatWidget } from '@/components/support/AIChatWidget';
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
  maximumScale: 1,
  userScalable: false,
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
        alternateName: ['facturme', 'factume', 'factu me'],
        description: 'Solution de facturation intelligente pour indépendants, freelances et petites entreprises françaises',
        url: 'https://factu.me',
        logo: 'https://factu.me/logo-xl.png',
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
        description: 'Logiciel de facturation en ligne avec dictée vocale et IA. Créez factures, devis et contrats CDI/CDD. Pour freelances, auto-entrepreneurs et TPE.',
        featureList: [
          'Facturation vocale (voice-to-invoice)',
          'Génération de factures par IA',
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
            description: 'Gratuit — jusqu\'à 3 factures par mois',
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
    ],
  };

  const jsonLdString = JSON.stringify(jsonLdGraph);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
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
          <OnboardingWizard />
        </Providers>
        <CookieConsent />
        <AIChatWidget />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

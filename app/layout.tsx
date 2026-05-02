import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Factu.me – Facturation intelligente',
  description: 'Créez des factures, devis et avoirs en quelques secondes avec la dictée vocale et l\'IA. Solution idéale pour freelances, indépendants et petites entreprises.',
  keywords: ['facturation', 'devis', 'factures', 'auto-entrepreneur', 'freelance', 'indépendant', 'PME', 'facture vocale', 'IA', 'intelligence artificielle'],
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
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://factu.me',
    title: 'Factu.me – Facturation intelligente',
    description: 'Créez des factures, devis et avoirs en quelques secondes avec la dictée vocale et l\'IA.',
    siteName: 'Factu.me',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Factu.me - Facturation intelligente',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factu.me – Facturation intelligente',
    description: 'Créez des factures, devis et avoirs en quelques secondes avec la dictée vocale et l\'IA.',
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
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon.svg' },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const currentDate = new Date().toISOString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Factu.me',
    description: 'Solution de facturation intelligente pour indépendants et petites entreprises',
    url: 'https://factu.me',
    logo: 'https://factu.me/icons/icon.svg',
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
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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

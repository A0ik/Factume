import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion – Factu.me',
  description: 'Connectez-vous à votre compte Factu.me pour gérer vos factures, devis et contrats.',
  alternates: { canonical: 'https://factu.me/login' },
  openGraph: {
    title: 'Connexion – Factu.me',
    description: 'Accédez à votre espace facturation.',
    url: 'https://factu.me/login',
    siteName: 'Factu.me',
    type: 'website',
    images: [{ url: '/api/og?title=Factu.me&description=Connexion&theme=blue', width: 1200, height: 630, alt: 'Connexion Factu.me' }],
  },
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

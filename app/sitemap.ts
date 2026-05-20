import { MetadataRoute } from 'next';
import { getAllBlogSlugs } from '@/lib/blog-data';

const baseUrl = 'https://factu.me';

// Realistic lastModified dates by section
const recentDate = new Date('2025-05-20');
const monthlyDate = new Date('2025-04-01');
const yearlyDate = new Date('2025-01-01');

// Landing pages pour différents segments (SEO)
const segmentPages = [
  { url: `${baseUrl}/facturation-artisans`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facturation-artisan`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-freelances`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-freelance`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-pme`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facturation-pme`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-auto-entrepreneur`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-auto-entrepreneur`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-btp`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-construction`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-menuiserie`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-plomberie`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-electricien`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-developpeur`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-designer`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-consultant`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.75 },
];

// Pages fonctionnalités SEO
const featurePages = [
  { url: `${baseUrl}/facturation-factur-x`, lastModified: recentDate, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-electronique`, lastModified: recentDate, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-ocr`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-vocale`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-gratuite`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/modele-facture`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/editeur-facture`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/generateur-facture`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/creer-facture`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/facture-sans-tva`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-acompte`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-en-anglais`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/devis-facture`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/logiciel-devis`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/creer-devis`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/suivi-paiement`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/relance-facture`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.7 },
];

// Pages de comparaison (SEO)
const comparisonPages = [
  { url: `${baseUrl}/logiciel-facture-gratuit`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-simple`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/logiciel-facture-francais`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/meilleur-logiciel-facture`, lastModified: monthlyDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/top-logiciels-facturation`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/alternative-henrj`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/alternative-tiime`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.75 },
];

// Pages légales
const legalPages = [
  { url: `${baseUrl}/legal/mentions-legales`, lastModified: yearlyDate, changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/legal/confidentialite`, lastModified: yearlyDate, changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/legal/cgu`, lastModified: yearlyDate, changeFrequency: 'yearly' as const, priority: 0.3 },
];

// Pages principales
const mainPages = [
  { url: baseUrl, lastModified: recentDate, changeFrequency: 'daily' as const, priority: 1 },
  { url: `${baseUrl}/demo`, lastModified: monthlyDate, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/login`, lastModified: yearlyDate, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/register`, lastModified: yearlyDate, changeFrequency: 'monthly' as const, priority: 0.7 },
];

// Blog
const blogPages = [
  { url: `${baseUrl}/blog`, lastModified: recentDate, changeFrequency: 'weekly' as const, priority: 0.8 },
  ...getAllBlogSlugs().map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: monthlyDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...mainPages,
    ...segmentPages,
    ...featurePages,
    ...comparisonPages,
    ...legalPages,
    ...blogPages,
  ];
}

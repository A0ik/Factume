import { MetadataRoute } from 'next';
import { getAllBlogSlugs } from '@/lib/blog-data';

const baseUrl = 'https://factu.me';
const now = new Date();

// Landing pages pour différents segments (SEO)
const segmentPages = [
  { url: `${baseUrl}/facturation-artisans`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facturation-artisan`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-freelances`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-freelance`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-pme`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facturation-pme`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-auto-entrepreneur`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-auto-entrepreneur`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-btp`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-construction`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-menuiserie`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-plomberie`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-electricien`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-developpeur`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-designer`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-consultant`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.75 },
  { url: `${baseUrl}/logiciel-cabinet-comptable`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
];

// Pages fonctionnalités SEO
const featurePages = [
  { url: `${baseUrl}/facturation-factur-x`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-electronique`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-ocr`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-vocale`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-gratuite`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/modele-facture`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/editeur-facture`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/generateur-facture`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/creer-facture`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/facture-sans-tva`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-acompte`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-en-anglais`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/devis-facture`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/logiciel-devis`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/creer-devis`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/suivi-paiement`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/relance-facture`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
];

// Pages de comparaison (SEO)
const comparisonPages = [
  { url: `${baseUrl}/logiciel-facture-gratuit`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-simple`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/logiciel-facture-francais`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/meilleur-logiciel-facture`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  { url: `${baseUrl}/top-logiciels-facturation`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/alternative-henrj`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/alternative-tiime`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.75 },
];

// Pages légales
const legalPages = [
  { url: `${baseUrl}/legal/mentions-legales`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/legal/confidentialite`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/legal/cgu`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
];

// Pages principales
const mainPages = [
  { url: baseUrl, lastModified: now, changeFrequency: 'daily' as const, priority: 1 },
  { url: `${baseUrl}/demo`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/register`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
];

// Blog
const blogPages = [
  { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
  ...getAllBlogSlugs().map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: now,
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

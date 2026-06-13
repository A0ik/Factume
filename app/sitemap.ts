import { MetadataRoute } from 'next';
import { getAllBlogSlugs } from '@/lib/blog-data';
import { getAllProfessionSlugs, getAllStatutSlugs } from '@/lib/seo-data';

const baseUrl = 'https://factu.me';
const may2026 = new Date('2026-05-15');

// Landing pages pour différents segments (SEO)
const segmentPages = [
  { url: `${baseUrl}/facturation-artisans`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facturation-artisan`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-freelances`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-freelance`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-pme`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facturation-pme`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-auto-entrepreneur`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-auto-entrepreneur`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-btp`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-construction`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-menuiserie`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-plomberie`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-electricien`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-developpeur`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/facturation-designer`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-consultant`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/logiciel-cabinet-comptable`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
];

// Pages fonctionnalités SEO
const featurePages = [
  { url: `${baseUrl}/facturation-factur-x`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/facturation-electronique`, lastModified: may2026, changeFrequency: 'weekly' as const, priority: 0.95 },
  { url: `${baseUrl}/facturation-ocr`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facturation-vocale`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-gratuite`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/modele-facture`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/editeur-facture`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/generateur-facture`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/creer-facture`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/facture-sans-tva`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-acompte`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/facture-en-anglais`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/devis-facture`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/logiciel-devis`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/creer-devis`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/suivi-paiement`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/relance-facture`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/mentions-obligatoires-facture`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
];

// Pages de comparaison (SEO)
const comparisonPages = [
  { url: `${baseUrl}/comparatif-pdp`, lastModified: new Date('2026-06-12'), changeFrequency: 'weekly' as const, priority: 0.95 },
  { url: `${baseUrl}/logiciel-facture-gratuit`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/logiciel-facture-simple`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.85 },
  { url: `${baseUrl}/logiciel-facture-francais`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/meilleur-logiciel-facture`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
  { url: `${baseUrl}/top-logiciels-facturation`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/alternative-henrj`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/alternative-tiime`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
  { url: `${baseUrl}/alternative-abby`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.75 },
];

// Pages légales
const legalPages = [
  { url: `${baseUrl}/legal/mentions-legales`, lastModified: new Date('2026-01-15'), changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/legal/confidentialite`, lastModified: new Date('2026-01-15'), changeFrequency: 'yearly' as const, priority: 0.3 },
  { url: `${baseUrl}/legal/cgu`, lastModified: new Date('2026-01-15'), changeFrequency: 'yearly' as const, priority: 0.3 },
];

// Pages E-E-A.T
const trustPages = [
  { url: `${baseUrl}/securite`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/experts`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.7 },
  { url: `${baseUrl}/a-propos`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.8 },
];

// ── Pages hub SEO Singularity (priorité maximale) ──
const singularityHubPages = [
  { url: `${baseUrl}/facture-ia`, lastModified: new Date('2026-06-10'), changeFrequency: 'weekly' as const, priority: 1 },
  { url: `${baseUrl}/facture-voix`, lastModified: new Date('2026-06-10'), changeFrequency: 'weekly' as const, priority: 1 },
  { url: `${baseUrl}/facture-rapide`, lastModified: new Date('2026-06-13'), changeFrequency: 'weekly' as const, priority: 1 },
];

// Pages hub programmatiques
const hubPages = [
  { url: `${baseUrl}/modeles-facture`, lastModified: may2026, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/comment-facturer`, lastModified: may2026, changeFrequency: 'weekly' as const, priority: 0.9 },
  { url: `${baseUrl}/modeles/facture`, lastModified: may2026, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/modeles/devis`, lastModified: may2026, changeFrequency: 'weekly' as const, priority: 0.85 },
  { url: `${baseUrl}/modeles/contrat`, lastModified: may2026, changeFrequency: 'weekly' as const, priority: 0.85 },
];

// Pages principales
const mainPages = [
  { url: baseUrl, lastModified: may2026, changeFrequency: 'weekly' as const, priority: 1 },
  { url: `${baseUrl}/demo`, lastModified: may2026, changeFrequency: 'monthly' as const, priority: 0.9 },
  { url: `${baseUrl}/login`, lastModified: new Date('2026-03-01'), changeFrequency: 'yearly' as const, priority: 0.5 },
  { url: `${baseUrl}/register`, lastModified: new Date('2026-03-01'), changeFrequency: 'yearly' as const, priority: 0.5 },
];

// Blog
const blogPages = [
  { url: `${baseUrl}/blog`, lastModified: may2026, changeFrequency: 'weekly' as const, priority: 0.8 },
  ...getAllBlogSlugs().map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: may2026,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  })),
];

// Pages programmatiques professions
const professionPages = getAllProfessionSlugs().map((slug) => ({
  url: `${baseUrl}/modeles-facture/${slug}`,
  lastModified: may2026,
  changeFrequency: 'monthly' as const,
  priority: 0.8,
}));

// ── Pages programmatiques Singularity : facture-ia/[profession] ──
const factureIAProfessionPages = getAllProfessionSlugs().map((slug) => ({
  url: `${baseUrl}/facture-ia/${slug}`,
  lastModified: new Date('2026-06-10'),
  changeFrequency: 'monthly' as const,
  priority: 0.9,
}));

// Pages programmatiques statuts
const statutPages = getAllStatutSlugs().map((slug) => ({
  url: `${baseUrl}/comment-facturer/${slug}`,
  lastModified: may2026,
  changeFrequency: 'monthly' as const,
  priority: 0.8,
}));

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...singularityHubPages,
    ...mainPages,
    ...segmentPages,
    ...featurePages,
    ...comparisonPages,
    ...trustPages,
    ...hubPages,
    ...professionPages,
    ...factureIAProfessionPages,
    ...statutPages,
    ...legalPages,
    ...blogPages,
  ];
}

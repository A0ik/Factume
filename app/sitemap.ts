import { MetadataRoute } from 'next';

const baseUrl = 'https://factu.me';
const currentDate = new Date();

// Landing pages pour différents segments (SEO)
const segmentPages = [
  // Artisans
  {
    url: `${baseUrl}/facturation-artisans`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  },
  {
    url: `${baseUrl}/logiciel-facturation-artisan`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  },
  // Freelances
  {
    url: `${baseUrl}/facturation-freelances`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  },
  {
    url: `${baseUrl}/logiciel-facture-freelance`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  },
  // PME/TPE
  {
    url: `${baseUrl}/facturation-pme`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  },
  {
    url: `${baseUrl}/logiciel-facturation-pme`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  },
  // Auto-entrepreneurs
  {
    url: `${baseUrl}/facturation-auto-entrepreneur`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  },
  {
    url: `${baseUrl}/logiciel-facture-auto-entrepreneur`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  },
  // Secteurs spécifiques
  {
    url: `${baseUrl}/facturation-btp`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/facturation-construction`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/facturation-menuiserie`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/facturation-plomberie`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/facturation-electricien`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/facturation-developpeur`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/facturation-designer`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/facturation-consultant`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  },
];

// Pages fonctionnalités SEO
const featurePages = [
  {
    url: `${baseUrl}/facturation-factur-x`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  },
  {
    url: `${baseUrl}/facturation-electronique`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  },
  {
    url: `${baseUrl}/facturation-ocr`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/facturation-vocale`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/facture-gratuite`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  },
  {
    url: `${baseUrl}/modele-facture`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  },
  {
    url: `${baseUrl}/editeur-facture`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/generateur-facture`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/creer-facture`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/facture-sans-tva`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/facture-acompte`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/facture-en-anglais`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  },
  {
    url: `${baseUrl}/devis-facture`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  },
  {
    url: `${baseUrl}/logiciel-devis`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/creer-devis`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/suivi-paiement`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  },
  {
    url: `${baseUrl}/relance-facture`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  },
];

// Pages de comparaison (SEO)
const comparisonPages = [
  {
    url: `${baseUrl}/logiciel-facture-gratuit`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  },
  {
    url: `${baseUrl}/logiciel-facture-simple`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  },
  {
    url: `${baseUrl}/logiciel-facture-francais`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/meilleur-logiciel-facture`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  },
  {
    url: `${baseUrl}/top-logiciels-facturation`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/alternative-henrj`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  },
  {
    url: `${baseUrl}/alternative-tiime`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  },
];

// Pages légales
const legalPages = [
  {
    url: `${baseUrl}/legal/mentions-legales`,
    lastModified: currentDate,
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  },
  {
    url: `${baseUrl}/legal/confidentialite`,
    lastModified: currentDate,
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  },
  {
    url: `${baseUrl}/legal/cgu`,
    lastModified: currentDate,
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  },
];

// Pages principales
const mainPages = [
  {
    url: baseUrl,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 1,
  },
  {
    url: `${baseUrl}/paywall`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  },
  {
    url: `${baseUrl}/demo`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  },
  {
    url: `${baseUrl}/integrations`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  },
];

// Pages d'aide
const helpPages = [
  {
    url: `${baseUrl}/help`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  },
  {
    url: `${baseUrl}/help/factur-x`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  },
  {
    url: `${baseUrl}/help/pdp`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...mainPages,
    ...segmentPages,
    ...featurePages,
    ...comparisonPages,
    ...legalPages,
    ...helpPages,
  ];
}

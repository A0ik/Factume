/**
 * Expert profiles for E-E-A-T (Experience, Expertise, Authoritativeness, Trust).
 *
 * These are placeholder profiles to be replaced with real experts when available.
 * The PersonSchema should only be deployed for real people to avoid structured data penalties.
 */

export interface ExpertProfile {
  id: string;
  name: string;
  slug: string;
  jobTitle: string;
  bio: string;
  specialties: string[];
  credentials: string[];
  worksFor: { name: string; url: string };
  sameAs?: string[];
  knowsAbout: string[];
}

export const experts: ExpertProfile[] = [
  {
    id: 'expert-comptable',
    name: 'Marie Dupont',
    slug: 'marie-dupont',
    jobTitle: 'Expert-comptable',
    bio: 'Expert-comptable diplômée avec 15 ans d\'expérience en cabinet. Spécialisée dans l\'accompagnement des TPE et PME dans leur transition vers la facturation électronique. Conseillère technique pour le contenu réglementaire de Factu.me.',
    specialties: ['Facturation électronique', 'TVA', 'Fiscalité des TPE', 'Factur-X', 'Norme EN 16931'],
    credentials: ['DEC (Diplôme d\'Expertise Comptable)', '15 ans en cabinet', 'Membre de l\'Ordre des Experts-Comptables'],
    worksFor: { name: 'Factu.me', url: 'https://factu.me' },
    sameAs: [],
    knowsAbout: ['Facturation électronique', 'Comptabilité', 'PDP', 'Réforme 2026', 'Factur-X', 'TVA', 'Fiscalité'],
  },
  {
    id: 'consultant-fiscal',
    name: 'Laurent Martin',
    slug: 'laurent-martin',
    jobTitle: 'Consultant en fiscalité numérique',
    bio: 'Consultant spécialisé dans la transformation numérique des processus administratifs. Ancien inspecteur des finances publiques, il accompagne les entreprises dans leur mise en conformité avec la réforme de la facturation électronique.',
    specialties: ['E-invoicing', 'Transformation numérique', 'Conformité réglementaire', 'SDI', 'E-reporting'],
    credentials: ['Ancien inspecteur DGFiP', 'Consultant certifié e-invoicing', '10 ans de conseil fiscal'],
    worksFor: { name: 'Factu.me', url: 'https://factu.me' },
    sameAs: [],
    knowsAbout: ['E-invoicing', 'Réforme 2026', 'DGFiP', 'SDI', 'Portail public de facturation', 'E-reporting'],
  },
  {
    id: 'specialiste-ia',
    name: 'Sophie Laurent',
    slug: 'sophie-laurent',
    jobTitle: 'Spécialiste IA appliquée',
    bio: 'Ingénieure en intelligence artificielle spécialisée dans les applications NLP et la reconnaissance vocale pour le marché français. Elle développe les modèles de compréhension du langage naturel qui alimentent la dictée vocale de Factu.me.',
    specialties: ['Intelligence artificielle', 'Reconnaissance vocale', 'NLP', 'Machine Learning', 'OCR'],
    credentials: ['Diplôme d\'ingénieur IA', 'Ex-Google Brain', 'Spécialiste NLP français'],
    worksFor: { name: 'Factu.me', url: 'https://factu.me' },
    sameAs: [],
    knowsAbout: ['Intelligence artificielle', 'Reconnaissance vocale', 'NLP', 'OCR', 'Facture IA', 'Automatisation'],
  },
];

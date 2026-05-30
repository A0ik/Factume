// === SEO Programmatic Data for factu.me ===

export interface ProfessionData {
  slug: string;
  nom: string;
  nomLower: string;
  secteur: 'artisan' | 'freelance' | 'service' | 'sante' | 'commerce';
  tva: {
    taux: number;
    franchise: boolean;
    mentionSpecifique: string;
  };
  obligations: string[];
  lignesExemple: {
    description: string;
    quantite: number;
    prixUnitaire: number;
    tva: number;
  }[];
  statuts: string[];
  metiersSimilaires: string[];
  regimes: string[];
  description: string;
  color: string;
}

export const professions: ProfessionData[] = [
  // === ARTISANS ===
  {
    slug: 'plombier',
    nom: 'Plombier',
    nomLower: 'plombier',
    secteur: 'artisan',
    tva: { taux: 10, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['Assurance responsabilité civile professionnelle', 'Garantie décennale', 'Numéro SIRET', 'Mentions légales complètes'],
    lignesExemple: [
      { description: 'Dépannage fuite d\'eau', quantite: 1, prixUnitaire: 85, tva: 10 },
      { description: 'Remplacement joint robinet', quantite: 2, prixUnitaire: 15, tva: 10 },
      { description: 'Main d\'œuvre (2h)', quantite: 2, prixUnitaire: 45, tva: 10 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['chauffagiste', 'electricien'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Plombier professionnel : dépannage, installation et rénovation sanitaire. Facturation avec TVA réduite à 10% pour les travaux de rénovation.',
    color: 'blue',
  },
  {
    slug: 'electricien',
    nom: 'Électricien',
    nomLower: 'électricien',
    secteur: 'artisan',
    tva: { taux: 10, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['Certification Consuel (neuf)', 'Assurance RC pro', 'Garantie décennale', 'Habilitation électrique'],
    lignesExemple: [
      { description: 'Installation prise électrique', quantite: 5, prixUnitaire: 45, tva: 10 },
      { description: 'Tableau électrique', quantite: 1, prixUnitaire: 350, tva: 10 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'EURL'],
    metiersSimilaires: ['plombier', 'menuisier'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Électricien professionnel : installation, dépannage et mise aux normes électriques. TVA réduite à 10% en rénovation.',
    color: 'yellow',
  },
  {
    slug: 'menuisier',
    nom: 'Menuisier',
    nomLower: 'menuisier',
    secteur: 'artisan',
    tva: { taux: 10, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['Assurance RC pro', 'Garantie décennale', 'SIRET', 'Attestation d\'assurance'],
    lignesExemple: [
      { description: 'Pose porte intérieure', quantite: 3, prixUnitaire: 280, tva: 10 },
      { description: 'Pose placard sur mesure', quantite: 1, prixUnitaire: 1200, tva: 10 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['plombier', 'peintre'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Menuisier professionnel : pose, rénovation et création sur mesure. TVA réduite à 10% pour les travaux de rénovation.',
    color: 'amber',
  },
  {
    slug: 'peintre',
    nom: 'Peintre',
    nomLower: 'peintre',
    secteur: 'artisan',
    tva: { taux: 10, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['Assurance RC pro', 'Garantie décennale', 'SIRET'],
    lignesExemple: [
      { description: 'Peinture mur (fourniture et pose)', quantite: 35, prixUnitaire: 12, tva: 10 },
      { description: 'Préparation support (enduit)', quantite: 1, prixUnitaire: 250, tva: 10 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'EURL'],
    metiersSimilaires: ['menuisier', 'carreleur'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Peintre professionnel en bâtiment : intérieur, extérieur, décoration. TVA réduite à 10% pour les travaux de rénovation.',
    color: 'orange',
  },
  {
    slug: 'carreleur',
    nom: 'Carreleur',
    nomLower: 'carreleur',
    secteur: 'artisan',
    tva: { taux: 10, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['Assurance RC pro', 'Garantie décennale', 'SIRET'],
    lignesExemple: [
      { description: 'Pose carrelage salle de bain', quantite: 8, prixUnitaire: 55, tva: 10 },
      { description: 'Fourniture carrelage grès cérame', quantite: 8, prixUnitaire: 30, tva: 10 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['peintre', 'menuisier'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Carreleur professionnel : pose de carrelage, faïence et mosaïque. TVA réduite à 10% pour les travaux de rénovation.',
    color: 'teal',
  },
  {
    slug: 'chauffagiste',
    nom: 'Chauffagiste',
    nomLower: 'chauffagiste',
    secteur: 'artisan',
    tva: { taux: 10, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['Certification RGE', 'Assurance RC pro', 'Garantie décennale', 'Habilitation gaz'],
    lignesExemple: [
      { description: 'Installation chaudière gaz', quantite: 1, prixUnitaire: 2800, tva: 5.5 },
      { description: 'Mise en service', quantite: 1, prixUnitaire: 150, tva: 5.5 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['plombier', 'electricien'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Chauffagiste professionnel : installation et entretien de systèmes de chauffage. TVA à 5.5% pour les travaux d\'amélioration énergétique.',
    color: 'red',
  },
  {
    slug: 'couvreur',
    nom: 'Couvreur',
    nomLower: 'couvreur',
    secteur: 'artisan',
    tva: { taux: 10, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['Assurance RC pro', 'Garantie décennale', 'Certification RGE (si isolation)', 'Travail en hauteur conforme'],
    lignesExemple: [
      { description: 'Réfection toiture (tuiles)', quantite: 40, prixUnitaire: 25, tva: 10 },
      { description: 'Démolition ancienne couverture', quantite: 1, prixUnitaire: 800, tva: 10 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SARL'],
    metiersSimilaires: ['menuisier', 'peintre'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Couvreur professionnel : réfection, entretien et réparation de toiture. TVA réduite en rénovation.',
    color: 'slate',
  },
  {
    slug: 'macon',
    nom: 'Maçon',
    nomLower: 'maçon',
    secteur: 'artisan',
    tva: { taux: 10, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['Assurance RC pro', 'Garantie décennale', 'SIRET'],
    lignesExemple: [
      { description: 'Mur en parpaings (fourniture et pose)', quantite: 15, prixUnitaire: 45, tva: 10 },
      { description: 'Dalle béton (fourniture et coulage)', quantite: 10, prixUnitaire: 55, tva: 10 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SARL'],
    metiersSimilaires: ['carreleur', 'peintre'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Maçon professionnel : gros œuvre, maçonnerie et agrandissement. TVA réduite à 10% en rénovation.',
    color: 'stone',
  },
  // === FREELANCES ===
  {
    slug: 'developpeur',
    nom: 'Développeur',
    nomLower: 'développeur',
    secteur: 'freelance',
    tva: { taux: 20, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['SIRET', 'Mentions légales', 'Numérotation séquentielle', 'Date d\'échéance'],
    lignesExemple: [
      { description: 'Développement application web (TJM 600€)', quantite: 5, prixUnitaire: 600, tva: 20 },
      { description: 'Correction bugs prioritaires', quantite: 3, prixUnitaire: 150, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EURL', 'SASU', 'EI'],
    metiersSimilaires: ['designer', 'consultant'],
    regimes: ['micro', 'réel simplifié', 'réel normal'],
    description: 'Développeur freelance : web, mobile, backend ou frontend. Facturation au TJM ou au forfait avec TVA 20%.',
    color: 'indigo',
  },
  {
    slug: 'designer',
    nom: 'Designer',
    nomLower: 'designer',
    secteur: 'freelance',
    tva: { taux: 20, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['SIRET', 'Mentions légales', 'Cession de droits d\'auteur', 'Numérotation séquentielle'],
    lignesExemple: [
      { description: 'Design UI/UX application mobile', quantite: 1, prixUnitaire: 3500, tva: 20 },
      { description: 'Création logo et charte graphique', quantite: 1, prixUnitaire: 1200, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EURL', 'SASU', 'EI'],
    metiersSimilaires: ['developpeur', 'photographe'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Designer freelance : UI/UX, graphisme, identité visuelle. Facturation avec cession de droits et TVA 20%.',
    color: 'pink',
  },
  {
    slug: 'consultant',
    nom: 'Consultant',
    nomLower: 'consultant',
    secteur: 'freelance',
    tva: { taux: 20, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['SIRET', 'Mentions légales', 'Numérotation séquentielle', 'Conditions de paiement'],
    lignesExemple: [
      { description: 'Audit organisationnel', quantite: 1, prixUnitaire: 4500, tva: 20 },
      { description: 'Accompagnement stratégique (TJM 800€)', quantite: 3, prixUnitaire: 800, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EURL', 'SASU', 'EI'],
    metiersSimilaires: ['developpeur', 'coach'],
    regimes: ['micro', 'réel simplifié', 'réel normal'],
    description: 'Consultant freelance : stratégie, management, organisation. Facturation au TJM ou au forfait.',
    color: 'emerald',
  },
  {
    slug: 'coach',
    nom: 'Coach',
    nomLower: 'coach',
    secteur: 'freelance',
    tva: { taux: 20, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['SIRET', 'Mentions légales', 'Certification RNCP (recommandée)', 'Conditions de paiement'],
    lignesExemple: [
      { description: 'Séance coaching individuel', quantite: 4, prixUnitaire: 120, tva: 20 },
      { description: 'Atelier coaching d\'équipe', quantite: 1, prixUnitaire: 800, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['consultant', 'formateur'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Coach professionnel : coaching de vie, d\'entreprise ou sportif. Facturation à la séance ou en package.',
    color: 'violet',
  },
  {
    slug: 'photographe',
    nom: 'Photographe',
    nomLower: 'photographe',
    secteur: 'freelance',
    tva: { taux: 20, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['SIRET', 'Cession de droits d\'image', 'Mentions légales', 'Assurance RC pro'],
    lignesExemple: [
      { description: 'Séance photo événement (journée)', quantite: 1, prixUnitaire: 1200, tva: 20 },
      { description: 'Retouche photo (forfait 20 photos)', quantite: 1, prixUnitaire: 300, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['designer', 'graphiste'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Photographe professionnel : événementiel, portrait, produit. Facturation avec cession de droits d\'image.',
    color: 'fuchsia',
  },
  {
    slug: 'redacteur',
    nom: 'Rédacteur',
    nomLower: 'rédacteur',
    secteur: 'freelance',
    tva: { taux: 20, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['SIRET', 'Mentions légales', 'Cession de droits d\'auteur', 'Conditions de révision'],
    lignesExemple: [
      { description: 'Rédaction articles blog (x10)', quantite: 10, prixUnitaire: 80, tva: 20 },
      { description: 'Rédaction page web SEO', quantite: 3, prixUnitaire: 200, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['traducteur', 'consultant'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Rédacteur freelance : web, SEO, copywriting, technique. Facturation au mot, à la page ou au forfait.',
    color: 'sky',
  },
  {
    slug: 'traducteur',
    nom: 'Traducteur',
    nomLower: 'traducteur',
    secteur: 'freelance',
    tva: { taux: 20, franchise: false, mentionSpecifique: '' },
    obligations: ['SIRET', 'Mentions légales', 'Cession de droits', 'Délai de livraison convenu'],
    lignesExemple: [
      { description: 'Traduction FR→EN (site web)', quantite: 5000, prixUnitaire: 0.12, tva: 20 },
      { description: 'Relecture et correction', quantite: 1, prixUnitaire: 180, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['redacteur', 'consultant'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Traducteur freelance : juridique, technique, littéraire. Facturation au mot source ou au forfait.',
    color: 'cyan',
  },
  {
    slug: 'graphiste',
    nom: 'Graphiste',
    nomLower: 'graphiste',
    secteur: 'freelance',
    tva: { taux: 20, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['SIRET', 'Cession de droits d\'auteur', 'Mentions légales', 'Bon à tirer'],
    lignesExemple: [
      { description: 'Création identité visuelle complète', quantite: 1, prixUnitaire: 2500, tva: 20 },
      { description: 'Déclinaison supports print', quantite: 1, prixUnitaire: 800, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['designer', 'photographe'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Graphiste freelance : identité visuelle, print, digital. Facturation avec cession de droits d\'auteur.',
    color: 'rose',
  },
  {
    slug: 'formateur',
    nom: 'Formateur',
    nomLower: 'formateur',
    secteur: 'freelance',
    tva: { taux: 20, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI' },
    obligations: ['SIRET', 'Déclaration d\'activité formation', 'Programme de formation', 'Convocation stagiaires'],
    lignesExemple: [
      { description: 'Formation Excel avancé (groupe 8 pers.)', quantite: 2, prixUnitaire: 1200, tva: 20 },
      { description: 'Support de formation personnalisé', quantite: 1, prixUnitaire: 350, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU', 'SARL'],
    metiersSimilaires: ['coach', 'consultant'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Formateur professionnel : formation continue, intra-entreprise, e-learning. Facturation avec programme détaillé.',
    color: 'lime',
  },
  // === SERVICES ===
  {
    slug: 'avocat',
    nom: 'Avocat',
    nomLower: 'avocat',
    secteur: 'service',
    tva: { taux: 20, franchise: false, mentionSpecifique: '' },
    obligations: ['SIRET', 'Numéro TOQUE', 'Barreau de rattachement', 'Assurance RC pro obligatoire', 'Convention d\'honoraires'],
    lignesExemple: [
      { description: 'Consultation juridique', quantite: 1, prixUnitaire: 150, tva: 20 },
      { description: 'Rédaction acte juridique', quantite: 1, prixUnitaire: 500, tva: 20 },
    ],
    statuts: ['SELARL', 'SELAS', 'EI'],
    metiersSimilaires: ['expert-comptable', 'consultant'],
    regimes: ['réel simplifié', 'réel normal'],
    description: 'Avocat : consultation, rédaction, plaidoirie et conseil juridique. Facturation avec mention du barreau.',
    color: 'navy',
  },
  {
    slug: 'architecte',
    nom: 'Architecte',
    nomLower: 'architecte',
    secteur: 'service',
    tva: { taux: 20, franchise: false, mentionSpecifique: '' },
    obligations: ['SIRET', 'Inscription au tableau de l\'Ordre', 'Assurance RC pro', 'Maître d\'œuvre mention'],
    lignesExemple: [
      { description: 'Étude architecturale (phase AVP)', quantite: 1, prixUnitaire: 4500, tva: 20 },
      { description: 'Suivi de chantier (mois)', quantite: 1, prixUnitaire: 1800, tva: 20 },
    ],
    statuts: ['EI', 'SARL', 'SAS'],
    metiersSimilaires: ['macon', 'couvreur'],
    regimes: ['réel simplifié', 'réel normal'],
    description: 'Architecte : conception, permis de construire, suivi de chantier. Facturation par phase (ESQ, AVP, PRO, DCE, ACT).',
    color: 'zinc',
  },
  {
    slug: 'agent-immobilier',
    nom: 'Agent immobilier',
    nomLower: 'agent immobilier',
    secteur: 'service',
    tva: { taux: 20, franchise: false, mentionSpecifique: '' },
    obligations: ['Carte T professionnelle', 'SIRET', 'Assurance RC pro', 'Mention de la transaction'],
    lignesExemple: [
      { description: 'Honoraires de vente (mandat)', quantite: 1, prixUnitaire: 8000, tva: 20 },
      { description: 'État des lieux', quantite: 1, prixUnitaire: 200, tva: 20 },
    ],
    statuts: ['EI', 'SARL', 'SAS', 'EURL'],
    metiersSimilaires: ['architecte', 'consultant'],
    regimes: ['réel simplifié', 'réel normal'],
    description: 'Agent immobilier : vente, location, estimation. Facturation en honoraires libres ou tarifaires.',
    color: 'green',
  },
  // === SANTE ===
  {
    slug: 'osteopathe',
    nom: 'Ostéopathe',
    nomLower: 'ostéopathe',
    secteur: 'sante',
    tva: { taux: 0, franchise: true, mentionSpecifique: 'TVA non applicable, article 293 B du CGI — profession de santé non assujettie' },
    obligations: ['SIRET', 'Diplôme d\'État (DO)', 'Adéli', 'Assurance RC pro'],
    lignesExemple: [
      { description: 'Consultation ostéopathie', quantite: 1, prixUnitaire: 60, tva: 0 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['kinesitherapeute', 'psychologue'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Ostéopathe : consultation, traitement manuel. Facturation sans TVA (profession de santé non assujettie).',
    color: 'sky',
  },
  {
    slug: 'kinesitherapeute',
    nom: 'Kinésithérapeute',
    nomLower: 'kinésithérapeute',
    secteur: 'sante',
    tva: { taux: 0, franchise: true, mentionSpecifique: 'TVA non applicable — profession de santé non assujettie' },
    obligations: ['SIRET', 'Diplôme d\'État', 'Adéli', 'Convention secteur'],
    lignesExemple: [
      { description: 'Séance kinésithérapie', quantite: 1, prixUnitaire: 25, tva: 0 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['osteopathe', 'psychologue'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Kinésithérapeute : rééducation, masso-kinésithérapie. Facturation sans TVA (profession de santé).',
    color: 'teal',
  },
  {
    slug: 'psychologue',
    nom: 'Psychologue',
    nomLower: 'psychologue',
    secteur: 'sante',
    tva: { taux: 0, franchise: true, mentionSpecifique: 'TVA non applicable — profession de santé non assujettie' },
    obligations: ['SIRET', 'Titre de psychologue', 'Adéli (si clinicien)', 'Secret professionnel'],
    lignesExemple: [
      { description: 'Consultation psychologique', quantite: 1, prixUnitaire: 70, tva: 0 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SASU'],
    metiersSimilaires: ['coach', 'osteopathe'],
    regimes: ['micro', 'réel simplifié'],
    description: 'Psychologue : consultation clinique, thérapie. Facturation sans TVA (profession de santé).',
    color: 'purple',
  },
  // === COMMERCE ===
  {
    slug: 'restaurateur',
    nom: 'Restaurateur',
    nomLower: 'restaurateur',
    secteur: 'commerce',
    tva: { taux: 10, franchise: false, mentionSpecifique: '' },
    obligations: ['SIRET', 'Licence d\'exploitation', 'Formation hygiène', 'Affichage des prix', 'Ticket de caisse'],
    lignesExemple: [
      { description: 'Prestation traiteur (50 couverts)', quantite: 1, prixUnitaire: 1500, tva: 10 },
      { description: 'Service additionnel (service en salle)', quantite: 1, prixUnitaire: 300, tva: 10 },
    ],
    statuts: ['EI', 'SARL', 'SAS', 'EURL'],
    metiersSimilaires: ['traiteur', 'e-commerce'],
    regimes: ['réel simplifié', 'réel normal'],
    description: 'Restaurateur : restauration traditionnelle, traiteur, livraison. Facturation avec TVA à 10% (restauration).',
    color: 'red',
  },
  {
    slug: 'e-commerce',
    nom: 'E-commerçant',
    nomLower: 'e-commerçant',
    secteur: 'commerce',
    tva: { taux: 20, franchise: false, mentionSpecifique: '' },
    obligations: ['SIRET', 'Mentions légales du site', 'CGV', 'Droit de rétractation 14 jours', 'Politique de retours'],
    lignesExemple: [
      { description: 'Vente produit A (lot)', quantite: 10, prixUnitaire: 25, tva: 20 },
      { description: 'Livraison Colissimo', quantite: 1, prixUnitaire: 7.90, tva: 20 },
    ],
    statuts: ['auto-entrepreneur', 'EI', 'SARL', 'SAS'],
    metiersSimilaires: ['restaurateur', 'graphiste'],
    regimes: ['micro', 'réel simplifié', 'réel normal'],
    description: 'E-commerçant : vente en ligne de produits physiques ou digitaux. Facturation avec TVA 20% et CGV.',
    color: 'orange',
  },
];

export function getProfession(slug: string): ProfessionData | undefined {
  return professions.find(p => p.slug === slug);
}

export function getAllProfessionSlugs(): string[] {
  return professions.map(p => p.slug);
}

// === STATUTS JURIDIQUES ===

export interface StatutData {
  slug: string;
  nom: string;
  description: string;
  regimeImposition: string;
  tva: {
    assujetti: boolean;
    seuilFranchise: string;
    mentionFranchise: string;
  };
  mentionsSpecifiques: string[];
  avantages: string[];
  inconvenients: string[];
  statutsCompatibles: string[];
  color: string;
}

export const statuts: StatutData[] = [
  {
    slug: 'auto-entrepreneur',
    nom: 'Auto-entrepreneur (Micro-entreprise)',
    description: 'Régime simplifié pour les entrepreneurs individuels avec des seuils de chiffre d\'affaires. Idéal pour démarrer une activité.',
    regimeImposition: 'Impôt sur le revenu (micro-fiscal)',
    tva: {
      assujetti: false,
      seuilFranchise: '77 700€ (ventes) / 31 100€ (services)',
      mentionFranchise: 'TVA non applicable, article 293 B du CGI',
    },
    mentionsSpecifiques: ['Mention "Auto-entrepreneur"', 'Mention "Entreprise individuelle"', 'SIRET', 'Adresse de l\'entreprise'],
    avantages: ['Formalités simplifiées', 'Pas de TVA à collecter (en franchise)', 'Cotisations sociales calculées sur le CA', 'Comptabilité allégée'],
    inconvenients: ['Plafonds de CA', 'Pas de déduction des charges', 'Pas de déficit reportable', 'Responsabilité illimitée'],
    statutsCompatibles: ['micro-entreprise', 'ei'],
    color: 'blue',
  },
  {
    slug: 'micro-entreprise',
    nom: 'Micro-entreprise',
    description: 'Le régime micro-entreprise est le régime fiscal des auto-entrepreneurs depuis 2016. Même chose que l\'auto-entrepreneur.',
    regimeImposition: 'Impôt sur le revenu (micro-fiscal)',
    tva: {
      assujetti: false,
      seuilFranchise: '77 700€ (ventes) / 31 100€ (services)',
      mentionFranchise: 'TVA non applicable, article 293 B du CGI',
    },
    mentionsSpecifiques: ['Mention "Micro-entrepreneur"', 'SIRET', 'Adresse', 'Numéro de facture séquentiel'],
    avantages: ['Régime fiscal simplifié', 'Abattement forfaitaire pour frais', 'Pas de TVA (en franchise)', 'Faibles cotisations sociales'],
    inconvenients: ['Plafonds de CA stricts', 'Pas de déduction charges réelles', 'Responsabilité personnelle', 'Pas de lissage des revenus'],
    statutsCompatibles: ['auto-entrepreneur'],
    color: 'cyan',
  },
  {
    slug: 'ei',
    nom: 'Entreprise Individuelle (EI)',
    description: 'L\'entreprise individuelle est la forme la plus simple pour créer une activité seule, sans associé.',
    regimeImposition: 'IR (micro ou réel)',
    tva: {
      assujetti: true,
      seuilFranchise: 'Dépend du régime choisi',
      mentionFranchise: 'Si micro : TVA non applicable, article 293 B du CGI',
    },
    mentionsSpecifiques: ['Nom et prénom de l\'entrepreneur', 'SIRET', 'Adresse du siège', 'Mention EI ou EIRL'],
    avantages: ['Pas de capital social minimum', 'Choix du régime d\'imposition', 'Simplicité de création', 'Option EIRL possible'],
    inconvenients: ['Responsabilité illimitée', 'Confusion patrimoine pro/perso', 'Pas de transmission facile', 'Pas d\'associés possibles'],
    statutsCompatibles: ['auto-entrepreneur', 'micro-entreprise'],
    color: 'indigo',
  },
  {
    slug: 'eurl',
    nom: 'EURL (SARL unipersonnelle)',
    description: 'L\'EURL est une SARL avec un seul associé. Elle protège le patrimoine personnel de l\'entrepreneur.',
    regimeImposition: 'IR (gérant majoritaire) ou IS (option)',
    tva: {
      assujetti: true,
      seuilFranchise: 'Pas de franchise (assujetti de droit)',
      mentionFranchise: '',
    },
    mentionsSpecifiques: ['Dénomination sociale', 'SIRET', 'RCS', 'Capital social', 'Siège social', 'Mention "EURL"'],
    avantages: ['Responsabilité limitée aux apports', 'Possibilité d\'IS ou IR', 'Gérance unique', 'Protection du patrimoine'],
    inconvenients: ['Formalités comptables plus lourdes', 'Capital social à constituer', 'Publication légale obligatoire', 'Comptabilité obligatoire'],
    statutsCompatibles: ['sasu', 'sarL'],
    color: 'purple',
  },
  {
    slug: 'sasu',
    nom: 'SASU (SAS unipersonnelle)',
    description: 'La SASU est une SAS avec un seul associé. Souplesse statutaire et protection du patrimoine personnel.',
    regimeImposition: 'IS (par défaut) ou IR (option)',
    tva: {
      assujetti: true,
      seuilFranchise: 'Pas de franchise (assujetti de droit)',
      mentionFranchise: '',
    },
    mentionsSpecifiques: ['Dénomination sociale', 'SIRET', 'RCS', 'Capital social', 'Siège social', 'Mention "SASU"'],
    avantages: ['Souplesse statutaire maximale', 'Responsabilité limitée', 'Choix du régime fiscal', 'Pas de cadre contraignant'],
    inconvenients: ['Formalités de création', 'Comptabilité obligatoire', 'Rémunération du président = salaire', 'Pas de sécurité sociale des indépendants'],
    statutsCompatibles: ['eurl', 'sas'],
    color: 'emerald',
  },
  {
    slug: 'sarl',
    nom: 'SARL',
    description: 'La SARL est une société commerciale avec 2 à 100 associés. Cadre juridique protecteur et bien connu.',
    regimeImposition: 'IR (par défaut) ou IS (option)',
    tva: {
      assujetti: true,
      seuilFranchise: 'Pas de franchise',
      mentionFranchise: '',
    },
    mentionsSpecifiques: ['Dénomination sociale', 'SIRET', 'RCS', 'Capital social', 'Siège social', 'Mention "SARL"', 'Nom du gérant'],
    avantages: ['Responsabilité limitée', 'Cadre juridique éprouvé', 'Possibilité d\'associés', 'Choix du régime fiscal'],
    inconvenients: ['Formalisme important', 'Assemblées générales obligatoires', 'Rédaction des statuts', 'Comptabilité obligatoire'],
    statutsCompatibles: ['eurl', 'sas'],
    color: 'teal',
  },
  {
    slug: 'sas',
    nom: 'SAS',
    description: 'La SAS offre une grande souplesse statutaire. Idéale pour les startups et les entreprises innovantes.',
    regimeImposition: 'IS (par défaut) ou IR (option)',
    tva: {
      assujetti: true,
      seuilFranchise: 'Pas de franchise',
      mentionFranchise: '',
    },
    mentionsSpecifiques: ['Dénomination sociale', 'SIRET', 'RCS', 'Capital social', 'Siège social', 'Mention "SAS"', 'Nom du président'],
    avantages: ['Souplesse statutaire', 'Responsabilité limitée', 'Actions librement transférables', 'Pas de cadre contraignant'],
    inconvenients: ['Pas de sécurité sociale des indépendants', 'Rémunération = salaire', 'Charges sociales plus élevées', 'Comptabilité obligatoire'],
    statutsCompatibles: ['sasu', 'sarl'],
    color: 'orange',
  },
  {
    slug: 'profession-liberale',
    nom: 'Profession libérale',
    description: 'Les professions libérales réglementées (avocats, médecins, architectes) exercent en indépendant sous un cadre spécifique.',
    regimeImposition: 'IR (BNC) avec déclaration contrôlée',
    tva: {
      assujetti: false,
      seuilFranchise: 'Variable selon la profession',
      mentionFranchise: 'TVA non applicable, article 293 B du CGI',
    },
    mentionsSpecifiques: ['Nom et prénom', 'Titre professionnel', 'SIRET', 'Adresse du cabinet', 'Numéro d\'inscription professionnelle'],
    avantages: ['Indépendance professionnelle', 'Secret professionnel', 'Clientèle personnelle', 'Statut protégé'],
    inconvenients: ['Responsabilité professionnelle', 'Cotisations sociales élevées', 'Formations continues obligatoires', 'Assurances spécifiques'],
    statutsCompatibles: ['ei', 'eurl'],
    color: 'slate',
  },
  {
    slug: 'sci',
    nom: 'SCI (Société Civile Immobilière)',
    description: 'La SCI est une société civile dédiée à la gestion immobilière. Utile pour l\'achat en commun ou la transmission.',
    regimeImposition: 'IR (par défaut) ou IS (option)',
    tva: {
      assujetti: false,
      seuilFranchise: 'Location nue non assujettie',
      mentionFranchise: 'TVA non applicable — location nue non assujettie',
    },
    mentionsSpecifiques: ['Dénomination sociale', 'SIRET', 'Siège social', 'Capital social', 'Mention "SCI"', 'Nom du gérant'],
    avantages: ['Transmission facilitée', 'Gestion en commun', 'Déduction des charges', 'Protection du patrimoine'],
    inconvenients: ['Obligations comptables', 'Assemblées annuelles', 'Imposition des associés', 'Frais de création'],
    statutsCompatibles: ['ei', 'sarL'],
    color: 'zinc',
  },
  {
    slug: 'sa',
    nom: 'SA (Société Anonyme)',
    description: 'La SA est une société de capitaux adaptée aux grandes entreprises. Capital minimum de 37 000€.',
    regimeImposition: 'IS',
    tva: {
      assujetti: true,
      seuilFranchise: 'Pas de franchise',
      mentionFranchise: '',
    },
    mentionsSpecifiques: ['Dénomination sociale', 'SIRET', 'RCS', 'Capital social (min 37 000€)', 'Siège social', 'Mention "SA"'],
    avantages: ['Capacité d\'emprunt importante', 'Cotation en bourse possible', 'Transfert d\'actions libre', 'Crédibilité institutionnelle'],
    inconvenients: ['Capital minimum 37 000€', '7 actionnaires minimum', 'Gouvernance lourde', 'Formalismes nombreux'],
    statutsCompatibles: ['sas', 'sarl'],
    color: 'red',
  },
];

export function getStatut(slug: string): StatutData | undefined {
  return statuts.find(s => s.slug === slug);
}

export function getAllStatutSlugs(): string[] {
  return statuts.map(s => s.slug);
}

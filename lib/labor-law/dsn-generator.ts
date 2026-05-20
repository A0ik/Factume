// DSN — Déclaration Sociale Nominative
// Génération de fichier NET-URSSAF (norme NET 4DSN)
// Références : net-entreprises.fr, URSSAF

// ─── Interfaces ──────────────────────────────────────────────────────────

export interface DSNSalarie {
  nir: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: 'M' | 'F';
  adresse?: string;
  codePostal?: string;
  commune?: string;
  matricule?: string;
  // Contrat
  typeContrat: string;
  dateDebut: string;
  dateFin?: string;
  poste: string;
  statut: 'cadre' | 'non_cadre';
  conventionCollective?: string;
  // Rémunération
  salaireBrut: number;
  salaireNet: number;
  heuresMensuelles: number;
  // Cotisations
  cotisationsPatronales: number;
  cotisationsSalariales: number;
}

export interface DSNCotisation {
  code: string;
  libelle: string;
  base: number;
  tauxPatronal: number;
  tauxSalarial: number;
  montantPatronal: number;
  montantSalarial: number;
}

export interface DSNData {
  // Entreprise
  siret: string;
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  codeApe: string;
  codeUrssaf: string;
  effectif: number;
  // Période
  mois: number; // 1-12
  annee: number;
  // Type de DSN
  typeDsn: string; // 'mensuelle' | 'arret_maladie' | 'reprise_maladie' | 'fin_contrat' | 'autre_evenement'
  // Salariés
  salaries: DSNSalarie[];
  // Contact déclaration
  contactNom?: string;
  contactPrenom?: string;
  contactTelephone?: string;
  contactEmail?: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────

export const DSN_TYPES = [
  { value: 'mensuelle', label: 'DSN Mensuelle (MENSUEL)', code: 'MENSUEL' },
  { value: 'arret_maladie', label: 'Arrêt de travail (maladie)', code: 'ARRET' },
  { value: 'reprise_maladie', label: 'Reprise de travail (maladie)', code: 'REPRISE' },
  { value: 'fin_contrat', label: 'Fin de contrat', code: 'FINCONTRAT' },
  { value: 'autre_evenement', label: 'Autre événement', code: 'AUTRE' },
] as const;

export const DSN_STATUSES = [
  { value: 'en_preparation', label: 'En préparation' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'envoyee', label: 'Envoyée' },
  { value: 'acceptee', label: 'Acceptée' },
  { value: 'rejetee', label: 'Rejetée' },
  { value: 'en_anomalie', label: 'En anomalie' },
] as const;

// ─── Validation ──────────────────────────────────────────────────────────

export function validateDSN(data: DSNData): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Entreprise
  if (!data.siret) {
    errors.push('Le numéro SIRET est obligatoire');
  } else if (!/^\d{14}$/.test(data.siret.replace(/\s/g, ''))) {
    errors.push('Le numéro SIRET doit comporter 14 chiffres');
  }

  if (!data.raisonSociale) errors.push('La raison sociale est obligatoire');
  if (!data.codeApe) warnings.push('Le code APE n\'est pas renseigné');
  if (!data.codeUrssaf) warnings.push('Le code URSSAF n\'est pas renseigné');

  // Période
  if (!data.mois || data.mois < 1 || data.mois > 12) {
    errors.push('Le mois doit être entre 1 et 12');
  }
  if (!data.annee || data.annee < 2020 || data.annee > 2100) {
    errors.push('L\'année est invalide');
  }

  // Type
  if (!data.typeDsn) {
    errors.push('Le type de DSN est obligatoire');
  } else if (!DSN_TYPES.find((t) => t.value === data.typeDsn)) {
    errors.push(`Type de DSN invalide : ${data.typeDsn}`);
  }

  // Salariés
  if (!data.salaries || data.salaries.length === 0) {
    errors.push('La DSN doit contenir au moins un salarié');
  } else {
    data.salaries.forEach((sal, idx) => {
      const prefix = `Salarié ${idx + 1} (${sal.prenom} ${sal.nom})`;

      if (!sal.nir) errors.push(`${prefix} : NIR manquant`);
      else if (sal.nir.replace(/\s/g, '').length !== 15) {
        errors.push(`${prefix} : NIR invalide (15 caractères attendus)`);
      }

      if (!sal.nom) errors.push(`${prefix} : nom manquant`);
      if (!sal.prenom) errors.push(`${prefix} : prénom manquant`);
      if (!sal.dateNaissance) errors.push(`${prefix} : date de naissance manquante`);
      if (!sal.typeContrat) errors.push(`${prefix} : type de contrat manquant`);
      if (!sal.dateDebut) errors.push(`${prefix} : date de début manquante`);
      if (!sal.salaireBrut || sal.salaireBrut <= 0) {
        errors.push(`${prefix} : salaire brut invalide`);
      }
      if (!sal.salaireNet || sal.salaireNet <= 0) {
        warnings.push(`${prefix} : salaire net non renseigné ou nul`);
      }
    });
  }

  // Effectif
  if (!data.effectif || data.effectif <= 0) {
    warnings.push('L\'effectif n\'est pas renseigné');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Génération du fichier NET-URSSAF ────────────────────────────────────

/**
 * Génère un fichier DSN au format NET-URSSAF (CSV-like, blocs S10-S90).
 * Format simplifié conforme à la norme NET 4DSN pour les DSN mensuelles.
 */
export function genererDSNFichier(data: DSNData): string {
  const lines: string[] = [];
  const now = new Date();
  const dateEmis = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const periode = `${data.annee}${String(data.mois).padStart(2, '0')}`;

  // Identifiant de la déclaration
  const idDeclaration = `DSN-${data.siret.replace(/\s/g, '')}-${periode}-${Date.now()}`;

  // ── S10 : En-tête de l'envoi ──────────────────────────────────────
  lines.push(`S10,GROUP,${idDeclaration},${dateEmis},${data.siret.replace(/\s/g, '')},NET4DSN,01,,`);

  // ── S20 : Identification de l'employeur ────────────────────────────
  lines.push(`S20,GROUP,${data.siret.replace(/\s/g, '')},${data.raisonSociale},${data.adresse},${data.codePostal},${data.ville},${data.codeApe},${data.codeUrssaf},${data.effectif},,`);

  // ── S30 : Contact déclaration ──────────────────────────────────────
  lines.push(`S30,GROUP,${data.contactNom || ''},${data.contactPrenom || ''},${data.contactTelephone || ''},${data.contactEmail || ''},`);

  // ── S40 : Identification du salarié + S50 : Contrat + S60 : Rémunération ──
  data.salaries.forEach((sal, idx) => {
    const nirClean = sal.nir.replace(/\s/g, '');

    // S40 : Identification du salarié
    lines.push(`S40,GROUP,${nirClean},${sal.nom},${sal.prenom},${sal.dateNaissance.replace(/-/g, '')},${sal.sexe},${sal.matricule || ''},${sal.adresse || ''},${sal.codePostal || ''},${sal.commune || ''},`);

    // S50 : Contrat de travail
    const codeContrat = mapTypeContratToCode(sal.typeContrat);
    lines.push(`S50,GROUP,${codeContrat},${sal.dateDebut.replace(/-/g, '')},${sal.dateFin ? sal.dateFin.replace(/-/g, '') : ''},${sal.poste},${sal.statut === 'cadre' ? 'CAD' : 'NCA'},${sal.conventionCollective || ''},,`);

    // S60 : Rémunération
    lines.push(`S60,GROUP,${periode},${sal.salaireBrut.toFixed(2)},${sal.salaireNet.toFixed(2)},${sal.heuresMensuelles},${sal.cotisationsPatronales.toFixed(2)},${sal.cotisationsSalariales.toFixed(2)},,`);

    // S65 : Base de cotisations (résumé)
    lines.push(`S65,GROUP,${sal.salaireBrut.toFixed(2)},${sal.cotisationsPatronales.toFixed(2)},${sal.cotisationsSalariales.toFixed(2)},`);
  });

  // ── S70 : Cotisations agrégées ─────────────────────────────────────
  const totalBrut = data.salaries.reduce((sum, s) => sum + s.salaireBrut, 0);
  const totalPatronal = data.salaries.reduce((sum, s) => sum + s.cotisationsPatronales, 0);
  const totalSalarial = data.salaries.reduce((sum, s) => sum + s.cotisationsSalariales, 0);

  lines.push(`S70,GROUP,${periode},${totalBrut.toFixed(2)},${totalPatronal.toFixed(2)},${totalSalarial.toFixed(2)},`);

  // ── S80 : Total déclaration ────────────────────────────────────────
  lines.push(`S80,GROUP,${data.salaries.length},${totalBrut.toFixed(2)},${totalPatronal.toFixed(2)},${totalSalarial.toFixed(2)},`);

  // ── S90 : Fin de l'envoi ───────────────────────────────────────────
  lines.push(`S90,GROUP,${idDeclaration},${lines.length + 1},`);

  return lines.join('\n');
}

function mapTypeContratToCode(typeContrat: string): string {
  const mapping: Record<string, string> = {
    'CDI': 'CDD01', // CDI temps complet
    'CDD': 'CDD02',
    'CDD_usage': 'CDD03',
    'CDD_reconversion': 'CDD04',
    'CDD_saisonnier': 'CDD05',
    'Interim': 'CDD06',
    'Stage': 'CDD07',
    'Apprentissage': 'CDD08',
    'Professionnalisation': 'CDD09',
  };
  return mapping[typeContrat] || 'CDD01';
}

// ─── Calcul de la date limite DSN ────────────────────────────────────────

/**
 * Calcule la date limite de dépôt de la DSN mensuelle :
 * - 5 du mois suivant pour les entreprises de 50+ salariés
 * - 15 du mois suivant pour les entreprises de moins de 50 salariés
 * Ajustée au jour ouvré suivant si la date tombe un week-end ou un jour férié.
 */
export function calculateDSNDeadline(
  mois: number,
  annee: number,
  effectif: number
): Date {
  // Mois suivant
  let targetMonth = mois;
  let targetYear = annee;
  targetMonth++;
  if (targetMonth > 12) {
    targetMonth = 1;
    targetYear++;
  }

  const deadlineDay = effectif >= 50 ? 5 : 15;
  let deadline = new Date(targetYear, targetMonth - 1, deadlineDay);

  // Ajuster si week-end ou jour férié -> jour ouvré suivant
  const holidays = getFrenchHolidaysSimple(targetYear);
  while (isWeekendSimple(deadline) || isHolidaySimple(deadline, holidays)) {
    deadline = new Date(deadline.getTime() + 86400000);
  }

  return deadline;
}

function getFrenchHolidaysSimple(year: number): Date[] {
  const holidays: Date[] = [
    new Date(year, 0, 1),   // Jour de l'An
    new Date(year, 4, 1),   // Fête du Travail
    new Date(year, 4, 8),   // Victoire 1945
    new Date(year, 6, 14),  // Fête nationale
    new Date(year, 7, 15),  // Assomption
    new Date(year, 10, 1),  // Toussaint
    new Date(year, 10, 11), // Armistice
    new Date(year, 11, 25), // Noël
  ];

  // Jours fériés basés sur Pâques
  const easter = computeEasterDSN(year);
  const easterMs = easter.getTime();
  const dayMs = 86400000;

  holidays.push(new Date(easterMs + 1 * dayMs));   // Lundi de Pâques
  holidays.push(new Date(easterMs + 39 * dayMs));  // Jeudi de l'Ascension
  holidays.push(new Date(easterMs + 50 * dayMs));  // Lundi de Pentecôte

  return holidays;
}

function computeEasterDSN(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function isWeekendSimple(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

function isHolidaySimple(date: Date, holidays: Date[]): boolean {
  return holidays.some(
    (h) =>
      h.getFullYear() === date.getFullYear() &&
      h.getMonth() === date.getMonth() &&
      h.getDate() === date.getDate()
  );
}

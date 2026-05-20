// DPAE — Déclaration Préalable à l'Embauche
// Utilitaires de validation, génération HTML et résumé URSSAF
// Références : Code du travail art. L1221-10, D1221-5 à D1221-8

// ─── Jours fériés France ────────────────────────────────────────────────────
function getFrenchPublicHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  // Jours fixes
  holidays.push(new Date(year, 0, 1));   // Jour de l'An
  holidays.push(new Date(year, 4, 1));   // Fête du Travail
  holidays.push(new Date(year, 4, 8));   // Victoire 1945
  holidays.push(new Date(year, 6, 14));  // Fête nationale
  holidays.push(new Date(year, 7, 15));  // Assomption
  holidays.push(new Date(year, 10, 1));  // Toussaint
  holidays.push(new Date(year, 10, 11)); // Armistice
  holidays.push(new Date(year, 11, 25)); // Noël

  // Jours basés sur Pâques
  const easter = computeEaster(year);
  const easterMs = easter.getTime();
  const dayMs = 86400000;

  holidays.push(new Date(easterMs + 1 * dayMs));   // Lundi de Pâques
  holidays.push(new Date(easterMs + 39 * dayMs));  // Ascension
  holidays.push(new Date(easterMs + 50 * dayMs));  // Lundi de Pentecôte

  return holidays;
}

function computeEaster(year: number): Date {
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

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(date: Date, holidays: Date[]): boolean {
  return holidays.some(
    (h) =>
      h.getFullYear() === date.getFullYear() &&
      h.getMonth() === date.getMonth() &&
      h.getDate() === date.getDate()
  );
}

function isWorkingDay(date: Date, holidays: Date[]): boolean {
  return !isWeekend(date) && !isHoliday(date, holidays);
}

// ─── NIR Validation ──────────────────────────────────────────────────────

/**
 * Valide un numéro NIR (Numéro d'Inscription au Répertoire — Sécurité sociale).
 * Format : 15 caractères (13 chiffres + clé 2 chiffres).
 * Gère la Corse (2A / 2B) pour le calcul de la clé.
 */
export function validateNIR(nir: string): { valid: boolean; error?: string } {
  if (!nir) return { valid: false, error: 'NIR non renseigné' };

  // Nettoyage : retirer les espaces
  const cleaned = nir.replace(/\s/g, '');

  if (cleaned.length !== 15) {
    return { valid: false, error: `Le NIR doit comporter 15 caractères (${cleaned.length} saisis)` };
  }

  // Extraire les parties
  const sexe = cleaned.substring(0, 1);
  const annee = cleaned.substring(1, 3);
  const mois = cleaned.substring(3, 5);
  const dept = cleaned.substring(5, 7);
  const commune = cleaned.substring(7, 10);
  const ordre = cleaned.substring(10, 13);
  const cle = cleaned.substring(13, 15);

  // Validation du sexe (1, 2, 3 ou 4)
  if (!['1', '2', '3', '4'].includes(sexe)) {
    return { valid: false, error: 'Sexe invalide (premier caractère doit être 1, 2, 3 ou 4)' };
  }

  // Validation de l'année
  const anneeNum = parseInt(annee, 10);
  if (isNaN(anneeNum) || anneeNum < 0 || anneeNum > 99) {
    return { valid: false, error: 'Année de naissance invalide' };
  }

  // Validation du mois
  const moisNum = parseInt(mois, 10);
  if (isNaN(moisNum) || moisNum < 1 || (moisNum > 12 && moisNum < 20) || moisNum > 42) {
    return { valid: false, error: 'Mois de naissance invalide' };
  }

  // Validation de la clé de contrôle
  let nirForChecksum: string;
  if (dept === '2A') {
    nirForChecksum = sexe + annee + mois + '19' + commune + ordre;
  } else if (dept === '2B') {
    nirForChecksum = sexe + annee + mois + '18' + commune + ordre;
  } else {
    nirForChecksum = cleaned.substring(0, 13);
  }

  const nirNum = parseInt(nirForChecksum, 10);
  const cleNum = parseInt(cle, 10);
  if (isNaN(nirNum) || isNaN(cleNum)) {
    return { valid: false, error: 'Format NIR invalide' };
  }

  const expectedCle = 97 - (nirNum % 97);
  if (cleNum !== expectedCle) {
    return { valid: false, error: `Clé de contrôle invalide (attendue : ${expectedCle}, fournie : ${cleNum})` };
  }

  return { valid: true };
}

// ─── Calcul date minimale d'embauche ─────────────────────────────────────

/**
 * Calcule la date minimale d'embauche : le prochain jour ouvré.
 * La DPAE doit être envoyée au plus tard le dernier jour ouvrable précédant
 * l'embauche (art. D1221-7 du Code du travail). Donc si on envoie la DPAE
 * aujourd'hui, l'embauche ne peut avoir lieu qu'au prochain jour ouvré.
 */
export function calculateMinHireDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const holidays = [
    ...getFrenchPublicHolidays(year),
    ...getFrenchPublicHolidays(year + 1),
  ];

  // Le prochain jour ouvré après aujourd'hui
  let current = new Date(today);
  do {
    current = new Date(current.getTime() + 86400000);
  } while (!isWorkingDay(current, holidays));

  return current;
}

// ─── Validation complète DPAE ────────────────────────────────────────────

export interface DPAEData {
  // Employeur
  siret?: string;
  raisonSociale?: string;
  adresseEmployeur?: string;
  codeApe?: string;
  urssaf?: string;
  // Salarié
  nir?: string;
  nom?: string;
  prenom?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  sexe?: string;
  adresse?: string;
  // Contrat
  typeContrat?: string;
  dateEmbauche?: string;
  poste?: string;
  lieuTravail?: string;
  salaireBrut?: number;
  tauxHoraire?: number;
  heuresHebdo?: number;
  periodeEssai?: number;
  conventionCollective?: string;
}

export function validateDPAE(data: DPAEData): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ─── Employeur ────────────────────────────────────────
  if (!data.siret) {
    errors.push('Le numéro SIRET de l\'employeur est obligatoire');
  } else if (!/^\d{14}$/.test(data.siret.replace(/\s/g, ''))) {
    errors.push('Le numéro SIRET doit comporter 14 chiffres');
  }

  if (!data.raisonSociale) {
    errors.push('La raison sociale de l\'employeur est obligatoire');
  }

  if (!data.urssaf) {
    warnings.push('Le code URSSAF n\'est pas renseigné');
  }

  // ─── Salarié ──────────────────────────────────────────
  if (!data.nom) errors.push('Le nom du salarié est obligatoire');
  if (!data.prenom) errors.push('Le prénom du salarié est obligatoire');

  if (!data.nir) {
    errors.push('Le numéro NIR (sécurité sociale) est obligatoire');
  } else {
    const nirCheck = validateNIR(data.nir);
    if (!nirCheck.valid) {
      errors.push(nirCheck.error || 'NIR invalide');
    }
  }

  if (!data.dateNaissance) {
    errors.push('La date de naissance est obligatoire');
  }

  if (!data.lieuNaissance) {
    warnings.push('Le lieu de naissance n\'est pas renseigné');
  }

  if (!data.sexe) {
    errors.push('Le sexe (civilité) est obligatoire');
  }

  // ─── Contrat ──────────────────────────────────────────
  if (!data.typeContrat) {
    errors.push('Le type de contrat est obligatoire');
  }

  const validTypes = [
    'CDI', 'CDD', 'CDD_usage', 'CDD_reconversion', 'CDD_saisonnier',
    'Interim', 'Stage', 'Apprentissage', 'Professionnalisation',
  ];
  if (data.typeContrat && !validTypes.includes(data.typeContrat)) {
    errors.push(`Type de contrat invalide : ${data.typeContrat}`);
  }

  if (!data.dateEmbauche) {
    errors.push('La date d\'embauche est obligatoire');
  } else {
    const minDate = calculateMinHireDate();
    const embauche = new Date(data.dateEmbauche);
    embauche.setHours(0, 0, 0, 0);
    if (embauche < minDate) {
      errors.push(
        `La date d'embauche doit être au minimum le ${minDate.toLocaleDateString('fr-FR')} (DPAE au plus tard la veille ouvrable, art. D1221-7)`
      );
    }
  }

  if (!data.poste) {
    warnings.push('Le poste/intitulé de l\'emploi n\'est pas renseigné');
  }

  if (!data.salaireBrut || data.salaireBrut <= 0) {
    errors.push('Le salaire brut doit être supérieur à 0');
  } else {
    // Vérification SMIC
    const smicMensuel = 1823.03; // SMIC brut 2026
    if (data.salaireBrut < smicMensuel * 0.85 && data.typeContrat !== 'Apprentissage' && data.typeContrat !== 'Stage') {
      warnings.push(`Le salaire brut (${data.salaireBrut.toFixed(2)} EUR) est inférieur à 85% du SMIC (${(smicMensuel * 0.85).toFixed(2)} EUR)`);
    }
  }

  if (!data.heuresHebdo || data.heuresHebdo <= 0) {
    warnings.push('Les heures hebdomadaires ne sont pas renseignées');
  }

  if (data.typeContrat === 'CDD' || data.typeContrat === 'CDD_usage' || data.typeContrat === 'CDD_saisonnier') {
    if (!data.conventionCollective) {
      warnings.push('La convention collective est recommandée pour un CDD');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Génération HTML du formulaire DPAE ──────────────────────────────────

export function genererDPAEHtml(data: DPAEData): string {
  const dateEmbauche = data.dateEmbauche
    ? new Date(data.dateEmbauche).toLocaleDateString('fr-FR')
    : '-';
  const dateNaissance = data.dateNaissance
    ? new Date(data.dateNaissance).toLocaleDateString('fr-FR')
    : '-';

  const fmt = (n: number) => n ? n.toFixed(2) + ' EUR' : '-';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>DPAE — ${data.prenom || ''} ${data.nom || ''}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1a1a1a; }
  .page { max-width: 210mm; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1D9E75; padding-bottom: 8px; margin-bottom: 16px; }
  .header h1 { font-size: 16pt; color: #1D9E75; }
  .header .ref { font-size: 8pt; color: #666; text-align: right; }
  .section { margin-bottom: 16px; }
  .section-title { background: #1D9E75; color: #fff; padding: 6px 12px; font-size: 10pt; font-weight: bold; border-radius: 4px 4px 0 0; }
  .section-body { border: 1px solid #ddd; border-top: none; padding: 12px; border-radius: 0 0 4px 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .field { margin-bottom: 6px; }
  .field-label { font-size: 7pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .field-value { font-size: 9pt; font-weight: 600; color: #333; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 7pt; color: #888; text-align: center; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>DPAE</h1>
    <div class="ref">
      Déclaration Préalable à l'Embauche<br/>
      Art. L1221-10 du Code du travail<br/>
      Établie le ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">EMPLOYEUR</div>
    <div class="section-body">
      <div class="grid">
        <div class="field">
          <div class="field-label">Raison sociale</div>
          <div class="field-value">${data.raisonSociale || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">SIRET</div>
          <div class="field-value">${data.siret || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Adresse</div>
          <div class="field-value">${data.adresseEmployeur || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Code APE</div>
          <div class="field-value">${data.codeApe || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">URSSAF</div>
          <div class="field-value">${data.urssaf || '-'}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">SALARIE</div>
    <div class="section-body">
      <div class="grid">
        <div class="field">
          <div class="field-label">Nom</div>
          <div class="field-value">${data.nom || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Prénom</div>
          <div class="field-value">${data.prenom || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Date de naissance</div>
          <div class="field-value">${dateNaissance}</div>
        </div>
        <div class="field">
          <div class="field-label">Lieu de naissance</div>
          <div class="field-value">${data.lieuNaissance || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">NIR (n° sécurité sociale)</div>
          <div class="field-value">${data.nir || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Sexe</div>
          <div class="field-value">${data.sexe === 'M' ? 'Masculin' : data.sexe === 'F' ? 'Féminin' : '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Nationalité</div>
          <div class="field-value">${data.nationalite || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Adresse</div>
          <div class="field-value">${data.adresse || '-'}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">CONTRAT DE TRAVAIL</div>
    <div class="section-body">
      <div class="grid">
        <div class="field">
          <div class="field-label">Type de contrat</div>
          <div class="field-value">${data.typeContrat || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Date d'embauche</div>
          <div class="field-value">${dateEmbauche}</div>
        </div>
        <div class="field">
          <div class="field-label">Poste / Emploi</div>
          <div class="field-value">${data.poste || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Lieu de travail</div>
          <div class="field-value">${data.lieuTravail || '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Salaire brut mensuel</div>
          <div class="field-value">${fmt(data.salaireBrut || 0)}</div>
        </div>
        <div class="field">
          <div class="field-label">Taux horaire</div>
          <div class="field-value">${data.tauxHoraire ? data.tauxHoraire.toFixed(2) + ' EUR/h' : '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Heures hebdomadaires</div>
          <div class="field-value">${data.heuresHebdo ? data.heuresHebdo + ' h' : '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Période d'essai</div>
          <div class="field-value">${data.periodeEssai ? data.periodeEssai + ' jours' : '-'}</div>
        </div>
        <div class="field">
          <div class="field-label">Convention collective</div>
          <div class="field-value">${data.conventionCollective || '-'}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    DPAE conforme à l'article L1221-10 du Code du travail — Conservez ce document sans limitation de durée —
    Sanction en cas de non-déclaration : amende de 4 058 EUR (art. L1221-12)
  </div>

</div>
</body>
</html>`;
}

// ─── Résumé texte pour URSSAF ────────────────────────────────────────────

export function genererDPAESummary(data: DPAEData): string {
  const lines: string[] = [];

  lines.push('=== DPAE — Déclaration Préalable à l\'Embauche ===');
  lines.push(`Établie le : ${new Date().toLocaleDateString('fr-FR')}`);
  lines.push('');

  lines.push('--- EMPLOYEUR ---');
  lines.push(`Raison sociale : ${data.raisonSociale || '-'}`);
  lines.push(`SIRET : ${data.siret || '-'}`);
  lines.push(`Adresse : ${data.adresseEmployeur || '-'}`);
  lines.push(`Code APE : ${data.codeApe || '-'}`);
  lines.push(`URSSAF : ${data.urssaf || '-'}`);
  lines.push('');

  lines.push('--- SALARIE ---');
  lines.push(`Nom : ${data.nom || '-'}`);
  lines.push(`Prénom : ${data.prenom || '-'}`);
  lines.push(`Date de naissance : ${data.dateNaissance ? new Date(data.dateNaissance).toLocaleDateString('fr-FR') : '-'}`);
  lines.push(`Lieu de naissance : ${data.lieuNaissance || '-'}`);
  lines.push(`NIR : ${data.nir || '-'}`);
  lines.push(`Sexe : ${data.sexe === 'M' ? 'Masculin' : data.sexe === 'F' ? 'Féminin' : '-'}`);
  lines.push(`Nationalité : ${data.nationalite || '-'}`);
  lines.push(`Adresse : ${data.adresse || '-'}`);
  lines.push('');

  lines.push('--- CONTRAT ---');
  lines.push(`Type : ${data.typeContrat || '-'}`);
  lines.push(`Date d'embauche : ${data.dateEmbauche ? new Date(data.dateEmbauche).toLocaleDateString('fr-FR') : '-'}`);
  lines.push(`Poste : ${data.poste || '-'}`);
  lines.push(`Lieu de travail : ${data.lieuTravail || '-'}`);
  lines.push(`Salaire brut mensuel : ${data.salaireBrut ? data.salaireBrut.toFixed(2) + ' EUR' : '-'}`);
  lines.push(`Taux horaire : ${data.tauxHoraire ? data.tauxHoraire.toFixed(2) + ' EUR/h' : '-'}`);
  lines.push(`Heures hebdomadaires : ${data.heuresHebdo ? data.heuresHebdo + ' h' : '-'}`);
  lines.push(`Période d'essai : ${data.periodeEssai ? data.periodeEssai + ' jours' : '-'}`);
  lines.push(`Convention collective : ${data.conventionCollective || '-'}`);
  lines.push('');

  return lines.join('\n');
}

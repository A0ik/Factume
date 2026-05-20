// Taux de cotisations sociales 2026 (France)
// Source: URSSAF, Code de la Sécurité sociale

export interface CotisationData {
  salaireBrut: number;
  salaireBrutAnnuel: number;
  statut: 'cadre' | 'non_cadre' | 'alternance' | 'stage';
  tempsPartiel?: boolean;
  heureSupplementaire?: number;
  region?: 'alsace_moselle' | 'normal';
  // Taux d'accident du travail personnalisé (en %)
  tauxAccidentTravail?: number;
  // Séparation de la réduction Fillon
  separationFillonUrssafRetraite?: boolean;
  // Convention collective pour calculs spécifiques
  conventionCollectiveId?: string;
}

export interface CotisationResult {
  patronales: {
    maladie: number;
    vieillesse: number;
    allocations_familiales: number;
    accident_du_travail: number;
    solidarite_autonomie: number;
    fnal: number;
    chomage: number;
    retraite_cadres: number;
    ags: number;
    formation: number;
    prevoyance: number;
    supplementaire_sante: number;
    penibilite: number;
    transport: number;
    total: number;
    reduction_fillon: number; // Réduction générale des cotisations (ex-Fillon)
    reduction_fillon_taux: number; // Taux appliqué (coefficient)
    // Séparation Fillon (si activée)
    reduction_fillon_urssaf?: number; // Part URSSAF
    reduction_fillon_retraite?: number; // Part Retraite
  };
  salariales: {
    maladie: number;
    vieillesse: number;
    retraite_cadres: number;
    chomage: number;
    ags: number;
    csg_crds: number;
    csg_deductible: number;
    csg_non_deductible: number;
    crds: number;
    total: number;
  };
  salaireNet: number;
  salaireNetImposable: number;
  coutEmployer: number;
  coutEmployerAvantReduction: number;
}

// Taux de cotisations 2026 (en %) - Sources officielles URSSAF/Code de la Sécurité sociale
const TAUX_2026 = {
  patronales: {
    maladie: 13.00, // Maladie-Maternité-Invalidité-Décès
    vieillesse: 10.66, // Vieillesse plafonnée (8.55%) + déplafonnée (2.11%) — revalorisée 2026
    allocations_familiales_reduit: 3.45, // AF taux réduit — uniquement LODEOM/ZFRR (régimes dérogatoires)
    allocations_familiales_plein: 5.25, // AF taux plein — régime général unique depuis fusion RGDU 2026
    accident_du_travail: 0.70, // Taux moyen (variable selon risque, 0.4% à 3.2%)
    solidarite_autonomie: 0.30,
    fnal: 0.10, // FNAL (< 50 salariés, base plafonnée PASS) ou 0.50% (≥ 50, base déplafonnée)
    chomage: 4.00, // Assurance chômage (taux 2026, en baisse)
    // AGIRC-ARRCO taux appelés (taux contractuels × 127%) — Source : AGIRC-ARRCO 2026
    agirc_arrco_t1: 4.72, // Tranche 1 patronal (tous salariés, jusqu'au PASS)
    agirc_arrco_t2: 12.95, // Tranche 2 patronal (cadres, entre 1x et 8x PASS)
    // CEG (Contribution d'Équilibre Général) — s'ajoute aux taux appelés
    ceg_t1: 1.29, // CEG Tranche 1 patronal
    ceg_t2: 1.62, // CEG Tranche 2 patronal
    // CET (Contribution d'Équilibre Technique) — uniquement si salaire > PASS
    cet: 0.21, // CET patronal
    // APEC — cadres uniquement
    apec: 0.036,
    ags: 0.25, // AGS (FNGS) 2026 — revalorisé
    formation: 0.55,
    prevoyance: 1.50, // Prévoyance obligatoire pour cadres
    supplementaire_sante: 0.60,
    penibilite: 0.10,
  },
  salariales: {
    maladie: 0.00, // Supprimée depuis 1998
    vieillesse: 6.90, // Vieillesse plafonnée (taux 2026)
    vieillesse_deplafonnee: 0.40,
    // AGIRC-ARRCO taux appelés
    agirc_arrco_t1: 3.15, // Tranche 1 salarial (tous salariés)
    agirc_arrco_t2: 8.64, // Tranche 2 salarial (cadres)
    // CEG
    ceg_t1: 0.86, // CEG Tranche 1 salarial
    ceg_t2: 1.08, // CEG Tranche 2 salarial
    // CET — si salaire > PASS
    cet: 0.14,
    // APEC — cadres uniquement
    apec: 0.024,
    chomage: 0.00, // Supprimée depuis 2019
    ags: 0.00,
    csg: 9.20, // 6.80% déductible + 2.40% non déductible
    crds: 0.50,
  },
  plafonds: {
    mensuel_ss: 4005, // PASS mensuel 2026 — Arrêté du 22 décembre 2025
    annuel_ss: 48060, // PASS annuel 2026
    cadre: 8 * 4005, // 8x PASS (tranche 2 AGIRC-ARRCO)
    tranche2: 8 * 4005,
  }
};

// SMIC 2026 - Taux horaire officiel (au 1er janvier 2026)
const SMIC_MENSUEL_2026 = 1823.03; // €/mois pour 35h (base 151.67h) - SMIC brut 2026

// Calcul des cotisations
export function calculerCotisations(data: CotisationData): CotisationResult {
  const { salaireBrut, statut, tauxAccidentTravail, separationFillonUrssafRetraite } = data;
  const plafondMensuel = TAUX_2026.plafonds.mensuel_ss;

  // === COTISATIONS PATRONALES ===

  // Maladie (sur salaire brut)
  const maladiePatronale = salaireBrut * (TAUX_2026.patronales.maladie / 100);

  // Vieillesse (sur salaire brut, dans la limite du plafond)
  const vieillessePatronale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2026.patronales.vieillesse / 100);

  // Allocations familiales : 5.25% taux unique depuis RGDU 2026
  // (la réduction 3.45% est supprimée et compensée par le RGDU)
  const allocationsFamiliales = salaireBrut * (TAUX_2026.patronales.allocations_familiales_plein / 100);

  // Accident du travail (taux personnalisé ou défaut)
  const tauxAT = tauxAccidentTravail ?? TAUX_2026.patronales.accident_du_travail;
  const accidentDuTravail = salaireBrut * (tauxAT / 100);

  // Solidarité autonomie
  const solidariteAutonomie = salaireBrut * (TAUX_2026.patronales.solidarite_autonomie / 100);

  // FNAL (< 50 salariés : base plafonnée au PASS, ≥ 50 : base déplafonnée à 0.50%)
  // Par défaut on applique le taux < 50 salariés (0.10%, base plafonnée PASS)
  const fnal = Math.min(salaireBrut, plafondMensuel) * (TAUX_2026.patronales.fnal / 100);

  // Chômage (sur salaire brut, plafonné à 4x le plafond SS)
  const plafondChomage = 4 * plafondMensuel;
  const chomage = Math.min(salaireBrut, plafondChomage) * (TAUX_2026.patronales.chomage / 100);

  // AGIRC-ARRCO + CEG — T1 s'applique à TOUS les salariés
  const t1Assiette = Math.min(salaireBrut, plafondMensuel);
  let retraiteCadres = t1Assiette * ((TAUX_2026.patronales.agirc_arrco_t1 + TAUX_2026.patronales.ceg_t1) / 100);
  if (statut === 'cadre') {
    const tranche2 = Math.max(0, Math.min(salaireBrut, 8 * plafondMensuel) - plafondMensuel);
    retraiteCadres += tranche2 * ((TAUX_2026.patronales.agirc_arrco_t2 + TAUX_2026.patronales.ceg_t2) / 100);
    // CET : uniquement si salaire dépasse le plafond SS
    if (salaireBrut > plafondMensuel) {
      retraiteCadres += salaireBrut * (TAUX_2026.patronales.cet / 100);
    }
    // APEC
    retraiteCadres += t1Assiette * (TAUX_2026.patronales.apec / 100);
  }

  // AGS
  const ags = salaireBrut * (TAUX_2026.patronales.ags / 100);

  // Formation
  const formation = salaireBrut * (TAUX_2026.patronales.formation / 100);

  // Prévoyance
  const prevoyance = salaireBrut * (TAUX_2026.patronales.prevoyance / 100);

  // Complémentaire santé
  const sante = salaireBrut * (TAUX_2026.patronales.supplementaire_sante / 100);

  // Pénibilité
  const penibilite = salaireBrut * (TAUX_2026.patronales.penibilite / 100);

  // Transport (forfait)
  const transport = salaireBrut * 0.005; // 0.5% environ

  // Total patronal
  const totalPatronal = maladiePatronale + vieillessePatronale + allocationsFamiliales +
    accidentDuTravail + solidariteAutonomie + fnal + chomage + retraiteCadres +
    ags + formation + prevoyance + sante + penibilite + transport;

  // === COTISATIONS SALARIALES ===

  // Maladie
  const maladieSalariale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2026.salariales.maladie / 100);

  // Vieillesse
  const vieillesseSalariale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2026.salariales.vieillesse / 100);
  const vieillesseDeplafonneeSalariale = salaireBrut * (TAUX_2026.salariales.vieillesse_deplafonnee / 100);

  // AGIRC-ARRCO + CEG salarial — T1 pour tous, T2 + CET + APEC pour cadres
  let retraiteCadresSalariale = t1Assiette * ((TAUX_2026.salariales.agirc_arrco_t1 + TAUX_2026.salariales.ceg_t1) / 100);
  if (statut === 'cadre') {
    const tranche2Sal = Math.max(0, Math.min(salaireBrut, 8 * plafondMensuel) - plafondMensuel);
    retraiteCadresSalariale += tranche2Sal * ((TAUX_2026.salariales.agirc_arrco_t2 + TAUX_2026.salariales.ceg_t2) / 100);
    if (salaireBrut > plafondMensuel) {
      retraiteCadresSalariale += salaireBrut * (TAUX_2026.salariales.cet / 100);
    }
    retraiteCadresSalariale += t1Assiette * (TAUX_2026.salariales.apec / 100);
  }

  // Chômage (Maintenant à 0.00% pour la part salariale)
  const chomageSalarial = salaireBrut * (TAUX_2026.salariales.chomage / 100);

  // AGS (Uniquement patronale)
  const agsSalarial = salaireBrut * (TAUX_2026.salariales.ags / 100);

  // CSG + CRDS (sur 98.25% du salaire brut) - 2025/2026
  const baseCSG = salaireBrut * 0.9825;
  const csgDeductible = baseCSG * 6.80 / 100; // 6.80% déductible
  const csgNonDeductible = baseCSG * 2.40 / 100; // 2.40% non déductible
  const crds = baseCSG * 0.50 / 100; // 0.50% CRDS non déductible
  const csgCrds = csgDeductible + csgNonDeductible + crds;

  // Total salarial
  const totalSalarial = maladieSalariale + vieillesseSalariale + vieillesseDeplafonneeSalariale + retraiteCadresSalariale +
    chomageSalarial + agsSalarial + csgCrds;

  // === SALAIRES ===

  const salaireNet = salaireBrut - totalSalarial;

  // Salaire net imposable (sans la CSG déductible, donc on l'ajoute)
  const salaireNetImposable = salaireBrut - totalSalarial + csgDeductible;

  // Coût employeur (avant réduction Fillon)
  const coutEmployerAvantReduction = salaireBrut + totalPatronal;

  // === RÉDUCTION GÉNÉRALE DÉGRESSIVE UNIQUE (RGDU) — ex-Fillon, formule 2026 ===
  // Référence : service-public.gouv.fr/F24542, décret n°2025-887
  // Formule : C = Tmin + (Tdelta × [(1/2) × (3 × SMIC_annuel / R_annuel) - 1]^P)
  const calculerRGDU = (salaireBrut: number, nombreSalaries: number = 1): { montant: number; coefficient: number } => {
    const SMIC_ANNUEL = 21876.40; // SMIC annuel brut 2026 (12.02€ × 1820h)
    const salaireAnnuel = salaireBrut * 12;

    // Seuil d'éligibilité : rémunération < 3 × SMIC
    if (salaireAnnuel >= 3 * SMIC_ANNUEL) return { montant: 0, coefficient: 0 };

    const Tmin = 0.0200;
    // Tdelta selon le taux FNAL (0.10% si < 50 salariés, 0.50% si ≥ 50)
    const Tdelta = nombreSalaries < 50 ? 0.3781 : 0.3821;
    const P = 1.75;

    const inner = 0.5 * ((3 * SMIC_ANNUEL / salaireAnnuel) - 1);
    const coefficientCalc = Tmin + Tdelta * Math.pow(Math.max(0, inner), P);
    const coefficient = Math.min(coefficientCalc, Tmin + Tdelta); // Plafonné à Tmax

    // Arrondi à 4 décimales (au dix-millième le plus proche)
    const coefficientArrondi = Math.round(coefficient * 10000) / 10000;
    const reduction = salaireBrut * coefficientArrondi;

    return { montant: reduction, coefficient: coefficientArrondi };
  };

  const fillonResult = calculerRGDU(salaireBrut);
  const reductionFillon = fillonResult.montant;
  const reductionFillonTaux = fillonResult.coefficient;

  // Séparation de la réduction Fillon (si demandé)
  let reductionFillonUrssaf: number | undefined = undefined;
  let reductionFillonRetraite: number | undefined = undefined;

  if (separationFillonUrssafRetraite && reductionFillon > 0) {
    // Par défaut : 85.9% pour l'URSSAF, 14.1% pour la retraite
    reductionFillonUrssaf = reductionFillon * 0.859;
    reductionFillonRetraite = reductionFillon * 0.141;
  }

  // Coût employeur final (avec réduction Fillon)
  const coutEmployer = coutEmployerAvantReduction - reductionFillon;

  return {
    patronales: {
      maladie: maladiePatronale,
      vieillesse: vieillessePatronale,
      allocations_familiales: allocationsFamiliales,
      accident_du_travail: accidentDuTravail,
      solidarite_autonomie: solidariteAutonomie,
      fnal,
      chomage,
      retraite_cadres: retraiteCadres,
      ags,
      formation,
      prevoyance,
      supplementaire_sante: sante,
      penibilite,
      transport,
      total: totalPatronal,
      reduction_fillon: reductionFillon,
      reduction_fillon_taux: reductionFillonTaux,
      reduction_fillon_urssaf: reductionFillonUrssaf,
      reduction_fillon_retraite: reductionFillonRetraite,
    },
    salariales: {
      maladie: maladieSalariale,
      vieillesse: vieillesseSalariale + vieillesseDeplafonneeSalariale,
      retraite_cadres: retraiteCadresSalariale,
      chomage: chomageSalarial,
      ags: agsSalarial,
      csg_crds: csgCrds,
      csg_deductible: csgDeductible,
      csg_non_deductible: csgNonDeductible,
      crds: crds,
      total: totalSalarial,
    },
    salaireNet,
    salaireNetImposable,
    coutEmployer,
    coutEmployerAvantReduction,
  };
}

// Calcul pour alternance (taux réduits)
export function calculerCotisationsAlternance(salaireBrut: number, type: 'apprentissage' | 'professionnalisation'): CotisationResult {
  if (type === 'apprentissage') {
    // Apprentissage: quasi aucune cotisation patronale
    const cotisations: CotisationResult = {
      patronales: {
        maladie: 0,
        vieillesse: 0,
        allocations_familiales: 0,
        accident_du_travail: salaireBrut * 0.011, // 1.1%
        solidarite_autonomie: 0,
        fnal: 0,
        chomage: 0,
        retraite_cadres: 0,
        ags: 0,
        formation: salaireBrut * 0.0055, // 0.55%
        prevoyance: 0,
        supplementaire_sante: 0,
        penibilite: 0,
        transport: 0,
        total: salaireBrut * 0.0166,
        reduction_fillon: 0,
        reduction_fillon_taux: 0,
      },
      salariales: {
        maladie: 0,
        vieillesse: 0,
        retraite_cadres: 0,
        chomage: 0,
        ags: 0,
        csg_crds: 0,
        csg_deductible: 0,
        csg_non_deductible: 0,
        crds: 0,
        total: 0,
      },
      salaireNet: salaireBrut,
      salaireNetImposable: salaireBrut,
      coutEmployer: salaireBrut * 1.0166,
      coutEmployerAvantReduction: salaireBrut * 1.0166,
    };
    return cotisations;
  }

  // Professionnalisation: taux réduits pendant la formation
  return calculerCotisations({
    salaireBrut,
    salaireBrutAnnuel: salaireBrut * 12,
    statut: 'non_cadre',
  });
}

// SMIC 2026
export const SMIC_2026 = {
  horaire: 12.02, // €/heure (taux officiel 2026)
  mensuel_35h: 1823.03, // €/mois pour 35h hebdomadaires (151.67h)
  mensuel_39h: 2030.04, // €/mois pour 39h (4h supp majorées à 110%)
  annuel: 21876.36, // €/an (1823.03 × 12)
};

// Fonction pour calculer la RGDU séparément (2026)
export function calculerReductionFillon(
  salaireBrut: number,
  nombreSalaries: number = 50,
  tempsPartiel: boolean = false,
  heuresHebdo: number = 35
): { montant: number; coefficient: number; details: string } {
  if (salaireBrut <= 0) {
    return { montant: 0, coefficient: 0, details: 'Salaire nul ou négatif' };
  }

  const SMIC_ANNUEL = 21876.40; // SMIC annuel brut 2026 (12.02€ × 1820h)
  let smicAnnuel = SMIC_ANNUEL;

  // Ajustement du SMIC pour temps partiel
  if (tempsPartiel) {
    smicAnnuel = smicAnnuel * (heuresHebdo / 35);
  }

  const salaireAnnuel = salaireBrut * 12;

  // Éligible uniquement si rémunération < 3 × SMIC
  if (salaireAnnuel >= 3 * smicAnnuel) {
    return { montant: 0, coefficient: 0, details: `Rémunération ≥ 3 SMIC (non éligible)` };
  }

  const Tmin = 0.0200;
  const Tdelta = nombreSalaries < 50 ? 0.3781 : 0.3821;
  const P = 1.75;

  const inner = 0.5 * ((3 * smicAnnuel / salaireAnnuel) - 1);
  const coefficientCalc = Tmin + Tdelta * Math.pow(Math.max(0, inner), P);
  const coefficient = Math.min(coefficientCalc, Tmin + Tdelta);
  const coefficientArrondi = Math.round(coefficient * 10000) / 10000;

  const montant = salaireBrut * coefficientArrondi;
  const ratio = salaireAnnuel / smicAnnuel;

  return {
    montant,
    coefficient: coefficientArrondi,
    details: `Ratio: ${ratio.toFixed(3)} SMIC, Coefficient RGDU: ${coefficientArrondi.toFixed(4)}, Taux max: ${((Tmin + Tdelta) * 100).toFixed(2)}%`
  };
}

// Salaires minimums par âge pour apprentissage
export const SALAIRE_APPRENTIAGE = {
  avant_18_ans: 0.27, // % du SMIC
  entre_18_20_ans: 0.43,
  entre_21_25_ans: 0.53,
  plus_26_ans: 1.00, // 100% du SMIC
};

// Fonction pour calculer le salaire minimum selon l'âge
export function getSalaireMinimumAlternance(
  type: 'apprentissage' | 'professionnalisation',
  age: number,
  salaireBase: number = SMIC_2026.mensuel_35h
): number {
  if (type === 'apprentissage') {
    if (age < 18) return salaireBase * SALAIRE_APPRENTIAGE.avant_18_ans;
    if (age < 21) return salaireBase * SALAIRE_APPRENTIAGE.entre_18_20_ans;
    if (age < 26) return salaireBase * SALAIRE_APPRENTIAGE.entre_21_25_ans;
    return salaireBase * SALAIRE_APPRENTIAGE.plus_26_ans;
  }

  // Professionnalisation: minimum 85% du SMIC pour les < 26 ans
  if (age < 26) return salaireBase * 0.85;
  return salaireBase;
}

// Export des données pour affichage
export function getCotisationsDisplay(result: CotisationResult) {
  const patronales = [
    { label: 'Maladie', value: result.patronales.maladie, taux: TAUX_2026.patronales.maladie },
    { label: 'Vieillesse', value: result.patronales.vieillesse, taux: TAUX_2026.patronales.vieillesse },
    { label: 'Allocations familiales', value: result.patronales.allocations_familiales, taux: TAUX_2026.patronales.allocations_familiales_reduit },
    { label: 'Accident du travail', value: result.patronales.accident_du_travail, taux: TAUX_2026.patronales.accident_du_travail },
    { label: 'Chômage', value: result.patronales.chomage, taux: TAUX_2026.patronales.chomage },
    { label: 'Retraite cadres', value: result.patronales.retraite_cadres, taux: 'Variable' },
    { label: 'Formation', value: result.patronales.formation, taux: TAUX_2026.patronales.formation },
    { label: 'Prévoyance', value: result.patronales.prevoyance, taux: TAUX_2026.patronales.prevoyance },
    { label: 'Complémentaire santé', value: result.patronales.supplementaire_sante, taux: TAUX_2026.patronales.supplementaire_sante },
  ];

  // Ajouter la réduction Fillon si applicable
  if (result.patronales.reduction_fillon > 0) {
    patronales.push({
      label: 'Réduction RGDU 2026',
      value: result.patronales.reduction_fillon,
      taux: (result.patronales.reduction_fillon_taux * 100).toFixed(2) + '%'
    });
  }

  return {
    patronales,
    salariales: [
      { label: 'Maladie', value: result.salariales.maladie, taux: TAUX_2026.salariales.maladie },
      { label: 'Vieillesse', value: result.salariales.vieillesse, taux: TAUX_2026.salariales.vieillesse },
      { label: 'Chômage', value: result.salariales.chomage, taux: TAUX_2026.salariales.chomage },
      { label: 'CSG/CRDS', value: result.salariales.csg_crds, taux: TAUX_2026.salariales.csg + TAUX_2026.salariales.crds },
    ],
    totals: {
      salaireNet: result.salaireNet,
      salaireNetImposable: result.salaireNetImposable,
      coutEmployer: result.coutEmployer,
      totalPatronal: result.patronales.total,
      totalSalarial: result.salariales.total,
    }
  };
}

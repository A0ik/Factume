/**
 * Bulletin de paie — React PDF template
 * Reproduit exactement le même rendu que genererBulletinPaieHTML()
 * Utilise @react-pdf/renderer, compatible Vercel (pas de Chromium)
 */
import React from 'react';
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { calculerCotisations } from './cotisations';
import type { BulletinPaieData } from './bulletin-paie';

// ── Helpers identiques à bulletin-paie.ts ─────────────────────────────────────

const fmt = (n: number) => n.toFixed(2);
const fmtE = (n: number) => n ? n.toFixed(2) + ' \u20ac' : '';

function calculs(data: BulletinPaieData) {
  const tauxH = data.tauxHoraire ?? (data.salaireBrut / (data.heuresMensuelles || 151.67));
  const joursOuvres = data.nombreJoursOuvres || 22;
  const montantSupp25 = (data.heuresSupp25 ?? 0) * tauxH * 1.25;
  const montantSupp50 = (data.heuresSupp50 ?? 0) * tauxH * 1.50;
  const retenueMaladie = data.joursMaladie ? (data.salaireBrut / joursOuvres) * data.joursMaladie : 0;
  const retenueAbsence = data.joursAbsenceNonJustifiee ? (data.salaireBrut / joursOuvres) * data.joursAbsenceNonJustifiee : 0;

  const totalBrut = data.salaireBrut
    + montantSupp25 + montantSupp50
    + (data.primeExceptionnelle ?? 0) + (data.prime13Mois ?? 0)
    + (data.primePerformance ?? 0) + (data.primeAnciennete ?? 0)
    + (data.autresPrimes ?? 0) + (data.indemniteCongesPayes ?? 0)
    - retenueMaladie - retenueAbsence;

  const cotisations = calculerCotisations({
    salaireBrut: totalBrut,
    salaireBrutAnnuel: data.salaireBrutAnnuel,
    statut: data.statut === 'alternance' ? 'non_cadre' : data.statut,
    tempsPartiel: data.tempsPartiel,
    tauxAccidentTravail: data.tauxAccidentTravail,
    separationFillonUrssafRetraite: data.separationFillonUrssafRetraite,
    conventionCollectiveId: (data as any).conventionCollectiveId,
  });

  const plafondSS = 3666;
  const basePlafonnée = Math.min(totalBrut, plafondSS);

  const netAvantImpot = totalBrut - cotisations.salariales.total
    + (data.indemnitesTransport ?? 0)
    + (data.indemniteDeplacementVehicule ?? 0)
    + (data.autresIndemnites ?? 0)
    - (data.mutuellePartSalarie ?? 0)
    - (data.prevoyancePartSalarie ?? 0)
    + (data.maintienSalaireMaladie ?? 0)
    + (data.indemnitesJournalieresSS ?? 0);

  return { tauxH, joursOuvres, montantSupp25, montantSupp50, retenueMaladie, retenueAbsence, totalBrut, cotisations, basePlafonnée, netAvantImpot };
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: { padding: '4mm 8mm', fontFamily: 'Helvetica', fontSize: 6.5, color: '#1a1a1a', lineHeight: 1.3 },
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1.5, borderBottomColor: accent, borderBottomStyle: 'solid', paddingBottom: 3, marginBottom: 3 },
    companyName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: accent, textTransform: 'uppercase' },
    companyMeta: { fontSize: 6, color: '#666', marginTop: 1 },
    bulletinTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: accent, padding: '2 6', borderRadius: 3 },
    headerRight: { alignItems: 'flex-end' },
    headerRightText: { fontSize: 7, marginTop: 2 },
    // ID boxes
    idRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
    idBox: { flex: 1, borderWidth: 0.5, borderColor: '#ddd', borderStyle: 'solid', borderRadius: 3, padding: '3 5', backgroundColor: '#fafafa' },
    idBoxTitle: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: accent, borderBottomWidth: 0.5, borderBottomColor: accent, borderBottomStyle: 'solid', paddingBottom: 1, marginBottom: 2, textTransform: 'uppercase' },
    idKv: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0.5 },
    idKey: { color: '#666' },
    idVal: { fontFamily: 'Helvetica-Bold', color: '#333' },
    // Section head
    sectionHead: { backgroundColor: accent, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6, padding: '2 5', marginTop: 2, marginBottom: 0, borderRadius: 2 },
    // Table
    table: { borderWidth: 0.5, borderColor: '#ddd', borderStyle: 'solid', marginBottom: 2 },
    thead: { flexDirection: 'row', backgroundColor: '#f0f1f2', borderBottomWidth: 0.5, borderBottomColor: '#ccc', borderBottomStyle: 'solid' },
    th: { padding: '2 4', fontFamily: 'Helvetica-Bold', fontSize: 6, flex: 1 },
    thRight: { textAlign: 'right' },
    tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#eee', borderBottomStyle: 'solid' },
    trShade: { backgroundColor: '#f8f9fa' },
    td: { padding: '2 4', fontSize: 6.5, flex: 1 },
    tdRight: { textAlign: 'right' },
    tdRed: { color: '#c0392b', textAlign: 'right' },
    tdGreen: { color: '#27ae60', textAlign: 'right' },
    tdBold: { fontFamily: 'Helvetica-Bold' },
    // Net box
    netBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: accent, borderRadius: 4, padding: '5 10', marginTop: 3 },
    netLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
    netSub: { fontSize: 6.5, color: '#ffffffcc', marginTop: 1 },
    netAmount: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#fff' },
    // Footer
    footerRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
    footerBox: { flex: 1, borderWidth: 0.5, borderColor: '#ddd', borderStyle: 'solid', borderRadius: 3, padding: '3 5', backgroundColor: '#fafafa' },
    footerBoxTitle: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: accent, borderBottomWidth: 0.5, borderBottomColor: accent, borderBottomStyle: 'solid', paddingBottom: 1, marginBottom: 2, textTransform: 'uppercase' },
    footerKv: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0.5 },
    mention: { fontSize: 5, color: '#888', textAlign: 'center', borderTopWidth: 0.5, borderTopColor: '#ddd', borderTopStyle: 'solid', paddingTop: 2, marginTop: 3, fontFamily: 'Helvetica-Oblique' },
  });
}

// ── Row helpers ───────────────────────────────────────────────────────────────

type RowDef = { label: string; base: string; taux: string; moins: string; plus: string; bold?: boolean; shade?: boolean };

function TRow({ r, S }: { r: RowDef; S: ReturnType<typeof makeStyles> }) {
  const rowStyle = [S.tr, ...(r.shade ? [S.trShade] : [])];
  const textStyle = r.bold ? S.tdBold : {};
  return (
    <View style={rowStyle}>
      <Text style={[S.td, { flex: 2 }, textStyle]}>{r.label}</Text>
      <Text style={[S.td, S.tdRight, textStyle]}>{r.base}</Text>
      <Text style={[S.td, S.tdRight, textStyle]}>{r.taux}</Text>
      <Text style={[S.td, S.tdRed, textStyle]}>{r.moins}</Text>
      <Text style={[S.td, S.tdGreen, textStyle]}>{r.plus}</Text>
    </View>
  );
}

function TRowIndem({ label, montant, S }: { label: string; montant: string; S: ReturnType<typeof makeStyles> }) {
  return (
    <View style={S.tr}>
      <Text style={[S.td, { flex: 3 }]}>{label}</Text>
      <Text style={[S.td, S.tdGreen]}>{montant}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const BulletinPDF: React.FC<{ data: BulletinPaieData }> = ({ data }) => {
  const accent = (data as any).accentColor || '#1D9E75';
  const S = makeStyles(accent);

  const moisAnnee = new Date(data.periodeDebut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const dateDebPeriode = new Date(data.periodeDebut).toLocaleDateString('fr-FR');
  const dateFinPeriode = new Date(data.periodeFin).toLocaleDateString('fr-FR');
  const datePaie = data.datePaiement ? new Date(data.datePaiement).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');

  const {
    tauxH, joursOuvres, montantSupp25, montantSupp50,
    retenueMaladie, retenueAbsence, totalBrut, cotisations, basePlafonnée, netAvantImpot,
  } = calculs(data);

  const plafondSS = 3666;
  const baseDéplafonnée = totalBrut;
  const tauxVieillessePlafonnée = 6.93;
  const tauxVieillesseDéplafonnée = 0.40;
  const vieillessePlafonnéeMontant = basePlafonnée * tauxVieillessePlafonnée / 100;
  const vieillesseDéplafonnéeMontant = baseDéplafonnée * tauxVieillesseDéplafonnée / 100;

  const cpAcquis = data.congesPayesAcquis ?? Math.floor(data.nombreJoursOuvres * 2.0833 / 10);
  const cpPris = data.congesPayesPris ?? 0;
  const cpSolde = data.congesPayesSolde ?? (cpAcquis - cpPris);

  const hasIndemnites = !!(data.indemnitesTransport || data.indemniteDeplacementVehicule || data.ticketRestaurantNombre || data.paniersRepasNombre || data.autresIndemnites || data.indemnitesJournalieresSS || data.maintienSalaireMaladie);

  return (
    <Document title={`Bulletin de paie ${moisAnnee} — ${data.prenom} ${data.nom}`}>
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.header}>
          <View>
            <Text style={S.companyName}>{data.raisonSociale}</Text>
            <Text style={S.companyMeta}>{data.adresseEntreprise}, {data.codePostalEntreprise} {data.villeEntreprise}</Text>
            <Text style={S.companyMeta}>SIRET : {data.siret}{(data as any).codeAPE ? ` | APE : ${(data as any).codeAPE}` : ''} | URSSAF : {data.urssaf || data.siret}</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.bulletinTitle}>BULLETIN DE PAIE</Text>
            <Text style={S.headerRightText}>Période : <Text style={{ fontFamily: 'Helvetica-Bold' }}>{dateDebPeriode} – {dateFinPeriode}</Text></Text>
            <Text style={S.headerRightText}>Date de paiement : <Text style={{ fontFamily: 'Helvetica-Bold' }}>{datePaie}</Text></Text>
            <Text style={[S.companyMeta, { marginTop: 1 }]}>Établi le {new Date().toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>

        {/* ── Identité ── */}
        <View style={S.idRow}>
          <View style={[S.idBox, { flex: 1.5 }]}>
            <Text style={S.idBoxTitle}>Salarié</Text>
            <View style={S.idKv}><Text style={S.idKey}>Nom</Text><Text style={S.idVal}>{data.prenom} {data.nom}</Text></View>
            <View style={S.idKv}><Text style={S.idKey}>Adresse</Text><Text style={S.idVal}>{data.adresse}, {data.codePostal} {data.ville}</Text></View>
            <View style={S.idKv}><Text style={S.idKey}>N° Sécu</Text><Text style={S.idVal}>{data.nir}</Text></View>
            <View style={S.idKv}><Text style={S.idKey}>Naissance</Text><Text style={S.idVal}>{data.dateNaissance ? new Date(data.dateNaissance).toLocaleDateString('fr-FR') : ''}</Text></View>
          </View>
          <View style={S.idBox}>
            <Text style={S.idBoxTitle}>Contrat & Emploi</Text>
            <View style={S.idKv}><Text style={S.idKey}>Type</Text><Text style={S.idVal}>{data.typeContrat.toUpperCase()}</Text></View>
            <View style={S.idKv}><Text style={S.idKey}>Statut</Text><Text style={S.idVal}>{data.statut === 'cadre' ? 'Cadre' : data.statut === 'non_cadre' ? 'Non-cadre' : 'Alternance'}</Text></View>
            <View style={S.idKv}><Text style={S.idKey}>Qualification</Text><Text style={S.idVal}>{data.classification}</Text></View>
            <View style={S.idKv}><Text style={S.idKey}>Coeff.</Text><Text style={S.idVal}>{data.coef}</Text></View>
            <View style={S.idKv}><Text style={S.idKey}>CCN</Text><Text style={S.idVal}>{data.conventionCollective}</Text></View>
          </View>
          <View style={S.idBox}>
            <Text style={S.idBoxTitle}>Temps de travail</Text>
            <View style={S.idKv}><Text style={S.idKey}>Heures/mois</Text><Text style={S.idVal}>{data.heuresMensuelles} h</Text></View>
            <View style={S.idKv}><Text style={S.idKey}>Jours ouvrés</Text><Text style={S.idVal}>{data.nombreJoursOuvres} j</Text></View>
            {data.tempsPartiel ? <View style={S.idKv}><Text style={S.idKey}>Temps partiel</Text><Text style={S.idVal}>{data.pourcentageTempsPartiel}%</Text></View> : null}
            <View style={S.idKv}><Text style={S.idKey}>Taux horaire</Text><Text style={S.idVal}>{data.tauxHoraire ? fmtE(data.tauxHoraire) : 'N/A'}</Text></View>
          </View>
        </View>

        {/* ── Éléments de rémunération ── */}
        <Text style={S.sectionHead}>ÉLÉMENTS DE RÉMUNÉRATION</Text>
        <View style={S.table}>
          <View style={S.thead}>
            <Text style={[S.th, { flex: 2 }]}>Libellé</Text>
            <Text style={[S.th, S.thRight]}>Base / Nb</Text>
            <Text style={[S.th, S.thRight]}>Taux</Text>
            <Text style={[S.th, S.thRight]}>Retenue (−)</Text>
            <Text style={[S.th, S.thRight]}>Gain (+)</Text>
          </View>
          <TRow S={S} r={{ label: 'Salaire de base', base: `${data.heuresMensuelles} h`, taux: '', moins: '', plus: fmtE(data.salaireBrut) }} />
          {data.heuresSupp25 ? <TRow S={S} r={{ label: `Heures supp. 25% (${data.heuresSupp25} h)`, base: `${data.heuresSupp25} h`, taux: '× 1,25', moins: '', plus: fmtE(montantSupp25) }} /> : null}
          {data.heuresSupp50 ? <TRow S={S} r={{ label: `Heures supp. 50% (${data.heuresSupp50} h)`, base: `${data.heuresSupp50} h`, taux: '× 1,50', moins: '', plus: fmtE(montantSupp50) }} /> : null}
          {data.primeExceptionnelle ? <TRow S={S} r={{ label: 'Prime exceptionnelle', base: '', taux: '', moins: '', plus: fmtE(data.primeExceptionnelle) }} /> : null}
          {data.prime13Mois ? <TRow S={S} r={{ label: 'Prime 13e mois', base: '', taux: '', moins: '', plus: fmtE(data.prime13Mois) }} /> : null}
          {data.primePerformance ? <TRow S={S} r={{ label: 'Prime de performance', base: '', taux: '', moins: '', plus: fmtE(data.primePerformance) }} /> : null}
          {data.primeAnciennete ? <TRow S={S} r={{ label: "Prime d'ancienneté", base: '', taux: '', moins: '', plus: fmtE(data.primeAnciennete) }} /> : null}
          {data.autresPrimes ? <TRow S={S} r={{ label: 'Autres primes', base: '', taux: '', moins: '', plus: fmtE(data.autresPrimes) }} /> : null}
          {data.indemniteCongesPayes ? <TRow S={S} r={{ label: 'Indemnité de congés payés', base: '', taux: '', moins: '', plus: fmtE(data.indemniteCongesPayes) }} /> : null}
          {data.joursMaladie ? <TRow S={S} r={{ label: `Retenue absence maladie (${data.joursMaladie} j)`, base: `${fmtE(data.salaireBrut / joursOuvres)}/j`, taux: `${joursOuvres} j`, moins: fmtE(retenueMaladie), plus: '' }} /> : null}
          {data.joursAbsenceNonJustifiee ? <TRow S={S} r={{ label: `Retenue absence injustifiée (${data.joursAbsenceNonJustifiee} j)`, base: `${fmtE(data.salaireBrut / joursOuvres)}/j`, taux: `${joursOuvres} j`, moins: fmtE(retenueAbsence), plus: '' }} /> : null}
          <TRow S={S} r={{ label: 'TOTAL BRUT', base: '', taux: '', moins: '', plus: fmtE(totalBrut), bold: true, shade: true }} />
        </View>

        {/* ── Cotisations salariales ── */}
        <Text style={S.sectionHead}>COTISATIONS SALARIALES</Text>
        <View style={S.table}>
          <View style={S.thead}>
            <Text style={[S.th, { flex: 2 }]}>Libellé</Text>
            <Text style={[S.th, S.thRight]}>Base</Text>
            <Text style={[S.th, S.thRight]}>Taux</Text>
            <Text style={[S.th, S.thRight]}>Retenue salarié</Text>
            <Text style={[S.th, S.thRight]}>Part patronale</Text>
          </View>
          <TRow S={S} r={{ label: 'Vieillesse plafonnée', base: fmtE(basePlafonnée), taux: `${tauxVieillessePlafonnée.toFixed(2)}%`, moins: fmtE(vieillessePlafonnéeMontant), plus: '' }} />
          <TRow S={S} r={{ label: 'Vieillesse déplafonnée', base: fmtE(baseDéplafonnée), taux: `${tauxVieillesseDéplafonnée.toFixed(2)}%`, moins: fmtE(vieillesseDéplafonnéeMontant), plus: '' }} />
          {data.statut === 'cadre' ? <TRow S={S} r={{ label: 'Retraite cadres AGIRC-ARRCO (T1)', base: fmtE(Math.min(totalBrut, plafondSS)), taux: '0,86%', moins: fmtE(cotisations.salariales.retraite_cadres), plus: '' }} /> : null}
          <TRow S={S} r={{ label: 'CSG déductible', base: fmtE(totalBrut * 0.9825), taux: '6,80%', moins: fmtE(cotisations.salariales.csg_deductible), plus: '' }} />
          <TRow S={S} r={{ label: 'CSG non-déductible', base: fmtE(totalBrut * 0.9825), taux: '2,40%', moins: fmtE(cotisations.salariales.csg_non_deductible), plus: '' }} />
          <TRow S={S} r={{ label: 'CRDS', base: fmtE(totalBrut * 0.9825), taux: '0,50%', moins: fmtE(cotisations.salariales.crds), plus: '' }} />
          {data.mutuellePartSalarie ? <TRow S={S} r={{ label: 'Mutuelle — part salarié', base: '', taux: '', moins: fmtE(data.mutuellePartSalarie), plus: '' }} /> : null}
          {data.prevoyancePartSalarie ? <TRow S={S} r={{ label: 'Prévoyance — part salarié', base: '', taux: '', moins: fmtE(data.prevoyancePartSalarie), plus: '' }} /> : null}
          <TRow S={S} r={{ label: 'TOTAL COTISATIONS', base: '', taux: '', moins: fmtE(cotisations.salariales.total + (data.mutuellePartSalarie ?? 0) + (data.prevoyancePartSalarie ?? 0)), plus: '', bold: true, shade: true }} />
        </View>

        {/* ── Cotisations patronales ── */}
        <Text style={S.sectionHead}>COTISATIONS PATRONALES (informatives)</Text>
        <View style={S.table}>
          <View style={S.thead}>
            <Text style={[S.th, { flex: 2 }]}>Libellé</Text>
            <Text style={[S.th, S.thRight]}>Base</Text>
            <Text style={[S.th, S.thRight]}>Taux</Text>
            <Text style={[S.th, S.thRight]}>—</Text>
            <Text style={[S.th, S.thRight]}>Montant</Text>
          </View>
          <TRow S={S} r={{ label: 'Maladie', base: fmtE(totalBrut), taux: '13,00%', moins: '', plus: fmtE(cotisations.patronales.maladie) }} />
          <TRow S={S} r={{ label: 'Vieillesse plafonnée', base: fmtE(basePlafonnée), taux: '8,55%', moins: '', plus: fmtE(basePlafonnée * 8.55 / 100) }} />
          <TRow S={S} r={{ label: 'Vieillesse déplafonnée', base: fmtE(baseDéplafonnée), taux: '2,00%', moins: '', plus: fmtE(baseDéplafonnée * 2.00 / 100) }} />
          <TRow S={S} r={{ label: 'Allocations familiales', base: fmtE(totalBrut), taux: '3,45%', moins: '', plus: fmtE(cotisations.patronales.allocations_familiales) }} />
          <TRow S={S} r={{ label: 'Accident du travail', base: fmtE(totalBrut), taux: `${((data.tauxAccidentTravail ?? 0.70)).toFixed(2).replace('.', ',')}%`, moins: '', plus: fmtE(cotisations.patronales.accident_du_travail) }} />
          <TRow S={S} r={{ label: 'Solidarité autonomie', base: fmtE(totalBrut), taux: '0,30%', moins: '', plus: fmtE(cotisations.patronales.solidarite_autonomie) }} />
          <TRow S={S} r={{ label: 'FNAL', base: fmtE(totalBrut), taux: '0,10%', moins: '', plus: fmtE(cotisations.patronales.fnal) }} />
          <TRow S={S} r={{ label: 'Chômage', base: fmtE(Math.min(totalBrut, 4 * plafondSS)), taux: '4,05%', moins: '', plus: fmtE(cotisations.patronales.chomage) }} />
          {data.statut === 'cadre' ? <TRow S={S} r={{ label: 'Retraite cadres AGIRC-ARRCO T1', base: fmtE(Math.min(totalBrut, plafondSS)), taux: '1,29%', moins: '', plus: fmtE(Math.min(totalBrut, plafondSS) * 1.29 / 100) }} /> : null}
          <TRow S={S} r={{ label: 'AGS', base: fmtE(totalBrut), taux: '0,15%', moins: '', plus: fmtE(cotisations.patronales.ags) }} />
          <TRow S={S} r={{ label: 'Formation professionnelle', base: fmtE(totalBrut), taux: '0,55%', moins: '', plus: fmtE(cotisations.patronales.formation) }} />
          {cotisations.patronales.reduction_fillon > 0 ? <TRow S={S} r={{ label: 'Réduction Fillon 2026', base: fmtE(totalBrut), taux: `${(cotisations.patronales.reduction_fillon_taux * 100).toFixed(2)}%`, moins: '', plus: `−${fmtE(cotisations.patronales.reduction_fillon)}` }} /> : null}
          {data.mutuellePartEmployeur ? <TRow S={S} r={{ label: 'Mutuelle — part employeur', base: '', taux: '', moins: '', plus: fmtE(data.mutuellePartEmployeur) }} /> : null}
          {data.prevoyancePartEmployeur ? <TRow S={S} r={{ label: 'Prévoyance — part employeur', base: '', taux: '', moins: '', plus: fmtE(data.prevoyancePartEmployeur) }} /> : null}
          <TRow S={S} r={{ label: 'COÛT TOTAL EMPLOYEUR', base: '', taux: '', moins: '', plus: fmtE(cotisations.coutEmployer + (data.mutuellePartEmployeur ?? 0) + (data.prevoyancePartEmployeur ?? 0)), bold: true, shade: true }} />
        </View>

        {/* ── Indemnités ── */}
        {hasIndemnites && (
          <>
            <Text style={S.sectionHead}>INDEMNITÉS & REMBOURSEMENTS</Text>
            <View style={S.table}>
              <View style={S.thead}>
                <Text style={[S.th, { flex: 3 }]}>Libellé</Text>
                <Text style={[S.th, S.thRight]}>Montant</Text>
              </View>
              {data.indemnitesTransport ? <TRowIndem S={S} label="Remboursement transport" montant={fmtE(data.indemnitesTransport)} /> : null}
              {data.indemniteDeplacementVehicule ? <TRowIndem S={S} label="Indemnité kilométrique" montant={fmtE(data.indemniteDeplacementVehicule)} /> : null}
              {data.ticketRestaurantNombre ? <TRowIndem S={S} label={`Tickets restaurant (${data.ticketRestaurantNombre} × ${fmtE(data.ticketRestaurantMontantEmployeur ?? 0)} part empl.)`} montant={fmtE(data.ticketRestaurantNombre * (data.ticketRestaurantMontantEmployeur ?? 0))} /> : null}
              {data.paniersRepasNombre ? <TRowIndem S={S} label={`Paniers repas (${data.paniersRepasNombre} × ${fmtE((data as any).paniersRepasMontantEmployeur ?? 0)} part empl.)`} montant={fmtE((data as any).paniersRepasTotal ?? (data.paniersRepasNombre * ((data as any).paniersRepasMontantEmployeur ?? 0)))} /> : null}
              {data.indemnitesJournalieresSS ? <TRowIndem S={S} label="IJ Sécurité Sociale" montant={fmtE(data.indemnitesJournalieresSS)} /> : null}
              {data.maintienSalaireMaladie ? <TRowIndem S={S} label="Maintien salaire maladie (employeur)" montant={fmtE(data.maintienSalaireMaladie)} /> : null}
              {data.autresIndemnites ? <TRowIndem S={S} label="Autres indemnités" montant={fmtE(data.autresIndemnites)} /> : null}
            </View>
          </>
        )}

        {/* ── NET À PAYER ── */}
        <View style={S.netBox}>
          <View>
            <Text style={S.netLabel}>NET À PAYER</Text>
            <Text style={S.netSub}>Net imposable : {fmtE(cotisations.salaireNetImposable)}</Text>
          </View>
          <Text style={S.netAmount}>{fmtE(Math.max(0, netAvantImpot))}</Text>
        </View>

        {/* ── Footer ── */}
        <View style={S.footerRow}>
          <View style={S.footerBox}>
            <Text style={S.footerBoxTitle}>Congés payés</Text>
            <View style={S.footerKv}><Text>Acquis ce mois</Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmt(cpAcquis)} j</Text></View>
            <View style={S.footerKv}><Text>Pris ce mois</Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmt(cpPris)} j</Text></View>
            <View style={S.footerKv}><Text>Solde</Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmt(cpSolde)} j</Text></View>
          </View>
          <View style={S.footerBox}>
            <Text style={S.footerBoxTitle}>Récapitulatif du mois</Text>
            <View style={S.footerKv}><Text>Salaire brut</Text><Text>{fmtE(totalBrut)}</Text></View>
            <View style={S.footerKv}><Text>Cotisations salariales</Text><Text style={{ color: '#c0392b' }}>− {fmtE(cotisations.salariales.total)}</Text></View>
            <View style={S.footerKv}><Text>Net avant impôt</Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmtE(Math.max(0, netAvantImpot))}</Text></View>
            <View style={S.footerKv}><Text>Coût employeur</Text><Text>{fmtE(cotisations.coutEmployer)}</Text></View>
          </View>
          <View style={S.footerBox}>
            <Text style={S.footerBoxTitle}>PAS & Cumuls</Text>
            <View style={S.footerKv}><Text>Taux PAS</Text><Text>{data.tauxPAS ? data.tauxPAS.toFixed(1) + ' %' : 'Cf. DGFIP'}</Text></View>
            <View style={S.footerKv}><Text>Brut annuel</Text><Text>{fmtE((data as any).cumulsAnnuelsBrut ?? data.salaireBrutAnnuel ?? totalBrut * 12)}</Text></View>
          </View>
        </View>

        <Text style={S.mention}>
          Art. R3243-1 C. trav. — Ce bulletin de paie doit être conservé sans limitation de durée. | {data.raisonSociale} — SIRET {data.siret}
        </Text>
      </Page>
    </Document>
  );
};

// ── Exported function ─────────────────────────────────────────────────────────

export async function generatePayslipReactPdfBuffer(data: BulletinPaieData): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<BulletinPDF data={data} />);
  return new Uint8Array(buffer);
}

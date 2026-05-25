/**
 * Server-side PDF generation using @react-pdf/renderer (pure JS, Vercel-compatible)
 */
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { getContractArticles } from '@/lib/labor-law/contract-templates';

export type { ContractTemplateData } from '@/lib/labor-law/contract-templates';
import type { ContractTemplateData } from '@/lib/labor-law/contract-templates';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d?: string): string {
  if (!d) return '_____________';
  try {
    const date = new Date(d.includes('T') ? d : `${d}T00:00:00`);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return d; }
}

function fmtMoney(v?: string): string {
  if (!v) return '0,00 €';
  const n = parseFloat(v);
  return isNaN(n) ? v : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function getTitle(type: string): string {
  const titles: Record<string, string> = {
    cdi: 'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE',
    cdd: 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE',
    stage: 'CONVENTION DE STAGE',
    apprentissage: "CONTRAT D'APPRENTISSAGE",
    professionnalisation: 'CONTRAT DE PROFESSIONNALISATION',
    interim: 'CONTRAT DE MISSION TEMPORAIRE',
    portage: 'CONTRAT DE PORTAGE SALARIAL',
    freelance: 'CONTRAT DE PRESTATION DE SERVICES',
  };
  return titles[type] || 'CONTRAT DE TRAVAIL';
}

function getLegal(type: string): string {
  const refs: Record<string, string> = {
    cdi: 'Articles L.1221-1 et suivants du Code du travail',
    cdd: 'Articles L.1242-1 et suivants du Code du travail',
    stage: "Articles L.124-1 et suivants du Code de l'éducation",
    apprentissage: 'Articles L.6211-1 et suivants du Code du travail',
    professionnalisation: 'Articles L.6325-1 et suivants du Code du travail',
    interim: 'Articles L.1251-1 et suivants du Code du travail',
    portage: 'Articles L.1254-1 et suivants du Code du travail',
    freelance: 'Code civil, articles 1710 et suivants',
  };
  return refs[type] || 'Code du travail';
}

function getSalaryLabel(freq: string): string {
  const l: Record<string, string> = { hourly: 'brut / heure', weekly: 'brut / semaine', flat_rate: 'forfait brut' };
  return l[freq] || 'brut mensuel';
}

function getSignatureSrc(sig?: string): string | null {
  if (!sig) return null;
  if (sig.startsWith('data:')) return sig;
  return `data:image/png;base64,${sig}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: {
      paddingTop: 42, paddingBottom: 52, paddingLeft: 52, paddingRight: 52,
      fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a', lineHeight: 1.45,
    },
    // Header
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingBottom: 8, marginBottom: 14,
      borderBottomWidth: 2, borderBottomColor: accent, borderBottomStyle: 'solid',
    },
    companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: accent },
    companyDetail: { fontSize: 7.5, color: '#666', marginTop: 2 },
    docMeta: { fontSize: 7.5, color: '#888', textAlign: 'right' },
    // Title
    mainTitle: {
      fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center',
      color: accent, marginBottom: 4, marginTop: 6, letterSpacing: 0.5,
    },
    subTitle: { fontSize: 9.5, textAlign: 'center', color: '#555', marginBottom: 3 },
    legalRef: { fontSize: 8, textAlign: 'center', color: '#888', marginBottom: 18, fontFamily: 'Helvetica-Oblique' },
    // Section
    sectionTitle: {
      fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff',
      backgroundColor: accent, paddingHorizontal: 8, paddingVertical: 4,
      marginTop: 14, marginBottom: 8,
    },
    // Parties
    partiesRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    partyBox: {
      flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid',
      borderRadius: 4, padding: 8,
    },
    partyLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: accent, marginBottom: 4 },
    partyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 3 },
    infoRow: { fontSize: 8, color: '#444', marginBottom: 2 },
    // Summary table
    tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', borderBottomStyle: 'solid' },
    tableKey: { width: '38%', backgroundColor: '#f8fafc', padding: 4, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155' },
    tableVal: { width: '62%', padding: 4, fontSize: 8, color: '#1a1a1a' },
    // Article
    articleTitle: {
      fontSize: 10, fontFamily: 'Helvetica-Bold', color: accent,
      borderLeftWidth: 3, borderLeftColor: accent, borderLeftStyle: 'solid',
      paddingLeft: 8, marginTop: 10, marginBottom: 4,
    },
    articlePara: { fontSize: 8.5, color: '#333', marginBottom: 4, textAlign: 'justify' },
    // Signatures
    sigRow: { flexDirection: 'row', gap: 20, marginTop: 20 },
    sigBox: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid', borderRadius: 4, padding: 10 },
    sigTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3, color: accent },
    sigName: { fontSize: 8.5, color: '#444', marginBottom: 2 },
    sigDate: { fontSize: 8, color: '#888', fontFamily: 'Helvetica-Oblique', marginBottom: 8 },
    sigLine: { borderBottomWidth: 1, borderBottomColor: '#333', borderBottomStyle: 'solid', marginBottom: 4, marginTop: 35 },
    sigHint: { fontSize: 7, color: '#888', fontFamily: 'Helvetica-Oblique' },
    sigImage: { maxWidth: 140, maxHeight: 55, marginTop: 4 },
    // Legal disclaimer
    disclaimer: {
      marginTop: 16, padding: 6, borderWidth: 0.5, borderColor: '#e6d800',
      borderStyle: 'solid', borderRadius: 2,
      fontSize: 6.5, color: '#777', lineHeight: 1.3,
    },
    // Footer
    footer: { position: 'absolute', bottom: 24, left: 52, right: 52 },
    footerLine: { borderTopWidth: 0.5, borderTopColor: '#ddd', borderTopStyle: 'solid', paddingTop: 4 },
    footerText: { fontSize: 7, color: '#aaa', textAlign: 'center' },
    // Misc
    separator: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderBottomStyle: 'solid', marginVertical: 10 },
    italic: { fontFamily: 'Helvetica-Oblique' },
    bold: { fontFamily: 'Helvetica-Bold' },
  });
}

// ── React PDF Component ───────────────────────────────────────────────────────

const ContractPDF: React.FC<{ data: ContractTemplateData }> = ({ data }) => {
  const accent = data.accentColor || '#1a1a1a';
  const S = makeStyles(accent);
  const title = getTitle(data.contractType);
  const legalRef = getLegal(data.contractType);
  const articles = getContractArticles(data);

  const docRef = `${data.contractType.toUpperCase()}-${(data.companyName || '').slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const sigDate = fmtDate(data.signatureDate || new Date().toISOString().split('T')[0]);
  const sigCity = data.signatureCity || data.companyCity || '_____________';

  const employerSig = getSignatureSrc(data.employerSignature);
  const employeeSig = getSignatureSrc(data.employeeSignature);

  // Summary rows
  const rows: [string, string][] = [
    ['Poste / Fonction', data.jobTitle],
    ["Date d'entrée", fmtDate(data.contractStartDate)],
  ];
  if (data.contractEndDate) rows.push(['Date de fin', fmtDate(data.contractEndDate)]);
  if (data.trialPeriodDays) rows.push(["Période d'essai", `${data.trialPeriodDays} jours`]);
  rows.push(['Durée du travail', data.workSchedule || '35h hebdomadaires']);
  rows.push(['Lieu de travail', data.workLocation]);
  rows.push(['Rémunération', `${fmtMoney(data.salaryAmount)} ${getSalaryLabel(data.salaryFrequency)}`]);
  if (data.collectiveAgreement) rows.push(['Convention collective', data.collectiveAgreement]);
  if (data.contractType === 'cdd' && data.contractReason) rows.push(['Motif du CDD', data.contractReason]);
  if (data.schoolName) rows.push(["École / CFA", data.schoolName]);
  if (data.tutorName) rows.push(['Tuteur / Maître de stage', data.tutorName]);

  return (
    <Document title={`${title} — ${data.employeeFirstName} ${data.employeeLastName}`} author={data.companyName}>
      <Page size="A4" style={S.page}>
        {/* ── Header ── */}
        <View style={S.header} fixed>
          <View>
            <Text style={S.companyName}>{data.companyName}</Text>
            <Text style={S.companyDetail}>{data.companyAddress}, {data.companyPostalCode} {data.companyCity}</Text>
            <Text style={S.companyDetail}>SIRET : {data.companySiret}{data.companyApe ? `  |  APE : ${data.companyApe}` : ''}</Text>
          </View>
          <View>
            <Text style={S.docMeta}>Réf. {docRef}</Text>
            <Text style={S.docMeta}>2 exemplaires originaux</Text>
          </View>
        </View>

        {/* ── Title ── */}
        <Text style={S.mainTitle}>{title}</Text>
        <Text style={S.subTitle}>{data.jobTitle}{data.collectiveAgreement ? `  —  Conv. : ${data.collectiveAgreement}` : ''}</Text>
        <Text style={S.legalRef}>{legalRef}</Text>

        {/* ── Parties ── */}
        <Text style={S.sectionTitle}>LES PARTIES</Text>
        <View style={S.partiesRow}>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>L'EMPLOYEUR</Text>
            <Text style={S.partyName}>{data.companyName}</Text>
            <Text style={S.infoRow}>{data.companyAddress}</Text>
            <Text style={S.infoRow}>{data.companyPostalCode} {data.companyCity}</Text>
            <Text style={S.infoRow}>SIRET : {data.companySiret}</Text>
            {data.companyApe ? <Text style={S.infoRow}>APE : {data.companyApe}</Text> : null}
            {data.companyRcs ? <Text style={S.infoRow}>RCS : {data.companyRcs}</Text> : null}
            <Text style={S.infoRow}>Représenté(e) par : {data.employerName}, {data.employerTitle}</Text>
            {data.collectiveAgreement ? <Text style={S.infoRow}>Conv. : {data.collectiveAgreement}</Text> : null}
          </View>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>LE / LA SALARIÉ(E)</Text>
            <Text style={S.partyName}>{data.employeeFirstName} {data.employeeLastName}</Text>
            <Text style={S.infoRow}>Né(e) le : {fmtDate(data.employeeBirthDate)}</Text>
            {data.employeeBirthPlace ? <Text style={S.infoRow}>Lieu de naissance : {data.employeeBirthPlace}</Text> : null}
            <Text style={S.infoRow}>Nationalité : {data.employeeNationality || 'Française'}</Text>
            <Text style={S.infoRow}>{data.employeeAddress}</Text>
            <Text style={S.infoRow}>{data.employeePostalCode} {data.employeeCity}</Text>
            {data.employeeEmail ? <Text style={S.infoRow}>Email : {data.employeeEmail}</Text> : null}
            {data.employeePhone ? <Text style={S.infoRow}>Tél. : {data.employeePhone}</Text> : null}
            {data.employeeSocialSecurity ? <Text style={S.infoRow}>N° SS : {data.employeeSocialSecurity}</Text> : null}
          </View>
        </View>

        {/* ── Summary table ── */}
        <Text style={S.sectionTitle}>CONDITIONS ESSENTIELLES</Text>
        <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
          {rows.map(([key, val], i) => (
            <View key={i} style={[S.tableRow, i % 2 === 0 ? {} : { backgroundColor: '#fafafa' }]}>
              <Text style={S.tableKey}>{key}</Text>
              <Text style={S.tableVal}>{val}</Text>
            </View>
          ))}
        </View>

        {/* ── Articles ── */}
        <Text style={S.sectionTitle}>CONDITIONS GÉNÉRALES</Text>
        {articles.map((art, i) => (
          <View key={i}>
            <Text style={S.articleTitle}>Article {i + 1} — {art.title}</Text>
            {art.paragraphs.map((p, j) => (
              <Text key={j} style={S.articlePara}>{p}</Text>
            ))}
          </View>
        ))}

        {/* ── Signatures ── */}
        <View break>
          <Text style={S.sectionTitle}>SIGNATURES</Text>
          <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Oblique', color: '#555', textAlign: 'center', marginBottom: 20 }}>
            Fait en deux exemplaires originaux, dont un est remis à chaque partie.{'\n'}À {sigCity}, le {sigDate}
          </Text>
          <View style={S.sigRow}>
            {/* Employer */}
            <View style={S.sigBox}>
              <Text style={S.sigTitle}>Pour l'employeur :</Text>
              <Text style={S.sigName}>{data.companyName}</Text>
              <Text style={S.sigName}>Représenté(e) par {data.employerName}, {data.employerTitle}</Text>
              {employerSig
                ? <Image style={S.sigImage} src={employerSig} />
                : <View style={S.sigLine} />}
              <Text style={S.sigHint}>Signature (précédée de la mention "Lu et approuvé")</Text>
            </View>
            {/* Employee */}
            <View style={S.sigBox}>
              <Text style={S.sigTitle}>Pour le/la salarié(e) :</Text>
              <Text style={S.sigName}>{data.employeeFirstName} {data.employeeLastName}</Text>
              {employeeSig
                ? <Image style={S.sigImage} src={employeeSig} />
                : <View style={S.sigLine} />}
              <Text style={S.sigHint}>Signature (précédée de la mention "Lu et approuvé")</Text>
            </View>
          </View>
          <Text style={{ fontSize: 7.5, color: '#888', fontFamily: 'Helvetica-Oblique', textAlign: 'center', marginTop: 20 }}>
            L'employeur reconnaît avoir remis un exemplaire du présent contrat au salarié.
          </Text>

          {/* ── Legal disclaimer ── */}
          <View style={S.disclaimer}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: '#555' }}>Avertissement :</Text>
            <Text>Ce document a été généré automatiquement par Factu.me à partir des informations fournies. Il constitue un modèle de contrat de travail et ne remplace pas l'avis d'un professionnel du droit (avocat, expert-comptable ou juriste). Vérifiez la conformité avec la convention collective applicable et la réglementation en vigueur avant toute signature.</Text>
          </View>
        </View>

        {/* ── Footer (every page) ── */}
        <View style={S.footer} fixed>
          <View style={S.footerLine}>
            <Text style={S.footerText} render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}  —  ${data.companyName}  —  SIRET ${data.companySiret}`
            } />
          </View>
        </View>
      </Page>
    </Document>
  );
};

// ── Exported function ─────────────────────────────────────────────────────────

export async function generateContractPdfBuffer(
  data: ContractTemplateData
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<ContractPDF data={data} />);
  return new Uint8Array(buffer);
}

/**
 * Service d'export de contrats au format DOCX (Word)
 * Génère un document Word professionnel avec structure complète
 */

import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  convertInchesToTwip, BorderStyle, TableCell, TableRow, Table, WidthType,
  PageNumber, Footer, Header, ShadingType, UnderlineType, PageBreak,
} from 'docx';
import { getContractArticles } from './contract-templates';

export interface ContractData {
  accentColor?: string;

  // Salarié
  employeeFirstName: string;
  employeeLastName: string;
  employeeAddress: string;
  employeePostalCode: string;
  employeeCity: string;
  employeeEmail?: string;
  employeePhone?: string;
  employeeBirthDate: string;
  employeeBirthPlace?: string;
  employeeSocialSecurity?: string;
  employeeNationality: string;
  employeeQualification?: string;

  // Contrat
  contractType: 'cdd' | 'cdi' | 'stage' | 'apprentissage' | 'professionnalisation' | 'interim' | 'portage' | 'freelance';
  contractStartDate: string;
  contractEndDate?: string;
  trialPeriodDays?: string;
  trialPeriodRenewable?: boolean;
  jobTitle: string;
  jobDescription?: string;
  workLocation: string;
  workSchedule: string;
  workingHours?: string;
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly' | 'weekly' | 'flat_rate';
  contractClassification?: string;
  contractCoefficient?: string;
  contractClassificationCode?: string;
  contractReason?: string;
  replacedEmployeeName?: string;

  // Entreprise
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  companyAPE?: string;
  companyRCS?: string;
  employerName: string;
  employerTitle: string;

  // Avantages
  hasTransport?: boolean;
  hasMeal?: boolean;
  hasHealth?: boolean;
  hasOther?: boolean;
  otherBenefits?: string;
  transportPercentage?: number;
  mealTicketAmount?: number;
  healthInsuranceAmount?: number;

  // Clauses
  collectiveAgreement?: string;
  collectiveAgreementIdcc?: string;
  probationClause?: boolean;
  nonCompeteClause?: boolean;
  nonCompeteDuration?: string;
  nonCompeteArea?: string;
  nonCompeteCompensation?: string;
  mobilityClause?: boolean;
  mobilityArea?: string;
  confidentialityClause?: boolean;

  // Stage / Alternance
  tutorName?: string;
  tutorJob?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolContact?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  durationWeeks?: string;
  internshipGratification?: string;
  opcoName?: string;
  cfaName?: string;
  diplomaTitle?: string;
  diplomaLevel?: string;

  // Congés et absences
  vacationDays?: number;
  probationNoticeDays?: number;
  noticePeriodEmployer?: string;
  noticePeriodEmployee?: string;

  // Signatures
  employerSignature?: string;
  employeeSignature?: string;
  employerSignatureDate?: string;
  employeeSignatureDate?: string;
  signatureCity?: string;
  signatureDate?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '___________';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtMoney(amount?: string): string {
  if (!amount) return '___________';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function getContractTitle(type: string): string {
  const titles: Record<string, string> = {
    cdd: 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE',
    cdi: 'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE',
    stage: 'CONVENTION DE STAGE',
    apprentissage: "CONTRAT D'APPRENTISSAGE",
    professionnalisation: 'CONTRAT DE PROFESSIONNALISATION',
    interim: 'CONTRAT DE MISSION TEMPORAIRE',
    portage: 'CONTRAT DE PORTAGE SALARIAL',
    freelance: 'CONTRAT DE PRESTATION DE SERVICES',
  };
  return titles[type] || 'CONTRAT DE TRAVAIL';
}

function getLegalRef(type: string): string {
  const refs: Record<string, string> = {
    cdd: 'Articles L. 1242-1 et suivants du Code du travail',
    cdi: 'Articles L. 1221-1 et suivants du Code du travail',
    stage: "Articles L. 124-1 et suivants du Code de l'éducation",
    apprentissage: 'Articles L. 6211-1 et suivants du Code du travail',
    professionnalisation: 'Articles L. 6325-1 et suivants du Code du travail',
    interim: 'Articles L. 1251-1 et suivants du Code du travail',
  };
  return refs[type] || 'Articles L. 1221-1 et suivants du Code du travail';
}

function getSalaryLabel(freq: string): string {
  const labels: Record<string, string> = {
    monthly: 'brut mensuel',
    hourly: 'brut / heure',
    weekly: 'brut / semaine',
    flat_rate: 'forfait brut',
  };
  return labels[freq] || freq;
}

// ── Paragraph builders ────────────────────────────────────────────────────────

const sp = (before = 0, after = 120) => ({ before, after });

function h1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: '1a1a1a', allCaps: true })],
    alignment: AlignmentType.CENTER,
    spacing: sp(0, 200),
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: '1a1a1a',
        underline: { type: UnderlineType.SINGLE },
      }),
    ],
    spacing: sp(300, 120),
  });
}

function h3(text: string, articleNum: number): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `Article ${articleNum} — `, bold: true, size: 22, color: '2C3E50' }),
      new TextRun({ text, bold: true, size: 22, color: '2C3E50' }),
    ],
    spacing: sp(240, 80),
  });
}

function body(text: string, indent = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 21 })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: sp(0, 120),
    indent: indent ? { left: convertInchesToTwip(0.3) } : undefined,
  });
}

function bold(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true, size: 21 }),
      new TextRun({ text: value, size: 21 }),
    ],
    spacing: sp(0, 80),
  });
}

function separator(): Paragraph {
  return new Paragraph({
    border: {
      bottom: { color: 'CCCCCC', style: BorderStyle.SINGLE, size: 6 },
    },
    spacing: sp(120, 120),
    children: [],
  });
}

function blankLine(): Paragraph {
  return new Paragraph({ children: [], spacing: sp(0, 160) });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

// ── Info table (key-value rows) ───────────────────────────────────────────────

function infoTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.DOTTED, color: 'DDDDDD', size: 4 },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
            children: [new Paragraph({
              children: [new TextRun({ text: label, bold: true, size: 20 })],
              spacing: sp(40, 40),
              indent: { left: convertInchesToTwip(0.1) },
            })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            children: [new Paragraph({
              children: [new TextRun({ text: value, size: 20 })],
              spacing: sp(40, 40),
              indent: { left: convertInchesToTwip(0.1) },
            })],
          }),
        ],
      })
    ),
  });
}

// ── Signature blocks ──────────────────────────────────────────────────────────

function signatureTable(data: ContractData): Table {
  const sigDate = data.signatureDate ? fmtDate(data.signatureDate) : fmtDate(new Date().toISOString().split('T')[0]);
  const city = data.signatureCity || data.companyCity || '_____________';

  const makeBlock = (title: string, name: string) => new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    children: [
      new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 22 })], spacing: sp(0, 80) }),
      new Paragraph({ children: [new TextRun({ text: name, size: 20 })], spacing: sp(0, 120) }),
      new Paragraph({ children: [new TextRun({ text: `À ${city}, le ${sigDate}`, size: 18, italics: true, color: '666666' })], spacing: sp(0, 200) }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, color: '333333', size: 6 } },
        spacing: sp(280, 40),
        children: [],
      }),
      new Paragraph({ children: [new TextRun({ text: 'Signature (précédée de la mention "Lu et approuvé")', size: 16, color: '888888', italics: true })], spacing: sp(40, 0) }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          makeBlock("Pour l'employeur :", `${data.companyName}\nReprésenté(e) par ${data.employerName}, ${data.employerTitle}`),
          makeBlock('Pour le/la salarié(e) :', `${data.employeeFirstName} ${data.employeeLastName}`),
        ],
      }),
    ],
  });
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateContractDOCX(data: ContractData): Promise<Blob> {
  const title = getContractTitle(data.contractType);
  const legalRef = getLegalRef(data.contractType);

  // ── Summary info table rows ───────────────────────────────────────────────
  const summaryRows: [string, string][] = [
    ['Poste / Fonction', data.jobTitle],
    ["Date d'entrée en fonction", fmtDate(data.contractStartDate)],
  ];
  if (data.contractEndDate) summaryRows.push(['Date de fin prévue', fmtDate(data.contractEndDate)]);
  if (data.durationWeeks && data.contractType === 'stage') summaryRows.push(['Durée du stage', `${data.durationWeeks} semaines`]);
  if (data.trialPeriodDays) summaryRows.push(["Période d'essai", `${data.trialPeriodDays} jours${data.trialPeriodRenewable ? ' (renouvelable)' : ''}`]);
  summaryRows.push(['Durée du travail', data.workingHours ? `${data.workingHours} h / semaine` : '35 h / semaine (temps plein)']);
  summaryRows.push(['Horaires', data.workSchedule || 'Selon planning']);
  summaryRows.push(['Lieu de travail habituel', data.workLocation]);
  summaryRows.push(['Rémunération', `${fmtMoney(data.salaryAmount)} ${getSalaryLabel(data.salaryFrequency)}`]);
  if (data.contractClassification) summaryRows.push(['Classification', `${data.contractClassification}${data.contractCoefficient ? ` — Coeff. ${data.contractCoefficient}` : ''}`]);
  if (data.collectiveAgreement) summaryRows.push(['Convention collective', `${data.collectiveAgreement}${data.collectiveAgreementIdcc ? ` (IDCC ${data.collectiveAgreementIdcc})` : ''}`]);
  if (data.contractType === 'cdd' && data.contractReason) summaryRows.push(['Motif du CDD', data.contractReason]);
  if (data.schoolName) summaryRows.push(["Établissement d'enseignement", data.schoolName]);
  if (data.tutorName) summaryRows.push(['Maître de stage / Tuteur', data.tutorName]);

  // ── Articles — mêmes que le PDF, extraits du template HTML partagé ──────────
  // getContractArticles() utilise le même generateArticles() que le template HTML,
  // garantissant que le Word et le PDF ont un contenu identique.
  const sharedArticles = getContractArticles(data as any);
  const articles: Paragraph[] = [];

  for (let i = 0; i < sharedArticles.length; i++) {
    const { title: artTitle, paragraphs } = sharedArticles[i];
    // Titre de l'article
    articles.push(new Paragraph({
      children: [
        new TextRun({ text: `Article ${i + 1} — `, bold: true, size: 22, color: '2C3E50' }),
        new TextRun({ text: artTitle, bold: true, size: 22, color: '2C3E50' }),
      ],
      spacing: sp(240, 80),
      border: { left: { style: BorderStyle.THICK, color: '2C3E50', size: 12 } },
      indent: { left: convertInchesToTwip(0.15) },
    }));
    // Paragraphes du corps
    for (const para of paragraphs) {
      articles.push(new Paragraph({
        children: [new TextRun({ text: para, size: 21 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: sp(0, 100),
        indent: { left: convertInchesToTwip(0.15) },
      }));
    }
    articles.push(new Paragraph({ children: [], spacing: sp(0, 60) }));
  }

  // ── Build document ─────────────────────────────────────────────────────────
  const doc = new Document({
    title,
    description: `Contrat de travail — ${data.companyName} / ${data.employeeFirstName} ${data.employeeLastName}`,
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.18),
            right: convertInchesToTwip(1.18),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${title} — `, size: 18, color: '888888' }),
                new TextRun({ text: `${data.companyName} / ${data.employeeFirstName} ${data.employeeLastName}`, size: 18, color: '555555', bold: true }),
              ],
              border: { bottom: { style: BorderStyle.SINGLE, color: 'DDDDDD', size: 4 } },
              spacing: sp(0, 60),
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Page ', size: 16, color: '888888' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888' }),
                new TextRun({ text: ' sur ', size: 16, color: '888888' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '888888' }),
                new TextRun({ text: `     —     ${data.companyName} — SIRET ${data.companySiret}`, size: 16, color: 'AAAAAA' }),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, color: 'DDDDDD', size: 4 } },
              spacing: sp(60, 0),
            }),
          ],
        }),
      },
      children: [
        // ── TITRE ──────────────────────────────────────────────────────────
        h1(title),
        new Paragraph({
          children: [new TextRun({ text: legalRef, size: 18, italics: true, color: '666666' })],
          alignment: AlignmentType.CENTER,
          spacing: sp(0, 80),
        }),
        new Paragraph({
          children: [new TextRun({ text: `Document confidentiel — ${new Date().toLocaleDateString('fr-FR')}`, size: 16, color: '999999' })],
          alignment: AlignmentType.CENTER,
          spacing: sp(0, 300),
        }),

        separator(),

        // ── PARTIES ────────────────────────────────────────────────────────
        h2('ENTRE LES SOUSSIGNÉS'),

        bold("L'Employeur : ", `${data.companyName}`),
        bold('Adresse : ', `${data.companyAddress}, ${data.companyPostalCode} ${data.companyCity}`),
        bold('SIRET : ', data.companySiret),
        ...(data.companyAPE ? [bold('Code APE : ', data.companyAPE)] : []),
        bold('Représenté(e) par : ', `${data.employerName}, ${data.employerTitle}`),

        blankLine(),

        bold('ET : ', `${data.employeeFirstName} ${data.employeeLastName}`),
        bold('Né(e) le : ', fmtDate(data.employeeBirthDate)),
        ...(data.employeeBirthPlace ? [bold('Lieu de naissance : ', data.employeeBirthPlace)] : []),
        bold('Nationalité : ', data.employeeNationality),
        bold('Demeurant : ', `${data.employeeAddress}, ${data.employeePostalCode} ${data.employeeCity}`),
        ...(data.employeeEmail ? [bold('Email : ', data.employeeEmail)] : []),
        ...(data.employeePhone ? [bold('Téléphone : ', data.employeePhone)] : []),
        ...(data.employeeSocialSecurity ? [bold('N° Sécurité sociale : ', data.employeeSocialSecurity)] : []),

        separator(),

        // ── TABLEAU RÉCAPITULATIF ────────────────────────────────────────────
        h2('IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT'),

        new Paragraph({
          children: [new TextRun({ text: 'Récapitulatif des conditions essentielles du contrat :', size: 20, italics: true, color: '444444' })],
          spacing: sp(0, 100),
        }),
        infoTable(summaryRows),
        blankLine(),

        separator(),

        // ── ARTICLES DU CONTRAT ──────────────────────────────────────────────
        h2('CONDITIONS GÉNÉRALES DU CONTRAT'),
        ...articles,

        blankLine(),
        separator(),

        // ── SIGNATURES ─────────────────────────────────────────────────────
        pageBreak(),
        h2('SIGNATURES'),
        new Paragraph({
          children: [new TextRun({ text: 'Fait en deux exemplaires originaux, dont un est remis à chaque partie.', size: 20, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: sp(0, 400),
        }),
        signatureTable(data),

        blankLine(),
        blankLine(),
        new Paragraph({
          children: [new TextRun({ text: 'L\'employeur reconnaît avoir remis un exemplaire du présent contrat au salarié.', size: 18, color: '888888', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: sp(200, 0),
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

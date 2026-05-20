'use client';
import { useEffect, useRef, useMemo } from 'react';
import { genererBulletinPaieHTML, type BulletinPaieData } from '@/lib/labor-law/bulletin-paie';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayslipPreviewProps {
  employeeData: {
    nom?: string;
    prenom?: string;
    nir?: string;
    dateNaissance?: string;
    adresse?: string;
    codePostal?: string;
    ville?: string;
    poste?: string;
    statut?: string;
    situationFamiliale?: string;
    nombreEnfants?: number;
  };
  companyData: {
    raisonSociale?: string;
    siret?: string;
    adresseEntreprise?: string;
    codePostalEntreprise?: string;
    villeEntreprise?: string;
    urssaf?: string;
    codeAPE?: string;
  };
  salaryData: {
    salaireBrut: number;
    salaireNet: number;
    cotisationsPatronales: number;
    cotisationsSalariales: number;
    coutEmployeur: number;
    heuresMensuelles: number;
    reductionFillon?: number;
    heuresSupp25?: number;
    heuresSupp50?: number;
    primeExceptionnelle?: number;
    joursMaladie?: number;
  };
  period: {
    mois: number;
    annee: number;
    debut: string;
    fin: string;
    joursOuvres: number;
  };
  accentColor?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayslipPreview({
  employeeData,
  companyData,
  salaryData,
  period,
  accentColor = '#1D9E75',
}: PayslipPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build BulletinPaieData from props
  const bulletinData: BulletinPaieData = useMemo(() => {
    const periodeDebut = period.debut || `${period.annee}-${String(period.mois).padStart(2, '0')}-01`;
    const lastDay = new Date(period.annee, period.mois, 0).getDate();
    const periodeFin = period.fin || `${period.annee}-${String(period.mois).padStart(2, '0')}-${lastDay}`;

    const tauxHoraire = salaryData.heuresMensuelles > 0
      ? salaryData.salaireBrut / salaryData.heuresMensuelles
      : salaryData.salaireBrut / 151.67;

    return {
      nom: employeeData.nom || '',
      prenom: employeeData.prenom || '',
      adresse: employeeData.adresse || '',
      codePostal: employeeData.codePostal || '',
      ville: employeeData.ville || '',
      nir: employeeData.nir || '',
      dateNaissance: employeeData.dateNaissance || '',
      situationFamiliale: (employeeData.situationFamiliale as any) || 'celibataire',
      nombreEnfants: employeeData.nombreEnfants || 0,

      typeContrat: 'cdi',
      dateDebut: periodeDebut,
      statut: (employeeData.statut as any) || 'non_cadre',
      classification: employeeData.poste || '',
      conventionCollective: '',
      coef: 100,

      salaireBrut: salaryData.salaireBrut,
      salaireBrutAnnuel: salaryData.salaireBrut * 12,
      tauxHoraire,
      heuresMensuelles: salaryData.heuresMensuelles || 151.67,
      heuresSupplementaires: 0,
      heuresSupp25: salaryData.heuresSupp25,
      heuresSupp50: salaryData.heuresSupp50,
      primeExceptionnelle: salaryData.primeExceptionnelle,

      raisonSociale: companyData.raisonSociale || '',
      siret: companyData.siret || '',
      adresseEntreprise: companyData.adresseEntreprise || '',
      codePostalEntreprise: companyData.codePostalEntreprise || '',
      villeEntreprise: companyData.villeEntreprise || '',
      urssaf: companyData.urssaf || companyData.siret || '',
      codeAPE: companyData.codeAPE,

      periodeDebut,
      periodeFin,
      nombreJoursOuvres: period.joursOuvres || 22,

      accentColor,
    };
  }, [employeeData, companyData, salaryData, period, accentColor]);

  // Generate HTML
  const html = useMemo(() => {
    try {
      return genererBulletinPaieHTML(bulletinData);
    } catch (error) {
      console.error('[PayslipPreview] Error generating HTML:', error);
      return `<html><body><p style="padding:40px;text-align:center;color:#999;">Erreur lors de la génération du bulletin</p></body></html>`;
    }
  }, [bulletinData]);

  // Write HTML to iframe
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className="payslip-iframe w-full h-full border-0"
      style={{ minHeight: '600px' }}
      title="Aperçu bulletin de paie"
      data-html={encodeURIComponent(html)}
    />
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateContract } from '@/lib/labor-law/contract-templates';
import type { ContractTemplateData } from '@/lib/labor-law/contract-templates';

/**
 * API Route - Generate Contract PDF from HTML Template
 *
 * Cette API utilise le MÊME template que l'aperçu HTML
 * pour garantir que le PDF est IDENTIQUE à l'aperçu
 *
 * POST /api/contracts/html-pdf
 */
export async function POST(req: NextRequest) {
  try {
    // Authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const raw: Record<string, any> = body.contract ?? body;

    if (!raw) {
      return NextResponse.json(
        { error: 'Données de contrat manquantes' },
        { status: 400 }
      );
    }

    // Validation des champs obligatoires
    const REQUIRED: Array<[string, string]> = [
      ['employee_first_name', 'employeeFirstName'],
      ['employee_last_name', 'employeeLastName'],
      ['contract_start_date', 'contractStartDate'],
      ['job_title', 'jobTitle'],
      ['salary_amount', 'salaryAmount'],
      ['company_name', 'companyName'],
      ['company_siret', 'companySiret'],
      ['employer_name', 'employerName'],
    ];
    const missingFields = REQUIRED
      .filter(([snake, camel]) => !raw[snake] && !raw[camel])
      .map(([snake]) => snake.replace(/_/g, ' '));
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Champs obligatoires manquants : ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Normalise snake_case (DB) vers camelCase (ContractTemplateData)
    const contractData: ContractTemplateData = {
      employeeFirstName: raw.employee_first_name || raw.employeeFirstName || '',
      employeeLastName: raw.employee_last_name || raw.employeeLastName || '',
      employeeAddress: raw.employee_address || raw.employeeAddress || '',
      employeePostalCode: raw.employee_postal_code || raw.employeePostalCode || '',
      employeeCity: raw.employee_city || raw.employeeCity || '',
      employeeEmail: raw.employee_email || raw.employeeEmail,
      employeePhone: raw.employee_phone || raw.employeePhone,
      employeeBirthDate: raw.employee_birth_date || raw.employeeBirthDate || '',
      employeeBirthPlace: raw.employee_birth_place || raw.employeeBirthPlace,
      employeeSocialSecurity: raw.employee_social_security || raw.employeeSocialSecurity,
      employeeNationality: raw.employee_nationality || raw.employeeNationality || 'Française',
      employeeQualification: raw.employee_qualification || raw.employeeQualification,
      contractType: (raw.contract_type || raw.contractType || 'cdi') as ContractTemplateData['contractType'],
      contractStartDate: raw.contract_start_date || raw.contractStartDate || '',
      contractEndDate: raw.contract_end_date || raw.contractEndDate,
      trialPeriodDays: raw.trial_period_days || raw.trialPeriodDays,
      jobTitle: raw.job_title || raw.jobTitle || '',
      workLocation: raw.work_location || raw.workLocation || '',
      workSchedule: raw.work_schedule || raw.workSchedule || '',
      workingHours: raw.working_hours || raw.workingHours,
      salaryAmount: raw.salary_amount || raw.salaryAmount || '0',
      salaryFrequency: (raw.salary_frequency || raw.salaryFrequency || 'monthly') as ContractTemplateData['salaryFrequency'],
      contractClassification: raw.contract_classification || raw.contractClassification,
      contractCoefficient: raw.contract_coefficient || raw.contractCoefficient,
      contractReason: raw.contract_reason || raw.contractReason,
      replacedEmployeeName: raw.replaced_employee_name || raw.replacedEmployeeName,
      companyName: raw.company_name || raw.companyName || '',
      companyAddress: raw.company_address || raw.companyAddress || '',
      companyPostalCode: raw.company_postal_code || raw.companyPostalCode || '',
      companyCity: raw.company_city || raw.companyCity || '',
      companySiret: raw.company_siret || raw.companySiret || '',
      companyApe: raw.company_ape || raw.companyApe || raw.companyAPE,
      companyRcs: raw.company_rcs || raw.companyRcs || raw.companyRCS,
      employerName: raw.employer_name || raw.employerName || '',
      employerTitle: raw.employer_title || raw.employerTitle || 'Gérant',
      collectiveAgreement: raw.collective_agreement || raw.collectiveAgreement,
      collectiveAgreementIdcc: raw.collective_agreement_idcc || raw.collectiveAgreementIdcc,
      hasTransport: raw.has_transport ?? raw.hasTransport,
      hasMeal: raw.has_meal ?? raw.hasMeal,
      hasHealth: raw.has_health ?? raw.hasHealth,
      hasOther: raw.has_other ?? raw.hasOther,
      otherBenefits: raw.other_benefits || raw.otherBenefits,
      probationClause: raw.probation_clause ?? raw.probationClause,
      nonCompeteClause: raw.non_compete_clause ?? raw.nonCompeteClause,
      nonCompeteArea: raw.non_compete_area || raw.nonCompeteArea,
      nonCompeteDuration: raw.non_compete_duration || raw.nonCompeteDuration,
      nonCompeteCompensation: raw.non_compete_compensation || raw.nonCompeteCompensation,
      mobilityClause: raw.mobility_clause ?? raw.mobilityClause,
      mobilityArea: raw.mobility_area || raw.mobilityArea,
      tutorName: raw.tutor_name || raw.tutorName,
      schoolName: raw.school_name || raw.schoolName,
      schoolAddress: raw.school_address || raw.schoolAddress,
      schoolContact: raw.school_contact || raw.schoolContact,
      speciality: raw.speciality || raw.specialty,
      objectives: raw.objectives,
      tasks: raw.tasks,
      durationWeeks: raw.duration_weeks || raw.durationWeeks,
      internshipGratification: raw.internship_gratification || raw.internshipGratification,
      employerSignature: raw.employer_signature || raw.employerSignature,
      employeeSignature: raw.employee_signature || raw.employeeSignature,
      signatureCity: raw.signature_city || raw.signatureCity,
      signatureDate: raw.signature_date || raw.signatureDate,
      accentColor: raw.accentColor,
    };

    // Récupérer la couleur de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('accent_color')
      .eq('id', user.id)
      .single();

    // Générer le HTML avec le MÊME template que l'aperçu
    const htmlContent = generateContract({
      ...contractData,
      accentColor: profile?.accent_color || contractData.accentColor
    });

    // Retourner le HTML avec les headers pour impression
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="contrat.pdf"`,
      },
    });

  } catch (error) {
    console.error('Erreur génération HTML contrat:', error);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateContractDOCX } from '@/lib/labor-law/docx-export-service';

// Map snake_case DB fields to camelCase ContractData fields
function normalizeContractData(raw: Record<string, any>): Record<string, any> {
  // If already camelCase (from new-contract form), return as-is
  if (raw.employeeFirstName || raw.contractType) return raw;

  return {
    ...raw,
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
    contractType: raw.contract_type || raw.contractType || 'cdi',
    contractStartDate: raw.contract_start_date || raw.contractStartDate || '',
    contractEndDate: raw.contract_end_date || raw.contractEndDate,
    trialPeriodDays: raw.trial_period_days || raw.trialPeriodDays,
    trialPeriodRenewable: raw.trial_period_renewable ?? raw.trialPeriodRenewable ?? false,
    jobTitle: raw.job_title || raw.jobTitle || '',
    jobDescription: raw.job_description || raw.jobDescription,
    workLocation: raw.work_location || raw.workLocation || '',
    workSchedule: raw.work_schedule || raw.workSchedule || '',
    workingHours: raw.working_hours || raw.workingHours,
    salaryAmount: raw.salary_amount || raw.salaryAmount || '0',
    salaryFrequency: raw.salary_frequency || raw.salaryFrequency || 'monthly',
    contractClassification: raw.contract_classification || raw.contractClassification,
    contractCoefficient: raw.contract_coefficient || raw.contractCoefficient,
    contractReason: raw.contract_reason || raw.contractReason,
    replacedEmployeeName: raw.replaced_employee_name || raw.replacedEmployeeName,
    companyName: raw.company_name || raw.companyName || '',
    companyAddress: raw.company_address || raw.companyAddress || '',
    companyPostalCode: raw.company_postal_code || raw.companyPostalCode || '',
    companyCity: raw.company_city || raw.companyCity || '',
    companySiret: raw.company_siret || raw.companySiret || '',
    companyAPE: raw.company_ape || raw.companyAPE,
    companyRCS: raw.company_rcs || raw.companyRCS,
    employerName: raw.employer_name || raw.employerName || '',
    employerTitle: raw.employer_title || raw.employerTitle || 'Gérant',
    collectiveAgreement: raw.collective_agreement || raw.collectiveAgreement,
    collectiveAgreementIdcc: raw.collective_agreement_idcc || raw.collectiveAgreementIdcc,
    hasTransport: raw.has_transport ?? raw.hasTransport ?? false,
    hasMeal: raw.has_meal ?? raw.hasMeal ?? false,
    hasHealth: raw.has_health ?? raw.hasHealth ?? false,
    nonCompeteClause: raw.non_compete_clause ?? raw.nonCompeteClause ?? false,
    nonCompeteDuration: raw.non_compete_duration || raw.nonCompeteDuration,
    nonCompeteArea: raw.non_compete_area || raw.nonCompeteArea,
    nonCompeteCompensation: raw.non_compete_compensation || raw.nonCompeteCompensation,
    mobilityClause: raw.mobility_clause ?? raw.mobilityClause ?? false,
    mobilityArea: raw.mobility_area || raw.mobilityArea,
    confidentialityClause: raw.confidentiality_clause ?? raw.confidentialityClause ?? false,
    tutorName: raw.tutor_name || raw.tutorName,
    schoolName: raw.school_name || raw.schoolName,
    schoolAddress: raw.school_address || raw.schoolAddress,
    speciality: raw.speciality || raw.specialty,
    objectives: raw.objectives,
    tasks: raw.tasks,
    durationWeeks: raw.duration_weeks || raw.durationWeeks,
    signatureCity: raw.signature_city || raw.signatureCity,
    signatureDate: raw.signature_date || raw.signatureDate,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();
    const raw = body.contract ?? body;

    const contractData = normalizeContractData(raw);

    // Validation des champs obligatoires
    const requiredFields: Array<keyof typeof contractData> = [
      'contractType', 'employeeFirstName', 'employeeLastName',
      'contractStartDate', 'jobTitle', 'salaryAmount',
      'companyName', 'companySiret', 'employerName',
    ];
    const missingFields = requiredFields.filter(f => !contractData[f]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Champs obligatoires manquants : ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Générer le DOCX
    const docxBlob = await generateContractDOCX(contractData as any);

    // Retourner le fichier
    return new NextResponse(docxBlob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Contrat_${contractData.contractType}_${contractData.employeeLastName}.docx"`
      }
    });
  } catch (error: any) {
    console.error('[Contract DOCX Export] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération du DOCX' },
      { status: 500 }
    );
  }
}

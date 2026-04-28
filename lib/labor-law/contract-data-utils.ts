/**
 * Fonctions utilitaires pour transformer les données de contrats entre les formats
 * - snake_case (base de données Supabase)
 * - camelCase (templates de contrat ContractTemplateData)
 */

import type { ContractTemplateData } from './contract-templates';

/**
 * Transforme les données d'un contrat depuis le format snake_case de la BD
 * vers le format camelCase attendu par ContractTemplateData
 */
export function dbToContractTemplate(
  dbRecord: any,
  contractType: string
): ContractTemplateData {
  const base: ContractTemplateData = {
    // Info salarié
    employeeFirstName: dbRecord.employee_first_name || '',
    employeeLastName: dbRecord.employee_last_name || '',
    employeeAddress: dbRecord.employee_address || '',
    employeePostalCode: dbRecord.employee_postal_code || '',
    employeeCity: dbRecord.employee_city || '',
    employeeEmail: dbRecord.employee_email || '',
    employeePhone: dbRecord.employee_phone || '',
    employeeBirthDate: dbRecord.employee_birth_date || '',
    employeeBirthPlace: dbRecord.employee_birth_place || '',
    employeeSocialSecurity: dbRecord.employee_social_security || '',
    employeeNationality: dbRecord.employee_nationality || 'Française',
    employeeQualification: dbRecord.employee_qualification || '',
    employeeSignature: dbRecord.employee_signature || '',
    employerSignature: dbRecord.employer_signature || '',

    // Info contrat
    contractType: contractType as any,
    contractStartDate: dbRecord.contract_start_date || dbRecord.start_date || '',
    contractEndDate: dbRecord.contract_end_date || dbRecord.end_date || '',
    trialPeriodDays: dbRecord.trial_period_days ? String(dbRecord.trial_period_days) : '',
    jobTitle: dbRecord.job_title || '',
    workLocation: dbRecord.work_location || '',
    workSchedule: dbRecord.work_schedule || '35hhebdomadaires',
    workingHours: dbRecord.working_hours || '',
    salaryAmount: dbRecord.salary_amount ? String(dbRecord.salary_amount) : '0',
    salaryFrequency: dbRecord.salary_frequency || 'monthly',
    contractClassification: dbRecord.contract_classification || '',
    contractCoefficient: dbRecord.contract_coefficient || '',
    contractReason: dbRecord.contract_reason || '',
    replacedEmployeeName: dbRecord.replaced_employee_name || '',

    // Info entreprise
    companyName: dbRecord.company_name || '',
    companyAddress: dbRecord.company_address || '',
    companyPostalCode: dbRecord.company_postal_code || '',
    companyCity: dbRecord.company_city || '',
    companySiret: dbRecord.company_siret || '',
    companyApe: dbRecord.company_ape || '',
    companyRcs: dbRecord.company_rcs || '',
    employerName: dbRecord.employer_name || '',
    employerTitle: dbRecord.employer_title || 'Gérant',

    // Convention collective
    collectiveAgreement: dbRecord.collective_agreement || '',
    collectiveAgreementIdcc: dbRecord.collective_agreement_idcc || '',

    // Avantages
    hasTransport: dbRecord.has_transport || false,
    transportAmount: dbRecord.transport_amount || '',
    hasMeal: dbRecord.has_meal || false,
    mealAmount: dbRecord.meal_amount || '',
    hasHealth: dbRecord.has_health || false,
    hasOther: dbRecord.has_other || false,
    otherBenefits: dbRecord.other_benefits || '',

    // Clauses
    probationClause: dbRecord.probation_clause || false,
    nonCompeteClause: dbRecord.non_compete_clause || false,
    nonCompeteArea: dbRecord.non_compete_area || '',
    nonCompeteDuration: dbRecord.non_compete_duration || '',
    nonCompeteCompensation: dbRecord.non_compete_compensation || '',
    mobilityClause: dbRecord.mobility_clause || false,
    mobilityArea: dbRecord.mobility_area || '',

    // Stage / Alternance
    tutorName: dbRecord.tutor_name || '',
    schoolName: dbRecord.school_name || '',
    schoolAddress: dbRecord.school_address || '',
    schoolContact: dbRecord.school_contact || '',
    speciality: dbRecord.speciality || '',
    objectives: dbRecord.objectives || '',
    tasks: dbRecord.tasks || '',
    durationWeeks: dbRecord.duration_weeks || '',
    internshipGratification: dbRecord.internship_gratification || '',

    // OPCO / CFA
    opcoName: dbRecord.opco_name || '',
    cfaName: dbRecord.cfa_name || '',
    diplomaTitle: dbRecord.diploma_title || '',
    diplomaLevel: dbRecord.diploma_level || '',
  };

  return base;
}

/**
 * Vérifie si un contrat peut être modifié (pas signé)
 */
export function isContractModifiable(documentStatus: string): boolean {
  return !documentStatus || documentStatus === 'draft';
}

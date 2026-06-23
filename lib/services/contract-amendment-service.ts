import { createAdminClient } from '@/lib/supabase-admin';
import { getSupabaseClient } from '@/lib/supabase';
import { ContractType, Contract, AmendmentType, ContractAmendment } from '@/types';
import { sendContractNotification } from '@/lib/services/contract-notification-service';

const TABLE_MAP: Record<ContractType, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

const AMENDMENT_LABELS: Record<AmendmentType, string> = {
  salary_change: 'Changement de salaire',
  schedule_change: 'Modification des horaires',
  location_change: 'Changement de lieu de travail',
  position_change: 'Changement de poste',
  other: 'Autre modification',
};

/**
 * Crée un nouvel avenant pour un contrat
 */
// NOTE (ARGOS): race condition connue — non bloquant pour le volume actuel.
// TODO: Race condition risk — count then increment is not atomic.
// For production safety, use a Supabase RPC with:
// SELECT COUNT(*) FROM contract_amendments WHERE contract_id = $1 FOR UPDATE;
export async function createAmendment(
  contractId: string,
  contractType: ContractType,
  amendmentType: AmendmentType,
  changes: Record<string, { old: any; new: any; label: string }>,
  effectiveDate: string,
  description: string
): Promise<ContractAmendment | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // Générer le numéro d'avenant
  const { count } = await supabase
    .from('contract_amendments')
    .select('*', { count: 'exact', head: true })
    .eq('contract_id', contractId);
  const amendmentNumber = `AV-${String((count || 0) + 1).padStart(3, '0')}`;

  // Créer l'avenant
  const { data, error } = await supabase
    .from('contract_amendments')
    .insert({
      contract_id: contractId,
      contract_type: contractType,
      user_id: session.user.id,
      amendment_number: amendmentNumber,
      amendment_type: amendmentType,
      description,
      changes,
      effective_date: effectiveDate,
      document_status: 'draft',
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Erreur lors de la création de l\'avenant:', error);
    throw new Error('Erreur lors de la création de l\'avenant');
  }

  // Envoyer notification
  const { data: contract } = await supabase
    .from(TABLE_MAP[contractType])
    .select('contract_number, employee_first_name, employee_last_name')
    .eq('id', contractId)
    .single();

  if (contract) {
    await sendContractNotification({
      userId: session.user.id,
      type: 'contract_amendment',
      contractId,
      contractType,
      employeeName: `${contract.employee_first_name} ${contract.employee_last_name}`,
      contractNumber: contract.contract_number,
      metadata: { amendmentId: data.id, amendmentType, effectiveDate },
    });
  }

  return data as ContractAmendment;
}

/**
 * Récupère tous les avenants d'un contrat
 */
export async function getAmendments(contractId: string): Promise<ContractAmendment[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('contract_amendments')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur lors de la récupération des avenants:', error);
    return [];
  }

  return (data || []) as ContractAmendment[];
}

/**
 * Applique un avenant signé au contrat principal
 */
export async function applyAmendment(amendmentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Non authentifié');

  // Récupérer l'avenant
  const { data: amendment, error: amendmentError } = await supabase
    .from('contract_amendments')
    .select('*')
    .eq('id', amendmentId)
    .single();

  if (amendmentError || !amendment) {
    throw new Error('Avenant introuvable');
  }

  const tableName = TABLE_MAP[amendment.contract_type as ContractType];

  // Construire l'objet de mise à jour avec les nouvelles valeurs
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const [field, change] of Object.entries(amendment.changes)) {
    const c = change as { old: any; new: any; label: string };
    updates[field] = c.new;
  }

  // Appliquer au contrat
  const { error: updateError } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', amendment.contract_id);

  if (updateError) {
    throw new Error('Erreur lors de l\'application de l\'avenant');
  }

  // Marquer l'avenant comme appliqué
  await supabase
    .from('contract_amendments')
    .update({ document_status: 'applied', updated_at: new Date().toISOString() })
    .eq('id', amendmentId);
}

/**
 * Calcule le diff entre deux objets pour générer le JSONB des changements
 */
export function computeChanges(
  originalData: any,
  newData: any,
  fieldsToTrack: string[]
): Record<string, { old: any; new: any; label: string }> {
  const changes: Record<string, { old: any; new: any; label: string }> = {};

  const LABELS: Record<string, string> = {
    salary_amount: 'Salaire',
    work_schedule: 'Horaires',
    work_location: 'Lieu de travail',
    job_title: 'Poste',
    working_hours: 'Durée hebdomadaire',
    contract_classification: 'Classification',
    collective_agreement: 'Convention collective',
  };

  for (const field of fieldsToTrack) {
    if (field in originalData && field in newData) {
      const oldVal = originalData[field];
      const newVal = newData[field];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[field] = {
          old: oldVal,
          new: newVal,
          label: LABELS[field] || field,
        };
      }
    }
  }

  return changes;
}

/**
 * Génère le numéro d'avenant pour un contrat
 */
export async function getNextAmendmentNumber(contractId: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('contract_amendments')
    .select('*', { count: 'exact', head: true })
    .eq('contract_id', contractId);

  if (error) {
    console.error('Erreur lors du comptage des avenants:', error);
    return 'AV-001';
  }

  return `AV-${String((count || 0) + 1).padStart(3, '0')}`;
}

/**
 * Met à jour le statut et les signatures d'un avenant
 */
export async function updateAmendmentStatus(
  amendmentId: string,
  status: string,
  signatureData?: { party: 'employer' | 'employee'; signatureData: string }
): Promise<void> {
  const supabase = getSupabaseClient();

  const updates: Record<string, any> = {
    document_status: status,
    updated_at: new Date().toISOString(),
  };

  if (signatureData) {
    if (signatureData.party === 'employer') {
      updates.employer_signature = signatureData.signatureData;
      updates.employer_signature_date = new Date().toISOString().split('T')[0];
    } else {
      updates.employee_signature = signatureData.signatureData;
      updates.employee_signature_date = new Date().toISOString().split('T')[0];
    }
  }

  const { error } = await supabase
    .from('contract_amendments')
    .update(updates)
    .eq('id', amendmentId);

  if (error) {
    throw new Error('Erreur lors de la mise à jour de l\'avenant');
  }
}

import { getSupabaseClient } from '@/lib/supabase';
import { ContractType, ContractRenewal, Contract, ContractFormData } from '@/types';

const TABLE_MAP: Record<ContractType, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

/**
 * Duplique un contrat pour le renouveler
 * Met à jour le numero avec le suffixe de renouvellement et incremente renewal_count
 */
export async function renewContract(
  contractId: string,
  contractType: ContractType,
  newEndDate: string,
  renewalReason: string,
  profile: any
): Promise<{ id: string; contract_number: string } | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // 1. Récupérer le contrat original
  const { data: originalContract, error: fetchError } = await supabase
    .from(TABLE_MAP[contractType])
    .select('*')
    .eq('id', contractId)
    .single();

  if (fetchError || !originalContract) {
    throw new Error('Contrat introuvable');
  }

  // 2. Obtenir le numéro de renouvellement suivant
  const renewalNumber = await getNextRenewalNumber(contractId, contractType);

  // 3. Préparer les données du nouveau contrat
  const newContractData: Record<string, any> = {
    ...originalContract,
    id: undefined, // Laisser BD générer nouvel ID
    contract_number: `${originalContract.contract_number}-R${renewalNumber}`,
    document_status: 'draft',
    renewal_count: renewalNumber,
    original_contract_id: contractId,
    created_at: undefined,
    updated_at: new Date().toISOString(),
  };

  // Mettre à jour la date de fin pour CDD et other
  if (contractType === 'cdd') {
    newContractData.contract_end_date = newEndDate;
  } else if (contractType === 'other') {
    newContractData.end_date = newEndDate;
  }

  // Réinitialiser les signatures (le nouveau contrat doit être signé à nouveau)
  newContractData.employer_signature = null;
  newContractData.employee_signature = null;
  newContractData.employer_signature_date = null;
  newContractData.employee_signature_date = null;

  // Retirer l'ID de l'objet pour l'insertion
  delete newContractData.id;
  delete newContractData.created_at;

  // 4. Insérer le nouveau contrat
  const { data: newContract, error: insertError } = await supabase
    .from(TABLE_MAP[contractType])
    .insert(newContractData)
    .select('id, contract_number')
    .single();

  if (insertError || !newContract) {
    throw new Error('Erreur lors de la création du contrat renouvelé');
  }

  // 5. Créer l'entrée de renouvellement
  const { error: renewalError } = await supabase.from('contract_renewals').insert({
    original_contract_id: contractId,
    renewed_contract_id: newContract.id,
    contract_type: contractType,
    user_id: session.user.id,
    renewal_number: renewalNumber,
    previous_end_date: contractType === 'cdd' ? originalContract.contract_end_date : originalContract.end_date,
    new_end_date: newEndDate,
    renewal_reason: renewalReason,
  });

  if (renewalError) {
    console.error('Erreur lors de la création de l\'entrée de renouvellement:', renewalError);
  }

  // 6. Envoyer notification (routée via API serveure — ARGOS build)
  try {
    await fetch('/api/contracts/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contract_renewal',
        contractId: newContract.id,
        contractType,
        employeeName: `${originalContract.employee_first_name} ${originalContract.employee_last_name}`,
        contractNumber: newContract.contract_number,
        metadata: { originalContractId: contractId, renewalNumber, newEndDate },
      }),
    });
  } catch (notifErr) {
    console.error('Failed to send renewal notification:', notifErr);
  }

  return { id: newContract.id, contract_number: newContract.contract_number };
}

/**
 * Récupère l'historique des renouvellements d'un contrat
 */
export async function getRenewalHistory(contractId: string): Promise<ContractRenewal[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('contract_renewals')
    .select('*')
    .or(`original_contract_id.eq.${contractId},renewed_contract_id.eq.${contractId}`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    return [];
  }

  return (data || []) as ContractRenewal[];
}

/**
 * Compte le nombre de renouvellements existants pour un contrat
 */
export async function getNextRenewalNumber(contractId: string, contractType: ContractType): Promise<number> {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('contract_renewals')
    .select('*', { count: 'exact', head: true })
    .eq('original_contract_id', contractId);

  if (error) {
    console.error('Erreur lors du comptage des renouvellements:', error);
    return 1;
  }

  return (count || 0) + 1;
}

// VULCAIN (build fix) — getRenewedChain (client admin / service-role) a été
// déplacée vers `./contract-renewal-server.ts` (server-only). Ce fichier-ci ne
// référence plus `supabase-admin` du tout : il redevient 100 % client-safe,
// ce qui empêche `server-only` d'être tiré dans le bundle navigateur via
// contractStore. La route /api/contracts/renewed-chain importe désormais la
// version server-only.

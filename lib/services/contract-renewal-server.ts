// VULCAIN (build fix) — Section server-only du service de renouvellement.
// `getRenewedChain` a besoin du client admin (service-role, bypass RLS) pour
// lire la chaîne des contrats renouvelés. Isolée ici derrière `server-only`
// pour qu'aucun import client (ex: contractStore) ne tire `supabase-admin`
// dans le bundle navigateur (ce qui cassait `next build`).
import 'server-only';
import { createAdminClient } from '@/lib/supabase-admin';
import type { ContractType } from '@/types';

const TABLE_MAP: Record<ContractType, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

/**
 * Récupère tous les contrats renouvelés liés à un contrat original.
 * Server-only : utilise le client admin (service-role).
 */
export async function getRenewedChain(originalContractId: string): Promise<any[]> {
  const admin = createAdminClient();

  const { data: renewals } = await admin
    .from('contract_renewals')
    .select('renewed_contract_id, contract_type, renewal_number, created_at')
    .eq('original_contract_id', originalContractId)
    .order('renewal_number', { ascending: true });

  if (!renewals) return [];

  // Récupérer les détails des contrats renouvelés
  const contracts = await Promise.all(
    renewals.map(async (r) => {
      const { data } = await admin.from(TABLE_MAP[r.contract_type as ContractType]).select('id, contract_number, document_status, contract_end_date, end_date').eq('id', r.renewed_contract_id).single();
      return {
        ...r,
        contract: data,
      };
    })
  );

  return contracts;
}

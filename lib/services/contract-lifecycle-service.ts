import { ContractStatus } from '@/types';

/**
 * Matrice des transitions autorisées
 * Chaque statut peut seulement transitionner vers les statuts listés
 */
const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['pending_signature', 'cancelled'],
  pending_signature: ['draft', 'signed', 'cancelled'],
  signed: ['active', 'cancelled'],
  active: ['ended', 'terminated', 'cancelled'],
  ended: [], // Terminal
  terminated: [], // Terminal
  cancelled: [], // Terminal
};

/**
 * Retourne les transitions autorisées depuis un statut donné
 */
export function getAllowedTransitions(currentStatus: ContractStatus): ContractStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Vérifie si une transition est autorisée
 */
export function canTransition(fromStatus: ContractStatus, toStatus: ContractStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Traite les transitions automatiques quotidiennes
 * Appelé par le cron job contract-expirations
 */
export async function processDailyTransitions(admin: any): Promise<{
  signedToActive: number;
  activeToEnded: number;
  expiredToCancelled: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let signedToActive = 0;
  let activeToEnded = 0;

  // 1. signed → active : quand contract_start_date est atteint
  const { data: cdiSigned } = await admin
    .from('contracts_cdi')
    .select('id, user_id, contract_start_date')
    .eq('document_status', 'signed');

  if (cdiSigned) {
    for (const c of cdiSigned) {
      const startDate = new Date(c.contract_start_date);
      if (startDate <= today) {
        await admin.from('contracts_cdi').update({ document_status: 'active' }).eq('id', c.id);
        signedToActive++;
      }
    }
  }

  const { data: cddSigned } = await admin
    .from('contracts_cdd')
    .select('id, user_id, contract_start_date')
    .eq('document_status', 'signed');

  if (cddSigned) {
    for (const c of cddSigned) {
      const startDate = new Date(c.contract_start_date);
      if (startDate <= today) {
        await admin.from('contracts_cdd').update({ document_status: 'active' }).eq('id', c.id);
        signedToActive++;
      }
    }
  }

  const { data: otherSigned } = await admin
    .from('contracts_other')
    .select('id, user_id, start_date')
    .eq('document_status', 'signed');

  if (otherSigned) {
    for (const c of otherSigned) {
      const startDate = new Date(c.start_date!);
      if (startDate <= today) {
        await admin.from('contracts_other').update({ document_status: 'active' }).eq('id', c.id);
        signedToActive++;
      }
    }
  }

  // 2. active → ended : quand contract_end_date est passé (CDD et other seulement)
  const { data: cddActive } = await admin
    .from('contracts_cdd')
    .select('id')
    .eq('document_status', 'active');

  if (cddActive) {
    for (const c of cddActive) {
      const { data: contract } = await admin
        .from('contracts_cdd')
        .select('contract_end_date')
        .eq('id', c.id)
        .single();

      if (contract?.contract_end_date) {
        const endDate = new Date(contract.contract_end_date);
        if (endDate < today) {
          await admin.from('contracts_cdd').update({ document_status: 'ended' }).eq('id', c.id);
          activeToEnded++;
        }
      }
    }
  }

  const { data: otherActive } = await admin
    .from('contracts_other')
    .select('id')
    .eq('document_status', 'active')
    .not('end_date', 'is', null);

  if (otherActive) {
    for (const c of otherActive) {
      const { data: contract } = await admin
        .from('contracts_other')
        .select('end_date')
        .eq('id', c.id)
        .single();

      if (contract?.end_date) {
        const endDate = new Date(contract.end_date);
        if (endDate < today) {
          await admin.from('contracts_other').update({ document_status: 'ended' }).eq('id', c.id);
          activeToEnded++;
        }
      }
    }
  }

  return { signedToActive, activeToEnded, expiredToCancelled: 0 };
}

/**
 * Archive automatiquement les contrats terminés depuis plus de 3 ans
 */
export async function autoArchiveOldContracts(admin: any): Promise<number> {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  let archived = 0;

  const tables = ['contracts_cdi', 'contracts_cdd', 'contracts_other'];
  for (const table of tables) {
    const { data: contracts } = await admin
      .from(table)
      .select('id')
      .eq('document_status', 'ended')
      .lt('created_at', threeYearsAgo.toISOString());

    if (contracts) {
      for (const c of contracts) {
        await admin.from(table).update({ document_status: 'archived' }).eq('id', c.id);
        archived++;
      }
    }
  }

  return archived;
}

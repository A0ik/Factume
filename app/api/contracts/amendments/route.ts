import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

// ODIN (CIBLE 1) — Allowlist des tables de contrats (anti-injection de nom de table).
const CONTRACT_TABLE_BY_TYPE: Record<string, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};
function resolveContractTable(contractType: unknown): string | null {
  if (typeof contractType !== 'string') return null;
  return CONTRACT_TABLE_BY_TYPE[contractType.toLowerCase()] ?? null;
}

// GET /api/contracts/amendments?contractId=&contractType=
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const contractId = searchParams.get('contractId');
    const contractType = searchParams.get('contractType');

    if (!contractId || !contractType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: amendments, error } = await admin
      .from('contract_amendments')
      .select('*')
      .eq('contract_id', contractId)
      .eq('contract_type', contractType)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(amendments || []);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/contracts/amendments
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { contractId, contractType, amendmentType, description, changes, effectiveDate } = await req.json();

    if (!contractId || !contractType || !amendmentType || !changes || !effectiveDate) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const admin = createAdminClient();

    // ODIN (CIBLE 1) — résolution allowlist du nom de table (anti-injection).
    const cTable = resolveContractTable(contractType);
    if (!cTable) {
      return NextResponse.json({ error: 'Type de contrat invalide' }, { status: 400 });
    }

    // Get contract for amendment number + verify ownership (BUG-06 fix)
    const { data: contract } = await admin
      .from(cTable)
      .select('contract_number, user_id')
      .eq('id', contractId)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });
    }

    // Ownership check — prevent creating amendments on someone else's contract
    if (contract.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Count existing amendments for this contract
    const { data: existing } = await admin
      .from('contract_amendments')
      .select('id')
      .eq('contract_id', contractId);
    const amendmentNumber = `AV-${String((existing?.length || 0) + 1).padStart(3, '0')}`;

    const { data: amendment, error } = await admin
      .from('contract_amendments')
      .insert({
        contract_id: contractId,
        contract_type: contractType,
        user_id: user.id,
        amendment_number: amendmentNumber,
        amendment_type: amendmentType,
        description,
        changes,
        effective_date: effectiveDate,
        document_status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(amendment, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

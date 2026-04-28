import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/contracts/amendments?contractId=&contractType=
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
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
      .eq('user_id', session.user.id)
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { contractId, contractType, amendmentType, description, changes, effectiveDate } = await req.json();

    if (!contractId || !contractType || !amendmentType || !changes || !effectiveDate) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get contract for amendment number
    const { data: contract } = await admin
      .from(`contracts_${contractType}`)
      .select('contract_number')
      .eq('id', contractId)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });
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

    if (error) throw error;
    return NextResponse.json(amendment, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

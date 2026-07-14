import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRenewedChain } from '@/lib/services/contract-renewal-server';

// ARGOS (build/sécurité) — getRenewedChain utilise le client admin (service-role) ;
// route serveur fine pour que les composants client n'importent pas le service.
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const contractId = new URL(req.url).searchParams.get('contractId');
    if (!contractId) {
      return NextResponse.json({ error: 'contractId requis' }, { status: 400 });
    }

    const chain = await getRenewedChain(contractId);
    return NextResponse.json(chain);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  sendContractNotification,
  type ContractNotificationType,
} from '@/lib/services/contract-notification-service';

// ARGOS (build/sécurité) — Route serveur fine : les composants client ne peuvent pas
// appeler sendContractNotification directement (elle utilise le client admin service-role).
// On authentifie ici (cookie session) et on délègue au service côté serveur.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();
    const { type, contractId, contractType, employeeName, companyName, contractNumber, metadata } = body;

    if (!type || !contractId || !contractType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    await sendContractNotification({
      userId: user.id,
      type: type as ContractNotificationType,
      contractId,
      contractType,
      employeeName,
      companyName,
      contractNumber,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

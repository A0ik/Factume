import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getConnectionStatus } from '@/lib/superPdpClient';

/**
 * GET /api/superpdp/status
 *
 * Statut de connexion SuperPDP de l'utilisateur (pour le badge UI).
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const status = await getConnectionStatus(user.id);
    return NextResponse.json(status);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[superpdp-status]', err.message);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}

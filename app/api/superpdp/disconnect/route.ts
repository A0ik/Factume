import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { disconnectSuperPdp } from '@/lib/superPdpClient';

/**
 * POST /api/superpdp/disconnect
 *
 * Révoque (déconnecte) la connexion SuperPDP de l'utilisateur.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    await disconnectSuperPdp(user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[superpdp-disconnect]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

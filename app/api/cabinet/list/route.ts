import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Get all cabinets owned by the user
    const { data: ownedCabinets } = await admin
      .from('cabinets')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true });

    // Get all cabinets where user is a member
    const { data: memberships } = await admin
      .from('cabinet_members')
      .select('cabinet_id, role, cabinets(*)')
      .eq('user_id', user.id);

    const memberCabinets = (memberships || [])
      .map((m: any) => ({ ...(m.cabinets || {}), memberRole: m.role }))
      .filter((c: any) => c.id && !(ownedCabinets || []).some(o => o.id === c.id));

    const allCabinets = [
      ...(ownedCabinets || []).map((c: any) => ({ ...c, memberRole: 'owner' })),
      ...memberCabinets,
    ];

    // Enrich with client counts
    const enriched = await Promise.all(
      allCabinets.map(async (cabinet: any) => {
        const { count } = await admin
          .from('cabinet_clients')
          .select('*', { count: 'exact', head: true })
          .eq('cabinet_id', cabinet.id);
        return { ...cabinet, clientCount: count || 0 };
      })
    );

    return NextResponse.json({ cabinets: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

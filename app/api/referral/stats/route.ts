import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const userId = req.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId manquant' }, { status: 400 });
  }

  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);

  if (error) {
    console.error('[referral/stats] query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = referrals?.length || 0;
  const completed = referrals?.filter((r: any) => r.status === 'completed').length || 0;
  const pending = referrals?.filter((r: any) => r.status === 'pending').length || 0;

  return NextResponse.json({ total, completed, pending, rewardMonths: completed });
}

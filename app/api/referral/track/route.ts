import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { referredUserId, referralCode } = await req.json();
  if (!referredUserId || !referralCode) {
    return NextResponse.json({ error: 'Missing referredUserId or referralCode' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  if (referrer.id === referredUserId) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', referredUserId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'User already referred' }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from('referrals')
    .update({
      referred_id: referredUserId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('referrer_id', referrer.id)
    .eq('referral_code', referralCode)
    .eq('status', 'pending');

  if (updateError) {
    console.error('[referral/track] update error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const now = new Date().toISOString();

  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: referrer.id,
    type: 'referral_completed',
    title: 'Parrainage réussi !',
    body: 'Vous avez parrainé un nouvel utilisateur. Vous recevrez 1 mois gratuit.',
    link: '/dashboard?tab=referral',
    read: false,
    created_at: now,
  });

  if (notifError) {
    console.warn('[referral/track] notification insert error:', notifError.message);
  }

  return NextResponse.json({ success: true, referrerId: referrer.id });
}

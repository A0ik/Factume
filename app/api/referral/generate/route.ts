import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/*
-- Migration: add referral_code to profiles and create referrals table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles (referral_code) WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_referrer_id ON referrals (referrer_id);
CREATE INDEX idx_referrals_code ON referrals (referral_code);
*/

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single();

  if (profile?.referral_code) {
    return NextResponse.json({ code: profile.referral_code });
  }

  let code = '';
  let attempts = 0;
  let isUnique = false;

  while (!isUnique && attempts < 10) {
    code = generateReferralCode();
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();
    isUnique = !existing;
    attempts++;
  }

  if (!isUnique) {
    return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ referral_code: code })
    .eq('id', userId);

  if (updateError) {
    console.error('[referral/generate] update error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: referralError } = await supabase.from('referrals').insert({
    referrer_id: userId,
    referral_code: code,
    status: 'pending',
  });

  if (referralError) {
    console.error('[referral/generate] referral insert error:', referralError);
  }

  return NextResponse.json({ code });
}

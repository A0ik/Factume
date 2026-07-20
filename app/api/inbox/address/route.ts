import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET  /api/inbox/address — renvoie (et crée au besoin) l'adresse d'import email
 *                           unique de l'utilisateur (factures+<token>@factu.me).
 * POST /api/inbox/address — régénère un nouveau token (l'ancienne adresse cesse de fonctionner).
 *
 * Feature Business (gate côté serveur).
 */

const INBOX_DOMAIN = process.env.INBOX_DOMAIN || 'factu.me';
const INBOX_PREFIX = process.env.INBOX_PREFIX || 'factures';

function buildAddress(token: string): string {
  return `${INBOX_PREFIX}+${token}@${INBOX_DOMAIN}`;
}

function newToken(): string {
  return crypto.randomBytes(8).toString('hex'); // 16 char hex
}

async function requireBusiness(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('subscription_tier, is_trial_active').eq('id', user.id).single();
  const tier = profile?.subscription_tier;
  const allowed = tier === 'business' || tier === 'trial' || profile?.is_trial_active === true;
  if (!allowed) {
    return { supabase, user, error: NextResponse.json({ error: 'Plan Business requis', upgradeUrl: '/paywall' }, { status: 403 }) };
  }
  return { supabase, user, error: null };
}

export async function GET(req: NextRequest) {
  const { supabase, user, error } = await requireBusiness(req);
  if (error || !user) return error;
  let { data: inbox } = await supabase.from('email_inboxes').select('token, address').eq('user_id', user.id).maybeSingle();
  if (!inbox) {
    const token = newToken();
    const address = buildAddress(token);
    const { data: created } = await supabase
      .from('email_inboxes')
      .insert({ user_id: user.id, token, address })
      .select('token, address')
      .single();
    inbox = created || { token, address };
  }
  return NextResponse.json({ address: inbox.address, token: inbox.token, domain: INBOX_DOMAIN, prefix: INBOX_PREFIX });
}

export async function POST(req: NextRequest) {
  const { supabase, user, error } = await requireBusiness(req);
  if (error || !user) return error;
  const token = newToken();
  const address = buildAddress(token);
  // Upsert : remplace l'ancienne adresse (ancien token invalidé)
  const { error: upErr } = await supabase
    .from('email_inboxes')
    .upsert({ user_id: user.id, token, address }, { onConflict: 'user_id' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ address, token, domain: INBOX_DOMAIN, prefix: INBOX_PREFIX });
}

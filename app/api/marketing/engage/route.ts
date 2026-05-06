import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  let inserted = 0;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, subscription_tier, created_at, is_trial_active, trial_end_date')
    .order('created_at', { ascending: false })
    .limit(500);

  if (!profiles) {
    return NextResponse.json({ error: 'No profiles found' }, { status: 500 });
  }

  for (const profile of profiles) {
    const notifications: Array<{
      user_id: string;
      type: string;
      title: string;
      body: string;
      link: string;
      read: boolean;
      created_at: string;
    }> = [];

    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    if ((invoiceCount ?? 0) === 0) {
      const daysSinceSignup = Math.floor(
        (now.getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceSignup >= 2 && daysSinceSignup <= 4) {
        notifications.push({
          user_id: profile.id,
          type: 'engagement',
          title: 'Créez votre première facture',
          body: 'Vous n\'avez pas encore créé de facture. Commencez maintenant, c\'est simple et rapide !',
          link: '/dashboard/invoices/new',
          read: false,
          created_at: now.toISOString(),
        });
      }
    }

    if (profile.is_trial_active && profile.trial_end_date) {
      const daysLeft = Math.ceil(
        (new Date(profile.trial_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft === 2 || daysLeft === 1) {
        notifications.push({
          user_id: profile.id,
          type: 'trial_expiring',
          title: `Votre essai se termine dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
          body: 'Profitez de toutes les fonctionnalités Pro avant la fin de votre période d\'essai.',
          link: '/dashboard?tab=subscription',
          read: false,
          created_at: now.toISOString(),
        });
      }
    }

    if ((invoiceCount ?? 0) >= 3 && profile.subscription_tier === 'free') {
      const last30Days = new Date(now);
      last30Days.setDate(last30Days.getDate() - 30);

      const { count: recentCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('created_at', last30Days.toISOString());

      if ((recentCount ?? 0) >= 5) {
        notifications.push({
          user_id: profile.id,
          type: 'invoice_streak',
          title: 'Vous êtes sur une bonne lancée !',
          body: `Vous avez créé ${recentCount} factures ce mois-ci. Passez à un plan supérieur pour débloquer des fonctionnalités avancées.`,
          link: '/dashboard?tab=subscription',
          read: false,
          created_at: now.toISOString(),
        });
      }
    }

    if (notifications.length > 0) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', profile.id)
        .in('type', notifications.map((n) => n.type))
        .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

      const existingTypes = new Set((existing || []).map((n: { type: string }) => n.type));
      const toInsert = notifications.filter((n) => !existingTypes.has(n.type));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('notifications').insert(toInsert);
        if (error) {
          console.warn('[marketing/engage] notification insert error:', error.message);
        } else {
          inserted += toInsert.length;
        }
      }
    }
  }

  return NextResponse.json({ processed: profiles.length, inserted });
}

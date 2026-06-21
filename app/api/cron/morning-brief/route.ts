import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// GET /api/cron/morning-brief
// Daily cron (Mon-Fri 7h) — generates morning brief notifications for users
// Killer #4: Copilot Factu — Morning Brief
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // Verify cron secret — fail-closed si CRON_SECRET absent (CIBLE 3d)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Get all users with active profiles (who have created at least 1 invoice)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, company_name')
      .not('email', 'is', null);

    if (profilesError) {
      console.error('[morning-brief] Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No profiles found' });
    }

    let notificationsCreated = 0;

    for (const profile of profiles) {
      try {
        const briefItems: string[] = [];

        // 1. Overdue invoices
        const { data: overdueInvoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_ttc, client_name, due_date')
          .eq('user_id', profile.id)
          .eq('status', 'overdue')
          .order('due_date', { ascending: true })
          .limit(5);

        if (overdueInvoices && overdueInvoices.length > 0) {
          const totalOverdue = overdueInvoices.reduce((s, inv) => s + (inv.total_ttc || 0), 0);
          briefItems.push(`🔴 ${overdueInvoices.length} facture(s) en retard (${totalOverdue.toFixed(2)}€)`);
        }

        // 2. Invoices due in next 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const { data: upcomingInvoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_ttc, client_name, due_date')
          .eq('user_id', profile.id)
          .eq('status', 'sent')
          .lte('due_date', threeDaysFromNow.toISOString())
          .order('due_date', { ascending: true })
          .limit(5);

        if (upcomingInvoices && upcomingInvoices.length > 0) {
          briefItems.push(`🟡 ${upcomingInvoices.length} facture(s) arrivent à échéance sous 3 jours`);
        }

        // Only create notification if there's something to report
        if (briefItems.length === 0) continue;

        const briefMessage = `☀️ Morning Brief — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n${briefItems.join('\n')}`;

        // Insert notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: profile.id,
            type: 'morning_brief',
            title: 'Morning Brief',
            message: briefMessage,
            read: false,
          });

        if (notifError) {
          console.error(`[morning-brief] Error for user ${profile.id}:`, notifError);
        } else {
          notificationsCreated++;
        }
      } catch (userError) {
        console.error(`[morning-brief] Error processing user ${profile.id}:`, userError);
      }
    }

    return NextResponse.json({
      processed: profiles.length,
      notificationsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[morning-brief] Fatal error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

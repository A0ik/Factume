import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendReminderEmail } from '@/lib/reminders';

/**
 * ARGOS (CIBLE 5 — Relances) — Envoi manuel multi-sélection.
 * POST /api/reminders/batch-send  body: { invoiceIds: string[], confirmed?: boolean }
 * Envoie une relance (niveau 1) à chaque facture impayée sélectionnée par l'utilisateur.
 * L'utilisateur choisit explicitement les destinataires dans le popup Relances de /documents.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { invoiceIds, confirmed = false } = await req.json();
    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: 'invoiceIds manquant' }, { status: 400 });
    }
    if (!confirmed) {
      return NextResponse.json({
        error: 'Confirmation requise',
        requiresConfirmation: true,
      }, { status: 400 });
    }

    // Récupère toutes les factures impayées appartenant à l'utilisateur dans la sélection.
    const { data: invoices, error } = await admin
      .from('invoices')
      .select('*, client:clients(*)')
      .in('id', invoiceIds)
      .eq('user_id', user.id)
      .in('status', ['sent', 'overdue']);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const config = await admin.from('reminders_config').select('*').eq('user_id', user.id).single();
    const profile = await admin.from('profiles').select('*').eq('id', user.id).single();

    const sent: string[] = [];
    const failed: { id: string; error: string }[] = [];
    const skipped: string[] = [];
    // ATHÉNA (C3) — clients sans email : relance enregistrée, à remonter à l'UI.
    const pendingEmail: string[] = [];

    for (const invoice of invoices || []) {
      const result = await sendReminderEmail({
        admin,
        userId: user.id,
        invoice,
        profile: profile.data || {},
        config: config.data || null,
        level: 1,
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });
      if (result.pendingEmail) pendingEmail.push(invoice.id);
      else if (result.ok) sent.push(invoice.id);
      else if (result.skipped) skipped.push(invoice.id);
      else failed.push({ id: invoice.id, error: result.error || 'Erreur' });
    }

    return NextResponse.json({
      success: true,
      sent: sent.length,
      failed: failed.length,
      skipped: skipped.length,
      pendingEmail: pendingEmail.length,
      details: { sent, failed, skipped, pendingEmail },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

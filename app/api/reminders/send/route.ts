import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendReminderEmail } from '@/lib/reminders';

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

    const { invoiceId, reminderLevel = 1, confirmed = false } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId manquant' }, { status: 400 });
    }

    // LOI 3 : L'IA PROPOSE, L'HUMAIN DISPOSE — un email ne part JAMAIS sans validation humaine.
    if (!confirmed) {
      return NextResponse.json({
        error: 'Confirmation requise',
        message: 'Vous devez confirmer l\'envoi de cette relance (confirmed: true).',
        requiresConfirmation: true,
      }, { status: 400 });
    }

    const { data: invoice, error: invoiceError } = await admin
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }
    if (invoice.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    if (invoice.status !== 'sent' && invoice.status !== 'overdue') {
      return NextResponse.json({ error: 'Cette facture n\'est pas en retard' }, { status: 400 });
    }

    const { data: config } = await admin.from('reminders_config').select('*').eq('user_id', user.id).single();
    const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single();

    const result = await sendReminderEmail({
      admin,
      userId: user.id,
      invoice,
      profile: profile || {},
      config: config || null,
      level: reminderLevel,
      ip: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    // ATHÉNA (C3) — un client sans email n'est plus un échec : la relance est
    // enregistrée (pending_email) + notifiée en in-app. On retourne un succès
    // explicite avec le flag pendingEmail pour que l'UI l'explique.
    if (!result.ok && !result.pendingEmail) {
      return NextResponse.json({ error: result.error || 'Erreur lors de l\'envoi de l\'email' }, { status: 500 });
    }

    if (result.pendingEmail) {
      return NextResponse.json({
        success: true,
        pendingEmail: true,
        message: 'Relance enregistrée — l’email du client est manquant. Ajoutez-le puis relancez.',
        reminderLevel,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Relance envoyée avec succès',
      reminderLevel,
      emailTo: result.emailTo,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

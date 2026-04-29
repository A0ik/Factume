import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// GET - Récupérer la configuration des relances
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer la configuration ou créer une par défaut
    const { data: config, error } = await admin
      .from('reminders_config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !config) {
      // Créer une configuration par défaut
      const { data: newConfig, error: createError } = await admin
        .from('reminders_config')
        .insert({
          user_id: user.id,
          enabled: true,
          reminder_1_days: 3,
          reminder_2_days: 7,
          reminder_3_days: 15,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      return NextResponse.json(newConfig);
    }

    return NextResponse.json(config);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Mettre à jour la configuration des relances
export async function PUT(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { enabled, reminder_1_days, reminder_2_days, reminder_3_days, email_subject, email_message } = body;

    // Mettre à jour la configuration
    const { data: config, error } = await admin
      .from('reminders_config')
      .upsert({
        user_id: user.id,
        enabled: enabled ?? true,
        reminder_1_days: reminder_1_days ?? 3,
        reminder_2_days: reminder_2_days ?? 7,
        reminder_3_days: reminder_3_days ?? 15,
        email_subject: email_subject || 'Rappel: Facture {invoice_number} en retard',
        email_message: email_message || 'Bonjour {client_name},\n\nNous vous rappelons que la facture {invoice_number} d\'un montant de {amount}€ est en retard depuis {days_overdue} jours.\n\nNous vous remercions de procéder au règlement dans les plus brefs délais.\n\nCordialement,\n{company_name}',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(config);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

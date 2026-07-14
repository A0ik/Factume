import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// PATCH /api/invoices/[id]/recipient — ZÉNITH (CIBLE 1)
// ---------------------------------------------------------------------------
// Carve-out NON-FISCAL d'immuabilité : permet de compléter/corriger le
// DESTINATAIRE de relance (client_email, client_name_override, client_id) sur
// une facture déjà émise (sent/overdue...), SANS toucher au contenu fiscal
// (montants, lignes, numéro, dates, TVA — protégés par Art. L.441-9).
//
// Cas d'usage : une facture envoyée SANS client lié ni email (ex: FACT-019) ne
// pouvait plus jamais être relancée — la garde renvoyait vers une page verrouillée.
// Ce routelet permet au pop-up de relance d'écrire l'email saisi dans le snapshot
// de la facture, puis la relance part (sendReminderEmail recourt à client_email).
//
// Sécurité :
//  - propriété vérifiée (user_id === auth.uid()) ;
//  - whitelist stricte des colonnes mutables (rien d'autre n'est accepté) ;
//  - le statut N'est PAS re-vérifié (c'est précisément le carve-out), mais on ne
//    modifie QUE des métadonnées de contact, jamais le document fiscal.
// ---------------------------------------------------------------------------

const ALLOWED_FIELDS = ['client_email', 'client_name_override', 'client_id'] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    // Appartenance.
    const { data: existing } = await admin.from('invoices')
      .select('user_id, client_email, client_name_override, client_id')
      .eq('id', id).single();
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    const body = await req.json();
    const update: Record<AllowedField, unknown> = {} as any;
    let touched = false;

    if (typeof body.client_email === 'string') {
      const trimmed = body.client_email.trim();
      if (trimmed && !EMAIL_RE.test(trimmed)) {
        return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
      }
      update.client_email = trimmed || null;
      touched = true;
    }
    if (typeof body.client_name_override === 'string') {
      update.client_name_override = body.client_name_override.trim() || null;
      touched = true;
    }
    // Optionnel : rattacher un client existant. Vérifie l'appartenance du client.
    if (body.client_id !== undefined && body.client_id !== null) {
      const { data: clientRow } = await admin.from('clients')
        .select('id').eq('id', body.client_id).eq('user_id', user.id).maybeSingle();
      if (!clientRow) {
        return NextResponse.json({ error: 'Client introuvable.' }, { status: 400 });
      }
      update.client_id = body.client_id;
      touched = true;
    }

    if (!touched) {
      return NextResponse.json({ error: 'Aucun champ valide à mettre à jour.' }, { status: 400 });
    }

    const { data: invoice, error } = await admin.from('invoices')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, client_email, client_name_override, client_id')
      .single();

    if (error) {
      console.error('[recipient] update error:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[recipient] error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

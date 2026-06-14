import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { calculateInvoiceTotals } from '@/lib/money';
import { buildVoidLinkUpdate } from '@/lib/payment-link';

// ---------------------------------------------------------------------------
// DELETE /api/invoices/[id] — Delete an invoice (CASCADE handles related records)
// ---------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership — single query, eq user_id as defense-in-depth
    const { data: existing } = await supabase
      .from('invoices')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Only draft/cancelled can be deleted
    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Seules les factures en brouillon ou annulees peuvent etre supprimees' },
        { status: 400 }
      );
    }

    // Delete — CASCADE on foreign keys handles all related tables automatically
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Invoices] Delete error:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    // TOLL FIX B3: Decrement monthly invoice counter to reopen the slot for free users
    try {
      await supabase.rpc('decrement_invoice_count', { p_user_id: user.id });
    } catch (decrementError) {
      // Non-critical — counter may be slightly off but no data loss
      console.warn('[Invoices] Failed to decrement invoice count:', decrementError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Invoices] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/invoices/[id] — Met à jour une facture (édition)
// LOI 7 (ADN Visuel Unique) : la même validation serveur que /api/invoices/create.
// Avant, updateInvoice() faisait un .update() Supabase direct côté client SANS
// re-validation serveur des montants. Désormais server-authoritative.
// ---------------------------------------------------------------------------

const IMMUTABLE_EDIT_STATUSES = ['sent', 'paid', 'overdue', 'cancelled', 'refunded', 'partial', 'delivered', 'rejected', 'accepted', 'refused']; // aligné sur IMMUTABLE_STATUSES (dataStore) — serveur = sur-ensemble strict du client

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    // Appartenance + immuabilité (une facture émise ne se modifie pas — Art. L.441-9)
    // INSPECTOR (BUG 3) — on récupère aussi le total courant + l'état du lien pour
    // détecter une désynchronisation monétaire après édition.
    const { data: existing } = await admin.from('invoices')
      .select('user_id, status, total, payment_provider, payment_link_amount').eq('id', id).single();
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }
    if (IMMUTABLE_EDIT_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: "Impossible de modifier une facture déjà émise. Créez un avoir ou dupliquez-la." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { items, discount_percent, ...rest } = body;

    // Colonnes protégées : jamais éditables via PATCH.
    // INSPECTOR (BUG 3) — les colonnes de lien de paiement sont protégées : seul
    // le serveur (PATCH via buildVoidLinkUpdate, ou les routes dédiées) peut les
    // muter. Un client ne peut PAS forger payment_link_stale=false pour cacher un
    // lien désynchronisé, ni réécrire un payment_link obsolète.
    const update: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
    for (const key of [
      'id', 'user_id', 'number', 'document_type', 'status', 'stripe_payment_intent_id', 'paid_at', 'sent_at',
      'payment_link', 'payment_method', 'stripe_payment_url', 'stripe_payment_link_id', 'stripe_payment_link_url',
      'sumup_checkout_id', 'payment_provider', 'payment_link_amount', 'payment_link_stale',
    ]) {
      delete update[key];
    }

    // Validation + recalcul des totaux côté serveur (identique à create)
    if (items && Array.isArray(items)) {
      if (items.length === 0) {
        return NextResponse.json({ error: 'La facture doit contenir au moins une ligne.' }, { status: 400 });
      }
      if (items.length > 200) {
        return NextResponse.json({ error: 'Maximum 200 lignes par facture.' }, { status: 400 });
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (typeof it.quantity !== 'number' || it.quantity <= 0 || it.quantity > 99999) {
          return NextResponse.json({ error: `Ligne ${i + 1} : quantité invalide.` }, { status: 400 });
        }
        if (typeof it.unit_price !== 'number' || it.unit_price < 0 || it.unit_price > 9999999) {
          return NextResponse.json({ error: `Ligne ${i + 1} : prix unitaire invalide.` }, { status: 400 });
        }
        if (typeof it.vat_rate !== 'number' || it.vat_rate < 0 || it.vat_rate > 100) {
          return NextResponse.json({ error: `Ligne ${i + 1} : taux TVA invalide.` }, { status: 400 });
        }
      }
      const discPct = typeof discount_percent === 'number' ? discount_percent : 0;
      const totals = calculateInvoiceTotals(items, discPct);
      update.items = items;
      update.discount_percent = discPct || null;
      update.subtotal = totals.subtotal;
      update.vat_amount = totals.vatAmount;
      update.discount_amount = totals.discountAmount || null;
      update.total = totals.total;

      // ── INSPECTOR (BUG 3) — Intégrité monétaire ───────────────────────────
      // Le montant est FIGÉ dans le checkout/session prestataire au moment de la
      // création du lien. Une édition qui change le total doit invalider l'ancien
      // lien, sinon le client paie un montant obsolète. On ne déclenche ce void
      // QUE pour les liens post-migration (payment_link_amount renseigné) : les
      // anciens liens (amount NULL) conservent le comportement historique et ne
      // sont pas invalidés en masse. payment_provider est CONSERVÉ pour que le
      // client régénère le bon lien (auto-régén silencieuse côté UI).
      const oldLinkAmount = typeof existing.payment_link_amount === 'number' ? existing.payment_link_amount : null;
      if (
        existing.payment_provider &&
        oldLinkAmount !== null &&
        Math.abs(totals.total - oldLinkAmount) > 0.01
      ) {
        Object.assign(update, buildVoidLinkUpdate());
      }
    }

    const { data, error } = await admin.from('invoices')
      .update(update).eq('id', id).eq('user_id', user.id)
      .select('*, client:clients(*)').single();
    if (error) {
      console.error('[Invoices] PATCH error:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Invoices] PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

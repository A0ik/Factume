import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier le subscription tier pour les utilisateurs Free
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, is_trial_active, monthly_invoice_count, invoice_month')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'free';
    const isFree = tier === 'free' && !profile?.is_trial_active;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyCount = profile?.invoice_month === currentMonth ? (profile?.monthly_invoice_count || 0) : 0;

    if (isFree && monthlyCount >= 5) {
      return NextResponse.json(
        { error: 'Limite atteinte. Passez au plan Solo pour créer des factures illimitées.', code: 'FREE_LIMIT' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      client_id, client_name_override, document_type, issue_date, due_date,
      items, subtotal, vat_amount, discount_percent, discount_amount, total,
      notes, prefix, linked_invoice_id, idempotency_id
    } = body;

    console.log('[API /invoices/create] User:', user.id, 'Tier:', tier, 'Prefix:', prefix, 'Total:', total);

    const { data: invoiceId, error: rpcError } = await supabase
      .rpc('create_invoice_atomique', {
        p_user_id: user.id,
        p_client_id: client_id || null,
        p_client_name_override: client_name_override || null,
        p_document_type: document_type || 'invoice',
        p_status: 'draft',
        p_issue_date: issue_date,
        p_due_date: due_date || null,
        p_items: items,
        p_subtotal: subtotal,
        p_vat_amount: vat_amount,
        p_discount_percent: discount_percent || null,
        p_discount_amount: discount_amount || null,
        p_total: total,
        p_notes: notes || null,
        p_prefix: prefix || 'FACT',
        p_linked_invoice_id: linked_invoice_id || null,
        p_idempotency_id: idempotency_id || crypto.randomUUID(),
      });

    if (rpcError || !invoiceId) {
      console.error('[API /invoices/create] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError?.message || 'Erreur RPC' }, { status: 500 });
    }

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('[API /invoices/create] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Facture créée mais impossible de la récupérer' }, { status: 500 });
    }

    // Update profile stats in background
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data: freshProfile }) => {
        if (freshProfile) {
          // We can't update the client-side store from the server, but the profile data is fresh
          console.log('[API /invoices/create] Profile updated, count:', freshProfile.monthly_invoice_count);
        }
      });

    console.log('[API /invoices/create] SUCCESS:', invoice.id);
    return NextResponse.json({ invoice });

  } catch (error: any) {
    console.error('[API /invoices/create] Error:', error);
    return NextResponse.json({ error: error?.message || 'Erreur interne' }, { status: 500 });
  }
}

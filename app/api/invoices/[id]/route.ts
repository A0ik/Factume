import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// DELETE /api/invoices/[id] — Delete an invoice and all related records
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

    // Verify ownership and current status
    const { data: existing } = await supabase
      .from('invoices')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Only allow deletion of draft/cancelled invoices
    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Seules les factures en brouillon ou annulees peuvent etre supprimees' },
        { status: 400 }
      );
    }

    // Delete related records first (to satisfy foreign key constraints)
    // Order matters — most dependent first
    const relatedTables = [
      'invoice_audit_trail',
      'invoice_comments',
      'invoice_tags',
      'invoice_items',
      'facturx_audit_logs',
      'pdp_transmissions',
      'partial_payments',
      'client_portal_tokens',
      'cabinet_reminders',
    ];

    for (const table of relatedTables) {
      const { error: relErr } = await supabase
        .from(table)
        .delete()
        .eq('invoice_id', id);

      // Ignore "not found" errors — table may have no rows for this invoice
      if (relErr && relErr.code !== 'PGRST116') {
        console.warn(`[Invoices] Warning: failed to delete from ${table}:`, relErr.message);
      }
    }

    // Now delete the invoice itself
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Invoices] Delete error:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document supprime avec succes',
    });
  } catch (error) {
    console.error('[Invoices] Unhandled DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

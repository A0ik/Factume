import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// DELETE /api/invoices/[id] — Delete an invoice
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
      .select('user_id, status, document_type')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Only allow deletion of draft invoices (sent invoices should be cancelled, not deleted)
    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Seules les factures en brouillon ou annulees peuvent etre supprimees' },
        { status: 400 }
      );
    }

    // Delete invoice (cascade handles items, comments, tags, etc.)
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

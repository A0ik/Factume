import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

// DELETE /api/contracts/attachments/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    // ODIN (CIBLE 1) — getUser() valide la session côté serveur (defense-in-depth)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get attachment metadata first
    const { data: attachment, error: fetchError } = await admin
      .from('contract_attachments')
      .select('storage_path, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 });
    }

    // Verify ownership
    if (attachment.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Delete from storage
    const { error: storageError } = await admin.storage
      .from('contract-documents')
      .remove([attachment.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue anyway - storage might already be deleted
    }

    // Delete from database
    const { error: dbError } = await admin
      .from('contract_attachments')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

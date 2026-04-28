import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

// DELETE /api/contracts/comments/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify ownership
    const { data: comment } = await admin
      .from('contract_comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
    }

    if (comment.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Delete
    const { error } = await admin
      .from('contract_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

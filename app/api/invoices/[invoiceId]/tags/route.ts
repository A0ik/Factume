import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// GET - Récupérer les tags d'une facture
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
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

    // Récupérer les tags de la facture
    const { data: tags, error } = await admin
      .from('invoice_tags')
      .select(`
        tag_id,
        tags(*)
      `)
      .eq('invoice_id', invoiceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(tags?.map(t => t.tags).filter(Boolean) || []);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Associer un tag à une facture
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
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

    const { tagId } = await req.json();

    if (!tagId) {
      return NextResponse.json({ error: 'tagId manquant' }, { status: 400 });
    }

    // Vérifier que le tag appartient à l'utilisateur
    const { data: tag } = await admin
      .from('tags')
      .select('user_id')
      .eq('id', tagId)
      .single();

    if (!tag || tag.user_id !== user.id) {
      return NextResponse.json({ error: 'Tag non trouvé' }, { status: 404 });
    }

    // Associer le tag à la facture
    const { data: invoiceTag, error } = await admin
      .from('invoice_tags')
      .insert({
        invoice_id: invoiceId,
        tag_id: tagId,
      })
      .select(`
        tag_id,
        tags(*)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(invoiceTag?.tags);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Dissocier un tag d'une facture
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    const { searchParams } = new URL(req.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json({ error: 'tagId manquant' }, { status: 400 });
    }

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

    // Supprimer l'association
    const { error } = await admin
      .from('invoice_tags')
      .delete()
      .eq('invoice_id', invoiceId)
      .eq('tag_id', tagId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

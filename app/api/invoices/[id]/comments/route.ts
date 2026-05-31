import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// GET - Récupérer les commentaires d'une facture
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Vérifier que la facture appartient à l'utilisateur
    const { data: invoice } = await admin
      .from('invoices')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!invoice || invoice.user_id !== user.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Récupérer les commentaires avec les infos utilisateur
    const { data: comments, error } = await admin
      .from('invoice_comments')
      .select(`
        *,
        profiles:profiles(
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .eq('invoice_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(comments || []);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Ajouter un commentaire
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Vérifier que la facture appartient à l'utilisateur
    const { data: invoice } = await admin
      .from('invoices')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!invoice || invoice.user_id !== user.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 });
    }

    // BUG-12 fix: maxLength + HTML sanitization
    if (content.length > 2000) {
      return NextResponse.json({ error: 'Commentaire trop long (max 2000 caractères).' }, { status: 400 });
    }
    const sanitizedContent = content.trim().replace(/<[^>]*>/g, '');

    // Créer le commentaire
    const { data: comment, error } = await admin
      .from('invoice_comments')
      .insert({
        invoice_id: id,
        user_id: user.id,
        content: sanitizedContent,
      })
      .select(`
        *,
        profiles:profiles(
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(comment);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

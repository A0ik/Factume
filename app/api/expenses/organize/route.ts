import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// POST handler - Assign tags and/or folder to expense
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { expense_id, tag_ids, folder_id } = await req.json();

    if (!expense_id) {
      return NextResponse.json(
        { error: 'ID de dépense requis' },
        { status: 400 }
      );
    }

    // Verify expense belongs to user
    const { data: expense } = await supabase
      .from('expenses')
      .select('id')
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .single();

    if (!expense) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    const results: any = {};

    // Handle folder assignment
    if (folder_id !== undefined) {
      if (folder_id === null) {
        // Remove from folder
        await supabase
          .from('expenses')
          .update({ folder_id: null })
          .eq('id', expense_id);
        results.folder = { action: 'removed' };
      } else {
        // Verify folder exists and belongs to user
        const { data: folder } = await supabase
          .from('folders')
          .select('id, name')
          .eq('id', folder_id)
          .eq('user_id', user.id)
          .single();

        if (!folder) {
          return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
        }

        await supabase
          .from('expenses')
          .update({ folder_id })
          .eq('id', expense_id);
        results.folder = { action: 'assigned', folder };
      }
    }

    // Handle tags assignment
    if (tag_ids !== undefined) {
      // Delete existing tag associations
      await supabase
        .from('expense_tags')
        .delete()
        .eq('expense_id', expense_id);

      // Add new tag associations
      if (tag_ids.length > 0) {
        // Verify all tags exist and belong to user
        const { data: tags } = await supabase
          .from('tags')
          .select('id, name, color')
          .eq('user_id', user.id)
          .in('id', tag_ids);

        if (!tags || tags.length !== tag_ids.length) {
          return NextResponse.json({ error: 'Un ou plusieurs tags introuvables' }, { status: 404 });
        }

        // Create associations
        const associations = tag_ids.map((tag_id: string) => ({
          expense_id,
          tag_id,
        }));

        await supabase
          .from('expense_tags')
          .insert(associations);

        results.tags = { action: 'assigned', tags };
      } else {
        results.tags = { action: 'cleared' };
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: 'Organisation mise à jour',
    });
  } catch (error) {
    console.error('[Organize Expense] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de l\'organisation' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET handler - Get tags and folder for an expense
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const expense_id = searchParams.get('expense_id');

    if (!expense_id) {
      return NextResponse.json(
        { error: 'ID de dépense requis' },
        { status: 400 }
      );
    }

    // Verify expense belongs to user
    const { data: expense } = await supabase
      .from('expenses')
      .select('id, folder_id')
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .single();

    if (!expense) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    // Get folder
    let folder = null;
    if (expense.folder_id) {
      const { data } = await supabase
        .from('folders')
        .select('*')
        .eq('id', expense.folder_id)
        .single();
      folder = data;
    }

    // Get tags
    const { data: tags } = await supabase
      .from('expense_tags')
      .select('tags(*)')
      .eq('expense_id', expense_id);

    return NextResponse.json({
      folder,
      tags: tags?.map(t => t.tags).filter(Boolean) || [],
    });
  } catch (error) {
    console.error('[Get Expense Organization] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

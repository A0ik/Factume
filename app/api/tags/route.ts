import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tag {
  id?: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
}

interface Folder {
  id?: string;
  name: string;
  color: string;
  icon?: string;
  parent_id?: string | null;
  description?: string;
}

// ---------------------------------------------------------------------------
// GET handler - Get all tags and folders
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'tags', 'folders', or 'all'

    // Get tags with usage counts
    const { data: tags } = await supabase
      .from('tags')
      .select('*, expense_tags(count)')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    // Get folders with expense counts and parent folder info
    const { data: folders } = await supabase
      .from('folders')
      .select('*, parent:folders!folders_parent_id_fref(name, color)')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    // Get expense counts for each folder
    const folderIds = folders?.map(f => f.id) || [];
    const { data: folderExpenses } = folderIds.length > 0
      ? await supabase
          .from('expenses')
          .select('folder_id')
          .eq('user_id', user.id)
          .in('folder_id', folderIds)
      : { data: [] };

    const folderCounts: Record<string, number> = {};
    for (const expense of folderExpenses || []) {
      if (expense.folder_id) {
        folderCounts[expense.folder_id] = (folderCounts[expense.folder_id] || 0) + 1;
      }
    }

    const foldersWithCounts = folders?.map(f => ({
      ...f,
      expense_count: folderCounts[f.id] || 0,
    })) || [];

    if (type === 'tags') {
      return NextResponse.json({ tags: tags || [] });
    }

    if (type === 'folders') {
      return NextResponse.json({ folders: foldersWithCounts });
    }

    return NextResponse.json({
      tags: tags || [],
      folders: foldersWithCounts,
    });
  } catch (error) {
    console.error('[Get Tags/Folders] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler - Create tag or folder
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { type, ...data } = await req.json();

    if (!type || (type !== 'tag' && type !== 'folder')) {
      return NextResponse.json(
        { error: 'Type invalide (tag ou folder requis)' },
        { status: 400 }
      );
    }

    if (!data.name || !data.color) {
      return NextResponse.json(
        { error: 'Nom et couleur requis' },
        { status: 400 }
      );
    }

    if (type === 'tag') {
      // Check for duplicate tag name
      const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', data.name)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'Un tag avec ce nom existe déjà' },
          { status: 409 }
        );
      }

      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: data.name.trim(),
          color: data.color,
          icon: data.icon || null,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        tag,
        message: 'Tag créé',
      }, { status: 201 });
    }

    if (type === 'folder') {
      // Check for duplicate folder name (in same parent)
      const { data: existing } = await supabase
        .from('folders')
        .select('id')
        .eq('user_id', user.id)
        .eq('parent_id', data.parent_id || null)
        .ilike('name', data.name)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'Un dossier avec ce nom existe déjà' },
          { status: 409 }
        );
      }

      // If parent_id provided, verify it exists and belongs to user
      if (data.parent_id) {
        const { data: parent } = await supabase
          .from('folders')
          .select('id')
          .eq('id', data.parent_id)
          .eq('user_id', user.id)
          .single();

        if (!parent) {
          return NextResponse.json(
            { error: 'Dossier parent introuvable' },
            { status: 404 }
          );
        }
      }

      const { data: folder, error } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name: data.name.trim(),
          color: data.color,
          icon: data.icon || null,
          parent_id: data.parent_id || null,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        folder,
        message: 'Dossier créé',
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Type non supporté' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Create Tag/Folder] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH handler - Update tag or folder
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { type, id, ...updates } = await req.json();

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type et ID requis' },
        { status: 400 }
      );
    }

    if (type === 'tag') {
      const { data: tag, error } = await supabase
        .from('tags')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (!tag) {
        return NextResponse.json({ error: 'Tag introuvable' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        tag,
        message: 'Tag mis à jour',
      });
    }

    if (type === 'folder') {
      // If parent_id being updated, verify new parent exists
      if (updates.parent_id !== undefined) {
        // Prevent setting self as parent
        if (updates.parent_id === id) {
          return NextResponse.json(
            { error: 'Un dossier ne peut pas être son propre parent' },
            { status: 400 }
          );
        }

        // Verify parent exists
        if (updates.parent_id) {
          const { data: parent } = await supabase
            .from('folders')
            .select('id')
            .eq('id', updates.parent_id)
            .eq('user_id', user.id)
            .single();

          if (!parent) {
            return NextResponse.json(
              { error: 'Dossier parent introuvable' },
              { status: 404 }
            );
          }
        }
      }

      const { data: folder, error } = await supabase
        .from('folders')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (!folder) {
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        folder,
        message: 'Dossier mis à jour',
      });
    }

    return NextResponse.json(
      { error: 'Type non supporté' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Update Tag/Folder] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE handler - Delete tag or folder
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type et ID requis' },
        { status: 400 }
      );
    }

    if (type === 'tag') {
      // Verify ownership before touching any related data
      const { data: ownedTag } = await supabase
        .from('tags')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (!ownedTag) {
        return NextResponse.json({ error: 'Tag introuvable' }, { status: 404 });
      }

      // Delete tag associations first (ownership confirmed above)
      await supabase
        .from('expense_tags')
        .delete()
        .eq('tag_id', id);

      // Delete tag
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Tag supprimé',
      });
    }

    if (type === 'folder') {
      // Check for subfolders
      const { data: subfolders } = await supabase
        .from('folders')
        .select('id')
        .eq('parent_id', id)
        .eq('user_id', user.id);

      if (subfolders && subfolders.length > 0) {
        return NextResponse.json(
          { error: 'Ce dossier contient des sous-dossiers. Videz-le d\'abord.' },
          { status: 409 }
        );
      }

      // Unlink expenses from this folder
      await supabase
        .from('expenses')
        .update({ folder_id: null })
        .eq('folder_id', id)
        .eq('user_id', user.id);

      // Delete folder
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Dossier supprimé',
      });
    }

    return NextResponse.json(
      { error: 'Type non supporté' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Delete Tag/Folder] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

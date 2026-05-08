import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Annotation {
  id?: string;
  annotation_type: 'highlight' | 'note' | 'field_marker' | 'correction' | 'approval';
  position: {
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
    width: number; // percentage (0-100)
    height: number; // percentage (0-100)
    page?: number;
  };
  content?: string;
  color?: string;
}

interface ExpenseAnnotations {
  expense_id: string;
  annotations: Annotation[];
}

// ---------------------------------------------------------------------------
// GET handler - Get annotations for an expense
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get('expense_id');

    if (!expenseId) {
      return NextResponse.json(
        { error: 'ID de dépense requis' },
        { status: 400 }
      );
    }

    // Verify expense belongs to user
    const { data: expense } = await supabase
      .from('expenses')
      .select('id, user_id')
      .eq('id', expenseId)
      .eq('user_id', user.id)
      .single();

    if (!expense) {
      return NextResponse.json({ error: 'Dépense introuvable' }, { status: 404 });
    }

    // Get annotations
    const { data: annotations, error } = await supabase
      .from('invoice_annotations')
      .select('*')
      .eq('expense_id', expenseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Update expense has_annotations flag
    await supabase
      .from('expenses')
      .update({
        has_annotations: (annotations?.length || 0) > 0,
      })
      .eq('id', expenseId);

    return NextResponse.json({
      annotations: annotations || [],
      count: annotations?.length || 0,
    });
  } catch (error) {
    console.error('[Get Annotations] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des annotations' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler - Create annotation
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { expense_id, annotation }: { expense_id: string; annotation: Annotation } = await req.json();

    if (!expense_id) {
      return NextResponse.json(
        { error: 'ID de dépense requis' },
        { status: 400 }
      );
    }

    if (!annotation || !annotation.annotation_type || !annotation.position) {
      return NextResponse.json(
        { error: 'Données d\'annotation incomplètes' },
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

    // Validate annotation type
    const validTypes = ['highlight', 'note', 'field_marker', 'correction', 'approval'];
    if (!validTypes.includes(annotation.annotation_type)) {
      return NextResponse.json(
        { error: 'Type d\'annotation invalide' },
        { status: 400 }
      );
    }

    // Validate position (must be percentages 0-100)
    const { x, y, width, height, page } = annotation.position;
    if (
      typeof x !== 'number' || x < 0 || x > 100 ||
      typeof y !== 'number' || y < 0 || y > 100 ||
      typeof width !== 'number' || width <= 0 || width > 100 ||
      typeof height !== 'number' || height <= 0 || height > 100 ||
      (page !== undefined && (typeof page !== 'number' || page < 1))
    ) {
      return NextResponse.json(
        { error: 'Position invalide (valeurs 0-100 requises)' },
        { status: 400 }
      );
    }

    // Create annotation
    const { data: newAnnotation, error } = await supabase
      .from('invoice_annotations')
      .insert({
        user_id: user.id,
        expense_id,
        annotation_type: annotation.annotation_type,
        position: {
          x,
          y,
          width,
          height,
          page: page || 1,
        },
        content: annotation.content || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update expense has_annotations flag
    await supabase
      .from('expenses')
      .update({ has_annotations: true })
      .eq('id', expense_id);

    return NextResponse.json({
      success: true,
      annotation: newAnnotation,
      message: 'Annotation créée avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('[Create Annotation] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création de l\'annotation' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE handler - Delete annotation
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const annotationId = searchParams.get('annotation_id');

    if (!annotationId) {
      return NextResponse.json({ error: 'ID d\'annotation requis' }, { status: 400 });
    }

    // Get annotation first to verify ownership
    const { data: annotation } = await supabase
      .from('invoice_annotations')
      .select('*, expense_id')
      .eq('id', annotationId)
      .eq('user_id', user.id)
      .single();

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation introuvable' }, { status: 404 });
    }

    // Delete annotation
    const { error } = await supabase
      .from('invoice_annotations')
      .delete()
      .eq('id', annotationId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    // Check if expense still has annotations
    const { count } = await supabase
      .from('invoice_annotations')
      .select('id', { count: 'exact', head: true })
      .eq('expense_id', annotation.expense_id)
      .eq('user_id', user.id);

    if (count === 0) {
      await supabase
        .from('expenses')
        .update({ has_annotations: false })
        .eq('id', annotation.expense_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Annotation supprimée avec succès',
    });
  } catch (error) {
    console.error('[Delete Annotation] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'annotation' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH handler - Update annotation
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { annotation_id, updates } = await req.json();

    if (!annotation_id) {
      return NextResponse.json(
        { error: 'ID d\'annotation requis' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Aucune mise à jour fournie' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('invoice_annotations')
      .select('*')
      .eq('id', annotation_id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Annotation introuvable' }, { status: 404 });
    }

    // Update only allowed fields
    const allowedUpdates = ['content', 'position'];
    const updateData: { content?: string; position?: object } = {};

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedUpdates.includes(key)) continue;

      if (key === 'position' && typeof value === 'object') {
        // Validate position values
        const pos = value as any;
        if (
          typeof pos.x === 'number' && pos.x >= 0 && pos.x <= 100 &&
          typeof pos.y === 'number' && pos.y >= 0 && pos.y <= 100 &&
          typeof pos.width === 'number' && pos.width > 0 && pos.width <= 100 &&
          typeof pos.height === 'number' && pos.height > 0 && pos.height <= 100
        ) {
          updateData.position = pos;
        }
      } else {
        (updateData as Record<string, unknown>)[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune mise à jour valide fournie' },
        { status: 400 }
      );
    }

    // Update annotation
    const { data: updated, error } = await supabase
      .from('invoice_annotations')
      .update(updateData)
      .eq('id', annotation_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      annotation: updated,
      message: 'Annotation mise à jour avec succès',
    });
  } catch (error) {
    console.error('[Update Annotation] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'annotation' },
      { status: 500 }
    );
  }
}

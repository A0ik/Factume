import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncEvent {
  id?: string;
  event_type: 'expense_created' | 'expense_validated' | 'expense_updated' | 'vendor_learned' | 'category_learned';
  entity_id: string;
  entity_type: 'expense' | 'vendor' | 'category' | 'tag' | 'folder';
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

interface SyncRule {
  id?: string;
  name: string;
  trigger_event: string;
  conditions: Record<string, any>;
  actions: {
    type: 'update_status' | 'add_tag' | 'assign_folder' | 'send_notification' | 'trigger_workflow';
    params: Record<string, any>;
  }[];
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Helper: Process sync event
// ---------------------------------------------------------------------------

async function processSyncEvent(
  event: SyncEvent,
  supabase: any,
  userId: string,
  userCookie: string
): Promise<void> {
  // Get applicable sync rules
  const { data: rules } = await supabase
    .from('sync_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('trigger_event', event.event_type)
    .eq('is_active', true);

  if (!rules || rules.length === 0) return;

  for (const rule of rules as SyncRule[]) {
    // Check conditions
    let conditionsMet = true;
    for (const [key, value] of Object.entries(rule.conditions)) {
      if (event.payload[key] !== value) {
        conditionsMet = false;
        break;
      }
    }

    if (!conditionsMet) continue;

    // Execute actions
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'update_status':
            await supabase
              .from('expenses')
              .update({ validation_status: action.params.status })
              .eq('id', event.entity_id);
            break;

          case 'add_tag':
            const { data: existingTag } = await supabase
              .from('expense_tags')
              .select('*')
              .eq('expense_id', event.entity_id)
              .eq('tag_id', action.params.tag_id)
              .single();

            if (!existingTag) {
              await supabase
                .from('expense_tags')
                .insert({
                  expense_id: event.entity_id,
                  tag_id: action.params.tag_id,
                });
            }
            break;

          case 'assign_folder':
            await supabase
              .from('expenses')
              .update({ folder_id: action.params.folder_id })
              .eq('id', event.entity_id);
            break;

          case 'send_notification':
            // Create notification
            await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                title: action.params.title || 'Notification système',
                message: action.params.message || '',
                type: action.params.notification_type || 'info',
                entity_id: event.entity_id,
                entity_type: event.entity_type,
              });
            break;

          case 'trigger_workflow':
            await fetch('/api/workflows/validation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: userCookie,
              },
              body: JSON.stringify({
                expense_id: event.entity_id,
                auto_apply: true,
              }),
            });
            break;
        }
      } catch (error) {
        console.error('[Process Sync Action] Error:', error);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// POST handler - Create sync event (triggered by other actions)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { event_type, entity_id, entity_type, payload } = await req.json();

    if (!event_type || !entity_id || !entity_type) {
      return NextResponse.json(
        { error: 'event_type, entity_id et entity_type requis' },
        { status: 400 }
      );
    }

    // Create sync event
    const { data: event, error } = await supabase
      .from('sync_events')
      .insert({
        user_id: user.id,
        event_type,
        entity_id,
        entity_type,
        payload,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Process event immediately (could also be queued)
    const userCookie = req.headers.get('cookie') ?? '';
    await processSyncEvent(event, supabase, user.id, userCookie);

    // Mark as completed
    await supabase
      .from('sync_events')
      .update({ status: 'completed' })
      .eq('id', event.id);

    return NextResponse.json({
      success: true,
      event,
      message: 'Événement synchronisé',
    });
  } catch (error) {
    console.error('[Create Sync Event] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la synchronisation' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET handler - Get sync events and rules
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'events', 'rules', or 'all'

    if (type === 'rules' || type === 'all') {
      const { data: rules } = await supabase
        .from('sync_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (type === 'rules') {
        return NextResponse.json({ rules: rules || [] });
      }
    }

    if (type === 'events' || type === 'all') {
      const { data: events } = await supabase
        .from('sync_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (type === 'events') {
        return NextResponse.json({ events: events || [] });
      }
    }

    // Get both
    const [rulesRes, eventsRes] = await Promise.all([
      supabase
        .from('sync_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('sync_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    return NextResponse.json({
      rules: rulesRes.data || [],
      events: eventsRes.data || [],
    });
  } catch (error) {
    console.error('[Get Sync Data] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données de sync' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT handler - Create/update sync rule
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const ruleData = await req.json();

    if (!ruleData.name || !ruleData.trigger_event || !ruleData.actions) {
      return NextResponse.json(
        { error: 'Nom, trigger_event et actions requis' },
        { status: 400 }
      );
    }

    // Check if rule exists
    const { data: existing } = await supabase
      .from('sync_rules')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', ruleData.name)
      .single();

    let result;

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('sync_rules')
        .update({
          trigger_event: ruleData.trigger_event,
          conditions: ruleData.conditions || {},
          actions: ruleData.actions,
          is_active: ruleData.is_active !== undefined ? ruleData.is_active : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create
      const { data, error } = await supabase
        .from('sync_rules')
        .insert({
          user_id: user.id,
          name: ruleData.name,
          trigger_event: ruleData.trigger_event,
          conditions: ruleData.conditions || {},
          actions: ruleData.actions,
          is_active: ruleData.is_active !== undefined ? ruleData.is_active : true,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      rule: result,
      message: existing ? 'Règle mise à jour' : 'Règle créée',
    });
  } catch (error) {
    console.error('[Update Sync Rule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE handler - Delete sync rule
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rule_id = searchParams.get('rule_id');

    if (!rule_id) {
      return NextResponse.json(
        { error: 'ID de règle requis' },
        { status: 400 }
      );
    }

    await supabase
      .from('sync_rules')
      .delete()
      .eq('id', rule_id)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Règle supprimée',
    });
  } catch (error) {
    console.error('[Delete Sync Rule] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

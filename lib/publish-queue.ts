import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function queueForPublishing(expenseIds: string[], software: string, userId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const queueIds: string[] = [];

  for (const expenseId of expenseIds) {
    const { data, error } = await supabase
      .from('publish_queue')
      .insert({
        user_id: userId,
        expense_id: expenseId,
        software,
        status: 'pending',
      })
      .select('id')
      .single();

    if (!error && data) queueIds.push(data.id);
  }

  return queueIds;
}

export async function processPublishQueue(userId: string): Promise<{ processed: number; failed: number }> {
  const supabase = await createServerSupabaseClient();

  const { data: items } = await supabase
    .from('publish_queue')
    .select('id, expense_id, software, attempts')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('attempts', 3)
    .limit(20);

  if (!items?.length) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    // Mark as processing
    await supabase.from('publish_queue').update({ status: 'processing' }).eq('id', item.id);

    try {
      // For now, mark as completed (actual Pennylane/Sage integration later)
      await supabase.from('publish_queue').update({
        status: 'completed',
        result: { exported: true },
        completed_at: new Date().toISOString(),
      }).eq('id', item.id);

      // Update expense status
      await supabase.from('expenses').update({ status: 'published' }).eq('id', item.expense_id);

      processed++;
    } catch (error) {
      await supabase.from('publish_queue').update({
        status: 'pending',
        attempts: (item.attempts || 0) + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      }).eq('id', item.id);
      failed++;
    }
  }

  return { processed, failed };
}

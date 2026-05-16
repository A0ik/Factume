import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const uid = user.id;

  const [profile, clients, invoices, expenses, recurring, notifications] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('clients').select('*').eq('user_id', uid),
    supabase.from('invoices').select('*, invoice_items(*)').eq('user_id', uid),
    supabase.from('expenses').select('*').eq('user_id', uid),
    supabase.from('recurring_invoices').select('*').eq('user_id', uid),
    supabase.from('notifications').select('*').eq('user_id', uid).limit(100),
  ]);

  const zip = new JSZip();
  zip.file('profile.json', JSON.stringify(profile.data, null, 2));
  zip.file('clients.json', JSON.stringify(clients.data, null, 2));
  zip.file('invoices.json', JSON.stringify(invoices.data, null, 2));
  zip.file('expenses.json', JSON.stringify(expenses.data, null, 2));
  zip.file('recurring_invoices.json', JSON.stringify(recurring.data, null, 2));
  zip.file('notifications.json', JSON.stringify(notifications.data, null, 2));

  const buffer = await zip.generateAsync({ type: 'uint8array' });

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="factume-rgpd-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}

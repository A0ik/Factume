import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { invoiceId, email, profile, confirmed = false } = await req.json();
    if (!invoiceId || !email) return NextResponse.json({ error: 'invoiceId and email required' }, { status: 400 });

    // LOI 3 : Confirmation humaine obligatoire avant envoi de relance
    if (!confirmed) {
      return NextResponse.json({
        error: 'Confirmation requise',
        message: 'L\'envoi de relance doit être explicitement approuvé par l\'utilisateur.',
        requiresConfirmation: true,
      }, { status: 400 });
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, email, profile, isReminder: true }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Record reminder sent timestamp (scoped to user)
    const supabase = createAdminClient();
    await supabase.from('invoices').update({ updated_at: new Date().toISOString() }).eq('id', invoiceId).eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

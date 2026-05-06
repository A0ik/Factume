import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const { data: messages, error: msgError } = await admin
      .from('support_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    return NextResponse.json({ ticket, messages: messages || [] });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: ticket } = await admin
      .from('support_tickets')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ce ticket est fermé' }, { status: 400 });
    }

    const { message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Le message est obligatoire' }, { status: 400 });
    }

    const { data: newMessage, error: msgError } = await admin
      .from('support_messages')
      .insert({
        ticket_id: id,
        sender_id: user.id,
        message: message.trim(),
        is_admin: false,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    if (ticket.status === 'resolved') {
      await admin
        .from('support_tickets')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', id);
    } else {
      await admin
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    return NextResponse.json({ message: newMessage });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Support message error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

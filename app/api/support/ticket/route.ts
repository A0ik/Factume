import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

/*
  Migration SQL:

  CREATE TABLE support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    subject TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES support_tickets(id) NOT NULL,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see own tickets" ON support_tickets FOR ALL USING (user_id = auth.uid());

  ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users see messages in own tickets" ON support_messages FOR SELECT USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );
*/

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { name, email, subject, message, priority } = await req.json();

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Le sujet et le message sont obligatoires' }, { status: 400 });
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const ticketPriority = validPriorities.includes(priority) ? priority : 'normal';

    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        priority: ticketPriority,
        status: 'open',
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    await admin
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: message.trim(),
        is_admin: false,
      });

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        created_at: ticket.created_at,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Support ticket creation error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: tickets, error } = await admin
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tickets: tickets || [] });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

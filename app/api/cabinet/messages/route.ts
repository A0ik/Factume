import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser, getCabinetClients } from '@/lib/cabinet-helpers';
import { Resend } from 'resend';

// PROMÉTHÉE (CIBLE 3 — C3) — Messagerie contextuelle cabinet ↔ client.
// GET  : fil d'un client. POST : ajout d'un message (rôle inféré : membre cabinet
// → 'cabinet', client lié → 'client'). Notification email au client si l'émetteur
// est le cabinet (le client n'est pas obligé d'être connecté au portail).

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');
    if (!clientId) return NextResponse.json({ error: 'client_id requis' }, { status: 400 });

    const { data: messages, error } = await admin
      .from('cabinet_messages')
      .select('id, author_role, author_id, body, read_at, created_at')
      .eq('cabinet_id', cabinet.id)
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Accusé de lecture : seul le STAFF du cabinet marque les messages client comme lus.
    const { data: membership } = await admin
      .from('cabinet_members')
      .select('role')
      .eq('cabinet_id', cabinet.id)
      .eq('user_id', user.id)
      .maybeSingle();
    const isStaff = cabinet.owner_id === user.id || ['admin', 'manager'].includes(membership?.role);
    if (isStaff) {
      await admin
        .from('cabinet_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('cabinet_id', cabinet.id)
        .eq('client_id', clientId)
        .eq('author_role', 'client')
        .is('read_at', null);
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (err: any) {
    console.error('[cabinet/messages GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { client_id, body } = await req.json();
    const trimmed = typeof body === 'string' ? body.trim().slice(0, 4000) : '';
    if (!client_id || !trimmed) return NextResponse.json({ error: 'client_id et body requis' }, { status: 400 });

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) return NextResponse.json({ error: 'Aucun cabinet' }, { status: 404 });

    // Inférence du rôle émetteur : staff du cabinet (owner/admin/manager) ? sinon client.
    // NB : un client invité EST aussi cabinet_members(role='client') — il ne doit PAS être
    // compté comme cabinet, sinon ses réponses seraient attribuées au comptable.
    const { data: membership } = await admin
      .from('cabinet_members')
      .select('role')
      .eq('cabinet_id', cabinet.id)
      .eq('user_id', user.id)
      .maybeSingle();
    const isOwner = cabinet.owner_id === user.id;
    const isCabinetStaff = isOwner || ['admin', 'manager'].includes(membership?.role);
    const authorRole = isCabinetStaff ? 'cabinet' : 'client';

    // Sécurité : un client n'écrit QUE dans son propre fil.
    const clients = await getCabinetClients(cabinet.id);
    const client: any = clients.find((c: any) => c.id === client_id);
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    if (!isCabinetStaff && client.client_user_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { data: message, error } = await admin
      .from('cabinet_messages')
      .insert({
        cabinet_id: cabinet.id,
        client_id,
        author_role: authorRole,
        author_id: user.id,
        body: trimmed,
      })
      .select('id, author_role, body, created_at')
      .single();
    if (error) throw error;

    // Notification email au client quand le cabinet écrit (portail sans connexion requise).
    if (isCabinetStaff) {
      try {
        const clientEmail = client.contact_email || client.profile?.email || null;
        const clientName = client.company_name || client.contact_name || client.profile?.company_name || 'Client';
        if (clientEmail && process.env.RESEND_API_KEY) {
          const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
          const resend = new Resend(process.env.RESEND_API_KEY);
          const sender = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
          await resend.emails.send({
            from: `${cabinet.name} <${sender}>`,
            to: [clientEmail],
            subject: `Nouveau message de ${cabinet.name}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333;">
              <p>Bonjour ${esc(clientName)},</p>
              <p>Votre cabinet <strong>${esc(cabinet.name)}</strong> vous a écrit :</p>
              <div style="background:#f6f6f6;border-radius:10px;padding:16px;margin:16px 0;white-space:pre-wrap;">${esc(trimmed)}</div>
              <p style="color:#888;font-size:12px;">Connectez-vous à votre espace pour répondre.</p>
            </div>`,
          });
        }
      } catch (e) {
        console.warn('[cabinet/messages POST] email notification failed:', (e as any)?.message);
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err: any) {
    console.error('[cabinet/messages POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

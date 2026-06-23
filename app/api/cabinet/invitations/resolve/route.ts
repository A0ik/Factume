import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// PROMÉTHÉE — Résolution publique d'un lien d'invitation par token.
// Retourne le nom du cabinet + validité (pour la page d'acceptation).
// N'expose AUCUNE donnée métier — juste de quoi afficher la page.

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token || !/^[a-f0-9]{16,128}$/i.test(token)) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: invitation, error } = await admin
      .from('cabinet_invitations')
      .select('id, status, expires_at, role, cabinet_id, accepted_by')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!invitation) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });

    const now = new Date().toISOString();
    const expired = new Date(invitation.expires_at).toISOString() < now;
    if (invitation.status === 'revoked') {
      return NextResponse.json({ error: 'Ce lien d\'invitation a été révoqué' }, { status: 410 });
    }
    if (invitation.status === 'accepted' || expired) {
      return NextResponse.json({ error: 'Ce lien d\'invitation a expiré' }, { status: 410 });
    }

    const { data: cabinet } = await admin
      .from('cabinets')
      .select('name, primary_color, logo_url')
      .eq('id', invitation.cabinet_id)
      .maybeSingle();

    return NextResponse.json({
      cabinetName: cabinet?.name || 'Cabinet',
      primaryColor: cabinet?.primary_color || '#10b981',
      logoUrl: cabinet?.logo_url || null,
      role: invitation.role,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

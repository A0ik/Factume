import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    // Verify ownership of the cabinet
    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Aucun cabinet trouve' }, { status: 404 });
    }

    // Only the owner can delete the cabinet
    if (cabinet.owner_id !== user.id) {
      return NextResponse.json({ error: 'Seul le proprietaire peut supprimer le cabinet' }, { status: 403 });
    }

    const cabinetId = cabinet.id;

    // Delete cabinet_clients (all client associations)
    const { error: clientsError } = await admin
      .from('cabinet_clients')
      .delete()
      .eq('cabinet_id', cabinetId);

    if (clientsError) {
      console.error('[cabinet-delete] Error deleting cabinet_clients:', clientsError);
      throw clientsError;
    }

    // Delete cabinet_members (all member associations)
    const { error: membersError } = await admin
      .from('cabinet_members')
      .delete()
      .eq('cabinet_id', cabinetId);

    if (membersError) {
      console.error('[cabinet-delete] Error deleting cabinet_members:', membersError);
      throw membersError;
    }

    // Delete the cabinet itself
    const { error: cabinetError } = await admin
      .from('cabinets')
      .delete()
      .eq('id', cabinetId);

    if (cabinetError) {
      console.error('[cabinet-delete] Error deleting cabinet:', cabinetError);
      throw cabinetError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[cabinet-delete] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

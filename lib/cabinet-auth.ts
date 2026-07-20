import { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * ARGUS — Contrôle d'accès centralisé pour le module Cabinet.
 *
 * Rôles cabinet_members (contrainte CHECK Postgres) :
 *   - owner  (cabinets.owner_id) : accès complet, gestion du cabinet et des membres.
 *   - admin  : gère membres + paramètres + écrit les documents.
 *   - manager: écrit les documents (factures, missions…), voit tout.
 *   - viewer : lecture seule, portée à SES propres données.
 *   - client : le gérant invité qui rejoint son cabinet — voit SES propres données.
 *
 * Toute route cabinet DOIT passer par requireCabinetStaff / requireCabinetOwner
 * avant d'écrire ou de lister des données sensibles. Plus de checks éclatés.
 */

export type CabinetRole = 'admin' | 'manager' | 'viewer' | 'client';

export interface CabinetAccess {
  isOwner: boolean;
  role: CabinetRole | null;
  isMember: boolean;
  /** owner / admin / manager — peut écrire (factures, missions…) et voit tout. */
  isStaff: boolean;
  /** viewer / client — lecture seule, portée à ses propres données. */
  isReadOnly: boolean;
}

const STAFF_ROLES: ReadonlySet<CabinetRole> = new Set(['admin', 'manager']);

/** Calcule les droits d'un utilisateur sur un cabinet. Ne lève jamais. */
export async function resolveCabinetAccess(
  admin: SupabaseClient,
  cabinet: { id: string; owner_id: string },
  userId: string,
): Promise<CabinetAccess> {
  const isOwner = cabinet.owner_id === userId;
  let role: CabinetRole | null = null;
  let isMember = false;
  try {
    const { data: membership } = await admin
      .from('cabinet_members')
      .select('role')
      .eq('cabinet_id', cabinet.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (membership) {
      role = (membership.role as CabinetRole) ?? null;
      isMember = true;
    }
  } catch {
    // Table injoignable — on reste prudent : owner garde ses droits, les autres non.
  }
  const isStaff = isOwner || (role !== null && STAFF_ROLES.has(role));
  return { isOwner, role, isMember, isStaff, isReadOnly: !isStaff };
}

/** Garde 403 si l'utilisateur n'est pas staff (owner / admin / manager). */
export async function requireCabinetStaff(
  admin: SupabaseClient,
  cabinet: { id: string; owner_id: string },
  userId: string,
): Promise<{ ok: true; access: CabinetAccess } | { ok: false; response: NextResponse }> {
  const access = await resolveCabinetAccess(admin, cabinet, userId);
  if (!access.isStaff) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Droits insuffisants : réservé au propriétaire ou à un collaborateur (admin/manager).' },
        { status: 403 },
      ),
    };
  }
  return { ok: true, access };
}

/** Garde 403 si l'utilisateur n'est pas propriétaire du cabinet. */
export async function requireCabinetOwner(
  admin: SupabaseClient,
  cabinet: { id: string; owner_id: string },
  userId: string,
): Promise<{ ok: true; access: CabinetAccess } | { ok: false; response: NextResponse }> {
  const access = await resolveCabinetAccess(admin, cabinet, userId);
  if (!access.isOwner) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Réservé au propriétaire du cabinet.' },
        { status: 403 },
      ),
    };
  }
  return { ok: true, access };
}

/**
 * Renvoie la liste des identifiants de cabinet_clients appartenant à l'utilisateur
 * (pour filtrer les listes en lecture pour les rôles viewer/client).
 * Retourne null si l'utilisateur est staff (voit tout).
 */
export async function getScopedClientIds(
  admin: SupabaseClient,
  cabinetId: string,
  userId: string,
  access: CabinetAccess,
): Promise<string[] | null> {
  if (access.isStaff) return null; // staff voit tout
  const { data } = await admin
    .from('cabinet_clients')
    .select('id')
    .eq('cabinet_id', cabinetId)
    .eq('client_user_id', userId);
  return (data || []).map((r: any) => r.id);
}

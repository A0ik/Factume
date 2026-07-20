import { SupabaseClient } from '@supabase/supabase-js';

/**
 * ARGUS — Helper permissions pour l'Équipe Business (table team_members).
 *
 * Rôles : owner (team_owner_id) / admin / member / viewer.
 * Le partage LECTURE est géré par RLS (policy "Team members read owner *").
 * Ce helper sert à vérifier les droits d'ÉCRITURE côté API (délégation owner
 * → admin/member) et à résoudre le rôle pour le front.
 */

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TeamMembership {
  role: TeamRole;
  status: string;
  teamOwnerId: string;
}

const DELEGATED_WRITE_ROLES: ReadonlySet<TeamRole> = new Set(['admin', 'member']);

/** L'utilisateur est-il propriétaire de la ressource ? */
export function isOwnerOf(resourceUserId: string | null | undefined, userId: string): boolean {
  return !!resourceUserId && resourceUserId === userId;
}

/** Membership d'un utilisateur auprès d'un owner donné (ou null). */
export async function getTeamMembership(
  admin: SupabaseClient,
  ownerId: string,
  userId: string,
): Promise<TeamMembership | null> {
  const { data } = await admin
    .from('team_members')
    .select('role, status, team_owner_id')
    .eq('team_owner_id', ownerId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  return {
    role: data.role as TeamRole,
    status: data.status,
    teamOwnerId: data.team_owner_id,
  };
}

/**
 * Peut écrire sur une ressource : owner de la ressource, OU membre actif
 * avec rôle admin/member délégué par l'owner de la ressource.
 */
export async function canWriteResource(
  admin: SupabaseClient,
  resourceUserId: string | null | undefined,
  userId: string,
): Promise<boolean> {
  if (isOwnerOf(resourceUserId, userId)) return true;
  if (!resourceUserId) return false;
  const m = await getTeamMembership(admin, resourceUserId, userId);
  return !!m && m.status === 'active' && DELEGATED_WRITE_ROLES.has(m.role);
}

/** Tous les owners dont l'utilisateur est membre actif (pour étendre un scope). */
export async function getTeamOwnerIds(
  admin: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await admin
    .from('team_members')
    .select('team_owner_id')
    .eq('user_id', userId)
    .eq('status', 'active');
  return (data || []).map((r: any) => r.team_owner_id as string);
}

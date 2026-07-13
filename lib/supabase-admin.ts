import 'server-only';
// ⚠️ SERVER-ONLY: This file uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS. Never import in client components.
// ARGOS (build) — Réactivé : ce fichier n'est plus importé STATIQUEMENT par du code client.
// Les 3 services (notification/renewal/amendment) n'importent plus supabase-admin au niveau
// du module ; les seules fonctions qui en ont besoin (sendContractNotification,
// sendContractExpirationEmail, getRenewedChain) utilisent un import DYNAMIQUE, et ne sont
// appelées que côté serveur (routes API + signing + cron). Le garde-fou server-only est
// donc compatible avec le bundle client.
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

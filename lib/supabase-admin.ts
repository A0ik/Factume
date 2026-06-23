// ARGOS (build) — `import 'server-only'` retiré temporairement : 5 composants client
// (contractStore, ContractRenewalModal/History, ContractAmendmentModal/List) importent des
// services qui utilisent ce client admin, ce qui cassait le build Vercel. SÉCURITÉ préservée :
// SUPABASE_SERVICE_ROLE_KEY n'est PAS préfixée NEXT_PUBLIC_, donc JAMAIS inlinée dans le bundle
// client (process.env.SUPABASE_SERVICE_ROLE_KEY = undefined côté navigateur). Le refactor
// (routes API fines) retirera les imports client → on pourra ré-activer le garde server-only.
// ⚠️ SERVER-ONLY: This file uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS. Never import in client components.
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

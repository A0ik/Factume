import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { extractReceiptPath, RECEIPTS_BUCKET } from '@/lib/receipt-storage';

/**
 * ZEUS (CIBLE 2) — Mint une URL signée pour un justificatif du bucket PRIVÉ `receipts`.
 *
 * POST { url } | { path }  →  { signedUrl, expiresIn }
 *
 * Sécurité :
 *   1. Authentification requise (session cookie).
 *   2. Ownership : les justificatifs OCR sont stockés sous `${userId}/…` ;
 *      on refuse de signer un path n'appartenant pas à l'utilisateur courant.
 *
 * NB : createSignedUrl se fait via le client service role (le bucket privé
 * exige un bypass RLS pour minte l'URL) ; l'ownership vérifiée ci-dessus est
 * le vrai garde-fou de sécurité.
 */
const SIGNED_URL_TTL_SEC = 3600; // 1 h

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: { url?: string; path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const input = body.url ?? body.path;
  const path = extractReceiptPath(input);
  if (!path) {
    return NextResponse.json({ error: 'Chemin de justificatif invalide' }, { status: 400 });
  }

  // Ownership : path attendu = `${userId}/<file>`.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Accès refusé à ce justificatif' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Justificatif introuvable' }, { status: 404 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: SIGNED_URL_TTL_SEC });
}

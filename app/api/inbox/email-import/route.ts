import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase-server';
import { generateStoragePath, buildOcrPrompt, ALLOWED_MIME_TYPES } from '@/lib/ocr-helpers';
import { processAndSaveExpense } from '@/lib/ocr-core';

/**
 * POST /api/inbox/email-import
 *
 * Webhook appelé par le Cloudflare Email Worker (cf cloudflare/email-inbox-worker.ts)
 * lorsqu'un fournisseur envoie une facture à l'adresse d'import d'un utilisateur
 * (factures+<token>@factu.me). Le token résout l'utilisateur → OCR Gemini auto →
 * expense créée en statut 'pending' (file d'attente de /ocr) prête à valider.
 *
 * Sécurité :
 *   - header `x-inbox-secret` doit matcher INBOX_WEBHOOK_SECRET (shared secret Worker).
 *   - le token doit exister dans email_inboxes (résolution user_id).
 *   - l'utilisateur doit être Business/trial.
 *
 * Body JSON : { token, from_email?, from_name?, attachments: [{ filename, content_type, data_b64 }] }
 */

export const maxDuration = 60;

const OCR_MODEL = 'google/gemini-2.5-flash';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const INBOX_DOMAIN = process.env.INBOX_DOMAIN || 'factu.me';

export async function POST(req: NextRequest) {
  // ── Shared secret Worker ↔ app ────────────────────────────────────────────
  const inboxSecret = process.env.INBOX_WEBHOOK_SECRET;
  const provided = req.headers.get('x-inbox-secret');
  if (!inboxSecret || provided !== inboxSecret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const token: string | undefined = body?.token;
  const attachments: any[] = Array.isArray(body?.attachments) ? body.attachments : [];
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
  }
  if (attachments.length === 0) {
    return NextResponse.json({ processed: 0, message: 'Aucune pièce jointe' });
  }

  const admin = createAdminClient();

  // ── Résolution user par token ─────────────────────────────────────────────
  const { data: inbox, error: inboxErr } = await admin
    .from('email_inboxes')
    .select('user_id, address')
    .eq('token', token)
    .maybeSingle();
  if (inboxErr || !inbox) {
    return NextResponse.json({ error: 'Boîte de réception inconnue' }, { status: 404 });
  }
  const userId: string = inbox.user_id;

  // ── Gate Business/trial (feature Business) ────────────────────────────────
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier, is_trial_active')
    .eq('id', userId)
    .single();
  const tier = profile?.subscription_tier;
  const allowed = tier === 'business' || tier === 'trial' || profile?.is_trial_active === true;
  if (!allowed) {
    return NextResponse.json({ error: 'Plan Business requis', code: 'PLAN_REQUIRED' }, { status: 403 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'Configuration IA manquante' }, { status: 500 });
  }

  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const processed: any[] = [];
  const errors: any[] = [];

  for (const att of attachments.slice(0, 5)) {
    const filename: string = att.filename || 'piecejointe';
    const contentType: string = (att.content_type || 'application/octet-stream').toLowerCase();
    const dataB64: string | undefined = att.data_b64;

    if (!dataB64) { errors.push({ filename, error: 'Pas de données' }); continue; }
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      errors.push({ filename, error: `Type non supporté (${contentType})` });
      continue;
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(dataB64, 'base64');
    } catch {
      errors.push({ filename, error: 'Base64 invalide' });
      continue;
    }
    if (buf.length === 0 || buf.length > MAX_FILE_SIZE_BYTES) {
      errors.push({ filename, error: 'Taille invalide (>20 Mo ou vide)' });
      continue;
    }

    try {
      const isPdf = contentType === 'application/pdf';

      // Upload du justificatif dans le bucket privé receipts
      const storagePath = generateStoragePath(userId, filename);
      const { error: upErr } = await admin.storage
        .from('receipts')
        .upload(storagePath, buf, { contentType, upsert: false });
      if (upErr) { errors.push({ filename, error: `Stockage: ${upErr.message}` }); continue; }
      const { data: urlData } = admin.storage.from('receipts').getPublicUrl(storagePath);
      const receiptPublicUrl = urlData.publicUrl;

      // Pré-traitement image (hors PDF) — améliore la précision OCR
      let ocrB64 = buf.toString('base64');
      let ocrMime = contentType;
      if (!isPdf) {
        try {
          const { preprocessReceipt } = await import('@/lib/ocr-preprocess');
          const processedImg = await preprocessReceipt(buf, contentType);
          ocrB64 = Buffer.from(processedImg.buffer).toString('base64');
          ocrMime = processedImg.mimeType;
        } catch {
          /* fallback : image originale */
        }
      }

      // Extraction Gemini
      const completion = await openrouter.chat.completions.create({
        model: OCR_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: buildOcrPrompt() },
            { type: 'image_url', image_url: { url: `data:${ocrMime};base64,${ocrB64}` } },
          ],
        }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) { errors.push({ filename, error: 'IA sans réponse' }); continue; }
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(raw); } catch { errors.push({ filename, error: 'Réponse IA illisible' }); continue; }

      const result = await processAndSaveExpense(parsed, userId, admin, {
        receiptUrl: receiptPublicUrl,
        storagePath,
        fileName: filename,
        fileSize: buf.length,
        fileType: contentType,
        isPdf,
      });

      processed.push({
        filename,
        expense_id: result.savedExpense?.id ?? null,
        vendor: result.extracted?.vendor ?? null,
        amount: result.extracted?.amount ?? null,
        confidence: result.extracted?.confidence ?? null,
      });
    } catch (err: any) {
      errors.push({ filename, error: err?.message || 'Erreur traitement' });
    }
  }

  return NextResponse.json({
    processed: processed.length,
    errors,
    items: processed,
    domain: INBOX_DOMAIN,
  });
}

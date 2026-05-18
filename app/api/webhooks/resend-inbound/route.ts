import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';
import { processAndSaveExpense } from '@/lib/ocr-core';
import { buildOcrPrompt } from '@/lib/ocr-helpers';

// ---------------------------------------------------------------------------
// Resend Inbound Parse webhook — handles forwarded receipts / invoices sent to
// depenses@factu.me.  Resend POSTs a JSON payload for every inbound email.
// ---------------------------------------------------------------------------

// Lazy-initialized admin client (service-role) — no user session available
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ---------------------------------------------------------------------------
// 1. Webhook signature verification  (HMAC-SHA256)
// ---------------------------------------------------------------------------

function verifySignature(body: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[resend-inbound] RESEND_WEBHOOK_SECRET is not configured');
    return false;
  }

  // Resend may send multiple signatures separated by spaces (e.g. t=...,v1=... v1=...)
  // We verify against the first valid v1 signature we find.
  const parts = signatureHeader.split(' ');
  for (const part of parts) {
    const match = part.match(/^v1=(.+)$/);
    if (!match) continue;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(match[1]);
    if (expectedBuf.length !== sigBuf.length) continue;
    if (crypto.timingSafeEqual(expectedBuf, sigBuf)) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// 2. OCR via OpenRouter — returns raw AI response for processAndSaveExpense
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 3. Duplicate detection
// ---------------------------------------------------------------------------

async function isDuplicate(
  userId: string,
  vendor: string | null,
  amount: number | null,
  date: string | null,
): Promise<boolean> {
  if (!amount || !date) return false;

  const { data: existing } = await getSupabaseAdmin()
    .from('expenses')
    .select('id, vendor, amount, date')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!existing || existing.length === 0) return false;

  for (const row of existing) {
    // Amount within 5 % tolerance
    const rowAmount = Number(row.amount) || 0;
    if (rowAmount === 0) continue;
    const diff = Math.abs(rowAmount - amount);
    if (diff > Math.abs(amount) * 0.05) continue;

    // Vendor similarity (fuzzy)
    if (vendor && row.vendor) {
      const a = vendor.toLowerCase().trim();
      const b = (row.vendor as string).toLowerCase().trim();
      if (a.includes(b) || b.includes(a)) return true;
    } else {
      // Same amount + same date, no vendor info — likely duplicate
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// 4. Run OCR via OpenRouter — returns raw parsed JSON for ocr-core
// ---------------------------------------------------------------------------

async function runOcr(
  base64Content: string,
  mimeType: string,
): Promise<Record<string, unknown> | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[resend-inbound] OPENROUTER_API_KEY not configured');
    return null;
  }

  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  try {
    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildOcrPrompt() },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Content}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    console.error('[resend-inbound] OCR error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 6. Process a single attachment
// ---------------------------------------------------------------------------

interface ProcessResult {
  success: boolean;
  expenseId?: string;
  vendor?: string | null;
  amount?: number | null;
  filename: string;
  error?: string;
}

async function processAttachment(
  userId: string,
  attachment: { filename: string; content_type: string; content: string },
): Promise<ProcessResult> {
  const { filename, content_type, content } = attachment;

  try {
    // Decode base64
    const buffer = Buffer.from(content, 'base64');

    // Upload to Supabase Storage bucket "receipts"
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${timestamp}_${sanitizedFilename}`;

    const { error: uploadError } = await getSupabaseAdmin()
      .storage
      .from('receipts')
      .upload(storagePath, buffer, { contentType: content_type, upsert: false });

    if (uploadError) {
      console.error('[resend-inbound] Storage upload error:', uploadError);
      return { success: false, filename, error: 'Storage upload failed' };
    }

    const { data: urlData } = getSupabaseAdmin()
      .storage
      .from('receipts')
      .getPublicUrl(storagePath);

    const receiptUrl = urlData.publicUrl;
    const isPdf = content_type === 'application/pdf';

    // Preprocess image for better OCR accuracy (skip PDFs)
    let ocrBase64 = content;
    let ocrMime = isPdf ? 'application/pdf' : content_type;
    if (!isPdf) {
      try {
        const { preprocessReceipt } = await import('@/lib/ocr-preprocess');
        const processed = await preprocessReceipt(buffer, ocrMime);
        ocrBase64 = processed.buffer.toString('base64');
        ocrMime = processed.mimeType;
      } catch {}
    }

    // Run OCR
    const raw = await runOcr(ocrBase64, ocrMime);
    if (!raw) {
      // Save minimal record even without OCR
      const { data: saved } = await getSupabaseAdmin()
        .from('expenses')
        .insert({
          user_id: userId,
          vendor: null,
          amount: 0,
          category: 'other',
          date: new Date().toISOString().slice(0, 10),
          description: `Reçu par email — ${filename} (OCR échoué)`,
          receipt_url: receiptUrl,
          receipt_storage_path: storagePath,
          status: 'pending',
          source: 'email',
        })
        .select('id')
        .single();

      return { success: true, expenseId: saved?.id, filename };
    }

    // Duplicate check
    const amount = raw.amount as number | undefined;
    const vendor = raw.vendor as string | undefined;
    const date = raw.date as string | undefined;
    const dup = await isDuplicate(userId, vendor ?? null, amount ?? null, date ?? null);
    if (dup) {
      console.log(`[resend-inbound] Duplicate detected: vendor=${vendor} amount=${amount} date=${date}`);
      return { success: false, filename, error: 'Duplicate expense', vendor, amount };
    }

    // Use ocr-core for sanitize + accounts + journal + DB save
    const supabase = getSupabaseAdmin();
    const result = await processAndSaveExpense(raw, userId, supabase, {
      receiptUrl,
      storagePath,
      fileName: filename,
      isPdf,
    });

    // Add source: 'email' to the saved record
    if (result.savedExpense?.id) {
      await supabase.from('expenses').update({ source: 'email' }).eq('id', result.savedExpense.id);
    }

    return {
      success: !result.dbError,
      expenseId: (result.savedExpense as Record<string, unknown>)?.id as string | undefined,
      vendor: (result.extracted as Record<string, unknown>).vendor as string | null,
      amount: (result.extracted as Record<string, unknown>).amount as number | null,
      filename,
      error: result.dbError ?? undefined,
    };
  } catch (err) {
    console.error(`[resend-inbound] processAttachment error for ${filename}:`, err);
    return { success: false, filename, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// 7. Extract info from HTML email body (no attachments)
// ---------------------------------------------------------------------------

async function extractFromHtmlBody(
  userId: string,
  html: string | undefined,
  text: string | undefined,
  subject: string | undefined,
): Promise<ProcessResult | null> {
  const body = text || html;
  if (!body || body.trim().length < 20) return null;

  if (!process.env.OPENROUTER_API_KEY) return null;

  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  try {
    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: `${buildOcrPrompt()}\n\n--- CONTENU EMAIL ---\nObjet: ${subject || 'N/A'}\n\n${body.slice(0, 8000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) return null;

    const raw = JSON.parse(rawContent) as Record<string, unknown>;

    // Only save if we extracted a meaningful amount
    const amount = raw.amount as number | undefined;
    if (!amount || amount <= 0) return null;

    const vendor = raw.vendor as string | undefined;
    const date = raw.date as string | undefined;

    // Duplicate check
    const dup = await isDuplicate(userId, vendor ?? null, amount, date ?? null);
    if (dup) {
      return { success: false, filename: 'email-body', error: 'Duplicate expense', vendor, amount };
    }

    // Use ocr-core for sanitize + accounts + journal + DB save
    const supabase = getSupabaseAdmin();
    const result = await processAndSaveExpense(raw, userId, supabase, {
      receiptUrl: '',
      storagePath: '',
      fileName: 'email-body',
      isPdf: false,
    });

    // Add source: 'email'
    if (result.savedExpense?.id) {
      await supabase.from('expenses').update({ source: 'email' }).eq('id', result.savedExpense.id);
    }

    return {
      success: !result.dbError,
      expenseId: (result.savedExpense as Record<string, unknown>)?.id as string | undefined,
      vendor: (result.extracted as Record<string, unknown>).vendor as string | null,
      amount: (result.extracted as Record<string, unknown>).amount as number | null,
      filename: 'email-body',
      error: result.dbError ?? undefined,
    };
  } catch (err) {
    console.error('[resend-inbound] extractFromHtmlBody error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 8. POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Always read body as text first for signature verification
  const rawBody = await req.text();

  // --- Signature verification ---
  const signature = req.headers.get('resend-signature');
  if (!verifySignature(rawBody, signature)) {
    console.warn('[resend-inbound] Invalid or missing signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse JSON payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('[resend-inbound] Invalid JSON payload');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 200 });
  }

  // Extract email fields from Resend inbound format
  // Resend uses nested objects: { from: { address: "..." }, to: [...], ... }
  // But also flat strings in some configurations. Handle both.
  const fromRaw = payload.from;
  const fromEmail = typeof fromRaw === 'string'
    ? fromRaw
    : (fromRaw as Record<string, string>)?.address
      || (fromRaw as Record<string, string>)?.[0]
      || null;

  if (!fromEmail) {
    console.warn('[resend-inbound] No "from" address in payload');
    return NextResponse.json({ received: true });
  }

  console.log(`[resend-inbound] Processing email from ${fromEmail}`);

  // --- Identify user ---
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, subscription_tier, is_trial_active')
    .eq('email', fromEmail)
    .single();

  if (!profile) {
    // Silently ignore — do not reveal user existence to random senders
    console.log(`[resend-inbound] No profile found for ${fromEmail}, ignoring`);
    return NextResponse.json({ received: true });
  }

  // --- Subscription check ---
  const isBusiness = profile.subscription_tier === 'business';
  const isTrial = profile.is_trial_active === true;

  if (!isBusiness && !isTrial) {
    console.log(`[resend-inbound] User ${fromEmail} is not on Business/trial plan`);
    return NextResponse.json({ received: true });
  }

  const userId = profile.id as string;
  const subject = (payload.subject as string) || '';
  const html = payload.html as string | undefined;
  const text = payload.text as string | undefined;

  // Resend inbound attachments format:
  // attachments: [{ filename, content_type, content (base64) }]
  const attachments = (payload.attachments as Array<{
    filename?: string;
    content_type?: string;
    content?: string;
  }>) || [];

  // Filter to supported types (images + PDFs)
  const supportedAttachments = attachments.filter((att) => {
    const ct = att.content_type || '';
    return ct === 'application/pdf' || ct.startsWith('image/');
  });

  const results: ProcessResult[] = [];

  // --- Process each supported attachment ---
  if (supportedAttachments.length > 0) {
    for (const att of supportedAttachments) {
      if (!att.content || !att.filename) continue;

      const result = await processAttachment(userId, {
        filename: att.filename,
        content_type: att.content_type || 'application/octet-stream',
        content: att.content,
      });

      results.push(result);
    }
  }

  // --- If no attachments (or none were supported), try email body ---
  if (supportedAttachments.length === 0) {
    const bodyResult = await extractFromHtmlBody(userId, html, text, subject);
    if (bodyResult) {
      results.push(bodyResult);
    }
  }

  // --- Summary ---
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const duplicateCount = results.filter((r) => r.error === 'Duplicate expense').length;

  console.log(
    `[resend-inbound] Done for ${fromEmail}: ${successCount} processed, ${duplicateCount} duplicates, ${failCount} failed`,
  );

  // --- Send notification ---
  if (successCount > 0 || duplicateCount > 0) {
    try {
      let notificationBody: string;
      if (successCount > 0 && duplicateCount > 0) {
        notificationBody = `${successCount} justificatif${successCount > 1 ? 's' : ''} traité${successCount > 1 ? 's' : ''} par email. ${duplicateCount} doublon${duplicateCount > 1 ? 's' : ''} ignoré${duplicateCount > 1 ? 's' : ''}.`;
      } else if (successCount > 0) {
        notificationBody = `${successCount} justificatif${successCount > 1 ? 's' : ''} traité${successCount > 1 ? 's' : ''} par email.`;
      } else {
        notificationBody = `${duplicateCount} justificatif${duplicateCount > 1 ? 's' : ''} ignoré${duplicateCount > 1 ? 's' : ''} (doublon${duplicateCount > 1 ? 's' : ''}).`;
      }

      await getSupabaseAdmin().from('notifications').insert({
        user_id: userId,
        type: 'expense_email',
        title: `${successCount} justificatif${successCount > 1 ? 's' : ''} traité${successCount > 1 ? 's' : ''} par email`,
        body: notificationBody,
        link: '/expenses',
        read: false,
      });
    } catch (notifErr) {
      // Non-critical — log but don't fail the webhook
      console.error('[resend-inbound] Notification insert error:', notifErr);
    }
  }

  // Always return 200 — webhooks need 200 to stop retrying
  return NextResponse.json({
    received: true,
    processed: successCount,
    duplicates: duplicateCount,
    failed: failCount,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';

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
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(match[1]))) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// 2. Sanitization helpers  (mirrors ocr-receipt/route.ts)
// ---------------------------------------------------------------------------

function sanitizeNumeric(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function sanitizeDate(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? `${y}-${m}-${d}` : null;
}

function sanitizeString(val: unknown): string | null {
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : null;
}

const VALID_CATEGORIES = [
  'transport', 'meals', 'accommodation', 'equipment', 'office',
  'shopping', 'mileage', 'telecom', 'insurance', 'software', 'other',
] as const;

function sanitizeCategory(val: unknown): string {
  return typeof val === 'string' && (VALID_CATEGORIES as readonly string[]).includes(val) ? val : 'other';
}

function sanitizePaymentMethod(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const normalized = val.toLowerCase().trim();
  if (['card', 'carte'].includes(normalized)) return 'card';
  if (['cash', 'especes'].includes(normalized)) return 'cash';
  if (['transfer', 'virement'].includes(normalized)) return 'transfer';
  if (['check', 'cheque'].includes(normalized)) return 'check';
  return null;
}

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
// 4. OCR prompt (French — tailored for expense receipts)
// ---------------------------------------------------------------------------

const OCR_PROMPT = `Tu es un expert-comptable français spécialisé dans l'analyse de justificatifs de dépenses. Analyse ce document avec précision maximale.

RÈGLES :
1. Ne devine JAMAIS une information absente — mets null.
2. Distingue bien HT / TTC / TVA.
3. Les montants doivent être des NOMBRES (pas de chaînes, pas de symbole €).
4. Les dates au format YYYY-MM-DD.
5. Le champ category doit être une seule valeur parmi la liste ci-dessous.

CATÉGORIES AUTORISÉES :
transport | meals | accommodation | equipment | office | shopping | telecom | insurance | software | other

Retourne UNIQUEMENT du JSON valide (pas de markdown, pas de commentaires) :
{
  "vendor": "nom du fournisseur",
  "amount": 0.00,
  "ht_amount": 0.00,
  "vat_amount": 0.00,
  "vat_rate": 20.0,
  "date": "YYYY-MM-DD",
  "description": "description courte",
  "category": "transport|meals|accommodation|equipment|office|shopping|telecom|insurance|software|other",
  "currency": "EUR",
  "confidence": 85,
  "payment_method": "card|cash|transfer|check|null",
  "invoice_number": "numéro ou null"
}
Si le document est illisible, mets null pour les champs concernés et confidence à 0.`;

// ---------------------------------------------------------------------------
// 5. Run OCR via OpenRouter (mirrors ocr-receipt/route.ts)
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
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
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

    // Determine mime for OCR — PDFs are sent as image/jpeg to Gemini
    // (Gemini handles PDF natively, but we normalise for safety)
    const isPdf = content_type === 'application/pdf';
    const ocrMime = isPdf ? 'application/pdf' : content_type;

    // Run OCR
    const raw = await runOcr(content, ocrMime);
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

    // Sanitize OCR output
    const vendor = sanitizeString(raw.vendor);
    const amount = sanitizeNumeric(raw.amount);
    const htAmount = sanitizeNumeric(raw.ht_amount);
    const vatAmount = sanitizeNumeric(raw.vat_amount);
    const vatRate = sanitizeNumeric(raw.vat_rate);
    const date = sanitizeDate(raw.date) ?? new Date().toISOString().slice(0, 10);
    const description = sanitizeString(raw.description) ?? `Reçu par email — ${filename}`;
    const category = sanitizeCategory(raw.category);
    const currency = sanitizeString(raw.currency) ?? 'EUR';
    const confidence = sanitizeNumeric(raw.confidence) ?? 0;
    const paymentMethod = sanitizePaymentMethod(raw.payment_method);
    const invoiceNumber = sanitizeString(raw.invoice_number);

    // Duplicate check
    const dup = await isDuplicate(userId, vendor, amount, date);
    if (dup) {
      console.log(`[resend-inbound] Duplicate detected: vendor=${vendor} amount=${amount} date=${date}`);
      return { success: false, filename, error: 'Duplicate expense', vendor, amount };
    }

    // Build expense record — only non-null keys
    const expenseRecord: Record<string, unknown> = {
      user_id: userId,
      vendor,
      amount,
      category,
      date,
      description,
      receipt_url: receiptUrl,
      receipt_storage_path: storagePath,
      payment_method: paymentMethod,
      status: 'pending',
      source: 'email',
      ocr_raw_response: raw,
      ocr_confidence: confidence,
      ocr_invoice_number: invoiceNumber,
      ocr_currency: currency,
    };

    if (htAmount !== null) expenseRecord.amount_ht = htAmount; // Only if the column exists
    if (vatAmount !== null) expenseRecord.vat_amount = vatAmount;
    if (vatRate !== null) expenseRecord.vat_rate = vatRate;

    // Remove null/undefined so Supabase uses column defaults
    Object.keys(expenseRecord).forEach((key) => {
      if (expenseRecord[key] === null || expenseRecord[key] === undefined) {
        delete expenseRecord[key];
      }
    });

    const { data: savedExpense, error: dbError } = await getSupabaseAdmin()
      .from('expenses')
      .insert(expenseRecord)
      .select('id')
      .single();

    if (dbError) {
      console.error('[resend-inbound] DB insert error:', dbError);
      return { success: false, filename, error: dbError.message };
    }

    return {
      success: true,
      expenseId: savedExpense?.id,
      vendor,
      amount,
      filename,
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
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        {
          role: 'user',
          content: `${OCR_PROMPT}\n\n--- CONTENU EMAIL ---\nObjet: ${subject || 'N/A'}\n\n${body.slice(0, 8000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) return null;

    const raw = JSON.parse(rawContent) as Record<string, unknown>;

    const vendor = sanitizeString(raw.vendor);
    const amount = sanitizeNumeric(raw.amount);
    const vatAmount = sanitizeNumeric(raw.vat_amount);
    const date = sanitizeDate(raw.date) ?? new Date().toISOString().slice(0, 10);
    const description = sanitizeString(raw.description) ?? `Email: ${subject || 'sans objet'}`;
    const category = sanitizeCategory(raw.category);
    const confidence = sanitizeNumeric(raw.confidence) ?? 0;
    const paymentMethod = sanitizePaymentMethod(raw.payment_method);
    const invoiceNumber = sanitizeString(raw.invoice_number);
    const currency = sanitizeString(raw.currency) ?? 'EUR';

    // Only save if we extracted a meaningful amount
    if (!amount || amount <= 0) return null;

    // Duplicate check
    const dup = await isDuplicate(userId, vendor, amount, date);
    if (dup) {
      return { success: false, filename: 'email-body', error: 'Duplicate expense', vendor, amount };
    }

    const expenseRecord: Record<string, unknown> = {
      user_id: userId,
      vendor,
      amount,
      category,
      date,
      description: `${description} (extrait du corps de l'email)`,
      payment_method: paymentMethod,
      status: 'pending',
      source: 'email',
      ocr_raw_response: raw,
      ocr_confidence: confidence,
      ocr_invoice_number: invoiceNumber,
      ocr_currency: currency,
    };

    if (vatAmount !== null) expenseRecord.vat_amount = vatAmount;

    Object.keys(expenseRecord).forEach((key) => {
      if (expenseRecord[key] === null || expenseRecord[key] === undefined) {
        delete expenseRecord[key];
      }
    });

    const { data: savedExpense, error: dbError } = await getSupabaseAdmin()
      .from('expenses')
      .insert(expenseRecord)
      .select('id')
      .single();

    if (dbError) {
      console.error('[resend-inbound] DB insert error (email body):', dbError);
      return { success: false, filename: 'email-body', error: dbError.message };
    }

    return {
      success: true,
      expenseId: savedExpense?.id,
      vendor,
      amount,
      filename: 'email-body',
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

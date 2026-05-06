import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const MAX_FILES = 20;
const MAX_CONCURRENT_OCR = 3;

const OCR_PROMPT = `Analyse ce justificatif de depense et extrait les informations. Retourne UNIQUEMENT du JSON valide:
{
  "vendor": "nom du fournisseur/magasin",
  "amount": nombre TTC,
  "ht_amount": montant HT ou null,
  "vat_amount": montant TVA ou null,
  "vat_rate": taux TVA (%) ou null,
  "date": "YYYY-MM-DD ou null",
  "description": "description courte de l'achat",
  "category": "transport|meals|accommodation|equipment|office|shopping|telecom|insurance|software|other",
  "currency": "EUR",
  "confidence": nombre entre 0 et 100,
  "payment_method": "card|cash|transfer|other",
  "invoice_number": "numero de facture ou null"
}
Si une information n'est pas lisible, mets null. La categorie doit etre la plus precise possible parmi les options listees.`;

interface OcrResult {
  success: boolean;
  file: string;
  expense?: Record<string, unknown>;
  error?: string;
}

async function processFile(
  file: File,
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  openrouter: OpenAI
): Promise<OcrResult> {
  const fileName = file.name;

  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Upload to Supabase storage
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}_${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[OCR Bulk] Upload failed for ${fileName}:`, uploadError);
      return { success: false, file: fileName, error: `Upload echoue: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(storagePath);

    const receiptUrl = urlData.publicUrl;

    // OCR via OpenRouter Gemini
    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      return { success: false, file: fileName, error: 'Impossible de lire le justificatif' };
    }

    // Insert into expenses table
    const expenseRecord = {
      user_id: userId,
      vendor: (extracted.vendor as string) || 'Inconnu',
      amount: typeof extracted.amount === 'number' ? extracted.amount : 0,
      vat_amount: (extracted.vat_amount as number) ?? null,
      category: (extracted.category as string) || 'other',
      date: (extracted.date as string) || new Date().toISOString().split('T')[0],
      description: (extracted.description as string) || fileName,
      receipt_url: receiptUrl,
      payment_method: (extracted.payment_method as string) || 'card',
      status: 'pending',
      location_country: 'France',
      is_deductible: true,
      ocr_raw_response: extracted,
      ocr_confidence: (extracted.confidence as number) ?? null,
      ocr_line_items: null,
      ocr_invoice_number: (extracted.invoice_number as string) ?? null,
      ocr_currency: (extracted.currency as string) || 'EUR',
      receipt_storage_path: storagePath,
    };

    const { data: expense, error: insertError } = await supabase
      .from('expenses')
      .insert(expenseRecord)
      .select()
      .single();

    if (insertError) {
      console.error(`[OCR Bulk] Insert failed for ${fileName}:`, insertError);
      return { success: false, file: fileName, error: `Erreur base de donnees: ${insertError.message}` };
    }

    return { success: true, file: fileName, expense: expense ?? undefined };
  } catch (error: any) {
    console.error(`[OCR Bulk] Error processing ${fileName}:`, error);
    const message = error.message || 'Erreur lors du traitement';
    if (error.status === 429) {
      return { success: false, file: fileName, error: 'Trop de requetes. Reessayez dans quelques instants.' };
    }
    return { success: false, file: fileName, error: message };
  }
}

/**
 * Run tasks with a concurrency limit.
 * Uses a pool of workers that pick up tasks as slots become available.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      const result = await Promise.resolve(tasks[currentIndex]())
        .then((value) => ({ status: 'fulfilled' as const, value }))
        .catch((reason) => ({ status: 'rejected' as const, reason }));
      results[currentIndex] = result;
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Subscription check — business or active trial only
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, is_trial_active')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const isBusiness = profile.subscription_tier === 'business';
    const isTrial = profile.is_trial_active === true;

    if (!isBusiness && !isTrial) {
      return NextResponse.json({
        error: 'L\'analyse OCR est disponible uniquement avec le plan Business. Passez a un plan superieur pour debloquer cette fonctionnalite.',
        feature: 'ocr',
        requiredPlan: 'business',
        upgradeUrl: '/paywall?plan=business',
      }, { status: 402 });
    }

    // API key check
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    // Parse form data
    const formData = await req.formData();
    const files: File[] = formData.getAll('files').filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier recu. Utilisez la cle "files".' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} fichiers par requete. Vous avez envoye ${files.length} fichiers.` },
        { status: 400 }
      );
    }

    // Initialize OpenRouter client
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Process files with concurrency limit
    const tasks = files.map((file) => () =>
      processFile(file, user.id, supabase, openrouter)
    );

    const settled = await runWithConcurrency(tasks, MAX_CONCURRENT_OCR);

    // Map settled results to final output
    const results: OcrResult[] = settled.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      // This case shouldn't happen since processFile catches internally,
      // but handle it defensively
      return { success: false, file: 'unknown', error: String(result.reason) };
    });

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: results.length - successCount,
      },
    });
  } catch (error: any) {
    console.error('[OCR Bulk] Error:', error);
    const message = error.message || 'Erreur lors du traitement en masse';

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Cle API invalide. Verifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requetes. Reessayez dans quelques instants.' }, { status: 429 });
    }
    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      return NextResponse.json({ error: 'Le delai a ete depasse. Reessayez avec moins de fichiers.' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

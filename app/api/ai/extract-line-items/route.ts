import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

// ---------------------------------------------------------------------------
// Line Items Extraction Prompt (Optimized for detailed extraction)
// ---------------------------------------------------------------------------

function buildLineItemsPrompt(): string {
  return `Tu es un expert-comptable français spécialisé dans l'extraction de données de factures. Ta mission est d'extraire CHAQUE ligne de produits/services d'une facture avec une précision extrême.

CONSIGNES CRITIQUES :
1. Extrais TOUTES les lignes visibles, sans exception
2. Chaque ligne doit avoir : description, quantité, prix unitaire, total
3. Les taux de TVA peuvent varier par ligne (20%, 10%, 5.5%, 2.1%, 0%)
4. Si une ligne n'a pas de TVA indiquée, déduis-la du contexte (ex: 20% par défaut en France)
5. Les codes produits/SKU/Références sont importants - extrais-les si visibles
6. Le montant total de la ligne DOIT inclure la TVA (TTC)
7. Les montants HT et TVA par ligne doivent être calculés précisément

FORMAT FRANÇAIS :
- Les décimales utilisent la VIRGULE (ex: 12,50 €)
- Les milliers peuvent avoir des espaces (ex: 1 234,56 €)
- Les taux de TVA français : 20%, 10%, 5.5%, 2.1%, 0%

Retourne UNIQUEMENT du JSON valide (pas de markdown) :
{
  "vendor": "nom du fournisseur",
  "invoice_number": "numéro de facture ou null",
  "invoice_date": "YYYY-MM-DD ou null",
  "currency": "EUR|USD|GBP|CHF|autre",
  "line_items": [
    {
      "line_number": 1,
      "description": "description précise du produit/service",
      "quantity": 1,
      "unit_price_ht": 10.00,
      "vat_rate": 20.0,
      "vat_amount": 2.00,
      "total_ht": 10.00,
      "total_ttc": 12.00,
      "product_code": "REF-123 ou null",
      "account_code": "606400 ou null",
      "unit_of_measure": "unité|heure|mètre|kg|forfait|null"
    }
  ],
  "summary": {
    "total_ht": 100.00,
    "total_vat": 20.00,
    "total_ttc": 120.00,
    "vat_breakdown": [
      { "rate": 20.0, "base_ht": 100.00, "vat_amount": 20.00 }
    ]
  },
  "confidence": 85,
  "extraction_notes": "notes sur l'extraction (tables mal alignées, illisible, etc.) ou null"
}

Si le document ne contient PAS de ligne de détails (ex: facture globale), mets "line_items": [] et explique dans extraction_notes.
Analyse maintenant ce document et extrais TOUTES les lignes avec la plus grande précision.`;
}

// ---------------------------------------------------------------------------
// Helper: Sanitize line item
// ---------------------------------------------------------------------------

function sanitizeLineItem(item: any): any {
  return {
    line_number: Math.max(1, parseInt(item.line_number) || 1),
    description: String(item.description || 'Article').trim(),
    quantity: parseFloat(item.quantity) || 1,
    unit_price_ht: parseFloat(item.unit_price_ht) || 0,
    vat_rate: parseFloat(item.vat_rate) || 20,
    vat_amount: parseFloat(item.vat_amount) || 0,
    total_ht: parseFloat(item.total_ht) || 0,
    total_ttc: parseFloat(item.total_ttc) || 0,
    product_code: item.product_code ? String(item.product_code).trim() : null,
    account_code: item.account_code ? String(item.account_code).trim() : null,
    unit_of_measure: item.unit_of_measure ? String(item.unit_of_measure).trim() : null,
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 1. Authentication & subscription check
    // ------------------------------------------------------------------
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

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
      return NextResponse.json(
        {
          error:
            "L'extraction de lignes est disponible uniquement avec le plan Business. Passez à un plan supérieur pour débloquer cette fonctionnalité.",
          feature: 'line_items',
          requiredPlan: 'business',
          upgradeUrl: '/paywall?plan=business',
        },
        { status: 402 }
      );
    }

    // ------------------------------------------------------------------
    // 2. Rate limiting
    // ------------------------------------------------------------------
    {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count: recentCount } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', windowStart);

      if (recentCount !== null && recentCount >= RATE_LIMIT_MAX_REQUESTS) {
        return NextResponse.json(
          { error: 'Trop de requêtes OCR. Réessayez dans une minute.' },
          { status: 429 }
        );
      }
    }

    // ------------------------------------------------------------------
    // 3. Validate environment
    // ------------------------------------------------------------------
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration IA manquante (OPENROUTER_API_KEY)' },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Parse & validate the uploaded file
    // ------------------------------------------------------------------
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const expenseId = formData.get('expense_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni. Envoyez un fichier via le champ "file".' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Type de fichier non supporté (${file.type}). Formats acceptés : JPEG, PNG, WebP, PDF.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 20 Mo.` },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 5. Convert file to base64
    // ------------------------------------------------------------------
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // ------------------------------------------------------------------
    // 6. Call OpenRouter / Gemini 2.0 Flash for Line Items Extraction
    // ------------------------------------------------------------------
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildLineItemsPrompt() },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    });

    // ------------------------------------------------------------------
    // 7. Parse & sanitize the response
    // ------------------------------------------------------------------
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: "L'IA n'a retourné aucune réponse. Réessayez." },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.error('[Line Items] JSON parse error. Raw content:', rawContent.slice(0, 500));
      return NextResponse.json(
        { error: "Impossible d'interpréter la réponse de l'IA. Réessayez." },
        { status: 500 }
      );
    }

    // Sanitize line items
    const lineItems = Array.isArray(parsed.line_items)
      ? parsed.line_items
          .filter((item: unknown) => typeof item === 'object' && item !== null)
          .map(sanitizeLineItem)
      : [];

    // Sanitize summary
    const summary = parsed.summary && typeof parsed.summary === 'object'
      ? {
          total_ht: parseFloat((parsed.summary as any).total_ht) || 0,
          total_vat: parseFloat((parsed.summary as any).total_vat) || 0,
          total_ttc: parseFloat((parsed.summary as any).total_ttc) || 0,
          vat_breakdown: Array.isArray((parsed.summary as any).vat_breakdown)
            ? (parsed.summary as any).vat_breakdown.map((v: any) => ({
                rate: parseFloat(v.rate) || 0,
                base_ht: parseFloat(v.base_ht) || 0,
                vat_amount: parseFloat(v.vat_amount) || 0,
              }))
            : [],
        }
      : null;

    const result = {
      vendor: (parsed.vendor as string)?.trim() || null,
      invoice_number: (parsed.invoice_number as string)?.trim() || null,
      invoice_date: (parsed.invoice_date as string)?.trim() || null,
      currency: (parsed.currency as string)?.trim() || 'EUR',
      line_items: lineItems,
      summary,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence / 100 : 0.5,
      extraction_notes: (parsed.extraction_notes as string)?.trim() || null,
    };

    // ------------------------------------------------------------------
    // 8. Update expense if expense_id provided
    // ------------------------------------------------------------------
    if (expenseId && lineItems.length > 0) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          ocr_line_items: lineItems,
          ocr_confidence: result.confidence,
          line_items_count: lineItems.length,
        })
        .eq('id', expenseId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Line Items] Update error:', updateError);
      }
    }

    // ------------------------------------------------------------------
    // 9. Return result
    // ------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        line_items_count: lineItems.length,
        model: 'google/gemini-2.5-flash',
      },
    });
  } catch (error: unknown) {
    console.error('[Line Items] Unhandled error:', error);

    const err = error as { message?: string; status?: number };

    if (err.status === 401 || err.status === 403) {
      return NextResponse.json(
        { error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' },
        { status: 500 }
      );
    }

    if (err.status === 429) {
      return NextResponse.json(
        { error: 'Trop de requêtes vers le service IA. Réessayez dans quelques instants.' },
        { status: 429 }
      );
    }

    if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
      return NextResponse.json(
        { error: 'Le délai d\'analyse a été dépassé. Réessayez avec un fichier plus léger.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Erreur inattendue lors de l'extraction des lignes." },
      { status: 500 }
    );
  }
}

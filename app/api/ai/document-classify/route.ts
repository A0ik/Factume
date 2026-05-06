import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Document types supported for classification
// ---------------------------------------------------------------------------
const DOCUMENT_TYPES = [
  'invoice',
  'receipt',
  'expense_report',
  'rent_receipt',
  'insurance_certificate',
  'bank_statement',
  'payslip',
  'contract',
  'other',
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Classification prompt
// ---------------------------------------------------------------------------

const CLASSIFICATION_PROMPT = `Classifie ce document dans UNE de ces catégories: invoice, receipt, expense_report, rent_receipt, insurance_certificate, bank_statement, payslip, contract, other.
Retourne UNIQUEMENT du JSON: { "type": "...", "confidence": 0-100, "description": "courte description du document" }`;

// ---------------------------------------------------------------------------
// Specialized extraction prompts per document type
// ---------------------------------------------------------------------------

function getExtractionPrompt(type: DocumentType): string {
  switch (type) {
    case 'invoice':
      return `Tu es un expert-comptable français. Analyse cette facture fournisseur et extrais toutes les informations.
Convertis les montants FR (ex: "52,74 €" → 52.74 / "1 040,00€" → 1040.00).
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "supplier_name": "nom du fournisseur",
  "supplier_siret": "SIRET du fournisseur (14 chiffres) ou null",
  "supplier_vat_number": "numéro TVA intracommunautaire ou null",
  "supplier_address": "adresse du fournisseur ou null",
  "invoice_number": "numéro de facture",
  "invoice_date": "YYYY-MM-DD ou null",
  "due_date": "YYYY-MM-DD ou null",
  "payment_terms": "conditions de paiement (ex: '30 jours', 'à réception') ou null",
  "currency": "EUR",
  "line_items": [
    { "description": "description ligne", "quantity": 1, "unit_price_ht": 0.00, "vat_rate": 20.0, "vat_amount": 0.00, "total_ttc": 0.00 }
  ],
  "vat_details": [
    { "rate": 20.0, "base_ht": 0.00, "vat_amount": 0.00 }
  ],
  "total_ht": 0.00,
  "total_ttc": 0.00,
  "total_vat": 0.00,
  "payment_method": "transfer|card|cash|check|prelevement|null",
  "purchase_order_number": "numéro bon de commande ou null"
}`;

    case 'receipt':
      return `Tu es un expert en lecture de tickets de caisse. Analyse ce ticket et extrais les informations.
Convertis les montants FR (ex: "52,74 €" → 52.74).
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "vendor_name": "nom du magasin/fournisseur",
  "vendor_address": "adresse ou null",
  "vendor_siret": "SIRET ou null",
  "receipt_number": "numéro du ticket ou null",
  "date": "YYYY-MM-DD ou null",
  "time": "HH:MM ou null",
  "items": [
    { "description": "nom article", "quantity": 1, "unit_price": 0.00, "total": 0.00 }
  ],
  "subtotal": 0.00,
  "total_ttc": 0.00,
  "vat_amount": 0.00,
  "vat_rate": 20.0,
  "payment_method": "card|cash|check|null",
  "currency": "EUR",
  "category": "transport|meals|accommodation|equipment|office|services|shopping|other"
}`;

    case 'expense_report':
      return `Tu es un expert-comptable français. Analyse cette note de frais et extrais les informations.
Convertis les montants FR (ex: "52,74 €" → 52.74).
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "employee_name": "nom de l'employé ou null",
  "employee_department": "département/service ou null",
  "report_number": "numéro de note de frais ou null",
  "period_start": "YYYY-MM-DD ou null",
  "period_end": "YYYY-MM-DD ou null",
  "trip_purpose": "objet du déplacement ou null",
  "trip_destination": "destination ou null",
  "expenses": [
    { "date": "YYYY-MM-DD", "category": "transport|meals|accommodation|other", "description": "description", "amount": 0.00, "vat_amount": 0.00, "receipt_reference": "ref ou null" }
  ],
  "total_amount": 0.00,
  "total_vat": 0.00,
  "currency": "EUR",
  "approval_status": "approved|pending|rejected|null"
}`;

    case 'rent_receipt':
      return `Tu es un expert en gestion locative. Analyse cette quittance de loyer et extrais les informations.
Convertis les montants FR (ex: "520,00 €" → 520.00).
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "landlord_name": "nom du propriétaire/bailleur",
  "landlord_address": "adresse du bailleur ou null",
  "tenant_name": "nom du locataire",
  "tenant_address": "adresse du logement loué",
  "receipt_number": "numéro de quittance ou null",
  "period_start": "YYYY-MM-DD ou null",
  "period_end": "YYYY-MM-DD ou null",
  "rent_amount": 0.00,
  "charges_amount": 0.00,
  "total_amount": 0.00,
  "payment_method": "transfer|check|cash|null",
  "payment_date": "YYYY-MM-DD ou null",
  "lease_start_date": "YYYY-MM-DD ou null",
  "currency": "EUR"
}`;

    case 'insurance_certificate':
      return `Tu es un expert en assurances. Analyse cette attestation d'assurance et extrais les informations.
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "insurer_name": "nom de la compagnie d'assurance",
  "insurer_address": "adresse ou null",
  "policy_number": "numéro de police",
  "certificate_number": "numéro d'attestation ou null",
  "insured_name": "nom de l'assuré",
  "insured_address": "adresse de l'assuré ou null",
  "start_date": "YYYY-MM-DD ou null",
  "end_date": "YYYY-MM-DD ou null",
  "coverage_type": "type de couverture (auto, habitation, RC pro, etc.)",
  "coverage_description": "description détaillée de la couverture ou null",
  "premium_amount": 0.00,
  "premium_frequency": "mensuelle|annuelle|trimestrielle|null",
  "deductible": 0.00,
  "currency": "EUR"
}`;

    case 'bank_statement':
      return `Tu es un expert bancaire. Analyse ce relevé bancaire et extrais les informations.
Convertis les montants FR (ex: "1 040,74 €" → 1040.74).
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "bank_name": "nom de la banque",
  "account_holder": "titulaire du compte",
  "account_number": "numéro de compte (masqué partiellement si nécessaire) ou null",
  "iban": "IBAN complet ou null",
  "statement_period_start": "YYYY-MM-DD ou null",
  "statement_period_end": "YYYY-MM-DD ou null",
  "opening_balance": 0.00,
  "closing_balance": 0.00,
  "currency": "EUR",
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "libellé de l'opération", "amount": 0.00, "type": "debit|credit", "balance_after": 0.00, "reference": "référence ou null" }
  ],
  "total_debits": 0.00,
  "total_credits": 0.00
}`;

    case 'payslip':
      return `Tu es un expert en paie française. Analyse ce bulletin de paie et extrais les informations.
Convertis les montants FR (ex: "2 500,00 €" → 2500.00).
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "employer_name": "nom de l'employeur",
  "employer_siret": "SIRET employeur ou null",
  "employer_address": "adresse employeur ou null",
  "employee_name": "nom du salarié",
  "employee_ssn": "numéro de sécu (masqué) ou null",
  "employee_position": "poste/fonction ou null",
  "period": "YYYY-MM (mois concerné) ou null",
  "start_date": "YYYY-MM-DD ou null",
  "end_date": "YYYY-MM-DD ou null",
  "gross_salary": 0.00,
  "net_salary_before_tax": 0.00,
  "net_salary_after_tax": 0.00,
  "total_deductions": 0.00,
  "deductions": [
    { "label": "libellé cotisation", "employee_share": 0.00, "employer_share": 0.00 }
  ],
  "overtime_hours": 0.00,
  "overtime_amount": 0.00,
  "paid_leave_days": 0.00,
  "currency": "EUR"
}`;

    case 'contract':
      return `Tu es un expert juridique. Analyse ce contrat et extrais les informations clés.
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "contract_type": "type de contrat (service, bail, travail, licence, etc.)",
  "contract_number": "numéro de contrat ou null",
  "party_1_name": "nom partie émettrice",
  "party_1_address": "adresse partie 1 ou null",
  "party_2_name": "nom partie prenante",
  "party_2_address": "adresse partie 2 ou null",
  "signature_date": "YYYY-MM-DD ou null",
  "start_date": "YYYY-MM-DD ou null",
  "end_date": "YYYY-MM-DD ou null",
  "amount": 0.00,
  "currency": "EUR",
  "key_terms": ["terme 1", "terme 2"],
  "renewal_clause": "description de la clause de renouvellement ou null",
  "termination_clause": "description de la clause de résiliation ou null"
}`;

    case 'other':
    default:
      return `Tu es un expert en analyse de documents. Analyse ce document et extrais toutes les informations pertinentes.
Convertis les montants FR (ex: "52,74 €" → 52.74).
Retourne UNIQUEMENT du JSON valide, sans markdown ni commentaires:
{
  "document_title": "titre ou type du document",
  "issuer_name": "nom de l'émetteur ou null",
  "recipient_name": "nom du destinataire ou null",
  "date": "YYYY-MM-DD ou null",
  "amount": 0.00,
  "currency": "EUR",
  "description": "résumé du contenu du document",
  "key_data": { "clé1": "valeur1", "clé2": "valeur2" },
  "relevant_dates": [{ "label": "libellé", "date": "YYYY-MM-DD" }],
  "relevant_amounts": [{ "label": "libellé", "amount": 0.00 }]
}`;
  }
}

// ---------------------------------------------------------------------------
// Timeout wrapper (50s to stay under Vercel 60s limit)
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout IA (${ms / 1000}s)`)), ms)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Sanitize document type from classification response
// ---------------------------------------------------------------------------

function sanitizeDocType(raw: string | undefined | null): DocumentType {
  if (!raw || typeof raw !== 'string') return 'other';
  const normalized = raw.trim().toLowerCase();
  if ((DOCUMENT_TYPES as readonly string[]).includes(normalized)) {
    return normalized as DocumentType;
  }
  return 'other';
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
            "La classification de documents est disponible uniquement avec le plan Business. Passez à un plan supérieur pour débloquer cette fonctionnalité.",
          feature: 'document_classify',
          requiredPlan: 'business',
          upgradeUrl: '/paywall?plan=business',
        },
        { status: 402 },
      );
    }

    // ------------------------------------------------------------------
    // 2. Validate environment
    // ------------------------------------------------------------------
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration IA manquante (OPENROUTER_API_KEY)' },
        { status: 500 },
      );
    }

    // ------------------------------------------------------------------
    // 3. Parse & validate the uploaded file
    // ------------------------------------------------------------------
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni. Envoyez un fichier via le champ "file".' },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10 Mo). Compressez le fichier avant l\'envoi.' },
        { status: 413 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // ------------------------------------------------------------------
    // 4. Step 1 — Classify the document
    // ------------------------------------------------------------------
    const classificationCompletion = await withTimeout(
      openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-exp',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: CLASSIFICATION_PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 300,
      }),
      30000,
    );

    const classificationRaw = classificationCompletion.choices[0]?.message?.content;
    if (!classificationRaw) {
      return NextResponse.json(
        { error: "L'IA n'a retourné aucune réponse de classification." },
        { status: 500 },
      );
    }

    let classification: { type?: string; confidence?: number; description?: string };
    try {
      classification = JSON.parse(classificationRaw);
    } catch {
      return NextResponse.json(
        { error: 'Réponse de classification IA invalide.' },
        { status: 500 },
      );
    }

    const documentType: DocumentType = sanitizeDocType(classification.type);
    const confidence =
      typeof classification.confidence === 'number' &&
      classification.confidence >= 0 &&
      classification.confidence <= 100
        ? classification.confidence
        : 0;

    // ------------------------------------------------------------------
    // 5. Step 2 — Targeted extraction based on detected type
    // ------------------------------------------------------------------
    const extractionPrompt = getExtractionPrompt(documentType);

    const extractionCompletion = await withTimeout(
      openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-exp',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: extractionPrompt },
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
      }),
      45000,
    );

    const extractionRaw = extractionCompletion.choices[0]?.message?.content;
    if (!extractionRaw) {
      return NextResponse.json(
        { error: "L'IA n'a retourné aucune réponse d'extraction." },
        { status: 500 },
      );
    }

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(extractionRaw);
    } catch {
      return NextResponse.json(
        { error: "Réponse d'extraction IA invalide." },
        { status: 500 },
      );
    }

    // ------------------------------------------------------------------
    // 6. Return result
    // ------------------------------------------------------------------
    return NextResponse.json({
      document_type: documentType,
      confidence,
      description: classification.description || null,
      extracted,
    });
  } catch (error: unknown) {
    console.error('[Document Classify] Error:', error);

    const err = error as { message?: string; status?: number };

    if (err.status === 401 || err.status === 403) {
      return NextResponse.json(
        { error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' },
        { status: 500 },
      );
    }

    if (err.status === 429) {
      return NextResponse.json(
        { error: 'Trop de requêtes vers le service IA. Réessayez dans quelques instants.' },
        { status: 429 },
      );
    }

    if (err.message?.includes('Timeout') || err.message?.includes('timeout')) {
      return NextResponse.json(
        {
          error:
            "Le délai d'analyse a été dépassé. Essayez avec un fichier plus léger ou un PDF textuel.",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: err.message || "Erreur inattendue lors de la classification du document." },
      { status: 500 },
    );
  }
}

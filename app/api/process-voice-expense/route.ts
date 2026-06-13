import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { processVoiceTranscript } from '@/lib/groq-translator';
import { APIError } from '@/types';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateAndCorrectTVA } from '@/lib/tva-validator';
import { getUserSubscriptionStatus } from '@/lib/subscription-guard';
import { roundMoney } from '@/lib/money';

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Expense-specific LLM prompt (multilingual)
// ---------------------------------------------------------------------------

const EXPENSE_SYSTEM_PROMPT = `Tu es un assistant expert en comptabilité française. L'utilisateur dicte une dépense par voix.

MULTILINGUAL TAX TERMINOLOGY — CRITICAL :
TERMES "HORS TAXES" (montant AVANT taxe = amount à retourner) :
  "HT" / "Hors taxes" / "Net" / "Netto" / "Sin IVA" / "Ohne MwSt" / "Senza IVA" / "Sem IVA"
TERMES "TTC" (montant APRÈS taxe = doit convertir en HT) :
  "TTC" / "Toutes taxes comprises" / "Gross" / "Brutto" / "Con IVA" / "Com IVA" / "Inkl. MwSt"
PAR DÉFAUT : En cas de doute, le montant indiqué EST le montant TTC (pour les dépenses, le reçu est généralement TTC).

Extrait les informations de la dépense et retourne UNIQUEMENT du JSON valide :
{
  "vendor": "string — nom du fournisseur/commerçant",
  "amount": number — montant TTC de la dépense,
  "vat_amount": number — montant de la TVA (0 si non mentionné ou exonéré),
  "vat_rate": number — taux de TVA (0, 2.1, 5.5, 10, 20),
  "category": "string — UNE de ces catégories : transport, meals, accommodation, equipment, office, shopping, mileage, telecom, insurance, software, marketing, rent, utilities, legal, training, healthcare, other",
  "date": "string — date au format YYYY-MM-DD (null si non mentionnée)",
  "description": "string — description professionnelle de la dépense (3-8 mots)",
  "payment_method": "string — 'cash', 'card', 'transfer', 'cheque', ou null",
  "is_recurring": boolean — true si c'est un abonnement/facture récurrente
}

RÈGLES :
- "amount" est le montant TTC (total payé)
- Si l'utilisateur dit un montant HT, calcule : TTC = HT * (1 + TVA/100)
- "category" doit correspondre à la nature de la dépense :
  * taxi, uber, train, avion, péage → "transport"
  * restaurant, café, repas, déjeuner → "meals"
  * hôtel, Airbnb, nuitée → "accommodation"
  * ordinateur, téléphone, imprimante → "equipment"
  * stylos, papier, cartouche, fournitures → "office"
  * courses, supermarché, courses alimentaires → "shopping"
  * essence, péage, parking → "transport"
  * internet, téléphone portable, forfait → "telecom"
  * assurance, mutuelle → "insurance"
  * abonnement logiciel, SaaS, Netflix, Spotify → "software"
  * publicité, Google Ads, Facebook Ads → "marketing"
  * loyer, charges → "rent"
  * électricité, eau, gaz → "utilities"
  * avocat, comptable, notaire → "legal"
  * formation, cours, livre → "training"
  * médecin, pharmacie → "healthcare"
- "description" doit être PROFESSIONNELLE, pas une copie brute
- Si l'utilisateur donne un prix par unité et une quantité, multiplier
- Toutes les valeurs numériques doivent être des nombres finis, jamais d'expressions

EXEMPLES MULTILINGUES :
- "J'ai payé 45 euros de taxi pour un déplacement client" → {vendor: "Taxi", amount: 45, vat_rate: 10, category: "transport", description: "Transport pour déplacement client"}
- "I paid 200 euros for a hotel in Berlin" → {vendor: "Hotel", amount: 200, vat_rate: 10, category: "accommodation", description: "Hébergement professionnel Berlin"}
- "50€ de restaurant avec le client Dupont" → {vendor: "Restaurant", amount: 50, vat_rate: 10, category: "meals", description: "Repas d'affaires client Dupont"}
- "I paid 49 euros for Netflix subscription" → {vendor: "Netflix", amount: 49, vat_rate: 0, category: "software", description: "Abonnement Netflix", is_recurring: true}
- "دفعت 30 يورو للصيدلية" → {vendor: "Pharmacie", amount: 30, vat_rate: 0, category: "healthcare", description: "Achat pharmacie"}`;

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 300, windowMs: 60000 }); // LOI 9
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 });
    }

    // Auth
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Subscription check
    const sub = await getUserSubscriptionStatus(user.id);
    if (!sub.isProOrAbove && !sub.isBusiness) {
      return NextResponse.json({
        error: 'Les dépenses vocales nécessitent le plan Pro.',
        code: 'EXPENSE_LIMIT',
        upgradeUrl: '/paywall?plan=pro',
      }, { status: 403 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;
    if (!audio) {
      return NextResponse.json({ error: 'Audio manquant' }, { status: 400 });
    }

    // 1. Transcribe with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
    });
    const rawTranscript = transcription.text;

    // 2. Translate to French if needed
    const { transcript, wasTranslated, originalLanguage } = await processVoiceTranscript(rawTranscript);

    // 3. Parse with LLM
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: EXPENSE_SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      return NextResponse.json({ error: 'Erreur de parsing IA' }, { status: 500 });
    }

    // 4. Validate required fields
    const amount = typeof parsed.amount === 'number' && Number.isFinite(parsed.amount) ? parsed.amount : 0;
    if (amount <= 0) {
      return NextResponse.json({ error: 'Montant non détecté. Réessayez en précisant le montant.' }, { status: 400 });
    }

    const vendor = parsed.vendor || parsed.supplier || 'Fournisseur';
    const category = parsed.category || 'other';
    const vatRate = typeof parsed.vat_rate === 'number' ? parsed.vat_rate : 20;
    const vatAmount = typeof parsed.vat_amount === 'number' ? parsed.vat_amount : roundMoney(amount * vatRate / (100 + vatRate));
    const description = parsed.description || vendor;
    const date = parsed.date || new Date().toISOString().slice(0, 10);
    const paymentMethod = parsed.payment_method || null;
    const isRecurring = parsed.is_recurring === true;

    // 5. Get PCG account code from category
    let accountCode = '658000'; // Default: charges diverses
    try {
      const { getCategoryAccountCode } = await import('@/lib/plan-comptable');
      const code = getCategoryAccountCode(category);
      if (code) accountCode = code;
    } catch {}

    // LOI 2 FIX: Ne PAS insérer en base ici.
    // Le frontend insère APRÈS confirmation utilisateur + upload justificatif obligatoire.
    // L'API ne fait que transcrire et parser.
    return NextResponse.json({
      transcript,
      originalTranscript: rawTranscript,
      wasTranslated,
      originalLanguage,
      expense: {
        vendor,
        amount,
        vat_amount: vatAmount,
        vat_rate: vatRate,
        category,
        account_code: accountCode,
        description,
        date,
        payment_method: paymentMethod,
        is_recurring: isRecurring,
      },
    });
  } catch (error: unknown) {
    console.error('[process-voice-expense] Error:', error);
    const apiError = error as APIError;
    return NextResponse.json(
      { error: apiError.message || 'Erreur lors du traitement vocal' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateAIGenerateData, formatValidationError, ValidationError, DocumentType, AIGenerateSchema, validateRequest } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

type LocalDocumentType = DocumentType;

const DOC_TYPE_CONFIG: Record<LocalDocumentType, {
  label: string;
  defaultDueDays: number;
  defaultNotes: string;
  promptHint: string;
}> = {
  invoice: {
    label: 'facture',
    defaultDueDays: 30,
    defaultNotes: '',
    promptHint: 'C\'est une FACTURE. due_days est un NOMBRE (30 par défaut) géré par un sélecteur de conditions de paiement — ne PAS le mentionner dans notes. Le champ "notes" doit rester VIDE (null) par défaut. Ne PAS y mettre de conditions de paiement, pénalités de retard ou indemnités de recouvrement — ces mentions légales sont déjà incluses automatiquement sur la facture. Ne remplir "notes" QUE si l\'utilisateur demande explicitement un message personnalisé (ex: "merci pour votre confiance", "livraison prévue le 15").',
  },
  quote: {
    label: 'devis',
    defaultDueDays: 0,
    defaultNotes: '',
    promptHint: 'C\'est un DEVIS. Mets due_days à 0. Le champ "notes" doit rester VIDE (null) par défaut. Ne PAS y mettre de conditions de paiement. Les mentions légales sont déjà incluses automatiquement. Ne remplir "notes" QUE si l\'utilisateur demande explicitement un message personnalisé.',
  },
  credit_note: {
    label: 'avoir',
    defaultDueDays: 0,
    defaultNotes: '',
    promptHint: 'C\'est un AVOIR. Mets due_days à 0. Le champ "notes" doit rester VIDE (null) par défaut. Ne PAS y mettre de conditions de paiement. Ne remplir "notes" QUE si l\'utilisateur demande explicitement un message personnalisé.',
  },
  purchase_order: {
    label: 'bon de commande',
    defaultDueDays: 30,
    defaultNotes: '',
    promptHint: 'C\'est un BON DE COMMANDE. Le champ "notes" doit rester VIDE (null) par défaut. Ne PAS y mettre de conditions de paiement. Ne remplir "notes" QUE si l\'utilisateur demande explicitement un message personnalisé.',
  },
  delivery_note: {
    label: 'bon de livraison',
    defaultDueDays: 0,
    defaultNotes: '',
    promptHint: 'C\'est un BON DE LIVRAISON. Mets due_days à 0. Le champ "notes" doit rester VIDE (null) par défaut. Ne PAS y mettre de conditions de paiement. Ne remplir "notes" QUE si l\'utilisateur demande explicitement un message personnalisé.',
  },
  deposit: {
    label: 'facture d\'acompte',
    defaultDueDays: 0,
    defaultNotes: '',
    promptHint: 'C\'est une FACTURE D\'ACOMPTE. Mets due_days à 0. Le champ "notes" doit rester VIDE (null) par défaut. Ne PAS y mettre de conditions de paiement. Ne remplir "notes" QUE si l\'utilisateur demande explicitement un message personnalisé.',
  },
};

export async function POST(req: NextRequest) {
  try {
    // Rate limiting : 20 requêtes/minute par IP
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 20, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) }
        }
      );
    }

    // Auth check
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // TOLL FIX B5: AI invoice generation requires Solo plan or above
    const { data: subProfile } = await supabaseAuth
      .from('profiles')
      .select('subscription_tier, is_trial_active')
      .eq('id', user.id)
      .single();
    const hasPlan = subProfile && ['solo', 'pro', 'business', 'trial'].includes(subProfile.subscription_tier || '');
    const isTrial = subProfile?.is_trial_active === true;
    if (!hasPlan && !isTrial) {
      return NextResponse.json({
        error: 'La génération IA de factures nécessite au minimum le plan Solo.',
        code: 'SUBSCRIPTION_REQUIRED',
        upgradeUrl: '/paywall?plan=solo',
      }, { status: 403 });
    }

    // Récupérer et valider le corps de la requête
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
    }

    // Valider les données d'entrée avec Zod
    let validatedData: ReturnType<typeof validateAIGenerateData>;
    try {
      // Double validation : Zod + logique existante
      const zodValidated = validateRequest(AIGenerateSchema, body);
      validatedData = validateAIGenerateData(zodValidated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation failed',
          details: error.errors
        }, { status: 400 });
      }
      if (error instanceof ValidationError) {
        return NextResponse.json(formatValidationError(error), { status: 400 });
      }
      throw error;
    }

    const { prompt, sector, isEdit, existingItems, document_type } = validatedData;

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const docType: LocalDocumentType = document_type;
    const docConfig = DOC_TYPE_CONFIG[docType] || DOC_TYPE_CONFIG.invoice;
    const sectorHint = sector ? `L'utilisateur travaille dans le secteur : ${sector}.` : '';

    let systemPrompt: string;

    if (isEdit && existingItems?.length) {
      const existingList = (existingItems as any[])
        .map((item, i) =>
          `  ${i + 1}. "${item.description || '(sans description)'}" — qté: ${item.quantity}, prix HT: ${item.unit_price}€, TVA: ${item.vat_rate}%`
        )
        .join('\n');

      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}
TYPE DE DOCUMENT : ${docConfig.label.toUpperCase()}
${docConfig.promptHint}

L'utilisateur a déjà un ${docConfig.label} en cours avec les lignes suivantes :

LIGNES EXISTANTES :
${existingList}

L'utilisateur veut faire une modification. Analyse son intention précisément :

- "ajoute / rajoute / nouvelle ligne / et aussi" → AJOUTER le(s) nouvel(s) item(s) à la liste existante
- "modifie / change / mets à X€ / X jours / la ligne N" → MODIFIER uniquement l'item concerné
- "supprime / enlève la ligne N / retire" → SUPPRIMER l'item concerné
- "remplace tout / nouvelle facture / efface tout" → REMPLACER toute la liste

Retourne UNIQUEMENT du JSON valide avec ce format :
{
  "action": "added" | "modified" | "removed" | "replaced",
  "summary": "Phrase courte décrivant la modification faite, ex: 'Ligne Design web ajoutée à 800€/j'",
  "client_name": null,
  "items": [
    { "description": "string", "quantity": number, "unit_price": number, "vat_rate": number }
  ],
  "due_days": null,
  "notes": null,
  "discount_percent": null
}

RÈGLES ABSOLUES :
- "items" doit contenir la liste COMPLÈTE après application de la modification
- unit_price est TOUJOURS HT (hors taxes) — DOIT être un nombre fini, jamais une expression
- vat_rate par défaut = 20
- CRITIQUE : Tous les nombres dans le JSON DOIVENT être des valeurs finales, jamais d'expressions mathématiques
- Ne modifie que ce que l'utilisateur demande explicitement, conserve le reste à l'identique
- summary doit être en français, court et précis

IMPORTANT — DEUX CHAMPS SÉPARÉS :
- "due_days" est un NOMBRE (ex: 30) utilisé par un sélecteur de conditions de paiement. C'est JUSTE un chiffre.
- "notes" est un TEXTE COMPLET en français qui apparaît sur le document. Ce doit être une ou plusieurs phrases complètes, JAMAIS un nombre seul.
  INTERDIT : notes: "30" ou notes: "30 jours"
  OBLIGATOIRE : notes: "Paiement par virement bancaire sous 30 jours à compter de la date d'émission."
- Si l'utilisateur ne précise pas de conditions : due_days: ${docConfig.defaultDueDays} et notes: "${docConfig.defaultNotes}"`;
    } else {
      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}
TYPE DE DOCUMENT : ${docConfig.label.toUpperCase()}
${docConfig.promptHint}

L'utilisateur décrit en langage naturel ce qu'il veut créer.
Extrais les informations et retourne UNIQUEMENT du JSON valide.

Format attendu:
{
  "action": "replaced",
  "summary": null,
  "client_name": "string ou null",
  "client_email": "string ou null — email du client",
  "client_phone": "string ou null — téléphone du client",
  "client_address": "string ou null — adresse rue du client",
  "client_city": "string ou null — ville du client",
  "client_postal_code": "string ou null — code postal du client",
  "client_siret": "string ou null — numéro SIRET du client (14 chiffres)",
  "client_vat_number": "string ou null — numéro de TVA intracommunautaire du client (format FRXX123456789)",
  "items": [
    {
      "description": "string — description détaillée et professionnelle",
      "quantity": number,
      "unit_price": number,
      "vat_rate": number
    }
  ],
  "due_days": number,
  "notes": "string ou null — conditions adaptées au type de document",
  "discount_percent": number
}

Règles strictes:
- unit_price est TOUJOURS HT (hors taxes) — DOIT être un nombre fini, jamais une expression
- vat_rate par défaut = 20 (taux normal français)
- due_days par défaut = ${docConfig.defaultDueDays} (${docConfig.label})

IMPORTANT — DEUX CHAMPS SÉPARÉS pour les conditions :
- "due_days" est un NOMBRE (ex: 30) utilisé par un sélecteur de délai de paiement. Juste un chiffre.
- "notes" est un TEXTE COMPLET en français qui sera imprimé sur le document. Ce doit être une ou plusieurs PHRASES COMPLÈTES.
  INTERDIT : notes: "30" ou notes: "30 jours"
  OBLIGATOIRE : notes: "Paiement par virement bancaire sous 30 jours à compter de la date d'émission. En cas de retard, une indemnité forfaitaire de 40€ sera appliquée."
- Si l'utilisateur ne précise pas de conditions/notes, utilise par défaut : "${docConfig.defaultNotes}"
- discount_percent (remise globale) ne doit être ajouté QUE si l'utilisateur le demande explicitement. Sinon, mets discount_percent à 0.
- CRITIQUE : Tous les nombres dans le JSON DOIVENT être des valeurs finales, jamais d'expressions mathématiques
- Exemple CORRECT : unit_price: 363.64 (pour 400€ TTC avec TVA 10%)
- Exemple FAUX : unit_price: 400 / 1.10
- Si un montant TTC est mentionné, calcule TOI-MÊME le HT avant d'écrire le JSON
- Extrais LES INFORMATIONS CLIENT si mentionnées : email, téléphone, adresse, code postal, ville, SIRET, numéro de TVA
- SIRET : 14 chiffres sans espaces ni points
- TVA : format français FRXX123456789 (où XX = numéro de clé, 9 chiffres = SIREN)
- Génère des descriptions PROFESSIONNELLES et COMMERCIALES (jamais de copier-coller du prompt)
  Ex: "site web" → "Conception et développement de site web"
  Ex: "logo" → "Création d'identité visuelle et logotype"
  Ex: "conseil 3 jours" → "Prestation de conseil et accompagnement stratégique"
- La description doit être claire, professionnelle, entre 3 et 10 mots
- Si l'utilisateur ne mentionne pas de quantité, utilise 1`;
    }

    const completion = await openrouter.chat.completions.create({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0, // Plus déterministe pour éviter les créations non demandées
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');

      // Post-processing : corriger les expressions mathématiques dans les items
      if (parsed.items && Array.isArray(parsed.items)) {
        const { safeMathEvaluate } = await import('@/lib/safe-math');
        parsed.items = parsed.items.map((item: any) => {
          if (typeof item.unit_price === 'string' && /[\d\.\s\+\-\*\/\(\)]/.test(item.unit_price)) {
            try {
              const result = safeMathEvaluate(item.unit_price);

              if (result.success && typeof result.result === 'number') {
                console.log(`[ai-generate-invoice] Corrected unit_price from "${item.unit_price}" to ${result.result}`);
                item.unit_price = result.result;
              }
            } catch (e) {
              console.error(`[ai-generate-invoice] Failed to evaluate unit_price: ${item.unit_price}`, e);
            }
          }
          return item;
        });
      }

      // Post-processing : s'assurer que "notes" est un vrai texte, pas juste un nombre
      if (parsed.notes !== null && parsed.notes !== undefined) {
        const n = String(parsed.notes).trim();
        if (/^\d+$/.test(n) || /^(\d+)\s*(jours?|days?)?$/i.test(n)) {
          const days = parsed.due_days ?? parseInt(n) ?? docConfig.defaultDueDays;
          const dayText = days === 0 ? 'à réception' : `sous ${days} jours à compter de la date d'émission`;
          parsed.notes = `Paiement par virement bancaire ${dayText}. En cas de retard, une indemnité forfaitaire pour frais de recouvrement de 40€ sera appliquée.`;
          console.log(`[ai-generate-invoice] Fixed bare number notes "${n}" → "${parsed.notes}"`);
        }
      }
    } catch {
      return NextResponse.json({ error: 'Erreur parsing IA' }, { status: 500 });
    }

    return NextResponse.json({ parsed, action: parsed.action, summary: parsed.summary });
  } catch (error: any) {
    console.error('[AI Generate Invoice] Error:', error);
    const message = error.message || 'Erreur lors de la génération IA';
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide ou expirée. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

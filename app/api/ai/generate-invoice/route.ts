import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateAIGenerateData, formatValidationError, ValidationError, DocumentType, AIGenerateSchema, validateRequest } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
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
    defaultNotes: 'Paiement par virement bancaire. En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40€ sera appliquée conformément à l\'article L441-6 du Code de commerce.',
    promptHint: 'C\'est une FACTURE. due_days est un NOMBRE (30 par défaut) géré par un sélecteur de conditions de paiement — ne PAS le mentionner dans notes. Le champ "notes" doit contenir des conditions COMPLÈTES en français : mode de règlement, pénalités de retard, indemnité de recouvrement.',
  },
  quote: {
    label: 'devis',
    defaultDueDays: 0,
    defaultNotes: 'Devis valable 30 jours à compter de la date d\'émission. Acceptation du devis par signature et retour d\'un exemplaire.',
    promptHint: 'C\'est un DEVIS. Mets due_days à 0. Le champ "notes" doit mentionner la durée de validité du devis et les conditions d\'acceptation — pas de délai de paiement.',
  },
  credit_note: {
    label: 'avoir',
    defaultDueDays: 0,
    defaultNotes: 'Avoir à déduire de la prochaine facture.',
    promptHint: 'C\'est un AVOIR. Mets due_days à 0. Le champ "notes" doit indiquer que c\'est un avoir à déduire. Pas de conditions de paiement.',
  },
  purchase_order: {
    label: 'bon de commande',
    defaultDueDays: 30,
    defaultNotes: 'Commande confirmée sous réserve de disponibilité. Livraison selon conditions convenues.',
    promptHint: 'C\'est un BON DE COMMANDE. Le champ "notes" doit mentionner les conditions de livraison et de commande.',
  },
  delivery_note: {
    label: 'bon de livraison',
    defaultDueDays: 0,
    defaultNotes: 'Bon de livraison à conserver. Veuillez vérifier la conformité de la livraison à réception et signaler toute anomalie dans les 48h.',
    promptHint: 'C\'est un BON DE LIVRAISON. Mets due_days à 0. Le champ "notes" doit concerner la vérification de la réception, pas le paiement.',
  },
  deposit: {
    label: 'facture d\'acompte',
    defaultDueDays: 0,
    defaultNotes: 'Acompte demandé à la commande. Ce montant sera déduit de la facture finale.',
    promptHint: 'C\'est une FACTURE D\'ACOMPE. Mets due_days à 0. Le champ "notes" doit préciser que c\'est un acompte déductible de la facture finale.',
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

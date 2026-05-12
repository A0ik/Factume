import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { processVoiceTranscript } from '@/lib/groq-translator';
import { VoiceExistingItem, VoiceParsedResponse, APIError } from '@/types';
import { validateVoiceData, formatValidationError, ValidationError } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting : 10 requêtes/minute par IP ou user
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 10, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) }
        }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (GROQ_API_KEY)' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const formData = await req.formData();

    // Valider les données d'entrée
    let validatedData: ReturnType<typeof validateVoiceData>;
    try {
      validatedData = validateVoiceData(formData);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(formatValidationError(error), { status: 400 });
      }
      throw error;
    }

    const { audio, sector, isEdit, existingItems } = validatedData;

    // Transcription with Groq Whisper (auto-detect language - supports Arabic and French)
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      // language: 'fr', // Removed - auto-detect to support Arabic
    });
    const rawTranscript = transcription.text;

    // Translate Arabic (any dialect) to French if needed
    const { transcript, wasTranslated, originalLanguage } = await processVoiceTranscript(rawTranscript);

    console.log(`[process-voice] Language detected: ${originalLanguage}${wasTranslated ? ' (translated)' : ''}`);

    const sectorHint = sector ? `L'utilisateur travaille dans le secteur : ${sector}.` : '';

    let systemPrompt: string;

    if (isEdit && existingItems.length) {
      const existingList = existingItems
        .map((item, i) =>
          `  ${i + 1}. "${item.description || '(sans description)'}" — qté: ${item.quantity}, prix HT: ${item.unit_price}€, TVA: ${item.vat_rate}%`
        )
        .join('\n');

      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}

CONTEXTE: L'utilisateur modifie une facture existante par voix. Analyse avec précision son intention.

RACCOURCIS TECHNIQUES À COMPRENDRE :
- "STC" ou "Solde tout compte" → Solde tout compte (final, sans suite)
- "FAC" ou "Facture" → Facture
- "DEV" ou "Devis" → Devis
- "AVOIR" → Avoir
- "CMD" ou "Commande" → Bon de commande
- "BL" ou "Livraison" → Bon de livraison
- "ACOMPTE" ou "Acompte" → Facture d'acompte
- "HT" → Hors taxes
- "TTC" → Toutes taxes comprises
- "TVA" → Taxe sur la valeur ajoutée

LIGNES EXISTANTES :
${existingList}

L'utilisateur vient de dicter une modification. Analyse son intention précisément :

INTENTIONS POSSIBLES :
- "ajoute / rajoute / nouvelle ligne / et aussi / en plus" → AJOUTER le(s) nouvel(s) item(s) à la liste existante
- "modifie / change / mets à X€ / X jours / la ligne N / remplace la ligne" → MODIFIER uniquement l'item concerné
- "supprime / enlève / retire la ligne N / supprime le premier" → SUPPRIMER l'item concerné
- "remplace tout / nouvelle facture / efface tout / recommence" → REMPLACER toute la liste

Retourne UNIQUEMENT du JSON valide :
{
  "action": "added" | "modified" | "removed" | "replaced",
  "summary": "Phrase courte décrivant la modification, ex: 'Ligne Design web ajoutée à 800€/j'",
  "client_name": null,
  "items": [
    { "description": "string", "quantity": number, "unit_price": number, "vat_rate": number }
  ],
  "due_days": null,
  "notes": null
}

RÈGLES ABSOLUES :
- "items" doit contenir la liste COMPLÈTE après application de la modification
- unit_price est TOUJOURS HT (hors taxes) — DOIT être un nombre fini, jamais une expression
- vat_rate par défaut = 20
- CRITIQUE : Tous les nombres dans le JSON DOIVENT être des valeurs finales, jamais d'expressions mathématiques
- Ne modifie que ce que l'utilisateur demande explicitement, conserve le reste à l'identique
- summary doit être en français, court et précis`;
    } else {
      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}

CONTEXTE: L'utilisateur dicte une facture par voix. Extrais TOUTES les informations pertinentes de manière professionnelle.

RACCOURCIS TECHNIQUES À COMPRENDRE :
- "STC" ou "Solde tout compte" → Solde tout compte (final, sans suite)
- "FAC" ou "Facture" → Facture
- "DEV" ou "Devis" → Devis
- "AVOIR" → Avoir
- "CMD" ou "Commande" → Bon de commande
- "BL" ou "Livraison" → Bon de livraison
- "ACOMPTE" ou "Acompte" → Facture d'acompte
- "HT" → Hors taxes
- "TTC" → Toutes taxes comprises
- "TVA" → Taxe sur la valeur ajoutée

EXTRACTION OBLIGATOIRE :
1. CLIENT: Toute mention de "client", "pour", "chez", "agence", "startup", "société", "entreprise"
2. LIGNES: Chaque prestation/produit mentionné avec quantité et prix
3. DÉLAI: "30 jours", "60 jours", "à réception", "comptant", "15 jours"
4. REMISE: Uniquement si explicite ("remise 10%", "faire une remise", "-10%")

Format JSON attendu:
{
  "action": "replaced",
  "summary": null,
  "client_name": "string ou null — nom du client",
  "client_email": "string ou null — email du client",
  "client_phone": "string ou null — téléphone du client",
  "client_address": "string ou null — adresse rue du client",
  "client_city": "string ou null — ville du client",
  "client_postal_code": "string ou null — code postal du client",
  "client_siret": "string ou null — numéro SIRET du client (14 chiffres)",
  "client_vat_number": "string ou null — numéro de TVA intracommunautaire du client (format FRXX123456789)",
  "items": [{"description": "string", "quantity": number, "unit_price": number, "vat_rate": number}],
  "due_days": number,
  "notes": "string ou null",
  "discount_percent": number
}

RÈGLES ABSOLUES pour les descriptions :
- NE JAMAIS recopier mot pour mot ce que l'utilisateur a dit
- Rédige une description PROFESSIONNELLE et COMMERCIALE
- "site internet" → "Conception et développement de site web"
- "logo" → "Création d'identité visuelle et logotype"
- "3 jours de conseil" → "Prestation de conseil et accompagnement stratégique"
- Description entre 3 et 10 mots, claire et professionnelle

RÈGLES POUR LES MONTANTS :
- unit_price est TOUJOURS HT — DOIT être un nombre fini
- Si le montant est TTC, calcule TOI-MÊME le HT : HT = TTC / (1 + TVA/100)
- TVA standard = 20%, réduite = 10%, très réduite = 5.5%, exonérée = 0%
- vat_rate par défaut = 20
- CORRECT: unit_price: 363.64 (pour 400€ TTC avec TVA 10%)
- FAUX: unit_price: 400 / 1.10

INFORMATIONS CLIENT :
- SIRET: 14 chiffres sans espaces ni points
- TVA: format FRXX123456789 (XX = clé, 9 chiffres = SIREN)

DÉLAI DE PAIEMENT :
- "à réception" / "comptant" / "sur place" → due_days: 0
- "15 jours" → due_days: 15
- "30 jours" (défaut) → due_days: 30
- "45 jours" → due_days: 45
- "60 jours" → due_days: 60
- "fin de mois" → ajouter aux jours indiqués

REMISE:
- NE JAMAIS mettre de remise par défaut
- Uniquement si l'utilisateur le demande explicitement
- "remise 10%" ou "10% de remise" → discount_percent: 10
- Sans mention → discount_percent: 0

RÈGLE FINALE : Tous les nombres DOIVENT être des valeurs finales, jamais d'expressions`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0, // Plus déterministe pour éviter les créations non demandées
    });

    let parsed: VoiceParsedResponse = {
      action: 'replaced',
      summary: null,
      client_name: null,
      items: [],
      due_days: 30,
      notes: null,
      discount_percent: 0,
    };
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}') as VoiceParsedResponse;

      // Post-processing : corriger les expressions mathématiques dans les items
      if (parsed.items && Array.isArray(parsed.items)) {
        const { safeMathEvaluate } = await import('@/lib/safe-math');
        parsed.items = await Promise.all(parsed.items.map(async (item: VoiceExistingItem) => {
          // Si unit_price est une expression, on essaie de l'évaluer
          if (typeof item.unit_price === 'string' && /[\d\.\s\+\-\*\/\(\)]/.test(item.unit_price)) {
            try {
              const result = safeMathEvaluate(item.unit_price);

              if (result.success && typeof result.result === 'number') {
                console.log(`[process-voice] Corrected unit_price from "${item.unit_price}" to ${result.result}`);
                item.unit_price = result.result;
              }
            } catch (e) {
              console.error(`[process-voice] Failed to evaluate unit_price: ${item.unit_price}`, e);
            }
          }
          return item;
        }));
      }
    } catch (err) {
      console.error('[process-voice] Failed to parse AI response:', err);
      // Keep the default parsed value, no need to reassign
    }

    return NextResponse.json({
      transcript,
      originalTranscript: rawTranscript,
      wasTranslated,
      originalLanguage,
      parsed,
      action: parsed.action,
      summary: parsed.summary
    });
  } catch (error: unknown) {
    console.error('[Process Voice] Error:', error);
    const apiError = error as APIError;
    const message = apiError.message || 'Erreur lors du traitement vocal';
    if (apiError.status === 401 || apiError.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez GROQ_API_KEY.' }, { status: 500 });
    }
    if (apiError.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

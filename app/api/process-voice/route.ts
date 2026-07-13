import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { processVoiceTranscript } from '@/lib/groq-translator';
import { getUserHotwords, buildWhisperPrompt } from '@/lib/voice-vocabulary';
import { applySttCorrection } from '@/lib/stt-correction';
import { VoiceExistingItem, VoiceParsedResponse, APIError } from '@/types';
import { validateVoiceData, formatValidationError, ValidationError } from '@/lib/validation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateAndCorrectTVA, isB2CClient, getDefaultTVARate, detectTranscriptTaxHints, detectTTCMisinterpretation } from '@/lib/tva-validator';
import { consumeVoiceQuota, acquireAiSlot, releaseAiSlot } from '@/lib/subscription-guard';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let slotAcquired = false;
  let slotUserId: string | null = null;
  try {
    // LOI 9 : seuil entreprise — la voix est illimitée, on ne bride pas l'usage légitime (était 10/min)
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 300, windowMs: 60000 });
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

    // MERCURE (juin 2026) — Le Hook Libre reste : voix illimitée Pro+.
    // Fair-use 50/mois sur le gratuit (quota atomique) pour stopper le bot-farming,
    // sans jamais bloquer un usage légitime rapide. consumeVoiceQuota gère le tier en interne.
    const voiceQuota = await consumeVoiceQuota(user.id);
    if (!voiceQuota.allowed) {
      return NextResponse.json({
        error: `Vous avez utilisé vos ${voiceQuota.limit} dictées vocales gratuites ce mois-ci. Passez au plan Pro pour une voix illimitée.`,
        code: voiceQuota.code || 'VOICE_QUOTA_REACHED',
        limit: voiceQuota.limit,
        remaining: voiceQuota.remaining,
        upgradeUrl: '/paywall',
      }, { status: 402 });
    }

    // Garde concurrentielle : max 2 dictées en vol/compte (best-effort, fail-open).
    const aiSlot = await acquireAiSlot(user.id);
    if (!aiSlot.allowed) {
      return NextResponse.json({
        error: "Une dictée vocale est déjà en cours. Patientez qu'elle se termine.",
        code: 'AI_SLOT_BUSY',
      }, { status: 429 });
    }
    slotAcquired = true;
    slotUserId = user.id;

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
    const mode = (formData.get('mode') as string) || 'invoice';

    // CIBLE 2 — Hotwords utilisateur (lexique métier + corrections passées + noms salariés).
    const { hotwords, corrections } = await getUserHotwords(supabaseAuth, user.id);

    // Transcription with Groq Whisper.
    // Couche 0 (pré-erreur) : `prompt` injecte le lexique métier pour biaiser la reconnaissance
    // vers "fiche de paie", "DSN", noms de salariés… avant qu'un homophone ne se produise.
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      prompt: buildWhisperPrompt(hotwords),
      // language: 'fr', // Auto-detect gardé pour le support arabe — la correction contextuelle compense.
    });
    const rawTranscript = transcription.text;

    // Translate Arabic (any dialect) to French if needed
    const { transcript: translated, wasTranslated, originalLanguage } = await processVoiceTranscript(rawTranscript);

    console.log(`[process-voice] Language detected: ${originalLanguage}${wasTranslated ? ' (translated)' : ''}`);

    // CIBLE 2 — Correction contextuelle STT (paie/paix, contrar/contrat…).
    // Couche 1 déterministe (lexique + corrections utilisateur réappliquées globalement)
    // + couche 2 LLM rescoring si un token suspect subsiste.
    const sttFixed = await applySttCorrection(translated, { userCorrections: corrections, groq });
    let transcript = sttFixed.transcript;
    if (sttFixed.changes.length) {
      console.log('[process-voice] STT corrections:', sttFixed.changes);
    }

    // Hint LLM construit depuis les mêmes corrections (mémoire vocale, single query).
    let correctionHint = '';
    if (corrections.length > 0) {
      const correctionLines = corrections
        .map(c => `"${c.original_value}" → "${c.corrected_value}" (champ: ${c.field})`)
        .join(', ');
      correctionHint = `\n\nCORRECTIONS PASSÉES DE L'UTILISATEUR (utilise ces corrections pour mieux interpréter):\n${correctionLines}\nSi tu entends un de ces noms/valeurs, utilise directement la version corrigée.`;
    }

    const sectorHint = sector ? `L'utilisateur travaille dans le secteur : ${sector}.` : '';

    // Type de document pour adapter le prompt
    const modeLabel: Record<string, string> = {
      invoice: 'facture',
      quote: 'devis',
      credit_note: 'avoir (note de crédit)',
      order: 'bon de commande',
      delivery: 'bon de livraison',
      deposit: "facture d'acompte",
    };
    const docLabel = modeLabel[mode || 'invoice'] || 'facture';

    // LOI 3 (Arbiter) — État complet du document en cours d'édition (pas seulement les lignes).
    // C'est ce qui transforme l'IA "one-shot" (recréation) en IA contextuelle (modification).
    const formCtxRaw = formData.get('formContext') as string | null;
    let formCtx: Record<string, unknown> | null = null;
    try {
      formCtx = formCtxRaw ? (JSON.parse(formCtxRaw) as Record<string, unknown>) : null;
    } catch {
      formCtx = null;
    }
    // SAGE (BUG VOIX FACTURE) — on n'emprunte le path « modification d'un document
    // existant » QUE s'il y a de VRAIES lignes existantes (isEdit + existingItems).
    // Avant, la simple présence de formContext (toujours envoyé par VoiceOneShot)
    // basculait une facture NOUVELLE dans le prompt « modification » avec
    // existingList='(aucune ligne)' → l'IA (Llama 3.3) renvoyait parfois items:[] ou
    // pas d'items → applyAIParsedResult sautait silencieusement la pose de lignes →
    // « il n'y avait aucune ligne ». Une nouvelle facture utilise désormais le path
    // d'extraction (else), fiable, qui retourne toujours les lignes dictées.
    const isContextualEdit = !!(isEdit && existingItems.length);

    let systemPrompt: string;

    if (isContextualEdit) {
      const existingList = existingItems
        .map((item, i) =>
          `  ${i + 1}. "${item.description || '(sans description)'}" — qté: ${item.quantity}, prix HT: ${item.unit_price}€, TVA: ${item.vat_rate}%`
        )
        .join('\n');

      // État complet du document sérialisé (client, lignes, notes, remise, échéance…)
      const documentStateJson = formCtx
        ? JSON.stringify(formCtx, null, 2)
        : JSON.stringify({ items: existingItems }, null, 2);

      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}

CONTEXTE: L'utilisateur est en train de MODIFIER un ${docLabel} EXISTANT par voix. Il NE crée PAS un nouveau document : il modifie l'état courant ci-dessous. Analyse avec précision son intention et retourne le document MODIFIÉ.

=== ÉTAT ACTUEL DU DOCUMENT (JSON — source de vérité) ===
${documentStateJson}
=== FIN DE L'ÉTAT ACTUEL ===

LIGNES EXISTANTES (rappel lisible) :
${existingList || '(aucune ligne)'}

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

MULTILINGUAL TAX TERMINOLOGY — CRITICAL (le transcript peut être traduit de n'importe quelle langue) :
TERMES SIGNIFIANT "HORS TAXES" (montant AVANT la taxe = unit_price à retourner) :
  "HT" / "Hors taxes" / "Net" / "Netto" / "Sin IVA" / "Ohne MwSt" / "Senza IVA" / "Sem IVA" / "بدون ضريبة" / "不含税"
TERMES SIGNIFIANT "TTC" (montant APRÈS la taxe = doit convertir en HT) :
  "TTC" / "Toutes taxes comprises" / "Gross" / "Brutto" / "Con IVA" / "Com IVA" / "Inkl. MwSt" / "含税" / "شامل الضريبة"
TERMES SIGNIFIANT "TVA" (la taxe elle-même) :
  "TVA" / "VAT" / "MwSt" / "IVA" / "ضريبة القيمة المضافة"
RÈGLE ABSOLUE : "Net/Netto/Sin IVA/Ohne MwSt" = TOUJOURS HT (avant taxe), JAMAIS TTC
RÈGLE ABSOLUE : "Gross/Brutto/Lordo/Con IVA" = TOUJOURS TTC (après taxe), JAMAIS HT
PAR DÉFAUT : En cas de doute, le montant indiqué EST le montant HT. Ne convertis TTC→HT QUE si l'utilisateur dit EXPLICITEMENT TTC/gross/brutto/with tax/toutes taxes comprises.
CONVERSION TTC→HT : HT = TTC / (1 + taux_TVA/100)
Exemples : "300 gross 10% VAT" → HT=272.73 | "300 HT 10%" → HT=300 | "300 brutto 19% MwSt" → HT=252.10 | "300 net 10%" → HT=300

LIGNES EXISTANTES :
${existingList}

L'utilisateur vient de dicter une modification. Analyse son intention précisément :

INTENTIONS POSSIBLES :
- "ajoute / rajoute / nouvelle ligne / et aussi / en plus" → AJOUTER le(s) nouvel(s) item(s) à la liste existante
- "modifie / change / mets à X€ / X jours / la ligne N / remplace la ligne" → MODIFIER uniquement l'item concerné
- "supprime / enlève / retire la ligne N / supprime le premier" → SUPPRIMER l'item concerné
- "remplace tout / nouvelle facture / efface tout / recommence" → REMPLACER toute la liste

MODIFICATIONS DE CHAMPS (hors lignes) — mets à jour si l'utilisateur le demande explicitement :
- "change le client à X" / "pour [Société]" / "facturé à X" → client_name = "X"
- "délai de paiement X jours" / "échéance dans X jours" / "payable sous X jours" → due_days = X
- "passe la TVA à X%" / "TVA à X sur tout" / "applique X% de TVA partout" → applique vat_rate = X à TOUTES les lignes dans items[]
- "remise de X%" / "rabais X%" sur un article précis → items[].discount_percent: X
- "réduction de X euros" / "rabais de X€" sur un article précis → items[].discount_amount: X
- "remise globale de X%" → discount_percent: X, discount_type: "percent"
- "remise globale de X euros" / "réduction globale de X€" → discount_amount: X, discount_type: "amount"
- "note : ..." / "ajoute la mention ..." → notes = "..."
- "change le prix de la ligne N à X" / "mets la ligne 2 à 500" → MODIFIER uniquement cet item (quantity inchangée si non précisé)
RÈGLE : si un champ n'est pas mentionné (client_name/due_days/notes = null), conserve sa valeur actuelle. Ne JAMAIS écraser un champ que l'utilisateur n'a pas demandé à modifier.

Retourne UNIQUEMENT du JSON valide (le document MODIFIÉ complet) :
{
  "action": "added" | "modified" | "removed" | "replaced",
  "summary": "Phrase courte décrivant la modification, ex: 'Ligne Design web ajoutée à 800€/j'",
  "client_name": null,
  "client_email": null,
  "client_phone": null,
  "client_address": null,
  "client_city": null,
  "client_postal_code": null,
  "client_siret": null,
  "client_vat_number": null,
  "items": [
    { "description": "string", "quantity": number, "unit_price": number, "vat_rate": number, "discount_percent": number, "discount_amount": number }
  ],
  "due_days": null,
  "notes": null,
  "discount_percent": null,
  "discount_amount": null,
  "discount_type": null,
  "uncertain_fields": [],
  "confidence": "high"
}

RÈGLES ABSOLUES :
- "items" doit contenir la liste COMPLÈTE du document APRÈS application de la modification (anciennes lignes conservées + nouvelles). JAMAIS uniquement la nouvelle ligne.
- CRITIQUE : un champ à "null" signifie "CONSERVER la valeur actuelle de l'état". Ne mets "null" QUE pour les champs que l'utilisateur n'a pas mentionnés.
- Si l'utilisateur modifie (ex: "change le prix à 500", "passe la ligne 2 à 3 jours"), retourne TOUTES les lignes avec la modification appliquée.
- Si l'utilisateur ajoute (ex: "ajoute un article", "et aussi"), retourne les anciennes lignes + la nouvelle.
- unit_price est TOUJOURS HT (hors taxes) — DOIT être un nombre fini, jamais une expression
- vat_rate par défaut = 20
- CRITIQUE : Tous les nombres dans le JSON DOIVENT être des valeurs finales, jamais d'expressions mathématiques
- Ne modifie que ce que l'utilisateur demande explicitement, conserve le reste à l'identique à partir de l'ÉTAT ACTUEL
- summary doit être en français, court et précis

INCERTITUDE — CHAMPS uncertain_fields + confidence :
Évalue TA propre confiance sur chaque champ clé (montant, quantité, client).
- "confidence": "high" si tout est clair et certain.
- "confidence": "medium" si un montant ou un nom est approximatif (ajoute-le dans uncertain_fields).
- "confidence": "low" si un nombre clé est ambigu ("deux" vs "douze", "cent" vs "sans") ou inaudible (ajoute-le dans uncertain_fields).
Signale dans uncertain_fields DÈS QUE tu n'es pas certain d'un montant ou d'un nom (current_value = ce que tu as entendu, suggestion = ton meilleur choix).
Si tu es pleinement confiant → "uncertain_fields": [], "confidence": "high".
Exemple de signal légitime :

CALCUL JOURNALIER - MODIFICATION :
- "X jours à Y€/jour" → quantity = X, unit_price = Y
- "X jours à Y€ par jour" → quantity = X, unit_price = Y
- "X days at Y€/day" → quantity = X, unit_price = Y (après conversion devise)
- "modifie la ligne 1 à 3 jours à 600€ par jour" → quantity: 3, unit_price: 600
- TOUJOURS appliquer le calcul journalier quand "par jour" ou "/jour" est mentionné`;
    } else {
      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}

CONTEXTE: L'utilisateur dicte un ${docLabel} par voix. Extrais TOUTES les informations pertinentes de manière professionnelle.

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

MULTILINGUAL TAX TERMINOLOGY — CRITICAL (le transcript peut être traduit de n'importe quelle langue) :
TERMES SIGNIFIANT "HORS TAXES" (montant AVANT la taxe = unit_price à retourner) :
  "HT" / "Hors taxes" / "Net" / "Netto" / "Sin IVA" / "Ohne MwSt" / "Senza IVA" / "Sem IVA" / "بدون ضريبة" / "不含税"
TERMES SIGNIFIANT "TTC" (montant APRÈS la taxe = doit convertir en HT) :
  "TTC" / "Toutes taxes comprises" / "Gross" / "Brutto" / "Con IVA" / "Com IVA" / "Inkl. MwSt" / "含税" / "شامل الضريبة"
TERMES SIGNIFIANT "TVA" (la taxe elle-même) :
  "TVA" / "VAT" / "MwSt" / "IVA" / "ضريبة القيمة المضافة"
RÈGLE ABSOLUE : "Net/Netto/Sin IVA/Ohne MwSt" = TOUJOURS HT (avant taxe), JAMAIS TTC
RÈGLE ABSOLUE : "Gross/Brutto/Lordo/Con IVA" = TOUJOURS TTC (après taxe), JAMAIS HT
PAR DÉFAUT : En cas de doute, le montant indiqué EST le montant HT. Ne convertis TTC→HT QUE si l'utilisateur dit EXPLICITEMENT TTC/gross/brutto/with tax/toutes taxes comprises.
CONVERSION TTC→HT : HT = TTC / (1 + taux_TVA/100)
Exemples : "300 gross 10% VAT" → HT=272.73 | "300 HT 10%" → HT=300 | "300 brutto 19% MwSt" → HT=252.10 | "300 net 10%" → HT=300

EXTRACTION OBLIGATOIRE :
1. CLIENT: Toute mention de "client", "pour", "chez", "agence", "startup", "société", "entreprise"
   B2B/B2C (client_type_hint) : si le client est une entreprise/société/immobilier/foncière/agence/cabinet/commerce/restauration → "b2b". Si c'est un PARTICULIER (nom propre seul, aucune société) → "b2c". Exemples : « iyad immobilier » → b2b ; « Jean Dupont » → b2c ; « Café du Centre » → b2b ; « pharmacie du marché » → b2b.
2. LIGNES: Chaque prestation/produit mentionné avec quantité et prix
3. DÉLAI: "30 jours", "60 jours", "à réception", "comptant", "15 jours"
4. REMISE: Uniquement si explicite ("remise 10%", "faire une remise", "-10%")
5. CONTACT: email, téléphone, adresse s'ils sont mentionnés

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
  "client_type_hint": "b2b | b2c | null — b2b si le client est une ENTREPRISE/SOCIÉTÉ (mots-clés : entreprise, société, SARL, EURL, SAS, SCI, immobilier, foncière, agence, cabinet, holding, groupe, commerce, restauration…). b2c si c'est un PARTICULIER (personne physique, nom propre sans société). null SEULEMENT si le doute est réel.",
  "items": [{"description": "string", "quantity": number, "unit_price": number, "vat_rate": number, "discount_percent": number, "discount_amount": number}],
  "due_days": number,
  "notes": "string ou null",
  "discount_percent": number,
  "discount_amount": number,
  "discount_type": "percent | amount",
  "uncertain_fields": [
    {"field": "string", "current_value": "any", "reason": "string", "suggestion": "any"}
  ],
  "confidence": "high | medium | low"
}

INCERTITUDE — ÉVALUE TA CONFIANCE (uncertain_fields + confidence) :
Tu n'es pas infaillible : évalue ta certitude sur chaque champ clé (montant, quantité, nom du client) et ose signaler ton doute.
- "confidence": "high" → tout est clair et certain.
- "confidence": "medium" → un montant ou un nom est approximatif ; ajoute-le dans uncertain_fields.
- "confidence": "low" → un nombre clé est ambigu ou inaudible ; ajoute-le dans uncertain_fields.
Signale dans uncertain_fields DÈS QUE tu hésites sur un montant ou un nom (current_value = ce que tu as entendu, suggestion = ton meilleur choix).
Signale notamment :
- Un mot à 2 interprétations très différentes ("deux" vs "douze", "cent" vs "sans")
- Un nombre couvert par du bruit ou inaudible
- Une contradiction dans la phrase ("500... non 1500")
- Un montant qui pourrait être HT ou TTC (le contexte ne le précise pas)
- Un nom propre partiellement entendu (current_value = ton meilleur choix, suggestion = alternative)
NE signale pas les petits doutes normaux d'une transcription parfaitement limpide.
Si tout est clair → "uncertain_fields": [], "confidence": "high".
Exemples de signaux légitimes :
- {"uncertain_fields": [{"field": "items[0].unit_price", "current_value": 500, "reason": "L'utilisateur a dit 'cinq cent' mais pourrait vouloir dire 15 000", "suggestion": 500}], "confidence": "low"}
- {"uncertain_fields": [{"field": "client_name", "current_value": "Dupont", "reason": "Nom partiellement entendu, pourrait être Dupond ou Du Pont", "suggestion": "Dupont"}], "confidence": "medium"}

RÈGLES ABSOLUES pour les descriptions :
- NE JAMAIS recopier mot pour mot ce que l'utilisateur a dit
- Rédige une description PROFESSIONNELLE et COMMERCIALE
- "site internet" → "Conception et développement de site web"
- "logo" → "Création d'identité visuelle et logotype"
- "3 jours de conseil" → "Prestation de conseil et accompagnement stratégique"
- "nettoyage" → "Prestation de nettoyage professionnel"
- "réparation" → "Service de réparation et maintenance"
- "cours" → "Prestation de formation et enseignement"
- "livraison" → "Service de livraison et transport"
- "coaching" → "Accompagnement et coaching professionnel"
- "photographie" → "Prestation de photographie professionnelle"
- "rédaction" → "Service de rédaction et création de contenu"
- Description entre 3 et 10 mots, claire et professionnelle

RÈGLES POUR LES MONTANTS :
- unit_price est TOUJOURS HT — DOIT être un nombre fini
- Si le montant est TTC, calcule TOI-MÊME le HT : HT = TTC / (1 + TVA/100)
- TVA standard = 20%, réduite = 10%, très réduite = 5.5%, particulier = 2.1%, exonérée = 0%
- vat_rate par défaut = 20
- CORRECT: unit_price: 363.64 (pour 400€ TTC avec TVA 10%)
- FAUX: unit_price: 400 / 1.10

EXEMPLES MULTILINGUES CRITIQUES (applique la taxonomie ci-dessus) :
- "300 net 10% VAT" → unit_price: 300, vat_rate: 10 (net = HT, le montant EST le prix HT)
- "300 TTC 10%" → unit_price: 272.73, vat_rate: 10 (TTC → HT = 300/1.10)
- "300 brutto 19% MwSt" → unit_price: 252.10, vat_rate: 19 (brutto = TTC → HT = 300/1.19)
- "300 sin IVA" → unit_price: 300, vat_rate: 0 (sin IVA = exonéré de taxe)
- "300 con IVA 21%" → unit_price: 247.93, vat_rate: 21 (con IVA = TTC → HT = 300/1.21)
- "300€ Netto" → unit_price: 300 (Netto = HT)
- "300 lordo IVA 22%" → unit_price: 245.90, vat_rate: 22 (lordo = TTC)
- "300 gross 20% VAT" → unit_price: 250, vat_rate: 20 (gross = TTC → HT = 300/1.20)
- "300 HT 10% TVA" → unit_price: 300, vat_rate: 10 (HT = avant taxe, NE PAS soustraire)
- "300 avec 10% de TVA" → unit_price: 300, vat_rate: 10 (montant de base = HT)
- "300 tout compris 10%" → unit_price: 272.73, vat_rate: 10 (tout compris = TTC)
ATTENTION : "300 10% TVA" sans précision HT/TTC → PAR DÉFAUT HT=300, TVA=10% (règle du doute = HT)

CALCUL JOURNALIER CRITIQUE - À APPLIQUER EN PRIORITÉ :
- "X jours à Y€/jour" ou "X jours à Y€ par jour" → quantity = X, unit_price = Y
- "X days at Y€/day" ou "X days at Y€ per day" → quantity = X, unit_price = Y
- "X jours de travail à Y€ journalier" → quantity = X, unit_price = Y
- "une semaine à Y€/jour" → quantity = 5, unit_price = Y
- "3 jours de dev à 500€ par jour" → quantity: 3, unit_price: 500
- "5 days consulting at £800 per day" → quantity: 5, unit_price: 928 (après conversion £→€)
- TOUJOURS interpréter "montant par jour" ou "montant/jour" comme unit_price
- TOUJOURS interpréter le nombre de jours/semaines comme quantity
- Si un prix total est donné sans précision "par jour", diviser par le nombre de jours

MONTANTS FORFAITAIRES :
- "pour 3000€" / "un forfait de X€" → quantity: 1, unit_price: X (le montant total)
- "le projet coûte X€" → quantity: 1, unit_price: X
- Si ni "/jour" ni "par jour" ni "/mois" mentionné → forfait (quantity = 1)

MONTANTS MENSUELS :
- "X€ par mois" / "X€/mois" / "mensuel" → quantity: 1, unit_price: X, description inclut "(mensuel)"

EXEMPLES DE CALCUL JOURNALIER :
- "5 jours de développement à 500€ par jour" → {description: "Développement", quantity: 5, unit_price: 500, vat_rate: 20}
- "3 jours de conseil à 800€/j" → {description: "Prestation de conseil", quantity: 3, unit_price: 800, vat_rate: 20}
- "Une semaine de formation à 1000€ par jour" → {description: "Formation", quantity: 5, unit_price: 1000, vat_rate: 20}
- "2 jours de design à £600 per day" → {description: "Design", quantity: 2, unit_price: 696, vat_rate: 20} (£600 × 1.16)

EXEMPLES DE FORFAIT :
- "un site web pour 3000€" → {description: "Conception et développement de site web", quantity: 1, unit_price: 3000, vat_rate: 20}
- "le logo à 500€" → {description: "Création d'identité visuelle et logotype", quantity: 1, unit_price: 500, vat_rate: 20}

INFORMATIONS CLIENT :
- SIRET: 14 chiffres sans espaces ni points
- TVA: format FRXX123456789 (XX = clé, 9 chiffres = SIREN)
- Email: chercher des mots comme "arobase", "chez", "at", "@" dans la dictée

DÉLAI DE PAIEMENT :
- "à réception" / "comptant" / "sur place" → due_days: 0
- "15 jours" → due_days: 15
- "30 jours" (défaut) → due_days: 30
- "45 jours" → due_days: 45
- "60 jours" → due_days: 60
- "fin de mois" → due_days: 30 (valeur standard)

REMISE (globale ET par ligne, en % OU en euros) :
- NE JAMAIS mettre de remise par défaut (discount_percent: 0, discount_amount: 0)
- Uniquement si l'utilisateur le demande explicitement. Synonymes : "remise", "rabais", "réduction", "discount".
- "%" ou "pour cent" → remise en POURCENTAGE (discount_percent).
- "euros", "€", "euro" → remise en MONTANT (discount_amount).
- REMISE GLOBALE (sur l'ensemble du document) :
  - "remise globale de 10%" → discount_type: "percent", discount_percent: 10, discount_amount: 0
  - "réduction de 50 euros" / "rabais de 50€" → discount_type: "amount", discount_amount: 50, discount_percent: 0
- REMISE PAR LIGNE (sur UN article précis) — mets-la dans items[].discount_percent ou items[].discount_amount, ET laisse discount_percent: 0 / discount_amount: 0 au niveau global :
  - "remise de 10% sur le premier article" / "création de site web 300 euros remise 10 pourcent" → items[].discount_percent: 10
  - "ajoute une réduction de 10 euros pour le premier article" / "rabais de 10€ sur la ligne 1" → items[].discount_amount: 10
- RÈGLE ABSOLUE (ANTI-DOUBLE-REMISE) : une remise s'applique à UN SEUL endroit. JAMAIS à la fois sur une ligne ET au global. Si tu poses items[].discount_*, alors discount_percent=0 ET discount_amount=0 OBLIGATOIRES. Réciproquement, si tu poses un discount_* global, AUCUNE ligne ne doit porter de discount_*.
- CAS UNE SEULE LIGNE : si la facture ne contient qu'un seul article, TOUTE remise va dans items[].discount_* (et le global RESTE à 0). Exemple « création de société 200 HT remise 10 euros » → 1 ligne unit_price=200 avec items[0].discount_amount=10, discount_amount global=0, discount_percent=0.
- CAS PLUSIEURS LIGNES : une remise qui dit « sur tout » / « globale » / « au total » → discount_* global. Une remise qui nomme UN article précis → items[].discount_* de CETTE ligne uniquement (les autres lignes sans discount_*).
- Sans mention de remise → discount_percent: 0, discount_amount: 0, items sans discount_percent/discount_amount.

NOTES ET CONDITIONS :
- Si l'utilisateur mentionne des conditions spéciales, les mettre dans "notes"
- Exemples : "non remboursable", "valable 1 mois", "urgence +50%"

SITUATIONS PARTICULIÈRES À GÉRER :
- L'utilisateur ne mentionne qu'un seul montant total → 1 ligne avec quantity=1, description générique basée sur le secteur
- L'utilisateur dit "la même chose que d'habitude" → crée une ligne générique "Prestation de service" avec les montants entendus
- L'utilisateur hésite sur un prix → mets le prix entendu et ajoute-le dans uncertain_fields
- L'utilisateur mentionne plusieurs clients → prends le dernier mentionné comme client principal
- L'utilisateur parle trop vite ou bafouille → extrais ce que tu peux, signale le reste dans uncertain_fields
- L'utilisateur mélange français et arabe/darija → extrais les infos dans les deux langues, noms en français
- L'utilisateur donne un montant TTC → convertis en HT et signale la conversion

RÈGLE FINALE : Tous les nombres DOIVENT être des valeurs finales, jamais d'expressions${correctionHint}`;
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
      uncertain_fields: [],
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

      // --- B2C auto-detection: heuristique + 2e signal IA (AXIOM CIBLE 2) ---
      // Un client est B2C seulement si l'heuristique par mots-clés le dit ET que
      // l'IA ne dit pas explicitement "b2b". L'IA est l'arbitre quand l'heuristique
      // est imparfaite (ex : « iyad immobilier » → l'IA reconnaît l'entreprise même
      // si l'ancienne liste manquait « immobilier » — désormais enrichie aussi).
      let isB2C = false;
      try {
        const clientInfo = {
          name: parsed.client_name,
          siret: parsed.client_siret,
          address: parsed.client_address,
        };
        const heuristicB2C = isB2CClient(clientInfo);
        const llmHint = (parsed as any).client_type_hint;
        const llmSaysB2B = llmHint === 'b2b' || parsed?.client_type === 'business';

        if (heuristicB2C && !llmSaysB2B) {
          isB2C = true;
          parsed.is_b2c = true;
          parsed.client_type = 'individual';

          // If no explicit TVA rate and client is B2C, default to 0%
          // Only apply when ALL items still have the default 20% rate (meaning AI didn't pick up a specific rate)
          const allDefaultRate = parsed.items && parsed.items.every(item => item.vat_rate === 20);
          if (allDefaultRate) {
            parsed.items = parsed.items.map(item => ({
              ...item,
              vat_rate: 0,
            }));
            console.log('[process-voice] B2C client detected — defaulting TVA to 0% for all items');
          }
        }
      } catch (e) {
        console.error('[process-voice] B2C detection failed:', e);
      }

      // --- TVA validation: ensure HT + TVA = TTC (fixes AI subtraction bug) ---
      if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
        try {
          const tvaResult = validateAndCorrectTVA(parsed.items);
          if (tvaResult.corrected) {
            console.log('[process-voice] TVA corrections applied:', JSON.stringify(tvaResult.corrections));
            parsed.items = tvaResult.items;
          }
        } catch (e) {
          console.error('[process-voice] TVA validation failed:', e);
        }

        // --- Secondary defense: detect TTC misinterpretation from multilingual input ---
        try {
          const taxHints = detectTranscriptTaxHints(transcript);
          const misinterpretation = detectTTCMisinterpretation(parsed.items, taxHints);
          if (misinterpretation.corrected) {
            console.log('[process-voice] TTC misinterpretation corrected:', JSON.stringify(misinterpretation.corrections));
            parsed.items = misinterpretation.items;
          }
        } catch (e) {
          console.error('[process-voice] TTC misinterpretation check failed:', e);
        }
      }

      // CIBLE 3 (AEGIS) — on ne taggue 'business' QUE si un client est réellement
      // présent. Sinon, un document sans client se retrouvait marqué B2B par défaut
      // (isB2C restant false quand le nom est vide), faussant l'auto-détection.
      if (!isB2C && parsed.client_name) {
        parsed.client_type = 'business';
      }

      // ─── CIBLE 4 (AEGIS) — Déclencheurs déterministes de faible confiance ───
      // L'IA reste trop conservatrice sur uncertain_fields ; on ajoute des signaux
      // objectifs pour qu'une demande de confirmation remonte quand un champ crucial
      // (montant ou nom du client) est objectivement ambigu. On ne fait que baisser
      // la confiance et ajouter un doute — jamais modifier les valeurs entendues.
      try {
        if (!parsed.confidence) parsed.confidence = 'high';

        // (a) Forfait unique peu spécifique, sans client identifié : un seul montant
        //     global entendu → le montant mérite confirmation.
        const GENERIC_DESC = /^(prestation|service|vente|forfait|travail|intervention|conseil|mission|produit|honoraire)/i;
        if (parsed.items?.length === 1 && !parsed.client_name) {
          const it = parsed.items[0];
          const generic = !it.description || GENERIC_DESC.test(String(it.description).trim());
          if (generic && !parsed.uncertain_fields?.some((f) => f.field === 'items[0].unit_price')) {
            parsed.uncertain_fields = [...(parsed.uncertain_fields ?? []), {
              field: 'items[0].unit_price',
              current_value: Number(it.unit_price) || 0,
              reason: "Un seul montant global a été entendu — confirmez le montant de la ligne.",
              suggestion: Number(it.unit_price) || 0,
            }];
            if (parsed.confidence === 'high') parsed.confidence = 'medium';
          }
        }

        // (b) Nom de client suspect (trop court ou contient un chiffre) → confirmer.
        const clientName = parsed.client_name?.trim() ?? '';
        if (clientName && (clientName.length < 3 || /\d/.test(clientName)) && !parsed.uncertain_fields?.some((f) => f.field === 'client_name')) {
          parsed.uncertain_fields = [...(parsed.uncertain_fields ?? []), {
            field: 'client_name',
            current_value: clientName,
            reason: "Le nom du client semble partiellement entendu — merci de confirmer.",
            suggestion: clientName,
          }];
          if (parsed.confidence === 'high') parsed.confidence = 'medium';
        }
      } catch (e) {
        console.error('[process-voice] confidence triggers failed:', e);
      }
    } catch (err) {
      console.error('[process-voice] Failed to parse AI response:', err);
      // Keep the default parsed value, no need to reassign
    }

    // MERCURE : le quota vocal est consommé atomiquement en amont (consumeVoiceQuota).

    return NextResponse.json({
      transcript,
      originalTranscript: rawTranscript,
      wasTranslated,
      originalLanguage,
      parsed,
      action: parsed.action,
      summary: parsed.summary,
      sttCorrections: sttFixed.changes,
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
  } finally {
    if (slotAcquired && slotUserId) await releaseAiSlot(slotUserId).catch(() => {});
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { processVoiceTranscript } from '@/lib/groq-translator';
import { getUserHotwords, buildWhisperPrompt } from '@/lib/voice-vocabulary';
import { applySttCorrection } from '@/lib/stt-correction';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { consumeVoiceQuota } from '@/lib/subscription-guard';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rl = rateLimit({ key: getClientIp(req), limit: 300, windowMs: 60000 }); // LOI 9
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) }
      });
    }

    // Auth check
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // MERCURE (juin 2026) — voix illimitée Pro+ ; fair-use 50/mois sur le gratuit. Quota atomique partagé entre toutes les routes vocales ; consumeVoiceQuota gère le tier.
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

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (GROQ_API_KEY)' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const formData = await req.formData();
    const audio = formData.get('audio') as File;
    const userId = formData.get('user_id') as string | null;

    if (!audio) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

    // Transcription with Groq Whisper (auto-detect language - supports Arabic and French)
    // CIBLE 2 — Hotwords utilisateur (lexique métier + corrections + salariés).
    const { hotwords, corrections } = await getUserHotwords(supabaseAuth, user.id);

    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      prompt: buildWhisperPrompt(hotwords),
    });
    const rawTranscript = transcription.text;

    // Translate Arabic (any dialect) to French if needed
    const { transcript: translated, wasTranslated, originalLanguage } = await processVoiceTranscript(rawTranscript);
    console.log(`[process-voice-product] Language detected: ${originalLanguage}${wasTranslated ? ' (translated)' : ''}`);

    // CIBLE 2 — Correction contextuelle STT (paie/paix, contrar/contrat…).
    const sttFixed = await applySttCorrection(translated, { userCorrections: corrections, groq });
    let transcript = sttFixed.transcript;
    if (sttFixed.changes.length) console.log('[process-voice-product] STT corrections:', sttFixed.changes);

    const systemPrompt = `Tu es un assistant expert en gestion de produits et articles.
L'utilisateur vient de dicter un produit ou un article à voix haute. Extrais les informations et retourne UNIQUEMENT du JSON valide.

Format attendu:
{
  "name": "string — nom du produit",
  "description": "string — description détaillée",
  "reference": "string ou null — référence du produit",
  "unit_price": "number — prix HT sous forme de nombre",
  "vatRate": "number — taux de TVA (par défaut 20)",
  "quantity": "number ou null — quantité par défaut (1 pour unité)",
  "unit": "string ou null — unité (unit, hour, day, month, kg, km, forfait)",
  "category": "string — détecte automatiquement la catégorie (service, product, software, consulting, other)"
}

Règles ABSOLUES pour la CATÉGORIE :
- Analyse les mots-clés pour détecter automatiquement la catégorie :
  - "software" → Mots: logiciel, application, app, saas, logiciel, programme, solution informatique
  - "consulting" → Mots: conseil, consulting, audit, expertise, accompagnement, stratégie, formation
  - "service" → Mots: service, prestation, maintenance, support, hébergement, abonnement
  - "product" → Mots: produit, matériel, article, équipement, device, hardware, objet
  - "other" → Si aucun mot-clé ne correspond
- La catégorie doit TOUJOURS être l'une de ces valeurs: "service", "product", "software", "consulting", "other"

Règles ABSOLUES :
- NE JAMAIS recopier mot pour mot ce que l'utilisateur a dit
- Rédige une description PROFESSIONNELLE et COMMERCIALE
- La description doit être claire, professionnelle, entre 5 et 15 mots
- unit_price est TOUJOURS HT (hors taxes) - DOIT être un nombre
- vatRate par défaut = 20 - DOIT être un nombre
- quantity représente la quantité par défaut, généralement 1 ou null
- Les valeurs unit possibles : "unit", "hour", "day", "month", "kg", "km", "forfait"

Exemples de détection de catégorie :
- "Développement d'une application mobile" → category: "software"
- "Conseil en stratégie digitale" → category: "consulting"
- "Maintenance informatique" → category: "service"
- "Vente de matériel informatique" → category: "product"
- "Formation équipe vente" → category: "consulting"
- "Abonnement mensuel SaaS" → category: "software"`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[process-voice-product] Failed to parse AI response:', err);
      parsed = {};
    }

    // MERCURE : quota vocal consommé atomiquement en amont (consumeVoiceQuota).

    return NextResponse.json({
      transcript,
      originalTranscript: rawTranscript,
      sttCorrections: sttFixed.changes,
      wasTranslated,
      originalLanguage,
      parsed
    });
  } catch (error: any) {
    console.error('[Process Voice Product] Error:', error);
    const message = error.message || 'Erreur lors du traitement vocal';
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez GROQ_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

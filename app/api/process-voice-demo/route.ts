import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { processVoiceTranscript } from '@/lib/groq-translator';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // LOI 9 : démo publique, modéré (était 5 req/min)
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 60, windowMs: 60000 });
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
      return NextResponse.json({ error: 'Configuration IA manquante' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const formData = await req.formData();

    const audio = formData.get('audio') as File | null;
    if (!audio) {
      return NextResponse.json({ error: 'Audio manquant' }, { status: 400 });
    }

    // Transcription with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
    });
    const rawTranscript = transcription.text;

    const { transcript, wasTranslated, originalLanguage } = await processVoiceTranscript(rawTranscript);

    const systemPrompt = `Tu es un assistant expert en facturation française.

CONTEXTE: L'utilisateur teste la démo Factu.me en dictant une facture par voix. Extrais les informations de manière professionnelle.

EXTRACTION OBLIGATOIRE :
1. CLIENT: Toute mention de "client", "pour", "chez", "agence", "startup", "société"
2. LIGNES: Chaque prestation/produit avec quantité et prix
3. DÉLAI: "30 jours", "60 jours", "à réception"

Format JSON attendu:
{
  "action": "replaced",
  "summary": null,
  "client_name": "string ou null",
  "client_email": "string ou null",
  "client_phone": "string ou null",
  "client_address": "string ou null",
  "client_city": "string ou null",
  "client_postal_code": "string ou null",
  "items": [{"description": "string", "quantity": number, "unit_price": number, "vat_rate": number}],
  "due_days": number,
  "notes": "string ou null",
  "discount_percent": number,
  "uncertain_fields": []
}

RÈGLES :
- unit_price TOUJOURS HT, nombre fini
- vat_rate par défaut = 20
- "X jours à Y€/jour" → quantity = X, unit_price = Y
- Description professionnelle (3-10 mots)
- Tous les nombres DOIVENT être des valeurs finales`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    let parsed: any = {
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
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {}

    return NextResponse.json({
      transcript,
      originalTranscript: rawTranscript,
      wasTranslated,
      originalLanguage,
      parsed,
    });
  } catch (error: any) {
    console.error('[process-voice-demo] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors du traitement vocal' },
      { status: 500 }
    );
  }
}

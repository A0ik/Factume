import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { processVoiceTranscript } from '@/lib/groq-translator';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, incrementVoiceUsage } from '@/lib/subscription-guard';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rl = rateLimit({ key: getClientIp(req), limit: 10, windowMs: 60000 });
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

    // TOLL FIX B1: Subscription check — voice features require Solo+ or trial (free: 1/month)
    const sub = await getUserSubscriptionStatus(user.id);
    if (!sub.canUseVoice) {
      return NextResponse.json({
        error: 'Vous avez utilisé votre facture vocale gratuite ce mois-ci. Passez au plan Pro pour un usage illimité.',
        code: 'VOICE_LIMIT',
        upgradeUrl: '/paywall?plan=solo',
      }, { status: 403 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (GROQ_API_KEY)' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const formData = await req.formData();
    const audio = formData.get('audio') as File;
    const contract_type = formData.get('contract_type') as string;

    if (!audio) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    // Transcription with Groq Whisper (auto-detect language - supports Arabic and French)
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      // language: 'fr', // Removed - auto-detect to support Arabic
    });
    const rawTranscript = transcription.text;

    // Translate Arabic (any dialect) to French if needed
    const { transcript, wasTranslated, originalLanguage } = await processVoiceTranscript(rawTranscript);

    console.log(`[process-voice-contract] Language detected: ${originalLanguage}${wasTranslated ? ' (translated)' : ''}`);

    // Load user's past voice corrections
    let correctionHint = '';
    try {
      const { data: corrections } = await supabaseAuth
        .from('voice_corrections')
        .select('field, original_value, corrected_value')
        .eq('user_id', user.id);
      if (corrections && corrections.length > 0) {
        const correctionLines = corrections
          .map(c => `"${c.original_value}" → "${c.corrected_value}" (champ: ${c.field})`)
          .join(', ');
        correctionHint = `\n\nCORRECTIONS PASSÉES DE L'UTILISATEUR:\n${correctionLines}\nSi tu entends un de ces noms/valeurs, utilise directement la version corrigée.`;
      }
    } catch (e) {
      // Non-critical
    }

    // System prompt based on contract type
    const systemPrompts: Record<string, string> = {
      cdd: `Tu es un assistant expert en contrats de travail français, spécialisé dans les CDD (Contrat à Durée Déterminée).
L'utilisateur dicte des informations pour un contrat CDD. Extrais et retourne UNIQUEMENT du JSON valide.

CONSIGNES SPÉCIALES:
- Numéro de Sécurité sociale: écoute bien les chiffres dictés, peut être en groupes (1-85-01-23...)
- Nationalité: écoute "Français", "Marocain", "Algérien", "Tunisien", etc.
- Dates: convertis toutes les dates en format YYYY-MM-DD (ex: "15 janvier 2026" → "2026-01-15")
- Pour les dates relatives ("dans 2 semaines", "le mois prochain"), calcule la date approximative
- Prénoms/noms propres: sois TRÈS attentif à l'orthographe. Si tu n'es pas sûr, ajoute le champ dans uncertain_fields

Format attendu (null si non mentionné) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeAddress": "string ou null",
  "employeePostalCode": "string ou null",
  "employeeCity": "string ou null",
  "employeeBirthDate": "string ou null (format YYYY-MM-DD)",
  "employeeSocialSecurity": "string ou null (15 chiffres, sans espaces)",
  "employeeNationality": "string ou null (Française, Marocaine, etc.)",
  "contractStartDate": "string ou null (format YYYY-MM-DD)",
  "contractEndDate": "string ou null (format YYYY-MM-DD)",
  "trialPeriodDays": "string ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "contractReason": "remplacement, accroisse, saisonnier, ou usage - null si non dit",
  "replacedEmployeeName": "string ou null (si remplacement)",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "uncertain_fields": [
    {"field": "string", "current_value": "any", "reason": "string", "suggestion": "any"}
  ]
}

INCERTITUDE — CHAMPS uncertain_fields :
Signale un champ UNIQUEMENT si l'information est réellement ambiguë ou inaudible.
Signale PARTICULIÈREMENT les prénoms et noms propres si l'orthographe est incertaine.
- Si le prénom/nom entendu pourrait s'écrire de plusieurs façons (ex: "Mamadou" vs "Mahamadou", "Dupon" vs "Dupont")
- Si un montant est ambigu (ex: "deux cents" vs "sans")
- Si un nombre clé est couvert par du bruit
NE PAS signaler si tu es raisonnablement confiant.
Si aucun doute réel → "uncertain_fields": []

Exemple : "Je veux embaucher Marie Dupont, de nationalité française, née le 15 mars 1990, numéro de sécurité sociale 2 85 01 234 567 89, comme développeuse web à Paris. Le contrat commence le 1er février 2026 pour 6 mois à 3000 euros par mois."
→ {
  "employeeFirstName": "Marie",
  "employeeLastName": "Dupont",
  "employeeNationality": "Française",
  "employeeBirthDate": "1990-03-15",
  "employeeSocialSecurity": "2850123456789",
  "jobTitle": "Développeuse web",
  "workLocation": "Paris",
  "contractStartDate": "2026-02-01",
  "contractEndDate": "2026-08-01",
  "salaryAmount": "3000",
  "salaryFrequency": "monthly",
  "uncertain_fields": []
}`,

      cdi: `Tu es un assistant expert en contrats de travail français, spécialisé dans les CDI (Contrat à Durée Indéterminée).
L'utilisateur dicte des informations pour un contrat CDI. Extrais et retourne UNIQUEMENT du JSON valide.

CONSIGNES SPÉCIALES:
- Numéro de Sécurité sociale: écoute bien les chiffres dictés, peut être en groupes (1-85-01-23...)
- Nationalité: écoute "Français", "Marocain", "Algérien", "Tunisien", etc.
- Dates: convertis toutes les dates en format YYYY-MM-DD (ex: "15 janvier 2026" → "2026-01-15")
- Pour les dates relatives ("dans 2 semaines", "le mois prochain"), calcule la date approximative
- Prénoms/noms propres: sois TRÈS attentif à l'orthographe. Si tu n'es pas sûr, ajoute le champ dans uncertain_fields

Format attendu (null si non mentionné) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeAddress": "string ou null",
  "employeePostalCode": "string ou null",
  "employeeCity": "string ou null",
  "employeeBirthDate": "string ou null (format YYYY-MM-DD)",
  "employeeSocialSecurity": "string ou null (15 chiffres, sans espaces)",
  "employeeNationality": "string ou null (Française, Marocaine, etc.)",
  "contractStartDate": "string ou null (format YYYY-MM-DD)",
  "trialPeriodDays": "string ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "contractClassification": "string ou null",
  "workingHours": "string ou null",
  "companyName": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "uncertain_fields": [
    {"field": "string", "current_value": "any", "reason": "string", "suggestion": "any"}
  ]
}

INCERTITUDE — CHAMPS uncertain_fields :
Signale un champ UNIQUEMENT si l'information est réellement ambiguë ou inaudible.
Signale PARTICULIÈREMENT les prénoms et noms propres si l'orthographe est incertaine.
Si aucun doute réel → "uncertain_fields": []`,

      other: `Tu es un assistant expert en contrats de travail français.
L'utilisateur dicte des informations pour un contrat (stage, freelance, etc.). Extrais et retourne UNIQUEMENT du JSON valide.

Format attendu (null si non mentionné) :
{
  "contractCategory": "stage, freelance, temp_work, apprenticeship, professionalization, ou other - détecte automatiquement",
  "contractTitle": "string ou null",
  "durationWeeks": "string ou null",
  "startDate": "string ou null (format YYYY-MM-DD)",
  "endDate": "string ou null (format YYYY-MM-DD)",
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "companyName": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly, hourly, weekly, ou flat_rate",
  "tutorName": "string ou null",
  "schoolName": "string ou null",
  "speciality": "string ou null",
  "uncertain_fields": [
    {"field": "string", "current_value": "any", "reason": "string", "suggestion": "any"}
  ]
}

INCERTITUDE — CHAMPS uncertain_fields :
Signale un champ UNIQUEMENT si l'information est réellement ambiguë ou inaudible.
Signale PARTICULIÈREMENT les prénoms et noms propres si l'orthographe est incertaine.
Si aucun doute réel → "uncertain_fields": []

Détection automatique de contractCategory :
- "stage" → mots: stage, stagiaire, convention de stage
- "freelance" → mots: freelance, prestataire, prestation, consultant
- "temp_work" → mots: intérim, intérimaire, mission temporaire
- "apprenticeship" → mots: apprentissage, apprenti
- "professionalization" → mots: professionnalisation`
    };

    const systemPrompt = (systemPrompts[contract_type] || systemPrompts.other) + correctionHint;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1500,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[process-voice-contract] Failed to parse AI response:', err);
      parsed = {};
    }

    // TOLL: Track voice usage for free tier (1/month limit)
    if (sub.isFree) await incrementVoiceUsage(user.id);

    return NextResponse.json({
      transcript,
      originalTranscript: rawTranscript,
      wasTranslated,
      originalLanguage,
      parsed
    });

  } catch (error: any) {
    console.error('[Process Voice Contract] Error:', error);
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

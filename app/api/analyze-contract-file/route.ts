import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // ARGOS (CIBLE 4) — Auth + rate-limit : avant, route anonyme consommant illimitément
    // le quota OpenRouter mutualisé (DoS financier).
    const rl = rateLimit({ key: getClientIp(req), limit: 10, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans un instant.' }, { status: 429 });
    }
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || 'application/octet-stream';
    const isPDF = mimeType === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    const isImage = mimeType.startsWith('image/');

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const systemPrompt = `Tu es un assistant expert en extraction de données depuis des documents administratifs français, spécialisé dans les contrats de travail.

INSTRUCTIONS PRÉCISES D'EXTRACTION :

1. NUMÉRO DE SÉCURITÉ SOCIALE (NIR) :
   - Cherche tous les formats : 15 chiffres, X XX XX XX XXX XXX XX, ou avec clés (2 chiffres à la fin)
   - Termes associés : NIR, numéro Sécu, sécurité sociale, SS, numéro d'inscription
   - Nettoie : retire tous les espaces, tirets et caractères non numériques (garde 15 chiffres)
   - Exemples : 185012345678912, 1 85 01 23 456 789 12 → 185012345678912

2. NATIONALITÉ :
   - Cherche : nationalité, de nationalité, Français(e), Française, étranger
   - Valeurs courantes : Française, Marocaine, Algérienne, Tunisienne, Italienne, Espagnole, Portugaise
   - Convertis au féminin singulier si possible

3. DATES DE CONTRAT :
   - Cherche : date de début, date de fin, début du contrat, fin du contrat, durée, prise de fonction, à compter du, jusqu'au
   - Formats acceptés : JJ/MM/AAAA, JJ-MM-AAAA, en toutes lettres (1er janvier 2025)
   - Convertis TOUJOURS au format YYYY-MM-DD

4. MONTANTS ET SALAIRES :
   - Cherche : salaire, rémunération, montant, taux horaire
   - Extrais le montant numérique uniquement (sans €, sans espaces)
   - Convertis en nombre décimal si nécessaire

5. COORDONNÉES :
   - Email : cherche les formats standard (nom@domaine.fr)
   - Téléphone : cherche formats français (06 XX XX XX XX, +33 6 XX XX XX XX)
   - Adresse complète : complète avec code postal et ville si possible

6. RAISON SOCIALE ET SIRET :
   - Nom de l'entreprise : cherche "Raison sociale", "Entreprise", "Société"
   - SIRET : 14 chiffres, peut être écrit avec ou sans espaces

Retourne UNIQUEMENT du JSON valide (pas de markdown, pas de commentaires) avec ce format (null si non trouvé) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeAddress": "string ou null",
  "employeePostalCode": "string ou null",
  "employeeCity": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeBirthDate": "string ou null (format YYYY-MM-DD)",
  "employeeSocialSecurity": "string ou null (15 chiffres, sans espaces ni tirets)",
  "employeeNationality": "string ou null",
  "contractStartDate": "string ou null (format YYYY-MM-DD)",
  "contractEndDate": "string ou null (format YYYY-MM-DD)",
  "trialPeriodDays": "number ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "salaryAmount": "number ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companyPostalCode": "string ou null",
  "companyCity": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "contractReason": "string ou null (pour CDD : remplacement, accroisse, saisonnier, usage)",
  "replacedEmployeeName": "string ou null",
  "contractClassification": "string ou null (pour CDI : niveau, coefficient, catégorie)",
  "workingHours": "string ou null"
}`;

    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout IA (${ms / 1000}s)`)), ms)
        ),
      ]);

    let responseText: string | null = null;

    // ── PDF: try text extraction first ──────────────────────────────────────
    if (isPDF) {
      try {
        const pdfParse = require('pdf-parse');
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await withTimeout(pdfParse(buffer), 20000) as any;
        const text = pdfData.text?.trim() || '';

        if (text.length > 50) {
          const completion = await withTimeout(
            openrouter.chat.completions.create({
              // Modèle économique et performant pour l'extraction de données françaises
              model: 'google/gemma-3-27b-it',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Analyse ce document de contrat et extrais les informations demandées avec précision :\n\n${text.slice(0, 12000)}` },
              ],
              response_format: { type: 'json_object' },
              temperature: 0, // Température nulle pour une extraction plus précise
              max_tokens: 2000,
            }),
            35000 // Timeout augmenté pour les contrats longs
          );
          responseText = completion.choices[0].message.content;
        }
      } catch (pdfErr) {
        console.warn('[analyze-contract-file] PDF text extraction failed, falling back to vision:', pdfErr);
      }
    }

    // ── Image or PDF fallback: vision model ──────────────────────────────────
    if (!responseText && (isImage || isPDF)) {
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const imgMime = isImage ? mimeType : 'image/jpeg';

      const VISION_MODELS = [
        'google/gemini-2.5-flash', // Rapide et gratuit, excellent pour l'OCR
        'meta-llama/llama-3.2-90b-vision-preview', // Plus précis pour les contrats complexes
        'openai/gpt-4o-mini', // Fallback fiable
      ];

      for (const model of VISION_MODELS) {
        try {
          const completion = await withTimeout(
            openrouter.chat.completions.create({
              model,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: systemPrompt + '\n\nAnalyse ce document et extrais les informations.' },
                    { type: 'image_url', image_url: { url: `data:${imgMime};base64,${base64}` } },
                  ],
                },
              ],
              response_format: { type: 'json_object' },
              max_tokens: 2000,
            }),
            35000
          );
          responseText = completion.choices[0].message.content;
          if (responseText) break;
        } catch (err: any) {
          console.warn(`[analyze-contract-file] Model ${model} failed:`, err.message);
          continue;
        }
      }
    }

    if (!responseText) {
      return NextResponse.json({ error: 'Impossible d\'analyser le document. Vérifiez que le fichier est lisible.' }, { status: 500 });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      console.error('[analyze-contract-file] Failed to parse AI response:', err);
      parsed = {};
    }

    return NextResponse.json({
      extractedData: parsed,
      fileName: file.name,
      fileType: file.type,
    });

  } catch (error: any) {
    console.error('[Analyze Contract File] Error:', error);
    const message = error.message || 'Erreur lors de l\'analyse du fichier';

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    if (error.message?.includes('Timeout')) {
      return NextResponse.json({ error: 'Délai dépassé. Essayez avec un fichier plus léger.' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

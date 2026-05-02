import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // Check user subscription - OCR is Business only feature
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // OCR is only available for Business users or active trial users
    const isBusiness = profile.subscription_tier === 'business';
    const isTrial = profile.is_trial_active === true;

    if (!isBusiness && !isTrial) {
      return NextResponse.json({
        error: 'L\'analyse OCR est disponible uniquement avec le plan Business. Passez à un plan supérieur pour débloquer cette fonctionnalité.',
        feature: 'ocr',
        requiredPlan: 'business',
        upgradeUrl: '/paywall?plan=business'
      }, { status: 402 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Try vision model via OpenRouter
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse ce justificatif de dépense et extrait les informations. Retourne UNIQUEMENT du JSON valide:
{
  "vendor": "nom du fournisseur/magasin",
  "amount": nombre TTC en euros,
  "vat_amount": montant TVA en euros ou null,
  "date": "YYYY-MM-DD ou null",
  "description": "description courte de l'achat",
  "category": "transport|meals|accommodation|equipment|office|shopping|other"
}
Si une information n'est pas lisible, mets null.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    let extracted: any = {};
    try {
      extracted = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      return NextResponse.json({ error: 'Impossible de lire le justificatif' }, { status: 500 });
    }

    return NextResponse.json({ extracted });
  } catch (error: any) {
    console.error('[OCR Receipt] Error:', error);
    const message = error.message || 'Erreur lors de l\'OCR';
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      return NextResponse.json({ error: 'Le délai d\'OCR a été dépassé. Réessayez avec un fichier plus léger.' }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Table Extraction Prompt
// ---------------------------------------------------------------------------

function buildTableExtractionPrompt(): string {
  return `Tu es un expert en extraction de données structurées depuis des factures. Ta mission est d'identifier et d'extraire TOUS les tableaux de données présents dans le document.

CONSIGNES CRITIQUES :
1. Identifie TOUS les tableaux visibles dans le document
2. Pour chaque tableau, extrais : en-têtes de colonnes, lignes de données
3. Préserve la structure hiérarchique des données
4. Les montants doivent être convertis en nombres (pas de texte)
5. Les pourcentages doivent être convertis en décimales (ex: 20% → 0.20)
6. Identifie le type de chaque colonne (texte, nombre, date, montant, etc.)

TYPES DE COLONNES À RECONNAÎTRE :
- text: Description, nom, référence
- number: Quantité, prix unitaire, montant
- date: Date de facture, date d'échéance
- percentage: Taux de TVA, remise
- boolean: Case à cocher, oui/non

Retourne UNIQUEMENT du JSON valide (pas de markdown) :
{
  "tables": [
    {
      "table_number": 1,
      "title": "titre descriptif du tableau ou null",
      "headers": ["Colonne1", "Colonne2", "Colonne3"],
      "column_types": ["text", "number", "number"],
      "rows": [
        {
          "row_number": 1,
          "cells": ["Donnée 1", 12.50, 100.00]
        }
      ],
      "row_count": 5,
      "confidence": 85
    }
  ],
  "total_tables": 1,
  "document_type": "invoice|receipt|statement|other",
  "extraction_notes": "notes sur l'extraction ou null"
}

Si aucun tableau n'est détecté, mets "tables": [] avec une explication dans extraction_notes.
Analyse maintenant ce document et extrais tous les tableaux avec précision.`;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
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

    const isBusiness = profile.subscription_tier === 'business';
    const isTrial = profile.is_trial_active === true;

    if (!isBusiness && !isTrial) {
      return NextResponse.json(
        { error: 'L\'extraction de tables est disponible avec le plan Business.' },
        { status: 402 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Call OpenRouter for table extraction
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
            { type: 'text', text: buildTableExtractionPrompt() },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: 'Pas de réponse IA' }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tables: parsed.tables || [],
      document_type: parsed.document_type,
      extraction_notes: parsed.extraction_notes,
    });
  } catch (error) {
    console.error('[Table Extraction] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'extraction des tableaux' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  type DetectionResult,
  isPDF,
  detectInvoiceSegments,
} from '@/lib/pdf-splitter';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS_DETECT = 10;

// ---------------------------------------------------------------------------
// POST handler — delegates to shared detectInvoiceSegments
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, is_trial_active')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

    const isBusiness = profile.subscription_tier === 'business';
    const isTrial = profile.is_trial_active === true;

    if (!isBusiness && !isTrial) {
      return NextResponse.json(
        { error: 'La détection multi-factures nécessite le plan Business.', feature: 'detect_invoices', requiredPlan: 'business', upgradeUrl: '/paywall?plan=business' },
        { status: 402 }
      );
    }

    // 2. Rate limiting
    {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count: recentCount } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', windowStart);
      if (recentCount !== null && recentCount >= RATE_LIMIT_MAX_REQUESTS_DETECT) {
        return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans une minute.' }, { status: 429 });
      }
    }

    // 3. Validate env
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante' }, { status: 500 });
    }

    // 4. Parse file
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    if (!isPDF(file.type)) return NextResponse.json({ error: 'Type non supporté. PDF uniquement.' }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 50 Mo)' }, { status: 413 });

    // 5. Initialize OpenRouter
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // 6. Run detection via shared function
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const result: DetectionResult = await detectInvoiceSegments(pdfBuffer, openrouter);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Detect Invoices] Unhandled error:', error);
    const err = error as { message?: string; status?: number };

    if (err.status === 401 || err.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide' }, { status: 500 });
    }
    if (err.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    if (err.message?.includes('timeout')) {
      return NextResponse.json({ error: 'Délai dépassé. Réessayez avec un fichier plus léger.' }, { status: 504 });
    }

    return NextResponse.json({ error: err.message || 'Erreur inattendue.' }, { status: 500 });
  }
}

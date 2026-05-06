import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Vendor similarity: Jaccard-like character overlap on normalized strings
// ---------------------------------------------------------------------------

function vendorSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;

  const setA = new Set(na.split(''));
  const setB = new Set(nb.split(''));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ---------------------------------------------------------------------------
// POST — Check if an expense is a duplicate
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { vendor, amount, date, image_hash } = body as {
      vendor: string;
      amount: number;
      date: string; // YYYY-MM-DD
      image_hash?: string;
    };

    if (!vendor || typeof amount !== 'number' || !date) {
      return NextResponse.json(
        { error: 'Paramètres manquants : vendor, amount et date sont requis.' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // 1. Fetch candidate expenses within ±1 day of the given date
    // ------------------------------------------------------------------
    const targetDate = new Date(date + 'T00:00:00Z');

    const dayBefore = new Date(targetDate);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    const dayAfter = new Date(targetDate);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

    const fromDate = dayBefore.toISOString().slice(0, 10);
    const toDate = dayAfter.toISOString().slice(0, 10);

    const { data: candidates, error: fetchError } = await supabase
      .from('expenses')
      .select('id, vendor, amount, date, created_at, ocr_raw_response')
      .eq('user_id', user.id)
      .gte('date', fromDate)
      .lte('date', toDate);

    if (fetchError) {
      console.error('[duplicate-check] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Erreur lors de la recherche de doublons.' }, { status: 500 });
    }

    // ------------------------------------------------------------------
    // 2. If image_hash provided, also fetch expenses with matching hash
    // ------------------------------------------------------------------
    let hashMatches: Array<{ id: string; vendor: string; amount: number; date: string; created_at: string }> = [];

    if (image_hash) {
      const { data: hashResults } = await supabase
        .from('expenses')
        .select('id, vendor, amount, date, created_at')
        .eq('user_id', user.id)
        .eq('ocr_raw_response->>image_hash', image_hash);

      if (hashResults && hashResults.length > 0) {
        hashMatches = hashResults;
      }
    }

    // ------------------------------------------------------------------
    // 3. Score candidates — amount within 5% AND vendor similarity > 70%
    // ------------------------------------------------------------------
    const AMOUNT_TOLERANCE = 0.05;
    const VENDOR_THRESHOLD = 0.7;

    const scoredMatches: Array<{
      id: string;
      vendor: string;
      amount: number;
      date: string;
      created_at: string;
    }> = [];

    const seenIds = new Set<string>();

    for (const candidate of candidates ?? []) {
      if (seenIds.has(candidate.id)) continue;

      // Amount within 5% tolerance
      const amountDiff = Math.abs(candidate.amount - amount);
      const amountOk = amountDiff < amount * AMOUNT_TOLERANCE;

      // Vendor similarity > 70%
      const similarity = vendorSimilarity(candidate.vendor ?? '', vendor);
      const vendorOk = similarity > VENDOR_THRESHOLD;

      if (amountOk && vendorOk) {
        seenIds.add(candidate.id);
        scoredMatches.push({
          id: candidate.id,
          vendor: candidate.vendor,
          amount: candidate.amount,
          date: candidate.date,
          created_at: candidate.created_at,
        });
      }
    }

    // Add hash matches that weren't already included
    for (const hm of hashMatches) {
      if (!seenIds.has(hm.id)) {
        seenIds.add(hm.id);
        scoredMatches.push(hm);
      }
    }

    return NextResponse.json({
      isDuplicate: scoredMatches.length > 0,
      matches: scoredMatches,
    });
  } catch (error: unknown) {
    console.error('[duplicate-check] Unhandled error:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Erreur inattendue lors de la vérification de doublons.' },
      { status: 500 },
    );
  }
}

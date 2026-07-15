import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { learnVendorIntelligence } from '@/lib/vendors';

// ---------------------------------------------------------------------------
// POST /api/vendors/seed — Reconstruit l'annuaire d'intelligence fournisseurs
// à partir de toutes les dépenses existantes (backfill one-shot). Idempotent :
// vide puis réapprend. Permet de peupler /suppliers dès le premier usage.
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Pagination large pour récupérer tout l'historique.
    const all: Array<{
      vendor: string | null; category?: string | null; amount?: number | null;
      date?: string | null; ocr_confidence?: number | null; ocr_invoice_number?: string | null;
    }> = [];
    let from = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from('expenses')
        .select('vendor, category, amount, date, ocr_confidence, ocr_invoice_number')
        .eq('user_id', user.id)
        .range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      all.push(...(data || []));
      if (!data || data.length < 1000) break;
      from += 1000;
    }

    // Rebuild propre : on vide l'annuaire puis on réapprend dépense par dépense.
    await supabase.from('vendor_intelligence').delete().eq('user_id', user.id);

    let learned = 0;
    for (const e of all) {
      if (!e.vendor) continue;
      try {
        await learnVendorIntelligence(supabase, user.id, e);
        learned++;
      } catch (err) {
        console.error('[vendors/seed] learn error:', err);
      }
    }

    return NextResponse.json({ success: true, processed: all.length, learned });
  } catch (error) {
    console.error('[vendors/seed] error:', error);
    return NextResponse.json({ error: 'Erreur lors du calcul de l\'annuaire' }, { status: 500 });
  }
}

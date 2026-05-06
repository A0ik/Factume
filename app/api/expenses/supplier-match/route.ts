import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Supplier/Client matching — links OCR-extracted vendors to existing client
// records in the database, enabling proper accounting integration.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { vendor_name, vendor_siret, vendor_vat_number, expense_id } = body as {
      vendor_name?: string;
      vendor_siret?: string;
      vendor_vat_number?: string;
      expense_id?: string;
    };

    if (!vendor_name && !vendor_siret) {
      return NextResponse.json({ error: 'vendor_name ou vendor_siret requis' }, { status: 400 });
    }

    // 1. Try exact SIRET match on clients table
    if (vendor_siret) {
      const { data: siretMatch } = await supabase
        .from('clients')
        .select('id, name, siret, vat_number, address, city, postal_code, email')
        .eq('user_id', user.id)
        .eq('siret', vendor_siret)
        .maybeSingle();

      if (siretMatch) {
        // Link expense to this client if expense_id provided
        if (expense_id) {
          await supabase
            .from('expenses')
            .update({ supplier_client_id: siretMatch.id })
            .eq('id', expense_id)
            .eq('user_id', user.id);
        }

        return NextResponse.json({
          match: siretMatch,
          match_type: 'siret_exact',
          confidence: 100,
        });
      }
    }

    // 2. Try VAT number match
    if (vendor_vat_number) {
      const { data: vatMatch } = await supabase
        .from('clients')
        .select('id, name, siret, vat_number, address, city, postal_code, email')
        .eq('user_id', user.id)
        .ilike('vat_number', vendor_vat_number)
        .maybeSingle();

      if (vatMatch) {
        if (expense_id) {
          await supabase
            .from('expenses')
            .update({ supplier_client_id: vatMatch.id })
            .eq('id', expense_id)
            .eq('user_id', user.id);
        }

        return NextResponse.json({
          match: vatMatch,
          match_type: 'vat_exact',
          confidence: 95,
        });
      }
    }

    // 3. Fuzzy name match using ILIKE and trigram-like logic
    if (vendor_name) {
      const cleanName = vendor_name
        .replace(/[^a-zA-Z0-9À-ÿ\s]/g, '')
        .trim()
        .substring(0, 100);

      if (cleanName.length >= 3) {
        // Try exact name first
        const { data: exactMatch } = await supabase
          .from('clients')
          .select('id, name, siret, vat_number, address, city, postal_code, email')
          .eq('user_id', user.id)
          .ilike('name', cleanName)
          .maybeSingle();

        if (exactMatch) {
          if (expense_id) {
            await supabase
              .from('expenses')
              .update({ supplier_client_id: exactMatch.id })
              .eq('id', expense_id)
              .eq('user_id', user.id);
          }

          return NextResponse.json({
            match: exactMatch,
            match_type: 'name_exact',
            confidence: 90,
          });
        }

        // Try partial match (first significant words)
        const words = cleanName.split(/\s+/).filter((w: string) => w.length >= 3);
        if (words.length > 0) {
          const primaryWord = words[0];
          const { data: partialMatches } = await supabase
            .from('clients')
            .select('id, name, siret, vat_number, address, city, postal_code, email')
            .eq('user_id', user.id)
            .ilike('name', `%${primaryWord}%`)
            .limit(5);

          if (partialMatches && partialMatches.length > 0) {
            // Score matches by word overlap
            const scored = partialMatches.map((client) => {
              const clientWords = client.name.toLowerCase().split(/\s+/);
              const vendorWords = cleanName.toLowerCase().split(/\s+/);
              const overlap = vendorWords.filter((w: string) =>
                clientWords.some((cw: string) => cw.includes(w) || w.includes(cw))
              ).length;
              const score = (overlap / Math.max(vendorWords.length, clientWords.length)) * 100;
              return { ...client, score };
            });

            scored.sort((a, b) => b.score - a.score);
            const best = scored[0];

            if (best.score >= 50) {
              return NextResponse.json({
                matches: scored.slice(0, 3),
                match_type: 'name_fuzzy',
                confidence: Math.round(best.score),
              });
            }
          }
        }
      }
    }

    // 4. No match — suggest creating a new client record
    return NextResponse.json({
      match: null,
      match_type: 'none',
      suggestion: {
        name: vendor_name || null,
        siret: vendor_siret || null,
        vat_number: vendor_vat_number || null,
      },
      message: 'Aucun client correspondant trouvé. Créez un nouveau fournisseur.',
    });
  } catch (error: unknown) {
    console.error('[Supplier Match] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche de fournisseur' },
      { status: 500 },
    );
  }
}

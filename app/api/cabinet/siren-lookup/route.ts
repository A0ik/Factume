import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 1) {
      return NextResponse.json(
        { error: 'Paramètre de recherche requis' },
        { status: 400 }
      );
    }

    const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query.trim())}&per_page=5`;

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
    } catch (fetchErr: any) {
      console.error('[siren-lookup GET] Fetch error:', fetchErr);
      return NextResponse.json(
        { error: 'Service de recherche indisponible' },
        { status: 503 }
      );
    }

    if (!response.ok) {
      console.error('[siren-lookup GET] API returned status:', response.status);
      return NextResponse.json(
        { error: 'Erreur du service de recherche' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Parse and simplify results
    const results = (data.results || []).map((item: any) => {
      const siege = item.siege || {};
      const dirigeants = item.dirigeants || [];

      // Get first dirigeant (personne_physique or personne_morale)
      const firstDirigeant = dirigeants.length > 0 ? dirigeants[0] : null;
      let manager: string | null = null;
      if (firstDirigeant) {
        if (firstDirigeant.prenoms && firstDirigeant.nom) {
          manager = `${firstDirigeant.prenoms} ${firstDirigeant.nom}`;
        } else if (firstDirigeant.denomination) {
          manager = firstDirigeant.denomination;
        }
      }

      return {
        siren: item.siren || null,
        siret: siege.siret || null,
        name: item.nom_raison_sociale || item.denomination || null,
        legal_form: item.nature_juridique || null,
        address: siege.geo_adresse || null,
        naf_code: item.activite_principale || null,
        manager,
        created_at: item.date_creation || null,
      };
    });

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('[siren-lookup GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

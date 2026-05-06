import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { runHealthScan } from '@/lib/data-health-engine';

export async function POST(req: NextRequest) {
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

    if (!profile || !['pro', 'business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Pro requis' }, { status: 403 });
    }

    const result = await runHealthScan(user.id);

    const { data: saved, error } = await admin
      .from('data_health_scans')
      .insert({
        user_id: user.id,
        overall_score: result.overall_score,
        category_scores: result.category_scores,
        issues: result.issues,
        suggestions: result.suggestions,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ scan: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const result = await runHealthScan(user.id);
    return NextResponse.json({ scan: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

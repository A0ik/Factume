import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/dashboard/urssaf-data
 * Returns the total revenue (sum of paid invoices) for a given date range.
 * Used by the URSSAF Widget to calculate the quarterly reserve.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate et endDate requis' }, { status: 400 });
    }

    // Sum of paid invoices (status = 'paid') within the date range
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('total_ttc, paid_at, status')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('paid_at', startDate)
      .lte('paid_at', endDate);

    if (error) {
      console.error('[urssaf-data] Error fetching invoices:', error);
      return NextResponse.json({ error: 'Erreur de base de données' }, { status: 500 });
    }

    const totalRevenue = (invoices || []).reduce((sum, inv) => {
      const amount = typeof inv.total_ttc === 'number' ? inv.total_ttc : 0;
      return sum + amount;
    }, 0);

    return NextResponse.json({
      totalRevenue,
      invoiceCount: invoices?.length || 0,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('[urssaf-data] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getInstitutions } from '@/lib/nordigen/client';

/**
 * GET /api/banking/institutions
 * Get list of available banks/institutions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'FR';

    const institutions = await getInstitutions(country);

    return NextResponse.json({
      success: true,
      data: institutions.map((inst) => ({
        id: inst.id,
        name: inst.name,
        logo: inst.logo,
        countries: inst.countries,
      })),
    });
  } catch (error) {
    console.error('Error fetching institutions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch institutions' },
      { status: 500 }
    );
  }
}

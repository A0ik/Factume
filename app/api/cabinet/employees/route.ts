import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

const VALID_CONTRACT_TYPES = [
  'CDI', 'CDD', 'CDD_usage', 'Interim', 'Stage',
  'Apprentissage', 'Professionnalisation', 'Portage', 'Freelance',
] as const;

const VALID_STATUSES = ['active', 'suspended', 'ended'] as const;
const VALID_GENDERS = ['M.', 'Mme'] as const;

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

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const contractType = searchParams.get('contract_type');

    let query = admin
      .from('cabinet_employees')
      .select('*')
      .eq('cabinet_id', cabinet.id)
      .order('last_name', { ascending: true });

    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);
    if (contractType) query = query.eq('contract_type', contractType);

    const { data: employees, error } = await query;

    if (error) {
      console.error('[employees GET] Query error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ employees: [] });
      }
      throw error;
    }

    return NextResponse.json({ employees: employees || [] });
  } catch (err: any) {
    console.error('[employees GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

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

    if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) {
      return NextResponse.json({ error: 'Abonnement Business requis' }, { status: 403 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 });
    }

    const body = await req.json();
    const {
      client_id, last_name, first_name, birth_date, birth_place,
      nationality, social_security_number, address, gender,
      job_title, contract_type, salary_brut_monthly, hourly_rate,
      hours_per_week, start_date, end_date, status, notes,
    } = body;

    // Validate required fields
    if (!client_id || !last_name || !first_name || !contract_type || !start_date) {
      return NextResponse.json(
        { error: 'client_id, last_name, first_name, contract_type et start_date sont requis' },
        { status: 400 },
      );
    }

    // Validate contract_type
    if (!VALID_CONTRACT_TYPES.includes(contract_type)) {
      return NextResponse.json(
        { error: `Type de contrat invalide. Valeurs autorisées : ${VALID_CONTRACT_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate gender if provided
    if (gender && !VALID_GENDERS.includes(gender)) {
      return NextResponse.json(
        { error: 'Genre invalide. Valeurs autorisées : M., Mme' },
        { status: 400 },
      );
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide. Valeurs autorisées : active, suspended, ended' },
        { status: 400 },
      );
    }

    const insertData: Record<string, any> = {
      cabinet_id: cabinet.id,
      client_id,
      last_name,
      first_name,
      contract_type,
      start_date,
      status: status || 'active',
    };

    if (birth_date !== undefined) insertData.birth_date = birth_date;
    if (birth_place !== undefined) insertData.birth_place = birth_place;
    if (nationality !== undefined) insertData.nationality = nationality;
    if (social_security_number !== undefined) insertData.social_security_number = social_security_number;
    if (address !== undefined) insertData.address = address;
    if (gender !== undefined) insertData.gender = gender;
    if (job_title !== undefined) insertData.job_title = job_title;
    if (salary_brut_monthly !== undefined) insertData.salary_brut_monthly = salary_brut_monthly;
    if (hourly_rate !== undefined) insertData.hourly_rate = hourly_rate;
    if (hours_per_week !== undefined) insertData.hours_per_week = hours_per_week;
    if (end_date !== undefined) insertData.end_date = end_date;
    if (notes !== undefined) insertData.notes = notes;

    const { data: employee, error } = await admin
      .from('cabinet_employees')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[employees POST] Insert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table cabinet_employees non trouvée' }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ employee }, { status: 201 });
  } catch (err: any) {
    console.error('[employees POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Aucun cabinet trouvé' }, { status: 404 });
    }

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de l\'employé requis' }, { status: 400 });
    }

    // Validate contract_type if provided
    if (fields.contract_type && !VALID_CONTRACT_TYPES.includes(fields.contract_type)) {
      return NextResponse.json(
        { error: `Type de contrat invalide. Valeurs autorisées : ${VALID_CONTRACT_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate gender if provided
    if (fields.gender && !VALID_GENDERS.includes(fields.gender)) {
      return NextResponse.json(
        { error: 'Genre invalide. Valeurs autorisées : M., Mme' },
        { status: 400 },
      );
    }

    // Validate status if provided
    if (fields.status && !VALID_STATUSES.includes(fields.status)) {
      return NextResponse.json(
        { error: 'Statut invalide. Valeurs autorisées : active, suspended, ended' },
        { status: 400 },
      );
    }

    // Build update object from provided fields
    const allowedFields = [
      'last_name', 'first_name', 'birth_date', 'birth_place', 'nationality',
      'social_security_number', 'address', 'gender', 'job_title', 'contract_type',
      'salary_brut_monthly', 'hourly_rate', 'hours_per_week', 'start_date',
      'end_date', 'status', 'notes',
    ];

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        updateData[field] = fields[field];
      }
    }

    const { data: employee, error } = await admin
      .from('cabinet_employees')
      .update(updateData)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) {
      console.error('[employees PATCH] Update error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Table cabinet_employees non trouvée' }, { status: 500 });
      }
      throw error;
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (err: any) {
    console.error('[employees PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

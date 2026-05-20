import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

// ── Shared auth guard ──────────────────────────────────────────────
async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  if (!profile || !['business', 'trial'].includes(profile.subscription_tier)) return null;

  const cabinet = await getCabinetForUser(user.id);
  if (!cabinet) return null;

  return { admin, user: user!, cabinet };
}

// ── Helpers ────────────────────────────────────────────────────────
function computeAmounts(items: any[]) {
  let amount_ht = 0;
  let amount_tva = 0;

  for (const item of items) {
    const lineHt = Number(item.unit_price) * Number(item.quantity || 1);
    const lineTva = lineHt * (Number(item.vat_rate || 0) / 100);
    amount_ht += lineHt;
    amount_tva += lineTva;
  }

  return {
    amount_ht: Math.round(amount_ht * 100) / 100,
    amount_tva: Math.round(amount_tva * 100) / 100,
    amount_ttc: Math.round((amount_ht + amount_tva) * 100) / 100,
  };
}

function emptyStats() {
  return { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 };
}

function isTableNotExistError(err: any): boolean {
  const msg = (err?.message || err?.code || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('relation') || err?.code === '42P01';
}

// ── GET  – list invoices + stats ───────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticate(req);
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { admin, cabinet } = ctx;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');
    const month = searchParams.get('month'); // YYYY-MM

    let query = admin
      .from('cabinet_invoices')
      .select('*')
      .eq('cabinet_id', cabinet.id);

    if (status) query = query.eq('status', status);
    if (clientId) query = query.eq('client_id', clientId);
    if (month) {
      const [year, m] = month.split('-');
      const start = `${year}-${m}-01`;
      const endMonth = m === '12' ? '01' : String(Number(m) + 1).padStart(2, '0');
      const endYear = m === '12' ? String(Number(year) + 1) : year;
      const end = `${endYear}-${endMonth}-01`;
      query = query.gte('issue_date', start).lt('issue_date', end);
    }

    query = query.order('issue_date', { ascending: false });

    const { data: invoices, error } = await query;

    if (error) {
      if (isTableNotExistError(error)) {
        return NextResponse.json({ invoices: [], stats: emptyStats() });
      }
      throw error;
    }

    // Compute stats across ALL invoices (not filtered)
    const { data: allInvoices } = await admin
      .from('cabinet_invoices')
      .select('status, amount_ttc')
      .eq('cabinet_id', cabinet.id);

    const stats: Record<string, { count: number; total: number }> = {};
    for (const inv of allInvoices || []) {
      const s = inv.status || 'draft';
      if (!stats[s]) stats[s] = { count: 0, total: 0 };
      stats[s].count++;
      stats[s].total += Number(inv.amount_ttc || 0);
    }

    return NextResponse.json({ invoices: invoices || [], stats });
  } catch (err: any) {
    if (isTableNotExistError(err)) {
      return NextResponse.json({ invoices: [], stats: emptyStats() });
    }
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ── POST – create invoice ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ctx = await authenticate(req);
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { admin, cabinet } = ctx;

    const body = await req.json();
    const { items, client_id, issue_date, due_date, description, objet, payment_method } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Au moins un article est requis' }, { status: 400 });
    }
    if (!client_id) {
      return NextResponse.json({ error: 'Client requis' }, { status: 400 });
    }

    // Verify client belongs to this cabinet
    const { data: client } = await admin
      .from('cabinet_clients')
      .select('id')
      .eq('id', client_id)
      .eq('cabinet_id', cabinet.id)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé dans ce cabinet' }, { status: 404 });
    }

    // Validate items
    for (const item of items) {
      if (!item.description || item.unit_price == null) {
        return NextResponse.json(
          { error: 'Chaque article doit avoir une description et un prix unitaire' },
          { status: 400 },
        );
      }
    }

    // Auto-generate invoice number: FAC-YYYYMM-XXX
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `FAC-${ym}-`;

    const { data: lastInvoice } = await admin
      .from('cabinet_invoices')
      .select('number')
      .eq('cabinet_id', cabinet.id)
      .like('number', `${prefix}%`)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seq = 1;
    if (lastInvoice?.number) {
      const lastSeq = parseInt(lastInvoice.number.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }
    const number = `${prefix}${String(seq).padStart(3, '0')}`;

    const amounts = computeAmounts(items);
    const today = issue_date || now.toISOString().slice(0, 10);

    const { data: invoice, error } = await admin
      .from('cabinet_invoices')
      .insert({
        cabinet_id: cabinet.id,
        client_id,
        number,
        status: 'draft',
        amount_ht: amounts.amount_ht,
        amount_tva: amounts.amount_tva,
        amount_ttc: amounts.amount_ttc,
        issue_date: today,
        due_date: due_date || null,
        description: description || null,
        objet: objet || null,
        payment_method: payment_method || null,
        items,
      })
      .select()
      .single();

    if (error) {
      if (isTableNotExistError(error)) {
        return NextResponse.json({ error: 'Table cabinet_invoices non trouvée' }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ── PATCH – update invoice ─────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await authenticate(req);
    if (!ctx) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { admin, cabinet } = ctx;

    const body = await req.json();
    const { id, items, status, client_id, issue_date, due_date, description, objet, payment_method } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de facture requis' }, { status: 400 });
    }

    // Verify invoice belongs to this cabinet
    const { data: existing, error: fetchError } = await admin
      .from('cabinet_invoices')
      .select('*')
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (status !== undefined) {
      const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      updates.status = status;

      // Auto-set paid_at when marking as paid
      if (status === 'paid' && existing.status !== 'paid') {
        updates.paid_at = new Date().toISOString();
      }
      // Clear paid_at if moving away from paid
      if (status !== 'paid' && existing.status === 'paid') {
        updates.paid_at = null;
      }
    }

    if (client_id !== undefined) updates.client_id = client_id;
    if (issue_date !== undefined) updates.issue_date = issue_date;
    if (due_date !== undefined) updates.due_date = due_date;
    if (description !== undefined) updates.description = description;
    if (objet !== undefined) updates.objet = objet;
    if (payment_method !== undefined) updates.payment_method = payment_method;

    // Recalculate amounts if items change
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'Au moins un article est requis' }, { status: 400 });
      }
      for (const item of items) {
        if (!item.description || item.unit_price == null) {
          return NextResponse.json(
            { error: 'Chaque article doit avoir une description et un prix unitaire' },
            { status: 400 },
          );
        }
      }
      const amounts = computeAmounts(items);
      updates.items = items;
      updates.amount_ht = amounts.amount_ht;
      updates.amount_tva = amounts.amount_tva;
      updates.amount_ttc = amounts.amount_ttc;
    }

    const { data: invoice, error } = await admin
      .from('cabinet_invoices')
      .update(updates)
      .eq('id', id)
      .eq('cabinet_id', cabinet.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ invoice });
  } catch (err: any) {
    if (isTableNotExistError(err)) {
      return NextResponse.json({ error: 'Table cabinet_invoices non trouvée' }, { status: 500 });
    }
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

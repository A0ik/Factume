import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fecDate(d: string) {
  return d.replace(/-/g, ''); // YYYYMMDD
}

function fecAmount(n: number) {
  return n.toFixed(2).replace('.', ',');
}

function esc(s: string) {
  return (s || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
}

function padNum(n: string, len: number) {
  return n.padStart(len, '0');
}

// Mapping categories -> compte comptable (plan comptable francais)
const CATEGORY_ACCOUNT: Record<string, string> = {
  transport: '625600',
  meals: '625700',
  accommodation: '625100',
  equipment: '604000',
  office: '606400',
  shopping: '607000',
  mileage: '625100',
  other: '625000',
};

const FEC_MANDATORY_FIELDS = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum',
  'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate',
  'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet',
  'ValidDate', 'Montantdevise', 'Idevise',
];

// ── GET handler (export history) ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Try to fetch from export_history table (may not exist yet)
    const { data: history, error: histError } = await supabase
      .from('export_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // If table doesn't exist, return empty history
    if (histError) {
      return NextResponse.json({ history: [] });
    }

    return NextResponse.json({ history: history || [] });
  } catch (error: any) {
    console.error('[export-compta GET] Error:', error);
    return NextResponse.json({ history: [] });
  }
}

// ── Helper: save export history ──────────────────────────────────────────────

async function saveExportHistory(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  software: string,
  expenseIds: string[],
  status: string,
) {
  try {
    await supabase.from('export_history').insert({
      user_id: userId,
      software,
      expense_ids: expenseIds,
      status,
    });
  } catch {
    // export_history table may not exist yet; silently skip
  }
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { software, expense_ids, expenseIds, dateFrom, dateTo, config } = body as {
      software: 'pennylane' | 'sage' | 'cegid' | 'csv_fec' | 'fec' | 'csv';
      expense_ids?: string[];
      expenseIds?: string[];
      dateFrom?: string;
      dateTo?: string;
      config?: {
        api_key?: string;
        account_code?: string;
      };
    };

    // Normalize expense ids (support both naming conventions)
    const selectedIds = expense_ids || expenseIds || [];

    // ── Validation ──────────────────────────────────────────────────────
    const validSoftware = ['pennylane', 'sage', 'cegid', 'csv_fec', 'fec', 'csv'];
    if (!software || !validSoftware.includes(software)) {
      return NextResponse.json({ error: 'Logiciel non supporte. Utilisez: pennylane, sage, cegid, csv_fec, fec, csv' }, { status: 400 });
    }

    // For fec/csv modes, expense_ids are optional (can use date range instead)
    const needsIds = !['fec', 'csv', 'csv_fec'].includes(software);
    if (needsIds && (!selectedIds || selectedIds.length === 0)) {
      return NextResponse.json({ error: 'Aucune depense selectionnee' }, { status: 400 });
    }

    // ── Auth ────────────────────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // ── Business / trial only ───────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, is_trial_active')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const isBusiness = profile.subscription_tier === 'business';
    const isTrial = profile.is_trial_active === true;

    if (!isBusiness && !isTrial) {
      return NextResponse.json({
        error: 'L\'export comptable est disponible uniquement avec le plan Business ou en periode d\'essai.',
        feature: 'accounting_export',
        requiredPlan: 'business',
        upgradeUrl: '/paywall?plan=business',
      }, { status: 402 });
    }

    // ── Fetch expenses ──────────────────────────────────────────────────
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['validated', 'approved'])
      .order('date', { ascending: true });

    if (selectedIds.length > 0) {
      query = query.in('id', selectedIds);
    }
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data: expenses, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: 'Aucune depense validee trouvee' }, { status: 404 });
    }

    // ── Fetch profile details for FEC ───────────────────────────────────
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('siret, company_name, email')
      .eq('id', user.id)
      .single();

    const errors: string[] = [];
    let exported = 0;

    // ── Route by software ───────────────────────────────────────────────
    switch (software) {
      // ──────────────────── FEC (standalone enhanced mode) ──────────────
      case 'fec': {
        const siren = (fullProfile?.siret || '').slice(0, 9) || '000000000';
        const year = new Date().getFullYear().toString();

        const headers = FEC_MANDATORY_FIELDS;
        const rows: string[] = [headers.join('|')];
        let ecritureSeq = 1;

        for (const expense of expenses) {
          const vendorName = esc(expense.vendor);
          const journalCode = expense.journal_type || 'ACH';
          const journalLib = journalCode === 'ACH' ? 'Achats' : 'Operations diverses';
          const date = fecDate(expense.date);
          const pieceRef = esc(expense.invoice_number || `EXP-${expense.id.slice(0, 8).toUpperCase()}`);
          const pieceDate = date;
          const libelle = esc(`${expense.vendor || 'Depense'} - ${expense.description || expense.category || ''}`).substring(0, 50);
          const accountCode = expense.account_code || config?.account_code || CATEGORY_ACCOUNT[expense.category] || '648000';
          const accountLib = esc(expense.account_label || 'Charges diverses');
          const htAmount = expense.ht_amount || (expense.amount - (expense.vat_amount || 0));
          const tva = expense.vat_amount || 0;
          const ttc = expense.amount || 0;
          const vatAccount = expense.vat_account || '445660';
          const eNum = padNum(String(ecritureSeq), 6);
          const validDate = date;
          const currency = expense.currency || expense.original_currency || 'EUR';
          const isForeign = currency !== 'EUR';
          const montantDevise = isForeign ? fecAmount(ttc) : '';
          const iDevise = isForeign ? currency : '';

          // Line 1: Debit expense account (HT)
          rows.push([
            journalCode, journalLib, eNum, date,
            accountCode, accountLib, '', '',
            pieceRef, pieceDate,
            libelle.substring(0, 50),
            fecAmount(htAmount), '0,00',
            '', '', validDate, montantDevise, iDevise,
          ].join('|'));

          // Line 2: Debit TVA deductible (if applicable)
          if (tva > 0) {
            rows.push([
              journalCode, journalLib, eNum, date,
              vatAccount, 'TVA deductible', '', '',
              pieceRef, pieceDate,
              `TVA ${libelle.substring(0, 40)}`,
              fecAmount(tva), '0,00',
              '', '', validDate, '', '',
            ].join('|'));
          }

          // Line 3: Credit fournisseur (TTC)
          rows.push([
            journalCode, journalLib, eNum, date,
            '401000', 'Fournisseurs', '', vendorName,
            pieceRef, pieceDate,
            libelle.substring(0, 50),
            '0,00', fecAmount(ttc),
            '', '', validDate, montantDevise, iDevise,
          ].join('|'));

          ecritureSeq++;
          await markExported(supabase, expense.id, 'fec');
          exported++;
        }

        const fecContent = rows.join('\n');
        const filename = `FEC${siren}${year}1231_Depenses.txt`;

        await saveExportHistory(supabase, user.id, 'fec', expenses.map(e => e.id), 'completed');

        return new NextResponse(fecContent, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }

      // ──────────────────── CSV (generic export) ────────────────────────
      case 'csv': {
        const csvHeader = 'Date,Fournisseur,Description,Montant HT,TVA,Montant TTC,Categorie,Compte,Libelle Compte,N° Facture,Mode paiement,Devise';
        const csvRows = expenses.map(e => [
          e.date,
          `"${(e.vendor || '').replace(/"/g, '""')}"`,
          `"${(e.description || '').replace(/"/g, '""')}"`,
          (e.ht_amount || (e.amount - (e.vat_amount || 0))).toFixed(2),
          (e.vat_amount || 0).toFixed(2),
          (e.amount || 0).toFixed(2),
          e.category || 'other',
          e.account_code || CATEGORY_ACCOUNT[e.category] || '625000',
          `"${(e.account_label || '').replace(/"/g, '""')}"`,
          e.invoice_number || '',
          e.payment_method || '',
          e.currency || e.original_currency || 'EUR',
        ].join(','));

        const csv = [csvHeader, ...csvRows].join('\n');

        await saveExportHistory(supabase, user.id, 'csv', expenses.map(e => e.id), 'completed');

        // Mark all as exported
        for (const expense of expenses) {
          await markExported(supabase, expense.id, 'csv');
          exported++;
        }

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="export_depenses_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // ──────────────────── PENNYLANE ──────────────────────────────────
      case 'pennylane': {
        const apiKey = config?.api_key;
        if (!apiKey) {
          return NextResponse.json({ error: 'Cle API Pennylane requise' }, { status: 400 });
        }

        for (const expense of expenses) {
          try {
            const accountCode = config?.account_code || CATEGORY_ACCOUNT[expense.category] || '625000';
            const htAmount = expense.amount - (expense.vat_amount || 0);

            const invoicePayload = {
              supplier_invoice: {
                reference: `EXP-${expense.id.slice(0, 8).toUpperCase()}`,
                description: `${expense.vendor} - ${expense.description || expense.category}`,
                date: expense.date,
                due_date: expense.date,
                currency: 'EUR',
                draft: false,
                supplier_name: expense.vendor,
                lines_attributes: [
                  {
                    description: expense.description || `${expense.vendor} - ${expense.category}`,
                    account_code: accountCode,
                    debit: htAmount,
                    credit: 0,
                    tax: expense.vat_amount > 0 ? { amount: expense.vat_amount, name: 'TVA 20%' } : undefined,
                  },
                ],
              },
            };

            const res = await fetch('https://app.pennylane.com/api/external/v1/supplier_invoices', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(invoicePayload),
            });

            if (res.status === 401) {
              errors.push(`Pennylane: Cle API invalide (401)`);
              break; // no point continuing with a bad key
            }

            if (res.status === 422) {
              const errBody = await res.json();
              const msgs = Array.isArray(errBody?.errors)
                ? errBody.errors.map((e: any) => e.detail || e.title || JSON.stringify(e)).join('; ')
                : JSON.stringify(errBody);
              errors.push(`Pennylane [${expense.vendor}]: ${msgs}`);
              continue;
            }

            if (!res.ok) {
              errors.push(`Pennylane [${expense.vendor}]: erreur ${res.status}`);
              continue;
            }

            // Mark exported
            await markExported(supabase, expense.id, 'pennylane');
            exported++;
          } catch (err: any) {
            errors.push(`Pennylane [${expense.vendor}]: ${err.message}`);
          }
        }

        await saveExportHistory(supabase, user.id, 'pennylane', expenses.map(e => e.id),
          errors.length === 0 ? 'completed' : 'partial');
        break;
      }

      // ──────────────────── SAGE ───────────────────────────────────────
      case 'sage': {
        const apiKey = config?.api_key;
        if (!apiKey) {
          return NextResponse.json({ error: 'Token OAuth Sage requis (config.api_key)' }, { status: 400 });
        }

        for (const expense of expenses) {
          try {
            const accountCode = config?.account_code || CATEGORY_ACCOUNT[expense.category] || '625000';
            const htAmount = expense.amount - (expense.vat_amount || 0);

            const sagePayload = {
              contact_id: expense.vendor,
              date: expense.date,
              due_date: expense.date,
              reference: `EXP-${expense.id.slice(0, 8).toUpperCase()}`,
              line_items: [
                {
                  description: expense.description || `${expense.vendor} - ${expense.category}`,
                  ledger_account_code: accountCode,
                  net_value: htAmount,
                  tax_code: expense.vat_amount > 0 ? 'T20' : 'T0',
                  tax_amount: expense.vat_amount || 0,
                },
              ],
            };

            const res = await fetch('https://api.sage.com/accounting/v1/purchase_invoices', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sagePayload),
            });

            if (res.status === 401) {
              errors.push('Sage: Token OAuth invalide ou expire (401)');
              break;
            }

            if (res.status === 422) {
              const errBody = await res.json();
              errors.push(`Sage [${expense.vendor}]: ${(errBody as any)?.message || 'erreur de validation 422'}`);
              continue;
            }

            if (!res.ok) {
              errors.push(`Sage [${expense.vendor}]: erreur ${res.status}`);
              continue;
            }

            await markExported(supabase, expense.id, 'sage');
            exported++;
          } catch (err: any) {
            errors.push(`Sage [${expense.vendor}]: ${err.message}`);
          }
        }

        await saveExportHistory(supabase, user.id, 'sage', expenses.map(e => e.id),
          errors.length === 0 ? 'completed' : 'partial');
        break;
      }

      // ──────────────────── CEGID ───────────────────────────────────────
      case 'cegid': {
        return NextResponse.json({
          error: 'L\'integration Cegid est en cours de developpement. Utilisez l\'export CSV/FEC en attendant.',
        }, { status: 501 });
      }

      // ──────────────────── CSV / FEC (legacy tab-separated) ────────────
      case 'csv_fec': {
        const siren = (fullProfile?.siret || '').slice(0, 9) || '000000000';
        const year = new Date().getFullYear().toString();

        const headers = [
          'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
          'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
          'PieceRef', 'PieceDate', 'EcritureLib',
          'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate',
          'Montantdevise', 'Idevise',
        ];

        const rows: string[] = [headers.join('\t')];
        let ecritureSeq = 1;

        for (const expense of expenses) {
          const vendorName = esc(expense.vendor);
          const accountCode = config?.account_code || CATEGORY_ACCOUNT[expense.category] || '625000';
          const ref = esc(`EXP-${expense.id.slice(0, 8).toUpperCase()}`);
          const date = fecDate(expense.date);
          const lib = esc(`Depense ${expense.vendor} - ${expense.description || expense.category}`);
          const eNum = padNum(String(ecritureSeq), 6);
          const validDate = date;
          const htAmount = expense.amount - (expense.vat_amount || 0);

          // Line 1: Credit fournisseur 404 (TTC)
          rows.push([
            'AC', 'Achats',
            eNum, date,
            '404000', 'Fournisseurs', '', vendorName,
            ref, date, lib,
            '0,00', fecAmount(expense.amount), '', '', validDate, '', '',
          ].join('\t'));

          // Line 2: Debit charges (HT)
          rows.push([
            'AC', 'Achats',
            eNum, date,
            accountCode, 'Charges diverses', '', '',
            ref, date, lib,
            fecAmount(htAmount), '0,00', '', '', validDate, '', '',
          ].join('\t'));

          // Line 3: Debit TVA deductible 445660 (if VAT > 0)
          if (expense.vat_amount > 0) {
            rows.push([
              'AC', 'Achats',
              eNum, date,
              '445660', 'TVA deductible', '', '',
              ref, date, lib,
              fecAmount(expense.vat_amount), '0,00', '', '', validDate, '', '',
            ].join('\t'));
          }

          ecritureSeq++;
          await markExported(supabase, expense.id, 'csv_fec');
          exported++;
        }

        const fecContent = rows.join('\r\n');
        const filename = `FEC${siren}${year}1231_Depenses.txt`;

        await saveExportHistory(supabase, user.id, 'csv_fec', expenses.map(e => e.id), 'completed');

        return new NextResponse(fecContent, {
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }
    }

    return NextResponse.json({ exported, errors });
  } catch (error: any) {
    console.error('[export-compta] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

// ── Helper: mark expense as exported ────────────────────────────────────────

async function markExported(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  expenseId: string,
  software: string,
) {
  const now = new Date().toISOString();
  const note = `[exported:${software}:${now}]`;

  // Append export note to ocr_raw_response (preserve existing data)
  const { data: existing } = await supabase
    .from('expenses')
    .select('ocr_raw_response')
    .eq('id', expenseId)
    .single();

  const existingData = existing?.ocr_raw_response
    ? typeof existing.ocr_raw_response === 'string'
      ? existing.ocr_raw_response
      : JSON.stringify(existing.ocr_raw_response)
    : '{}';

  const updatedData = existingData.endsWith('}')
    ? existingData.slice(0, -1) + `,${note}}`
    : existingData + note;

  await supabase
    .from('expenses')
    .update({
      ocr_raw_response: updatedData,
      updated_at: now,
    })
    .eq('id', expenseId);
}

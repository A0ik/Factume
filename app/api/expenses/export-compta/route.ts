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

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { software, expense_ids, config } = body as {
      software: 'pennylane' | 'sage' | 'cegid' | 'csv_fec';
      expense_ids: string[];
      config?: {
        api_key?: string;
        account_code?: string;
      };
    };

    // ── Validation ──────────────────────────────────────────────────────
    if (!software || !['pennylane', 'sage', 'cegid', 'csv_fec'].includes(software)) {
      return NextResponse.json({ error: 'Logiciel non supporte. Utilisez: pennylane, sage, cegid, csv_fec' }, { status: 400 });
    }

    if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
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
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .in('id', expense_ids)
      .in('status', ['validated', 'approved']);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: 'Aucune depense validee trouvee parmi la selection' }, { status: 404 });
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
        break;
      }

      // ──────────────────── CEGID ───────────────────────────────────────
      case 'cegid': {
        return NextResponse.json({
          error: 'L\'integration Cegid est en cours de developpement. Utilisez l\'export CSV/FEC en attendant.',
        }, { status: 501 });
      }

      // ──────────────────── CSV / FEC ───────────────────────────────────
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

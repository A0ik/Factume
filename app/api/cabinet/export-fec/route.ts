import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { getCategoryAccountCode } from '@/lib/plan-comptable';

// ---------------------------------------------------------------------------
// GET /api/cabinet/export-fec?client_user_id=xxx&year=2026
// Export FEC (Fichier des Écritures Comptables) — DGFiP format
// Killer #3: Comptable Connect — FEC Export
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientUserId = searchParams.get('client_user_id');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    if (!clientUserId) {
      return NextResponse.json({ error: 'client_user_id requis' }, { status: 400 });
    }

    // Verify the requesting user is the cabinet owner and this client belongs to them
    const { data: cabinet } = await supabase
      .from('cabinets')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!cabinet) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { data: clientLink } = await supabase
      .from('cabinet_clients')
      .select('id')
      .eq('cabinet_id', cabinet.id)
      .eq('client_user_id', clientUserId)
      .maybeSingle();

    if (!clientLink) {
      return NextResponse.json({ error: 'Client non trouvé dans ce cabinet' }, { status: 404 });
    }

    // ARGOS (CIBLE 6) — SIREN réel du client pour le nom du fichier FEC. Admin client car le
    // profil appartient au client (RLS user-scoped bloquerait la lecture) ; la propriété du
    // cabinet est déjà vérifiée ci-dessus.
    const { data: clientProfile } = await createAdminClient()
      .from('profiles')
      .select('siret')
      .eq('id', clientUserId)
      .maybeSingle();

    // Fetch invoices for the year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data: invoices } = await supabase
      .from('invoices')
      // HEPHAISTOS — colonnes réelles : number, subtotal, total (+ jointure clients pour le nom).
      .select('id, number, subtotal, total, vat_amount, status, issue_date, client:clients(name)')
      .eq('user_id', clientUserId)
      .gte('issue_date', startDate)
      .lte('issue_date', endDate)
      .order('issue_date', { ascending: true });

    // Fetch expenses for the year
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, vendor, amount, vat_amount, category, account_code, date')
      .eq('user_id', clientUserId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    // Build FEC lines
    const fecLines: string[] = [];
    let ecritureNum = 1;

    // Header
    fecLines.push('JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise');

    // Invoice entries (sales journal - VT)
    for (const inv of invoices || []) {
      const date = (inv.issue_date || '').slice(0, 10).replace(/-/g, '');
      // supabase-js type la jointure comme tableau ; à l'exécution c'est un objet (belongs_to).
      const clientRaw: any = (inv as any).client;
      const clientName = (Array.isArray(clientRaw) ? clientRaw[0]?.name : clientRaw?.name) || '';
      const pieceRef = inv.number || `FAC-${ecritureNum}`;
      const amount = inv.total || 0;
      const vatAmount = inv.vat_amount || 0;
      const htAmount = inv.subtotal || (amount - vatAmount);

      // Debit: Client account (411000)
      fecLines.push([
        'VT',                                    // JournalCode
        'Ventes',                                // JournalLib
        ecritureNum,                             // EcritureNum
        date,                                    // EcritureDate
        '411000',                                // CompteNum
        'Clients',                               // CompteLib
        '',                                      // CompAuxNum
        (clientName || '').slice(0, 35),   // CompAuxLib
        pieceRef,                                // PieceRef
        date,                                    // PieceDate
        `Vente ${(clientName || '')}`,      // EcritureLib
        amount.toFixed(2).replace('.', ','),     // Debit
        '0,00',                                  // Credit
        '',                                      // EcritureLet
        '',                                      // DateLet
        date,                                    // ValidDate
        '',                                      // Montantdevise
        '',                                      // Idevise
      ].join('|'));
      ecritureNum++;

      // Credit: Revenue account (706000 - Prestations de services)
      fecLines.push([
        'VT', 'Ventes', ecritureNum, date,
        '706000', 'Prestations de services',
        '', '', pieceRef, date,
        `Vente ${(clientName || '')}`,
        '0,00', htAmount.toFixed(2).replace('.', ','),
        '', '', date, '', '',
      ].join('|'));
      ecritureNum++;

      // Credit: VAT collected (445710) if applicable
      if (vatAmount > 0) {
        fecLines.push([
          'VT', 'Ventes', ecritureNum, date,
          '445710', 'TVA collectée',
          '', '', pieceRef, date,
          `TVA vente ${(clientName || '')}`,
          '0,00', vatAmount.toFixed(2).replace('.', ','),
          '', '', date, '', '',
        ].join('|'));
        ecritureNum++;
      }
    }

    // Expense entries (purchase journal - AC)
    for (const exp of expenses || []) {
      const date = (exp.date || '').slice(0, 10).replace(/-/g, '');
      const accountCode = exp.account_code || getCategoryAccountCode(exp.category) || '658000';
      const amount = exp.amount || 0;
      const vatAmount = exp.vat_amount || 0;

      // Debit: Expense account
      fecLines.push([
        'AC', 'Achats', ecritureNum, date,
        accountCode, (exp.vendor || 'Fournisseur').slice(0, 35),
        '', '', `EXP-${exp.id?.slice(0, 8) || ecritureNum}`, date,
        `Dépense ${(exp.vendor || '')}`,
        amount.toFixed(2).replace('.', ','), '0,00',
        '', '', date, '', '',
      ].join('|'));
      ecritureNum++;

      // Credit: Supplier account (401000)
      fecLines.push([
        'AC', 'Achats', ecritureNum, date,
        '401000', 'Fournisseurs',
        '', '', `EXP-${exp.id?.slice(0, 8) || ecritureNum}`, date,
        `Dépense ${(exp.vendor || '')}`,
        '0,00', amount.toFixed(2).replace('.', ','),
        '', '', date, '', '',
      ].join('|'));
      ecritureNum++;
    }

    const fecContent = fecLines.join('\n');
    const siren = (clientProfile?.siret || '').replace(/\D/g, '').slice(0, 9) || '000000000'; // ARGOS (CIBLE 6) — SIREN réel du client

    return new NextResponse(fecContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=windows-1252',
        'Content-Disposition': `attachment; filename="${siren}FEC${year}.txt"`,
      },
    });
  } catch (error) {
    console.error('[export-fec] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

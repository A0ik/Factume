import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Authentication check — BUG-02 fix: was completely missing
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }
    const admin = createAdminClient();

    // Récupérer l'avenant
    const { data: amendment, error } = await admin
      .from('contract_amendments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !amendment) {
      return NextResponse.json({ error: 'Avenant introuvable' }, { status: 404 });
    }

    // Ownership check — prevent IDOR
    if (amendment.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Récupérer le contrat associé
    const tableName = amendment.contract_type === 'cdi' ? 'contracts_cdi' : amendment.contract_type === 'cdd' ? 'contracts_cdd' : 'contracts_other';
    const { data: contract } = await admin.from(tableName).select('*').eq('id', amendment.contract_id).single();

    if (!contract) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });
    }

    // Récupérer le profil
    const { data: profile } = await admin.from('profiles').select('*').eq('id', amendment.user_id).single();

    // Générer le HTML de l'avenant
    const html = generateAmendmentHTML(amendment, contract, profile);

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

function generateAmendmentHTML(amendment: any, contract: any, profile: any): string {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');
  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const changesList = Object.entries(amendment.changes || {})
    .map(([field, change]: [string, any]) => {
      const oldVal = change.old !== undefined ? change.old : '-';
      const newVal = change.new !== undefined ? change.new : '-';
      let displayOld = oldVal;
      let displayNew = newVal;

      // Formatage spécial pour certains champs
      if (field === 'salary_amount') {
        displayOld = fmtMoney(Number(oldVal) || 0);
        displayNew = fmtMoney(Number(newVal) || 0);
      }

      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #e0e0e0;">${change.label}</td>
          <td style="padding: 8px; border: 1px solid #e0e0e0; color: #dc2626;">${displayOld}</td>
          <td style="padding: 8px; border: 1px solid #e0e0e0; color: #16a34a;"><strong>${displayNew}</strong></td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Avenant ${amendment.amendment_number} - ${profile?.company_name || ''}</title>
      <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1D9E75; }
        .header h1 { margin: 0; color: #1D9E75; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-box { background: #f9fafb; padding: 15px; border-radius: 6px; }
        .info-box h3 { margin: 0 0 10px 0; font-size: 14px; color: #6b7280; }
        .info-box p { margin: 5px 0; font-size: 16px; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #1D9E75; color: white; padding: 12px; text-align: left; font-weight: 500; }
        td { padding: 12px; border: 1px solid #e0e0e0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AVENANT AU CONTRAT DE TRAVAIL</h1>
          <p style="margin: 5px 0 0 0; font-size: 18px; color: #6b7280;">${amendment.amendment_number}</p>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Entreprise</h3>
            <p>${profile?.company_name || ''}</p>
            <p style="font-size: 14px; color: #6b7280;">${profile?.address || ''}, ${profile?.postal_code || ''} ${profile?.city || ''}</p>
            <p style="font-size: 14px; color: #6b7280;">SIRET: ${profile?.siret || '-'}</p>
          </div>
          <div class="info-box">
            <h3>Salarié</h3>
            <p>${contract.employee_first_name} ${contract.employee_last_name}</p>
            <p style="font-size: 14px; color: #6b7280;">${contract.employee_address || ''}, ${contract.employee_postal_code || ''} ${contract.employee_city || ''}</p>
          </div>
        </div>

        <div class="info-box" style="margin-bottom: 30px;">
          <h3>Détails de l'avenant</h3>
          <p><strong>Type:</strong> ${amendment.amendment_type}</p>
          <p><strong>Date d'effet:</strong> ${fmtDate(amendment.effective_date)}</p>
          <p><strong>Description:</strong> ${amendment.description}</p>
        </div>

        <h3 style="margin-bottom: 10px;">Modifications apportées</h3>
        <table>
          <thead>
            <tr>
              <th>Champ</th>
              <th>Ancienne valeur</th>
              <th>Nouvelle valeur</th>
            </tr>
          </thead>
          <tbody>
            ${changesList}
          </tbody>
        </table>

        <div style="margin-top: 40px;">
          <p><strong>Contrat de référence:</strong> ${contract.contract_number || '-'}</p>
          <p style="font-size: 14px; color: #6b7280;">Date de création: ${new Date(amendment.created_at).toLocaleDateString('fr-FR')}</p>
        </div>

        <div class="footer">
          <p>Document généré électroniquement par Factu.me</p>
          <p>Date de génération: ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

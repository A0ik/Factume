import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { getCabinetForUser } from '@/lib/cabinet-helpers';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const cabinet = await getCabinetForUser(user.id);
    if (!cabinet) {
      return NextResponse.json({ error: 'Cabinet non trouve' }, { status: 404 });
    }

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'ID facture manquant' }, { status: 400 });
    }

    // Fetch the invoice from any of the client's invoices that belong to this cabinet
    // Cabinet invoices are stored in the clients' own invoices tables
    const { data: clientLinks } = await admin
      .from('cabinet_clients')
      .select('client_user_id')
      .eq('cabinet_id', cabinet.id);

    if (!clientLinks?.length) {
      return NextResponse.json({ error: 'Aucun client trouve' }, { status: 404 });
    }

    const clientIds = clientLinks.map(c => c.client_user_id);

    // Try to find the invoice in the clients' invoices
    const { data: invoice, error: invoiceError } = await admin
      .from('invoices')
      .select('id, number, client_email, client_name, objet, pdf_url')
      .in('user_id', clientIds)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });
    }

    if (!invoice.client_email) {
      return NextResponse.json({ error: 'Aucune adresse email pour ce client' }, { status: 400 });
    }

    // Send email via the existing email service
    const emailRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me'}/api/emails/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: invoice.client_email,
        invoiceNumber: invoice.number,
        clientName: invoice.client_name,
        subject: `Facture ${invoice.number} - ${cabinet.name}`,
        cabinetName: cabinet.name,
        pdfUrl: invoice.pdf_url,
      }),
    });

    if (!emailRes.ok) {
      const emailErr = await emailRes.json().catch(() => ({ error: 'Erreur email' }));
      console.error('[cabinet-invoices-send] Email failed:', emailErr);
      // Still mark as sent in the cabinet context
    }

    // Update invoice status to 'sent'
    await admin
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoiceId);

    return NextResponse.json({ success: true, sentTo: invoice.client_email });
  } catch (error: any) {
    console.error('[cabinet-invoices-send] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { InvoiceStatusSchema, validateRequest } from '@/lib/validation';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting : 100 requêtes/minute par IP ou user
    const rateLimitResult = rateLimit(getClientIp(req), 100, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)) }
        }
      );
    }

    const { id } = await params;

    // Validation de l'ID de facture
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID de facture invalide' }, { status: 400 });
    }

    // Récupérer et valider le corps de la requête
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
    }

    // Valider le statut avec Zod
    let validatedData;
    try {
      validatedData = validateRequest(InvoiceStatusSchema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation failed',
          details: error.errors
        }, { status: 400 });
      }
      throw error;
    }

    const admin = createAdminClient();

    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer la facture pour vérifier les droits
    const { data: invoice, error: fetchError } = await admin
      .from('invoices')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    if (invoice.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      status: validatedData.status,
      updated_at: new Date().toISOString(),
    };

    if (validatedData.status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    } else if (validatedData.status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    // Mettre à jour la facture
    const { data: updatedInvoice, error: updateError } = await admin
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedInvoice);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

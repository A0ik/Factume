import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { InvoiceStatusSchema, validateRequest } from '@/lib/validation';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// FIX BUG-TRANS-01/02/03: Transitions complètes conformes Code de commerce
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled', 'pending', 'paid'],
  pending: ['sent', 'cancelled', 'expired'],
  sent: ['paid', 'cancelled', 'overdue', 'refused'],
  overdue: ['paid', 'cancelled'],
  paid: ['refunded', 'partial'],
  partial: ['paid', 'refunded'],
  cancelled: [],
  accepted: [],
  refused: ['cancelled'],
  refunded: [],
  expired: ['draft'],
  delivered: ['paid', 'cancelled'],
  rejected: [],
};

// FIX GAP-2/5: Piste d'audit fiable — log chaque transition
async function logAuditTrail(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    invoiceId: string;
    userId: string;
    action: string;
    fromStatus: string;
    toStatus: string;
    ipAddress: string;
    userAgent: string;
    metadata?: Record<string, unknown>;
  }
) {
  await admin.from('invoice_audit_trail').insert({
    invoice_id: params.invoiceId,
    user_id: params.userId,
    action: `status_change:${params.fromStatus}->${params.toStatus}`,
    from_status: params.fromStatus,
    to_status: params.toStatus,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    metadata: params.metadata || {},
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error('[AUDIT TRAIL] Erreur log:', error.message);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting : 100 requêtes/minute par IP ou user
    const rateLimitResult = rateLimit({ key: getClientIp(req), limit: 100, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) }
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

    // FIX BUG-TRANS-04: Utiliser le RPC pour atomicité (SELECT FOR UPDATE + UPDATE atomique)
    const { data: transitionResult, error: rpcError } = await admin.rpc('transition_invoice_status', {
      p_invoice_id: id,
      p_user_id: user.id,
      p_new_status: validatedData.status,
      p_ip_address: getClientIp(req),
      p_user_agent: req.headers.get('user-agent') || '',
    });

    if (rpcError) {
      // L'erreur RPC contient le message de validation de transition
      if (rpcError.message.includes('Transition')) {
        return NextResponse.json({ error: rpcError.message }, { status: 400 });
      }
      if (rpcError.message.includes('introuvable')) {
        return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
      }
      if (rpcError.message.includes('autorisé')) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // FIX GAP-2/5: Log d'audit pour la Piste d'Audit Fiable
    await logAuditTrail(admin, {
      invoiceId: id,
      userId: user.id,
      action: 'status_change',
      fromStatus: transitionResult?.from_status || '',
      toStatus: validatedData.status,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent') || '',
    });

    // LOI 2 (Métrique-à-Valeur) : une facture annulée rend son slot au free tier.
    // Les brouillons dictés puis annulés ne doivent JAMAIS bloquer l'utilisateur.
    if (validatedData.status === 'cancelled') {
      const currentMonthIso = new Date().toISOString().slice(0, 7);
      const { data: prof } = await admin.from('profiles')
        .select('subscription_tier, is_trial_active, monthly_invoice_count, invoice_month')
        .eq('id', user.id).single();
      const isFreeUser = prof && (prof.subscription_tier === 'free' || !prof.subscription_tier) && !prof.is_trial_active;
      if (prof && isFreeUser && prof.invoice_month === currentMonthIso && (prof.monthly_invoice_count || 0) > 0) {
        await admin.from('profiles')
          .update({ monthly_invoice_count: (prof.monthly_invoice_count || 0) - 1 })
          .eq('id', user.id);
      }
    }

    // Récupérer la facture mise à jour
    const { data: updatedInvoice, error: fetchError } = await admin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json(updatedInvoice);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { renderToBuffer } from '@react-pdf/renderer';
import { Resend } from 'resend';
import React from 'react';
import { PdfDocument } from '@/components/pdf-document';

export const maxDuration = 60;

// Helper pour logger les événements de signature de devis
async function logQuoteSignatureEvent(
  admin: any,
  quoteId: string,
  eventType: string,
  tokenId: string | null = null,
  metadata: Record<string, any> = {},
  req?: NextRequest
) {
  try {
    await admin.from('quote_signature_logs').insert({
      quote_id: quoteId,
      token_id: tokenId,
      event_type: eventType,
      ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req?.headers.get('x-real-ip') || null,
      user_agent: req?.headers.get('user-agent') || null,
      metadata,
    });
  } catch (err) {
    // Ne pas échouer si le log échoue
    console.error('Erreur log signature devis:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { quoteId, clientEmail, clientName } = await req.json();

    // Validation des champs requis
    if (!quoteId) {
      return NextResponse.json({ error: 'L\'ID du devis est requis' }, { status: 400 });
    }
    if (!clientEmail || !clientEmail.trim()) {
      return NextResponse.json({ error: 'L\'email du client est requis' }, { status: 400 });
    }
    if (!clientName || !clientName.trim()) {
      return NextResponse.json({ error: 'Le nom du client est requis' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Vérifier l'authentification via le header Authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier l'abonnement - Les signatures de devis sont réservées à Pro et Business
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, is_trial_active')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const isPro = profile.subscription_tier === 'pro' || profile.subscription_tier === 'business';
    const isTrial = profile.is_trial_active === true;

    if (!isPro && !isTrial) {
      return NextResponse.json({
        error: 'La signature électronique de devis est disponible uniquement avec les plans Pro et Business. Passez à un plan supérieur pour débloquer cette fonctionnalité.',
        feature: 'quote_signing',
        requiredPlan: 'pro',
        upgradeUrl: '/paywall?plan=pro'
      }, { status: 402 });
    }

    // Récupérer le devis avec les infos client
    const { data: quote, error: quoteError } = await admin
      .from('invoices')
      .select(`
        *,
        client:client_id(
          name,
          email,
          phone,
          address,
          city,
          postal_code
        )
      `)
      .eq('id', quoteId)
      .eq('document_type', 'quote')
      .single();

    if (quoteError) {
      console.error('Erreur récupération devis:', quoteError);
      return NextResponse.json({ error: 'Erreur lors de la récupération du devis' }, { status: 500 });
    }
    if (!quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }
    if (quote.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours (token non expiré)
    const { data: existingToken } = await admin
      .from('quote_signing_tokens')
      .select('id, token, expires_at')
      .eq('quote_id', quoteId)
      .is('signed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingToken) {
      // Une demande est déjà en cours, on renvoie le même token
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
      const signingUrl = `${appUrl}/sign-quote/${existingToken.token}`;
      const expiresAt = new Date(existingToken.expires_at);

      return NextResponse.json({
        success: true,
        token: existingToken.token,
        alreadyExists: true,
        signingUrl,
        expiresAt: expiresAt.toISOString(),
        message: 'Une demande de signature est déjà en cours pour ce devis.'
      });
    }

    // Invalider les anciens tokens expirés pour ce devis
    await admin
      .from('quote_signing_tokens')
      .delete()
      .eq('quote_id', quoteId)
      .lt('expires_at', new Date().toISOString());

    // Créer un nouveau token
    const newToken = crypto.randomUUID();

    const { data: tokenData, error: tokenError } = await admin
      .from('quote_signing_tokens')
      .insert({
        quote_id: quoteId,
        user_id: user.id,
        token: newToken,
        client_email: clientEmail.trim(),
        client_name: clientName.trim(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
      })
      .select('token, id, expires_at')
      .single();

    if (tokenError) {
      console.error('Erreur création token:', tokenError);
      await logQuoteSignatureEvent(admin, quoteId, 'token_creation_failed', null, { error: tokenError.message }, req);
      return NextResponse.json({ error: 'Erreur lors de la création du token de signature' }, { status: 500 });
    }
    if (!tokenData) {
      await logQuoteSignatureEvent(admin, quoteId, 'token_creation_failed', null, { error: 'Token data is null' }, req);
      return NextResponse.json({ error: 'Erreur lors de la création du token de signature' }, { status: 500 });
    }

    // Log la création du token
    await logQuoteSignatureEvent(admin, quoteId, 'token_created', tokenData.id, { token: tokenData.token }, req);

    // Générer le PDF du devis directement (sans appel HTTP interne)
    let attachment: Array<{ filename: string; content: Buffer }> = [];
    try {
      const { data: userProfile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const element = React.createElement(PdfDocument, { invoice: quote, profile: userProfile });
      const pdfBytes = await renderToBuffer(element as any);
      attachment = [{
        filename: `Devis_${quote.number}_${clientName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        content: Buffer.from(pdfBytes),
      }];
    } catch (err) {
      console.error('Erreur génération PDF devis:', err);
    }

    // Construire le lien de signature
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
    const signingUrl = `${appUrl}/sign-quote/${tokenData.token}`;

    // Envoyer l'email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré' }, { status: 500 });
    }

    const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
    const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#3B82F6;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h2 style="color:#fff;margin:0;font-size:20px;">Demande de signature</h2>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Devis n° ${quote.number}</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
          <p style="font-size:16px;margin:0 0 24px;">Vous avez reçu un <strong>devis</strong> à signer électroniquement.</p>

          <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:24px 0;text-align:left;">
            <p style="font-size:14px;color:#666;margin:0 0 8px;"><strong>Montant total:</strong> ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(quote.total || 0)}</p>
            <p style="font-size:14px;color:#666;margin:0 0 8px;"><strong>Date d'émission:</strong> ${new Date(quote.issue_date).toLocaleDateString('fr-FR')}</p>
            <p style="font-size:14px;color:#666;margin:0;"><strong>Validité:</strong> 30 jours à compter de la date d'émission</p>
          </div>

          <a href="${signingUrl}" style="display:inline-block;background:#3B82F6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Signer le devis
          </a>
          <p style="font-size:13px;color:#888;margin:24px 0 0;">Ce lien est valide pendant 7 jours.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="font-size:12px;color:#aaa;margin:0;">Ce document a été envoyé via Factu.me</p>
        </div>
      </div>
    `;

    let emailSent = false;
    let emailError = null;

    try {
      const resend = new Resend(RESEND_API_KEY);
      const { data, error: resendError } = await resend.emails.send({
        from: `${senderName} <${senderEmail}>`,
        to: [clientEmail.trim()],
        subject: `Demande de signature — Devis n° ${quote.number}`,
        html: htmlContent,
        attachments: attachment.length > 0 ? attachment : undefined,
      });

      if (resendError) {
        console.error('Erreur Resend:', resendError);
        emailError = resendError.message || 'Erreur lors de l\'envoi de l\'email';
        await logQuoteSignatureEvent(admin, quoteId, 'email_failed', tokenData.id, { error: emailError }, req);
      } else {
        emailSent = true;
        await logQuoteSignatureEvent(admin, quoteId, 'email_sent', tokenData.id, { recipient: clientEmail.trim(), messageId: data?.id }, req);
      }
    } catch (emailErr) {
      console.error('Exception envoi email:', emailErr);
      emailError = emailErr instanceof Error ? emailErr.message : 'Erreur inconnue lors de l\'envoi de l\'email';
      await logQuoteSignatureEvent(admin, quoteId, 'email_failed', tokenData.id, { error: emailError }, req);
    }

    // Mettre à jour le statut du devis uniquement si l'email a été envoyé
    if (emailSent) {
      const { error: updateError } = await admin
        .from('invoices')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', quoteId);

      if (updateError) {
        console.error('Erreur mise à jour statut:', updateError);
        // On ne échoue pas la requête si la mise à jour du statut échoue
      }

      return NextResponse.json({
        success: true,
        token: tokenData.token,
        alreadyExists: false,
        signingUrl,
        expiresAt: tokenData.expires_at,
      });
    } else {
      // Email non envoyé mais token créé - on informe l'utilisateur
      return NextResponse.json({
        success: false,
        token: tokenData.token,
        error: emailError,
        retryable: true,
        message: `Le token a été créé mais l'email n'a pas pu être envoyé. Erreur: ${emailError}`
      }, { status: 202 }); // Accepted but with warning
    }
  } catch (error: unknown) {
    console.error('Erreur serveur lors de la création de la demande de signature:', error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur serveur lors de la création de la demande de signature' }, { status: 500 });
  }
}

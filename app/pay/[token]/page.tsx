import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-server';
import { resolvePaymentLink } from '@/lib/payment-link';

// Route publique — le token (56^8) est l'unique secret. Toujours dynamique.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ACCENT = '#1D9E75';

/**
 * ATELIER (CIBLE 2 & 3) — Redirection courte vers le checkout de paiement.
 *
 * Le QR + le lien cliquable de la facture pointent ici (factu.me/pay/<token>).
 * On résout le vrai checkout via la source de vérité unique (resolvePaymentLink)
 * puis on redirige (302). Couvre les cas : lien invalide, expiré (stale), ou
 * facture déjà réglée.
 */
export default async function PayRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, number, status, payment_link_stale, payment_provider, payment_link, stripe_payment_url, stripe_payment_link_url, sumup_checkout_id')
    .eq('payment_short_token', token)
    .maybeSingle();

  if (!invoice) {
    return <InfoView accent={ACCENT} title="Lien invalide" message="Ce lien de paiement n'existe pas ou a été supprimé." />;
  }

  // Lien invalidé (montant changé, switch prestataire…) → on ne redirige jamais
  // vers une URL obsolète.
  const resolved = resolvePaymentLink(invoice);
  if (invoice.payment_link_stale || !resolved.url) {
    return (
      <InfoView
        accent={ACCENT}
        title="Lien expiré"
        message={`Le lien de paiement de la facture ${invoice.number || ''} n'est plus valable. Demandez une facture à jour à votre prestataire.`}
      />
    );
  }

  // Facture déjà réglée → on prévient plutôt que de pousser vers un checkout expiré.
  if (invoice.status === 'paid' || invoice.status === 'refunded') {
    return (
      <InfoView
        accent={ACCENT}
        title="Déjà réglé ✅"
        message={`La facture ${invoice.number || ''} a déjà été réglée. Merci !`}
      />
    );
  }

  redirect(resolved.url);
}

// ── Vue d'information minimaliste et brandée (aucun layout app) ──────────────

function InfoView({ accent, title, message }: { accent: string; title: string; message: string }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f8fa',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            background: '#fff',
            borderRadius: 16,
            padding: '40px 32px',
            boxShadow: '0 1px 3px rgba(16,24,40,0.08), 0 12px 32px rgba(16,24,40,0.06)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: accent,
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: '-0.02em',
            }}
          >
            f
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#111827' }}>{title}</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#6b7280' }}>{message}</p>
          <p style={{ margin: '24px 0 0', fontSize: 12, color: '#9ca3af' }}>factu.me</p>
        </div>
      </body>
    </html>
  );
}

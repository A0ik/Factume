import { createAdminClient } from '@/lib/supabase-admin';
import { getSupabaseClient } from '@/lib/supabase';
import { Resend } from 'resend';

export type ContractNotificationType =
  | 'contract_signed'
  | 'contract_expiring'
  | 'contract_expired'
  | 'contract_amendment'
  | 'contract_renewal'
  | 'contract_activated'
  | 'contract_ended'
  | 'contract_cancelled';

interface ContractNotificationOptions {
  userId: string;
  type: ContractNotificationType;
  contractId: string;
  contractType: string;
  employeeName?: string;
  companyName?: string;
  contractNumber?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Envoie une notification de contrat (in-app + push)
 */
export async function sendContractNotification(options: ContractNotificationOptions): Promise<void> {
  const { userId, type, contractId, contractType, employeeName, companyName, contractNumber, metadata } = options;

  // Labels des types
  const labels: Record<ContractNotificationType, { title: string; body: string }> = {
    contract_signed: {
      title: 'Contrat signé !',
      body: `${employeeName || 'Le salarié'} a signé le contrat ${contractNumber || ''}`,
    },
    contract_expiring: {
      title: 'Contrat qui expire',
      body: `Le contrat de ${employeeName || 'CDD'} expire bientôt (${contractNumber || ''})`,
    },
    contract_expired: {
      title: 'Contrat expiré',
      body: `Le contrat de ${employeeName || 'CDD'} est terminé (${contractNumber || ''})`,
    },
    contract_amendment: {
      title: 'Avenant créé',
      body: `Un avenant a été créé pour ${employeeName || 'le contrat'} (${contractNumber || ''})`,
    },
    contract_renewal: {
      title: 'Contrat renouvelé',
      body: `Le contrat de ${employeeName || 'CDD'} a été renouvelé (${contractNumber || ''})`,
    },
    contract_activated: {
      title: 'Contrat activé',
      body: `Le contrat de ${employeeName || ''} est maintenant actif (${contractNumber || ''})`,
    },
    contract_ended: {
      title: 'Contrat terminé',
      body: `Le contrat de ${employeeName || ''} est terminé (${contractNumber || ''})`,
    },
    contract_cancelled: {
      title: 'Contrat annulé',
      body: `Le contrat ${contractNumber || ''} a été annulé`,
    },
  };

  const { title, body } = labels[type];
  const link = `/contracts/${contractId}?type=${contractType}`;

  // 1. Insert notification in database
  const supabase = createAdminClient();
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: body,
      link,
      data: { contractId, contractType, ...metadata },
      read: false,
    });
  } catch (err) {
    console.error('Failed to insert contract notification:', err);
  }

  // 2. Send push notification via internal API
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET || '',
      },
      body: JSON.stringify({
        userId,
        notification: { title, body, data: { link } },
      }),
    });
  } catch (err) {
    console.error('Failed to send push notification:', err);
    // Non-critical, don't throw
  }
}

/**
 * Envoie une alerte d'expiration de contrat par email
 */
export async function sendContractExpirationEmail(
  userId: string,
  contracts: Array<{ id: string; type: string; number?: string; employeeName: string; endDate: string }>
): Promise<void> {
  if (contracts.length === 0) return;

  const supabase = createAdminClient();
  const { data: profile } = await supabase.from('profiles').select('email, first_name, company_name').eq('id', userId).single();
  if (!profile?.email) return;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const senderEmail = process.env.RESEND_FROM_EMAIL || 'contact@factu.me';
  const senderName = process.env.RESEND_FROM_NAME || 'Factu.me';

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY non configurée, email d\'expiration non envoyé');
    return;
  }

  const contractList = contracts
    .map(
      (c) => `• ${c.number || c.type} - ${c.employeeName} (expire le ${new Date(c.endDate).toLocaleDateString('fr-FR')})`
    )
    .join('\n');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #1D9E75; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 18px;">Contrats qui expirent</h2>
        <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">${profile.company_name || ''}</p>
      </div>
      <div style="background: #fff; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          Bonjour${profile.first_name ? ' ' + profile.first_name : ''},
        </p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          Les contrats suivants arrivent à échéance :
        </p>
        <pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 13px; white-space: pre-wrap;">${contractList}</pre>
        <p style="font-size: 14px; line-height: 1.6; margin: 16px 0 0;">
          N'oubliez pas de les renouveler ou de préparer la fin de contrat.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; margin: 0;">Cet email a été généré automatiquement par Factu.me</p>
      </div>
    </div>
  `;

  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [profile.email],
      subject: `[Factu.me] Contrats qui expirent bientôt`,
      html: htmlContent,
    });
  } catch (err) {
    console.error('Failed to send expiration email:', err);
  }
}

/**
 * Recupere les notifications de contrat pour un utilisateur
 */
export async function getContractNotifications(userId: string): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .or('type.eq.contract_signed,type.eq.contract_expiring,type.eq.contract_expired,type.eq.contract_amendment,type.eq.contract_renewal,type.eq.contract_activated,type.eq.contract_ended,type.eq.contract_cancelled')
    .order('created_at', { ascending: false })
    .limit(50);

  return data || [];
}

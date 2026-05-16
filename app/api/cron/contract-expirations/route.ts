import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendContractNotification, sendContractExpirationEmail } from '@/lib/services/contract-notification-service';

// Cron secret pour sécuriser l'endpoint
const CRON_SECRET = process.env.CRON_SECRET;

// Seuils d'alerte en jours
const EXPIRATION_THRESHOLDS = [30, 15, 7];

export async function GET(req: NextRequest) {
  // Vérifier que CRON_SECRET est configuré
  if (!CRON_SECRET) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Vérifier l'authentification cron
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // ============================================
    // PARTIE 1 : Alertes d'expiration
    // ============================================
    const expiringContracts: Array<{ id: string; type: string; number?: string; employeeName: string; endDate: string; userId: string }> = [];

    // Vérifier CDD actifs qui expirent bientôt
    const { data: cddContracts } = await admin
      .from('contracts_cdd')
      .select('id, user_id, contract_number, employee_first_name, employee_last_name, contract_end_date, document_status')
      .eq('document_status', 'active')
      .gte('contract_end_date', today.toISOString().split('T')[0])
      .order('contract_end_date', { ascending: true });

    if (cddContracts) {
      for (const c of cddContracts) {
        const endDate = new Date(c.contract_end_date);
        endDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (EXPIRATION_THRESHOLDS.includes(daysUntilExpiry)) {
          expiringContracts.push({
            id: c.id,
            type: 'cdd',
            number: c.contract_number,
            employeeName: `${c.employee_first_name} ${c.employee_last_name}`,
            endDate: c.contract_end_date,
            userId: c.user_id,
          });
        }
      }
    }

    // Vérifier contrats "other" actifs qui expirent bientôt
    const { data: otherContracts } = await admin
      .from('contracts_other')
      .select('id, user_id, contract_number, employee_first_name, employee_last_name, end_date, document_status')
      .eq('document_status', 'active')
      .not('end_date', 'is', null)
      .gte('end_date', today.toISOString().split('T')[0])
      .order('end_date', { ascending: true });

    if (otherContracts) {
      for (const c of otherContracts) {
        const endDate = new Date(c.end_date!);
        endDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (EXPIRATION_THRESHOLDS.includes(daysUntilExpiry)) {
          expiringContracts.push({
            id: c.id,
            type: 'other',
            number: c.contract_number,
            employeeName: `${c.employee_first_name} ${c.employee_last_name}`,
            endDate: c.end_date!,
            userId: c.user_id,
          });
        }
      }
    }

    // Grouper par utilisateur et envoyer notifications
    const byUser = new Map<string, typeof expiringContracts>();
    expiringContracts.forEach((c) => {
      if (!byUser.has(c.userId)) byUser.set(c.userId, []);
      byUser.get(c.userId)!.push(c);
    });

    for (const [userId, contracts] of byUser) {
      // Vérifier si l'utilisateur a activé les transitions automatiques
      const { data: profile } = await admin.from('profiles').select('auto_contract_transitions').eq('id', userId).single();
      if (profile?.auto_contract_transitions === false) continue;

      // Envoyer notification in-app pour chaque contrat
      for (const contract of contracts) {
        await sendContractNotification({
          userId,
          type: 'contract_expiring',
          contractId: contract.id,
          contractType: contract.type,
          employeeName: contract.employeeName,
          contractNumber: contract.number,
          metadata: { endDate: contract.endDate },
        });
      }

      // Envoyer email récapitulatif
      await sendContractExpirationEmail(userId, contracts);
    }

    // ============================================
    // PARTIE 2 : Transitions automatiques lifecycle
    // ============================================

    // 2a. signed → active (quand la date de début est atteinte)
    const signedToActive: Array<{ id: string; type: string; userId: string }> = [];

    const { data: cdiSigned } = await admin
      .from('contracts_cdi')
      .select('id, user_id, contract_start_date')
      .eq('document_status', 'signed');

    if (cdiSigned) {
      for (const c of cdiSigned) {
        const startDate = new Date(c.contract_start_date);
        if (startDate <= today) {
          signedToActive.push({ id: c.id, type: 'cdi', userId: c.user_id });
        }
      }
    }

    const { data: cddSigned } = await admin
      .from('contracts_cdd')
      .select('id, user_id, contract_start_date')
      .eq('document_status', 'signed');

    if (cddSigned) {
      for (const c of cddSigned) {
        const startDate = new Date(c.contract_start_date);
        if (startDate <= today) {
          signedToActive.push({ id: c.id, type: 'cdd', userId: c.user_id });
        }
      }
    }

    const { data: otherSigned } = await admin
      .from('contracts_other')
      .select('id, user_id, start_date')
      .eq('document_status', 'signed');

    if (otherSigned) {
      for (const c of otherSigned) {
        const startDate = new Date(c.start_date!);
        if (startDate <= today) {
          signedToActive.push({ id: c.id, type: 'other', userId: c.user_id });
        }
      }
    }

    // Appliquer signed → active
    for (const { id, type, userId } of signedToActive) {
      const tableName = type === 'cdi' ? 'contracts_cdi' : type === 'cdd' ? 'contracts_cdd' : 'contracts_other';
      const { data: contract } = await admin.from(tableName).select('contract_number, employee_first_name, employee_last_name').eq('id', id).single();

      await admin.from(tableName).update({ document_status: 'active' }).eq('id', id);

      await sendContractNotification({
        userId,
        type: 'contract_activated',
        contractId: id,
        contractType: type,
        employeeName: contract ? `${contract.employee_first_name} ${contract.employee_last_name}` : undefined,
        contractNumber: contract?.contract_number,
      });
    }

    // 2b. active → ended (quand la date de fin est passée)
    const activeToEnded: Array<{ id: string; type: string; userId: string }> = [];

    const { data: cddActive } = await admin
      .from('contracts_cdd')
      .select('id, user_id, contract_end_date')
      .eq('document_status', 'active');

    if (cddActive) {
      for (const c of cddActive) {
        const endDate = new Date(c.contract_end_date);
        if (endDate < today) {
          activeToEnded.push({ id: c.id, type: 'cdd', userId: c.user_id });
        }
      }
    }

    const { data: otherActive } = await admin
      .from('contracts_other')
      .select('id, user_id, end_date')
      .eq('document_status', 'active')
      .not('end_date', 'is', null);

    if (otherActive) {
      for (const c of otherActive) {
        const endDate = new Date(c.end_date!);
        if (endDate < today) {
          activeToEnded.push({ id: c.id, type: 'other', userId: c.user_id });
        }
      }
    }

    // Appliquer active → ended
    for (const { id, type, userId } of activeToEnded) {
      const tableName = type === 'cdd' ? 'contracts_cdd' : 'contracts_other';
      const { data: contract } = await admin.from(tableName).select('contract_number, employee_first_name, employee_last_name').eq('id', id).single();

      await admin.from(tableName).update({ document_status: 'ended' }).eq('id', id);

      await sendContractNotification({
        userId,
        type: 'contract_ended',
        contractId: id,
        contractType: type,
        employeeName: contract ? `${contract.employee_first_name} ${contract.employee_last_name}` : undefined,
        contractNumber: contract?.contract_number,
      });
    }

    return NextResponse.json({
      success: true,
      notified: expiringContracts.length,
      activated: signedToActive.length,
      ended: activeToEnded.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Contract expiration cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

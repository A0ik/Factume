import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// POST /api/copilot/command
// Parse voice commands and execute actions
// Killer #4: Copilot Factu — Proactive Voice Commands
// ---------------------------------------------------------------------------

interface CommandIntent {
  intent: 'show_outstanding' | 'show_urssaf' | 'send_reminder' | 'show_revenue' | 'create_invoice' | 'show_expenses' | 'unknown';
  client_name: string | null;
  period: string | null;
  raw_amount: number | null;
  confidence: number;
}

const COMMAND_SYSTEM_PROMPT = `Tu es un assistant vocal pour Factu.me, une application de facturation française.
Analyse la commande vocale de l'utilisateur et retourne un JSON avec l'intention détectée.

Intents possibles :
- "show_outstanding" : l'utilisateur veut voir les factures impayées (Combien me doit X? / Factures en retard / Impayés)
- "show_urssaf" : l'utilisateur veut voir ses cotisations URSSAF (Mes URSSAF / Cotisations / Réserve URSSAF)
- "send_reminder" : l'utilisateur veut envoyer une relance (Relance X / Relancer Dupont / Envoie un rappel)
- "show_revenue" : l'utilisateur veut voir son chiffre d'affaires (Mon CA / Combien j'ai gagné / Revenus)
- "create_invoice" : l'utilisateur veut créer une facture (Crée une facture / Nouvelle facture)
- "show_expenses" : l'utilisateur veut voir ses dépenses (Mes dépenses / Combien j'ai dépensé)

Retourne UNIQUEMENT du JSON :
{
  "intent": "string",
  "client_name": "string ou null",
  "period": "string ou null — 'month', 'quarter', 'year', ou null",
  "raw_amount": number ou null,
  "confidence": number entre 0 et 1
}`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });

    // Parse intent with Groq
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: COMMAND_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    let intent: CommandIntent;
    try {
      intent = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      return NextResponse.json({ error: 'Erreur de parsing' }, { status: 500 });
    }

    // Execute the intent
    const result = await executeIntent(intent, user.id, supabase);

    return NextResponse.json({
      intent: intent.intent,
      confidence: intent.confidence,
      result,
      originalText: text,
    });
  } catch (error) {
    console.error('[copilot/command] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

async function executeIntent(intent: CommandIntent, userId: string, supabase: any) {
  switch (intent.intent) {
    case 'show_outstanding': {
      let query = supabase
        .from('invoices')
        .select('invoice_number, total_ttc, client_name, due_date, status')
        .eq('user_id', userId)
        .in('status', ['sent', 'overdue']);

      if (intent.client_name) {
        query = query.ilike('client_name', `%${intent.client_name}%`);
      }

      const { data } = await query.order('due_date', { ascending: true }).limit(10);
      const total = (data || []).reduce((s: number, inv: any) => s + (inv.total_ttc || 0), 0);

      return {
        type: 'outstanding_invoices',
        invoices: data || [],
        total,
        count: data?.length || 0,
      };
    }

    case 'show_revenue': {
      const now = new Date();
      let startDate: string;

      if (intent.period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
      } else if (intent.period === 'quarter') {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1).toISOString();
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }

      const { data } = await supabase
        .from('invoices')
        .select('total_ttc')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .gte('paid_at', startDate);

      const total = (data || []).reduce((s: number, inv: any) => s + (inv.total_ttc || 0), 0);

      return {
        type: 'revenue',
        total,
        invoiceCount: data?.length || 0,
        period: intent.period || 'month',
      };
    }

    case 'show_urssaf': {
      const { calculateURSSAF, getCurrentQuarter, mapFiscalRegime, REGIME_SHORT_LABELS } = await import('@/lib/urssaf-calculator');
      const { data: profile } = await supabase
        .from('profiles')
        .select('regime_fiscal, legal_status')
        .eq('id', userId)
        .single();

      const regime = mapFiscalRegime(profile?.regime_fiscal, profile?.legal_status);
      if (!regime) {
        return { type: 'urssaf', message: 'Régime fiscal non configuré. Configurez-le dans les paramètres.' };
      }

      const { quarter, year } = getCurrentQuarter();
      const quarterStartMonth = (quarter - 1) * 3;
      const startIso = new Date(year, quarterStartMonth, 1).toISOString();

      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total_ttc')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .gte('paid_at', startIso);

      const revenue = (paidInvoices || []).reduce((s: number, inv: any) => s + (inv.total_ttc || 0), 0);
      const calc = calculateURSSAF(revenue, regime);

      return {
        type: 'urssaf',
        regime: REGIME_SHORT_LABELS[regime],
        quarterRevenue: revenue,
        urssafDue: calc.urssafAmount,
        quarter: `T${quarter} ${year}`,
      };
    }

    case 'show_expenses': {
      const { data } = await supabase
        .from('expenses')
        .select('vendor, amount, category, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10);

      const total = (data || []).reduce((s: number, exp: any) => s + (exp.amount || 0), 0);

      return {
        type: 'expenses',
        expenses: data || [],
        total,
        count: data?.length || 0,
      };
    }

    // LOI 3 : L'IA PROPOSE, L'HUMAIN DISPOSE
    // Le Copilot génère un brouillon de relance mais N'ENVOIE JAMAIS automatiquement.
    // L'utilisateur doit voir l'email et approuver manuellement l'envoi.
    case 'send_reminder': {
      // Find the most overdue unpaid invoice for the client
      let query = supabase
        .from('invoices')
        .select('id, number, total_ttc, total, due_date, issue_date, status, client:clients(id, name, email)')
        .eq('user_id', userId)
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(5);

      if (intent.client_name) {
        query = query.ilike('client_name', `%${intent.client_name}%`);
      }

      const { data: overdueInvoices } = await query;

      if (!overdueInvoices || overdueInvoices.length === 0) {
        return {
          type: 'reminder_draft',
          status: 'no_overdue',
          message: intent.client_name
            ? `Aucune facture impayée trouvée pour "${intent.client_name}".`
            : 'Aucune facture impayée en ce moment.',
        };
      }

      // Get profile for company name
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', userId)
        .single();

      // Generate draft emails for ALL matching invoices (user picks which to send)
      const drafts = overdueInvoices.map((inv: any) => {
        const dueDate = new Date(inv.due_date || inv.issue_date);
        const today = new Date();
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        const clientName = inv.client?.name || 'Client';
        const subject = `Rappel : Facture ${inv.number} - ${profile?.company_name || 'Mon entreprise'}`;

        const body = `Bonjour ${clientName},\n\nJe me permets de vous contacter concernant la facture n° ${inv.number} d'un montant de ${(inv.total || inv.total_ttc || 0).toFixed(2)}€, dont l'échéance était le ${dueDate.toLocaleDateString('fr-FR')}.\n\nÀ ce jour, cette facture n'a pas été réglée. Je vous remercie de bien vouloir procéder au paiement dans les meilleurs délais.\n\nN'hésitez pas à me contacter si vous avez des questions.\n\nCordialement,\n${profile?.company_name || 'Mon entreprise'}`;

        return {
          invoiceId: inv.id,
          invoiceNumber: inv.number,
          clientName,
          clientEmail: inv.client?.email,
          amount: inv.total || inv.total_ttc || 0,
          daysOverdue,
          subject,
          body,
          // LOI 3 : needsApproval = true — l'envoi DOIT être validé par l'utilisateur
          needsApproval: true,
          warning: '⚠️ Vérifiez que cette facture n\'a pas déjà été payée avant d\'envoyer la relance.',
        };
      });

      return {
        type: 'reminder_draft',
        status: 'drafts_ready',
        drafts,
        message: `${drafts.length} facture(s) impayée(s) trouvée(s). Vérifiez et approuvez chaque relance avant envoi.`,
      };
    }

    default:
      return { type: 'unknown', message: 'Commande non reconnue. Essayez "Mes impayés", "Mon CA", ou "Relance Dupont".' };
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import { applyIpRateLimit } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// POST /api/copilot/command  —  Copilot Factu (plan Business).
// PROMÉTHÉE (CIBLE 2) — refonte intelligence :
//   1. Mémoire conversationnelle (historique des derniers échanges envoyé au LLM).
//   2. RAG contextuel : liste clients + factures récentes + CA du mois injectés
//      dans le prompt → l'IA résout « relance nathan » → « Nathan » elle-même.
//   3. Matching fuzzy accent/casse-insensible (normalisation NFD).
//   4. Intents étendus : treasury_info, client_info (réponses en langage naturel).
//   5. Prompt expert ; l'IA répond à TOUT, ne redirige QUE pour create_invoice.
// ---------------------------------------------------------------------------

interface HistMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface CommandIntent {
  intent: 'show_outstanding' | 'show_urssaf' | 'send_reminder' | 'show_revenue'
    | 'create_invoice' | 'show_expenses' | 'treasury_info' | 'client_info' | 'unknown';
  client_name: string | null;
  period: string | null;
  raw_amount: number | null;
  answer: string;
  confidence: number;
}

/** Normalisation accent + casse + ponctuation (matching fuzzy robuste). */
const normalize = (s?: string | null): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les diacritiques (NFD)
    .replace(/[^a-z0-9\s]/g, ' ')   // retire la ponctuation
    .replace(/\s+/g, ' ')
    .trim();

/** Vrai match fuzzy : égalité, inclusion dans un sens ou dans l'autre. */
const fuzzyMatch = (candidate: string | null | undefined, query: string): boolean => {
  if (!query) return true;
  const n = normalize(candidate);
  if (!n) return false;
  return n === query || n.includes(query) || query.includes(n);
};

function buildSystemPrompt(rag: string): string {
  return `Tu es Copilot Factu.me, l'assistant IA expert d'un indépendant ou expert-comptable français.
Tu es précis, concret et concis. Tu réponds TOUJOURS en français.

${rag}

Tu PEUX répondre à TOUTES les questions : chiffre d'affaires, impayés, un client précis, échéances, trésorerie, dépenses, cotisations URSSAF… Utilise le CONTEXTE ci-dessus. Résous les noms de façon insensible à la casse ET aux accents (ex. « relance nathan » → le client « Nathan » s'il existe dans la liste). Tu ne inventes JAMAIS un montant, un nom ou une date qui ne figurent pas dans le contexte.

RÈGLES :
1. Si l'utilisateur demande de CRÉER une facture complète, choisis intent="create_invoice" et réponds answer="Je vous redirige vers la création de facture."
2. Pour une RELANCE, choisis intent="send_reminder" (le système génère un brouillon — jamais d'envoi automatique).
3. Sinon, choisis l'intent le plus pertinent et rédige "answer" : une phrase naturelle courte qui répond directement à la question, en langage clair.

Intents possibles : show_outstanding | show_revenue | show_urssaf | show_expenses | send_reminder | create_invoice | treasury_info | client_info | unknown

Retourne UNIQUEMENT ce JSON :
{ "intent": "...", "client_name": null, "period": "month|quarter|year|null", "raw_amount": null, "answer": "phrase courte en français", "confidence": 0.0-1.0 }`;
}

/** Construit le contexte RAG (clients + factures récentes + CA du mois). */
async function buildRagContext(userId: string, supabase: any): Promise<string> {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', userId)
    .order('name')
    .limit(50);

  const { data: recent } = await supabase
    .from('invoices')
    .select('number, total, status, client:clients(name)')
    .eq('user_id', userId)
    .order('issue_date', { ascending: false })
    .limit(8);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: paid } = await supabase
    .from('invoices')
    .select('total')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .gte('paid_at', monthStart);
  const monthRevenue = (paid || []).reduce((s: number, i: any) => s + (i.total || 0), 0);

  const clientList = (clients || []).map((c: any) => c.name).filter(Boolean).slice(0, 30).join(', ') || 'aucun client';
  const invList = (recent || [])
    .map((i: any) => `#${i.number} ${i.client?.name || ''} ${i.status} ${(i.total || 0).toFixed(0)}€`)
    .join(' | ') || 'aucune facture';

  return `CONTEXTE UTILISATEUR (temps réel) :
- Clients connus : ${clientList}
- Factures récentes : ${invList}
- CA payé ce mois-ci : ${monthRevenue.toFixed(2)} €`;
}

export async function POST(req: NextRequest) {
  try {
    // ARGOS (hardening) — anti-abus IA Copilot (Groq) : 30/min par IP.
    const rl = applyIpRateLimit(req, 30, 60_000);
    if (rl) return rl as NextResponse;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    // Guard plan : Copilot Factu réservé au plan Business.
    const sub = await getUserSubscriptionStatus(user.id);
    try {
      requireFeature(sub, 'copilotFactu');
    } catch {
      return NextResponse.json({
        error: 'Plan supérieur requis.',
        code: 'PLAN_REQUIRED',
        upgradeUrl: '/paywall',
      }, { status: 403 });
    }

    const { text, history } = await req.json();
    if (!text) return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante' }, { status: 500 });
    }

    // RAG contextuel + prompt expert.
    const rag = await buildRagContext(user.id, supabase);
    const systemPrompt = buildSystemPrompt(rag);

    // Mémoire conversationnelle : on réinjecte les N derniers échanges valides.
    const safeHistory: HistMsg[] = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
          .slice(-6)
          .map((m: any) => ({ role: m.role, content: m.content.slice(0, 500) }))
      : [];

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...safeHistory,
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

    const result = await executeIntent(intent, user.id, supabase);

    return NextResponse.json({
      intent: intent.intent,
      confidence: intent.confidence,
      answer: intent.answer || '',
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
      const { data } = await supabase
        .from('invoices')
        .select('number, total, due_date, status, client:clients(name)')
        .eq('user_id', userId)
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(50);

      const want = normalize(intent.client_name);
      const filtered = (data || [])
        .filter((inv: any) => fuzzyMatch(inv.client?.name, want))
        .slice(0, 10);

      const total = filtered.reduce((s: number, inv: any) => s + (inv.total || 0), 0);

      return {
        type: 'outstanding_invoices',
        invoices: filtered.map((inv: any) => ({
          number: inv.number,
          total: inv.total,
          due_date: inv.due_date,
          status: inv.status,
          client_name: inv.client?.name || null,
        })),
        total,
        count: filtered.length,
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
        .select('total')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .gte('paid_at', startDate);

      const total = (data || []).reduce((s: number, inv: any) => s + (inv.total || 0), 0);

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
        .select('total')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .gte('paid_at', startIso);

      const revenue = (paidInvoices || []).reduce((s: number, inv: any) => s + (inv.total || 0), 0);
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

    // PROMÉTHÉE — trésorerie : solde réel + en attente, en une phrase.
    case 'treasury_info': {
      const { data: paid } = await supabase.from('invoices').select('total').eq('user_id', userId).eq('status', 'paid');
      const { data: exp } = await supabase.from('expenses').select('amount').eq('user_id', userId);
      const { data: out } = await supabase.from('invoices').select('total').eq('user_id', userId).in('status', ['sent', 'overdue']);
      const income = (paid || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
      const spend = (exp || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const balance = income - spend;
      const outstanding = (out || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
      return {
        type: 'text',
        message: `Solde estimé : ${balance.toFixed(2)} € (encaissé ${income.toFixed(0)} € − dépensé ${spend.toFixed(0)} €). En attente d'encaissement : ${outstanding.toFixed(2)} €. Ouvrez le widget Trésorerie pour les prévisions à 30/90 jours.`,
      };
    }

    // PROMÉTHÉE — info client : résout le nom (fuzzy) + résume ses totaux.
    case 'client_info': {
      const want = normalize(intent.client_name);
      if (!want) return { type: 'text', message: 'Quel client souhaitez-vous consulter ?' };
      const { data: clients } = await supabase.from('clients').select('id, name, email').eq('user_id', userId);
      const match = (clients || []).find((c: any) => fuzzyMatch(c.name, want));
      if (!match) return { type: 'text', message: `Aucun client trouvé pour « ${intent.client_name} ».` };

      const { data: invs } = await supabase.from('invoices').select('total, status').eq('client_id', match.id);
      const total = (invs || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
      const unpaid = (invs || [])
        .filter((i: any) => ['sent', 'overdue'].includes(i.status))
        .reduce((s: number, i: any) => s + (i.total || 0), 0);
      const emailBit = match.email ? ` (${match.email})` : '';
      return {
        type: 'text',
        message: `${match.name}${emailBit} — CA total : ${total.toFixed(2)} €, dont ${unpaid.toFixed(2)} € non réglé.`,
      };
    }

    // LOI 3 : L'IA PROPOSE, L'HUMAIN DISPOSE — brouillon, jamais d'envoi auto.
    case 'send_reminder': {
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('id, number, total, due_date, issue_date, status, client:clients(id, name, email)')
        .eq('user_id', userId)
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(50);

      const want = normalize(intent.client_name);
      const overdueFiltered = (overdueInvoices || [])
        .filter((inv: any) => fuzzyMatch(inv.client?.name, want))
        .slice(0, 5);

      if (!overdueFiltered || overdueFiltered.length === 0) {
        return {
          type: 'reminder_draft',
          status: 'no_overdue',
          message: intent.client_name
            ? `Aucune facture impayée trouvée pour « ${intent.client_name} ».`
            : 'Aucune facture impayée en ce moment.',
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', userId)
        .single();

      const drafts = overdueFiltered.map((inv: any) => {
        const dueDate = new Date(inv.due_date || inv.issue_date);
        const today = new Date();
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        const clientName = inv.client?.name || 'Client';
        const subject = `Rappel : Facture ${inv.number} - ${profile?.company_name || 'Mon entreprise'}`;
        const body = `Bonjour ${clientName},\n\nJe me permets de vous contacter concernant la facture n° ${inv.number} d'un montant de ${(inv.total || 0).toFixed(2)}€, dont l'échéance était le ${dueDate.toLocaleDateString('fr-FR')}.\n\nÀ ce jour, cette facture n'a pas été réglée. Je vous remercie de bien vouloir procéder au paiement dans les meilleurs délais.\n\nN'hésitez pas à me contacter si vous avez des questions.\n\nCordialement,\n${profile?.company_name || 'Mon entreprise'}`;

        return {
          invoiceId: inv.id,
          invoiceNumber: inv.number,
          clientName,
          clientEmail: inv.client?.email,
          amount: inv.total || 0,
          daysOverdue,
          subject,
          body,
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

    case 'create_invoice': {
      const amount = typeof intent.raw_amount === 'number' ? intent.raw_amount : null;
      const client = intent.client_name || null;
      const params = new URLSearchParams();
      if (amount !== null) params.set('amount', String(amount));
      if (client) params.set('client', client);
      const qs = params.toString();
      return {
        type: 'create_invoice',
        amount,
        client_name: client,
        redirectUrl: `/documents/create${qs ? `?${qs}` : ''}`,
        message: amount !== null
          ? `Je vous redirige vers la création de facture${client ? ` pour ${client}` : ''} avec ${amount.toFixed(2)} € pré-rempli.`
          : 'Je vous redirige vers la création de facture.',
      };
    }

    default:
      return {
        type: 'unknown',
        message: 'Je peux vous renseigner sur vos impayés, votre CA, vos dépenses, vos URSSAF, votre trésorerie ou un client précis. Posez votre question.',
      };
  }
}

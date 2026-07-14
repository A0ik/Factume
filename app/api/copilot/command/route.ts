import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';
import { applyIpRateLimit } from '@/lib/rate-limit';
import { embed, embedForInsert, parseVector, cosineSim } from '@/lib/embeddings';

// ---------------------------------------------------------------------------
// POST /api/copilot/command — Copilot Factu (plan Business).
// ATHÉNA (CIBLE 2) — REBUILD AGENTIC RAG (doctrine 2026 « function calling +
// RAG sont complémentaires »). L'IA ne devine PLUS rien : elle appelle des OUTILS
// qui interrogent la base réelle, puis rédige sa réponse APRÈS les résultats.
//
// Pourquoi l'ancienne version était « désastreuse » (cause racine prouvée) :
//   A. l'answer en langage naturel était générée AVANT toute lecture DB, à partir
//      d'un RAG plafonné à 30 clients → affichée comme réponse principale, elle
//      contredisait le résultat DB correct (qui n'était qu'une carte secondaire).
//   B. tout client au-delà du 30e (ordre alpha) était INVISIBLE de l'IA.
//   C. chaque requête RAG avalait ses erreurs (|| []) → cécité aléatoire.
//   D. JSON monolithique one-shot, sans function calling ni boucle de validation.
//
// Le fix : un outil lookup_client (fuzzy NFD, SANS plafond) + outils d'action.
// « relance nathan » → l'IA appelle draft_reminder({client_query:"nathan"}) →
// l'outil résout « Nathan » en base → l'answer est ancrée sur les vraies données.
// ---------------------------------------------------------------------------

interface HistMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolCtx {
  userId: string;
  supabase: any;
}

/** Normalisation accent + casse + ponctuation (matching fuzzy robuste). */
const normalize = (s?: string | null): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les diacritiques (NFD)
    .replace(/[^a-z0-9\s]/g, ' ')    // retire la ponctuation
    .replace(/\s+/g, ' ')
    .trim();

/** Vrai match fuzzy : égalité, inclusion dans un sens ou dans l'autre. */
const fuzzyMatch = (candidate: string | null | undefined, query: string): boolean => {
  if (!query) return true; // requête vide = pas de filtre (on veut TOUT)
  const n = normalize(candidate);
  if (!n) return false;
  return n === query || n.includes(query) || query.includes(n);
};

const fmtEur = (n: number) => (Number(n) || 0).toFixed(2);

// CIBLE 1 — Recall mémoire long-terme (préférences/habitudes/faits).
// Récupère les souvenirs de l'utilisateur, privilégie ceux qui matchent la requête
// (mots-clés), sinon les plus récents. Sert à personnaliser la réponse.
// (pgvector index existe pour scale futur ; ici recall léger sur batch récent.)
async function loadMemoryContext(supabase: any, userId: string, query: string): Promise<string> {
  try {
    const { data: memories } = await supabase
      .from('copilot_memory')
      .select('kind, content, embedding')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(30);
    if (!memories || !memories.length) return '';

    let picked: any[];
    const qEmb = await embed(query); // null si pas de clé OpenAI → fallback mot-clé
    if (qEmb) {
      // RAG sémantique : similarité cosinus vs l'embedding de la requête.
      picked = memories
        .map((m: any) => ({ m, sim: m.embedding ? cosineSim(qEmb, parseVector(m.embedding) || []) : -1 }))
        .sort((a: any, b: any) => b.sim - a.sim)
        .filter((s: any) => s.sim > 0.3)
        .slice(0, 8)
        .map((s: any) => s.m);
      if (!picked.length) picked = memories.slice(0, 5); // rien de pertinent → récents
    } else {
      // Fallback (pas d'embeddings dispo) : mot-clé, sinon récents.
      const keywords = normalize(query).split(' ').filter(w => w.length > 3);
      const hits = memories.filter((m: any) => keywords.some(k => normalize(m.content).includes(k)));
      picked = (hits.length ? hits : memories).slice(0, 8);
    }
    if (!picked.length) return '';
    const lines = picked.map((m: any) => `- (${m.kind}) ${m.content}`);
    return `\n\nMÉMOIRE À LONG TERME DE L'UTILISATEUR (préférences, habitudes, faits déjà établis — personnalise ta réponse avec, sans redemander) :\n${lines.join('\n')}`;
  } catch {
    return '';
  }
}

// CIBLE 1 — Charge les derniers échanges d'une session (mémoire court-terme cross-device).
async function loadRecentConversation(supabase: any, userId: string, sessionId: string): Promise<HistMsg[]> {
  try {
    const { data } = await supabase
      .from('copilot_conversations')
      .select('role, content')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(12);
    if (!data || !data.length) return [];
    return data
      .filter((m: any) => (m.role === 'user' || m.role === 'assistant') && m.content)
      .slice(-6)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 500) }));
  } catch {
    return [];
  }
}

// ─── OUTILS (exécutés contre la base, résultats = source de vérité) ───────────
// Chaque exécuteur renvoie { toolResult (pour le LLM), card (pour l'UI ResultCard) }.

async function toolLookupClient(args: { query?: string }, ctx: ToolCtx) {
  const want = normalize(args?.query);
  // PAS de plafond : on charge tous les clients du user, on filtre en fuzzy.
  const { data, error } = await ctx.supabase
    .from('clients')
    .select('id, name, email')
    .eq('user_id', ctx.userId);
  if (error) return { toolResult: { error: 'lookup_failed', message: error.message }, card: null };
  const matches = (data || []).filter((c: any) => fuzzyMatch(c.name, want)).slice(0, 10);
  return {
    toolResult: {
      query: args?.query || '',
      count: matches.length,
      clients: matches.map((c: any) => ({ id: c.id, name: c.name, has_email: !!c.email })),
    },
    card: null, // lookup pur : pas de carte, l'IA répond en langage naturel
  };
}

async function toolListOutstanding(args: { client_query?: string }, ctx: ToolCtx) {
  const { data, error } = await ctx.supabase
    .from('invoices')
    .select('number, total, due_date, status, client_name_override, client:clients(name)')
    .eq('user_id', ctx.userId)
    .eq('document_type', 'invoice') // ATHÉNA : un DEVIS n'est pas une créance à recouvrer
    .in('status', ['sent', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(50);
  if (error) return { toolResult: { error: 'query_failed', message: error.message }, card: null };
  const want = normalize(args?.client_query);
  const filtered = (data || [])
    .filter((inv: any) => fuzzyMatch(inv.client?.name || inv.client_name_override, want))
    .slice(0, 10);
  const total = filtered.reduce((s: number, inv: any) => s + (inv.total || 0), 0);
  return {
    toolResult: {
      count: filtered.length,
      total,
      invoices: filtered.map((inv: any) => ({
        number: inv.number,
        total: inv.total,
        due_date: inv.due_date,
        status: inv.status,
        client: inv.client?.name || inv.client_name_override || null,
      })),
    },
    card: {
      type: 'outstanding_invoices',
      invoices: filtered.map((inv: any) => ({
        number: inv.number,
        total: inv.total,
        due_date: inv.due_date,
        status: inv.status,
        client_name: inv.client?.name || inv.client_name_override || null,
      })),
      total,
      count: filtered.length,
    },
  };
}

async function toolGetRevenue(args: { period?: string }, ctx: ToolCtx) {
  const now = new Date();
  const period = (args?.period === 'year' || args?.period === 'quarter') ? args.period : 'month';
  let startDate: string;
  if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1).toISOString();
  else if (period === 'quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    startDate = new Date(now.getFullYear(), qStart, 1).toISOString();
  } else startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await ctx.supabase
    .from('invoices')
    .select('total')
    .eq('user_id', ctx.userId)
    .eq('document_type', 'invoice')
    .eq('status', 'paid')
    .gte('paid_at', startDate);
  if (error) return { toolResult: { error: 'query_failed', message: error.message }, card: null };
  const total = (data || []).reduce((s: number, inv: any) => s + (inv.total || 0), 0);
  return {
    toolResult: { period, total, invoiceCount: data?.length || 0 },
    card: { type: 'revenue', total, invoiceCount: data?.length || 0, period },
  };
}

async function toolComputeUrssaf(_args: any, ctx: ToolCtx) {
  const { calculateURSSAF, getCurrentQuarter, mapFiscalRegime, REGIME_SHORT_LABELS } = await import('@/lib/urssaf-calculator');
  const { data: profile, error } = await ctx.supabase
    .from('profiles')
    .select('regime_fiscal, legal_status')
    .eq('id', ctx.userId)
    .single();
  if (error) return { toolResult: { error: 'query_failed', message: error.message }, card: null };
  const regime = mapFiscalRegime(profile?.regime_fiscal, profile?.legal_status);
  if (!regime) {
    const card = { type: 'urssaf', message: 'Régime fiscal non configuré. Configurez-le dans les paramètres.' };
    return { toolResult: { configured: false, message: card.message }, card };
  }
  const { quarter, year } = getCurrentQuarter();
  const startIso = new Date(year, (quarter - 1) * 3, 1).toISOString();
  const { data: paid } = await ctx.supabase
    .from('invoices')
    .select('total')
    .eq('user_id', ctx.userId)
    .eq('status', 'paid')
    .gte('paid_at', startIso);
  const revenue = (paid || []).reduce((s: number, inv: any) => s + (inv.total || 0), 0);
  const calc = calculateURSSAF(revenue, regime);
  const card = {
    type: 'urssaf',
    regime: REGIME_SHORT_LABELS[regime],
    quarterRevenue: revenue,
    urssafDue: calc.urssafAmount,
    quarter: `T${quarter} ${year}`,
  };
  return { toolResult: { ...card, configured: true }, card };
}

async function toolListExpenses(args: { limit?: number }, ctx: ToolCtx) {
  const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 20);
  const { data, error } = await ctx.supabase
    .from('expenses')
    .select('vendor, amount, category, date')
    .eq('user_id', ctx.userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) return { toolResult: { error: 'query_failed', message: error.message }, card: null };
  const total = (data || []).reduce((s: number, exp: any) => s + (exp.amount || 0), 0);
  return {
    toolResult: { count: data?.length || 0, total, expenses: data || [] },
    card: { type: 'expenses', expenses: data || [], total, count: data?.length || 0 },
  };
}

async function toolGetTreasury(_args: any, ctx: ToolCtx) {
  const { data: paid } = await ctx.supabase.from('invoices').select('total').eq('user_id', ctx.userId).eq('status', 'paid');
  const { data: exp } = await ctx.supabase.from('expenses').select('amount').eq('user_id', ctx.userId);
  const { data: out } = await ctx.supabase.from('invoices').select('total').eq('user_id', ctx.userId).in('status', ['sent', 'overdue']);
  const income = (paid || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
  const spend = (exp || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const balance = income - spend;
  const outstanding = (out || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
  const message = `Solde estimé : ${balance.toFixed(2)} € (encaissé ${income.toFixed(0)} € − dépensé ${spend.toFixed(0)} €). En attente d'encaissement : ${outstanding.toFixed(2)} €.`;
  return { toolResult: { balance, income, spend, outstanding }, card: { type: 'text', message } };
}

async function toolGetClientInfo(args: { client_query?: string }, ctx: ToolCtx) {
  const want = normalize(args?.client_query);
  if (!want) {
    const card = { type: 'text', message: 'Quel client souhaitez-vous consulter ?' };
    return { toolResult: { error: 'missing_client' }, card };
  }
  const { data: clients, error } = await ctx.supabase.from('clients').select('id, name, email').eq('user_id', ctx.userId);
  if (error) return { toolResult: { error: 'query_failed', message: error.message }, card: null };
  const match = (clients || []).find((c: any) => fuzzyMatch(c.name, want));
  if (!match) {
    const card = { type: 'text', message: `Aucun client trouvé pour « ${args?.client_query} ».` };
    return { toolResult: { found: false, query: args?.client_query }, card };
  }
  const { data: invs } = await ctx.supabase.from('invoices').select('total, status').eq('client_id', match.id);
  const total = (invs || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
  const unpaid = (invs || []).filter((i: any) => ['sent', 'overdue'].includes(i.status)).reduce((s: number, i: any) => s + (i.total || 0), 0);
  const emailBit = match.email ? ` (${match.email})` : '';
  const card = { type: 'text', message: `${match.name}${emailBit} — CA total : ${total.toFixed(2)} €, dont ${unpaid.toFixed(2)} € non réglé.` };
  return { toolResult: { found: true, client: match.name, total, unpaid, has_email: !!match.email }, card };
}

async function toolDraftReminder(args: { client_query?: string }, ctx: ToolCtx) {
  // LOI 3 : L'IA PROPOSE, L'HUMAIN DISPOSE — brouillon, jamais d'envoi auto.
  // ATHÉNA (C3) — conscience du client sans email : on lève un drapeau missingEmail
  // + un warning guidant l'utilisateur, au lieu d'ignorer silencieusement.
  const { data: overdueInvoices, error } = await ctx.supabase
    .from('invoices')
    .select('id, number, total, due_date, issue_date, status, client_name_override, client_email, client:clients(id, name, email)')
    .eq('user_id', ctx.userId)
    .eq('document_type', 'invoice') // ATHÉNA : ne pas relancer un DEVIS (ex: DEVIS-2026-032)
    .in('status', ['sent', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(50);
  if (error) return { toolResult: { error: 'query_failed', message: error.message }, card: null };

  const want = normalize(args?.client_query);
  const overdueFiltered = (overdueInvoices || [])
    .filter((inv: any) => fuzzyMatch(inv.client?.name || inv.client_name_override, want))
    .slice(0, 5);

  if (!overdueFiltered || overdueFiltered.length === 0) {
    const message = args?.client_query
      ? `Aucune facture impayée trouvée pour « ${args.client_query} ».`
      : 'Aucune facture impayée en ce moment.';
    return { toolResult: { drafts: 0, message }, card: { type: 'reminder_draft', status: 'no_overdue', message } };
  }

  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('company_name')
    .eq('id', ctx.userId)
    .single();

  const drafts = overdueFiltered.map((inv: any) => {
    const dueDate = new Date(inv.due_date || inv.issue_date);
    const today = new Date();
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    // ATHÉNA — résolution du nom/email robuste : un client libre (non lié) n'a pas de
    // join client, mais la facture porte client_name_override + client_email en snapshot.
    // Avant on affichait « Client » et aucun email pour ces factures.
    const clientName = inv.client?.name || inv.client_name_override || 'Client';
    const clientEmail = inv.client?.email || inv.client_email || null;
    const missingEmail = !clientEmail;
    const subject = `Rappel : Facture ${inv.number} - ${profile?.company_name || 'Mon entreprise'}`;
    const body = `Bonjour ${clientName},\n\nJe me permets de vous contacter concernant la facture n° ${inv.number} d'un montant de ${fmtEur(inv.total)}€, dont l'échéance était le ${dueDate.toLocaleDateString('fr-FR')}.\n\nÀ ce jour, cette facture n'a pas été réglée. Je vous remercie de bien vouloir procéder au paiement dans les meilleurs délais.\n\nN'hésitez pas à me contacter si vous avez des questions.\n\nCordialement,\n${profile?.company_name || 'Mon entreprise'}`;
    return {
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      clientName,
      clientEmail,
      missingEmail,
      amount: inv.total || 0,
      daysOverdue,
      subject,
      body,
      needsApproval: true,
      warning: missingEmail
        ? '⚠️ Aucun email pour ce client : ajoutez-le sur la fiche client avant d\'envoyer la relance.'
        : '⚠️ Vérifiez que cette facture n\'a pas déjà été payée avant d\'envoyer la relance.',
    };
  });

  const card = {
    type: 'reminder_draft',
    status: 'drafts_ready',
    drafts,
    message: `${drafts.length} facture(s) impayée(s) trouvée(s). Vérifiez et approuvez chaque relance avant envoi.`,
  };
  return { toolResult: { drafts: drafts.length, missing_email_count: drafts.filter((d:any)=>d.missingEmail).length }, card };
}

async function toolRedirectToCreator(args: { amount?: number; client?: string }, _ctx: ToolCtx) {
  const amount = typeof args?.amount === 'number' && isFinite(args.amount) ? args.amount : null;
  const client = args?.client || null;
  const params = new URLSearchParams();
  if (amount !== null) params.set('amount', String(amount));
  if (client) params.set('clientName', client);
  const qs = params.toString();
  const card = {
    type: 'create_invoice',
    amount,
    client_name: client,
    redirectUrl: `/documents/create${qs ? `?${qs}` : ''}`,
    message: amount !== null
      ? `Je vous redirige vers la création de facture${client ? ` pour ${client}` : ''} avec ${fmtEur(amount)} € pré-rempli.`
      : 'Je vous redirige vers la création de facture.',
  };
  return { toolResult: { redirect: true, amount, client }, card };
}

// CIBLE 1 — Mémoire explicite (style ChatGPT memory). Le copilot décide de retenir
// une préférence/habitude/fait pour personnaliser ses réponses futures.
async function toolSaveMemory(args: { kind?: string; content?: string }, ctx: ToolCtx) {
  const validKinds = ['preference', 'fact', 'alias', 'habit', 'summary'] as const;
  const kind = validKinds.includes(args?.kind as any) ? (args.kind as string) : 'fact';
  const content = (args?.content || '').trim().slice(0, 500);
  if (!content) return { toolResult: { saved: false, reason: 'contenu vide' }, card: null };
  try {
    // Dédoublonnage : ignore si un souvenir équivalent existe déjà.
    const { data: existing } = await ctx.supabase
      .from('copilot_memory')
      .select('id')
      .eq('user_id', ctx.userId)
      .ilike('content', content)
      .limit(1);
    if (existing && existing.length) return { toolResult: { saved: true, dedup: true }, card: null };
    // CIBLE 1 — Embedding pgvector (RAG sémantique). Null si pas de clé OpenAI.
    const embedding = await embedForInsert(content);
    const payload: any = { user_id: ctx.userId, kind, content };
    if (embedding) payload.embedding = embedding;
    let { error } = await ctx.supabase.from('copilot_memory').insert(payload);
    // Défense : si l'insert échoue sur le format vector, on retente SANS embedding
    // (la mémoire est quand même conservée ; le recall retombera sur pg_trgm).
    if (error && embedding) {
      ({ error } = await ctx.supabase
        .from('copilot_memory')
        .insert({ user_id: ctx.userId, kind, content }));
    }
    if (error) return { toolResult: { saved: false, error: error.message }, card: null };
    return { toolResult: { saved: true, kind, content }, card: null };
  } catch (e: any) {
    return { toolResult: { saved: false, error: e?.message || 'erreur' }, card: null };
  }
}

// ZÉNITH (CIBLE 3) — Outil PROACTIF : quand l'IA a besoin d'une saisie structurée
// (email, montant, nom, date…) pour agir, elle émet une CARTE FORMULAIRE au lieu de
// renvoyer l'utilisateur vers une page. L'utilisateur remplit les champs ; le front
// substitue les valeurs {field_id} dans submit_command et renvoie cette commande au
// Copilot, qui la traite via sa boucle d'outils habituelle. Aucune redirection.
async function toolRequestForm(args: {
  title?: string;
  message?: string;
  cta?: string;
  submit_command?: string;
  fields?: Array<{ id: string; label: string; type?: string; placeholder?: string; required?: boolean }>;
}, _ctx: ToolCtx) {
  const fields = Array.isArray(args?.fields) ? args.fields.slice(0, 6) : [];
  const card = {
    type: 'form' as const,
    title: String(args?.title || 'Information requise').slice(0, 80),
    message: String(args?.message || '').slice(0, 280),
    cta: String(args?.cta || 'Valider').slice(0, 24),
    submitCommand: String(args?.submit_command || '').slice(0, 400),
    fields: fields.map((f) => ({
      id: String(f.id || '').slice(0, 40),
      label: String(f.label || '').slice(0, 60),
      type: ['text', 'email', 'number', 'date', 'tel'].includes(f.type as string) ? f.type : 'text',
      placeholder: f.placeholder ? String(f.placeholder).slice(0, 80) : '',
      required: !!f.required,
    })),
  };
  return { toolResult: { form_requested: true, field_count: card.fields.length }, card };
}

const TOOL_EXECUTORS: Record<string, (args: any, ctx: ToolCtx) => Promise<{ toolResult: any; card: any }>> = {
  lookup_client: toolLookupClient,
  list_outstanding_invoices: toolListOutstanding,
  get_revenue: toolGetRevenue,
  compute_urssaf: toolComputeUrssaf,
  list_expenses: toolListExpenses,
  get_treasury: toolGetTreasury,
  get_client_info: toolGetClientInfo,
  draft_reminder: toolDraftReminder,
  redirect_to_invoice_creator: toolRedirectToCreator,
  save_memory: toolSaveMemory,
  request_form: toolRequestForm,
};

// ─── Schémas des outils (format OpenAI, compatible OpenRouter & Groq) ─────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'lookup_client',
      description: "Recherche un client par nom (insensible à la casse et aux accents, correspondance partielle). À utiliser DÈS QUE l'utilisateur nomme un client pour ne JAMAIS deviner son identité. Ne retourne que des clients qui existent vraiment.",
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Nom ou fragment du nom du client (ex: "nathan", "Durand SARL").' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_outstanding_invoices',
      description: "Liste les factures impayées (envoyées ou en retard) avec le total dû. Filtrable par client. Utiliser pour « combien me doit-on », « impayés de X ».",
      parameters: {
        type: 'object',
        properties: { client_query: { type: 'string', description: 'Nom/fragment du client pour filtrer (optionnel).' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_revenue',
      description: "Chiffre d'affaires encaissé (factures payées) sur une période.",
      parameters: {
        type: 'object',
        properties: { period: { type: 'string', enum: ['month', 'quarter', 'year'], description: 'Période (défaut: mois).' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compute_urssaf',
      description: "Calcule les cotisations URSSAF du trimestre courant selon le régime fiscal configuré.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_expenses',
      description: "Liste les dernières dépenses/notes de frais enregistrées.",
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'Nombre de dépenses (défaut 10, max 20).' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_treasury',
      description: "Synthèse de trésorerie : solde estimé (encaissé − dépensé) et montant en attente d'encaissement.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_client_info',
      description: "Fiche résumée d'un client : CA total et part non réglée. Résout le nom de façon floue.",
      parameters: {
        type: 'object',
        properties: { client_query: { type: 'string', description: 'Nom/fragment du client.' } },
        required: ['client_query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_reminder',
      description: "Prépare un BROUILLON de relance pour les factures impayées (filtrable par client). N'ENVOIE JAMAIS automatiquement : l'utilisateur valide chaque envoi. Si le client n'a pas d'email, le signaler.",
      parameters: {
        type: 'object',
        properties: { client_query: { type: 'string', description: 'Nom/fragment du client à relancer (optionnel ; sinon toutes les impayées).' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'redirect_to_invoice_creator',
      description: "Ouvre le créateur de facture pré-rempli. À utiliser UNIQUEMENT quand l'utilisateur demande explicitement de CRÉER une facture complète (tâche complexe).",
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Montant total à pré-remplir (optionnel).' },
          client: { type: 'string', description: 'Nom du client à pré-remplir (optionnel).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: "Mémorise un fait, une préférence ou une habitude de l'utilisateur pour personnaliser les réponses futures (ex: « Nathan est facturé 500€ tous les mois », « préfère des relances courtes et cordiales »). À utiliser quand l'utilisateur exprime une préférence claire ou un pattern récurrent. N'enregistre jamais de donnée sensible (mot de passe, IBAN, NSS).",
      parameters: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['preference', 'fact', 'alias', 'habit', 'summary'], description: 'Type de souvenir.' },
          content: { type: 'string', description: 'Le fait/préférence formulé en une phrase courte.' },
        },
        required: ['kind', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_form',
      description: "ZÉNITH (CIBLE 3) — Affiche un formulaire de saisie INLINE dans le chat (au lieu de renvoyer l'utilisateur vers une page). À utiliser QUAND l'IA a besoin d'informations structurées pour agir (ex: email manquant d'un client, montant d'une dépense à ajouter, nom d'un nouveau client). L'utilisateur remplit les champs, puis la commande submit_command (où {field_id} est remplacé par les valeurs) est renvoyée au Copilot. Le nombre de champs doit rester faible (1 à 4).",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titre court du formulaire (ex: « Email du client »).' },
          message: { type: 'string', description: 'Explication affichée au-dessus des champs.' },
          cta: { type: 'string', description: 'Libellé du bouton de validation (ex: « Enregistrer »).' },
          submit_command: { type: 'string', description: "Commande renvoyée au Copilot après saisie, avec les tokens {field_id} remplacés. Ex: « enregistre l\\'email {email} pour le client Dupont »." },
          fields: {
            type: 'array',
            description: 'Champs du formulaire (1 à 4).',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Identifiant du champ (utilisé comme token {id} dans submit_command).' },
                label: { type: 'string', description: 'Libellé affiché.' },
                type: { type: 'string', enum: ['text', 'email', 'number', 'date', 'tel'] },
                placeholder: { type: 'string' },
                required: { type: 'boolean' },
              },
              required: ['id', 'label'],
            },
          },
        },
        required: ['submit_command', 'fields'],
      },
    },
  },
];

const SYSTEM_PROMPT = `Tu es Copilot Factu.me, l'assistant IA expert d'un indépendant ou expert-comptable français. Tu réponds TOUJOURS en français, de façon précise, concrète et concise.

RÈGLES ABSOLUES :
1. Tu ne connais les clients, montants, factures ou dates QUE via les outils. N'utilise JAMAIS une valeur qui ne provient pas d'un appel d'outil réussi.
2. Dès que l'utilisateur nomme un client (ex. « nathan », « Durand »), appelle l'outil qui va bien (lookup_client, get_client_info, list_outstanding_invoices, draft_reminder) en passant le nom brut — la résolution insensible à la casse/accents se fait côté base. Ne suppose jamais qu'un client est introuvable sans avoir appelé l'outil.
3. Tu peux enchaîner plusieurs outils si nécessaire (ex. lookup_client puis list_outstanding_invoices).
4. Pour une RELANCE, appelle draft_reminder : le système ne fait que préparer un brouillon, l'utilisateur valide chaque envoi (l'IA propose, l'humain dispose). Si l'outil signale un email manquant, dis-le clairement à l'utilisateur.
5. Pour CRÉER une facture complète, appelle redirect_to_invoice_creator (tu ne crées rien toi-même).
6. Ta réponse finale est une phrase naturelle courte qui répond directement, ancrée sur les résultats des outils. Ne répète pas la liste brute si une carte structurée l'affiche déjà ; dis l'essentiel.
7. MÉMOIRE : si l'utilisateur exprime une préférence claire ou un pattern récurrent (ex: « je facture Nathan 500€ par mois », « fais court », « rappelle-moi d'envoyer la DSN le 5 »), appelle save_memory pour le retenir. Exploite la MÉMOIRE À LONG TERME fournie dans le contexte pour personnaliser tes réponses sans redemander.
8. FORMULAIRES PROACTIFS : si tu as besoin d'une info pour agir (ex: « quel email pour ce client ? », « quel montant pour cette dépense ? »), appelle request_form plutôt que de demander en texte libre. L'utilisateur remplit un champ inline, puis la commande submit_command (tokens {field_id} remplacés) te revient pour exécuter l'action. Ne renvoie JAMAIS l'utilisateur vers une page quand un formulaire inline suffit.

Tu peux aussi répondre à des questions générales (conseils de facturation, délais légaux français) sans outil.`;

// ─── Boucle de function calling (multi-providers) ─────────────────────────────

interface Provider { name: string; client: OpenAI; model: string; }

function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: 'openrouter',
      client: new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me',
          'X-Title': 'Factu.me Copilot',
        },
      }),
      // Modèle fort en tool-use ; overridable via OPENROUTER_MODEL.
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
    });
  }
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: 'groq',
      client: new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      }),
      model: 'llama-3.3-70b-versatile',
    });
  }
  return providers;
}

async function runAgentLoop(provider: Provider, messages: any[], ctx: ToolCtx): Promise<{ answer: string; card: any }> {
  let lastCard: any = null;
  const MAX_ITERS = 6;

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0,
    } as any);

    const msg: any = completion.choices?.[0]?.message;
    if (!msg) throw new Error('Réponse IA vide');

    // Si l'IA appelle des outils, on les exécute et on renverra le contexte.
    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      messages.push(msg); // contient tool_calls (attendu par l'API pour le tour suivant)
      for (const call of msg.tool_calls) {
        const fnName = call?.function?.name;
        let args: any = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { args = {}; }
        const executor = TOOL_EXECUTORS[fnName];
        let toolResult: any;
        try {
          if (!executor) {
            toolResult = { error: 'unknown_tool', name: fnName };
          } else {
            const { toolResult: r, card } = await executor(args, ctx);
            toolResult = r;
            if (card) lastCard = card; // la dernière carte d'action gagne
          }
        } catch (e: any) {
          toolResult = { error: 'tool_failed', message: e?.message || 'erreur' };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: fnName,
          content: JSON.stringify(toolResult),
        });
      }
      continue; // nouveau tour : l'IA exploite les résultats
    }

    // Pas d'appel d'outil : réponse finale.
    const answer = (msg.content || '').trim();
    return { answer, card: lastCard };
  }

  // Épuisement du budget d'itérations : on renvoie ce qu'on a.
  return { answer: 'J\'ai besoin de plus de contexte pour répondre précisément. Pouvez-vous préciser votre demande ?', card: lastCard };
}

export async function POST(req: NextRequest) {
  try {
    // Anti-abus IA Copilot : 30/min par IP.
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

    const { text, history, sessionId } = await req.json();
    if (!text) return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });

    const providers = buildProviders();
    if (providers.length === 0) {
      return NextResponse.json({ error: 'Configuration IA manquante' }, { status: 500 });
    }

    // Mémoire conversationnelle : N derniers échanges valides (envoyés par le client).
    const safeHistory: HistMsg[] = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
          .slice(-6)
          .map((m: any) => ({ role: m.role, content: m.content.slice(0, 500) }))
      : [];

    // CIBLE 1 — Mémoire : recharge la session si pas d'historique client (cross-device,
    // survit au refresh) + recall long-terme (préférences/habitudes) pour personnaliser.
    let effectiveHistory = safeHistory;
    if (effectiveHistory.length === 0 && sessionId) {
      effectiveHistory = await loadRecentConversation(supabase, user.id, sessionId);
    }
    const memoryCtx = await loadMemoryContext(supabase, user.id, text);

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT + memoryCtx },
      ...effectiveHistory,
      { role: 'user', content: text },
    ];

    const ctx: ToolCtx = { userId: user.id, supabase };

    // On essaie les providers en ordre (OpenRouter fort d'abord, Groq en repli).
    let lastError: any = null;
    for (const provider of providers) {
      try {
        const { answer, card } = await runAgentLoop(provider, messages, ctx);
        const result = card || { type: 'text', message: answer || 'Commande traitée.' };
        const intentByCard = card?.type || 'text';
        // CIBLE 1 — Persiste la conversation (court-terme, cross-device, survit au refresh).
        const sid = sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null);
        if (sid) {
          try {
            await supabase.from('copilot_conversations').insert([
              { user_id: user.id, session_id: sid, role: 'user', content: text },
              { user_id: user.id, session_id: sid, role: 'assistant', content: answer || '' },
            ]);
          } catch {}
        }
        return NextResponse.json({
          intent: intentByCard,
          confidence: 1,
          answer: answer || (card?.message || ''),
          result,
          originalText: text,
          sessionId: sid,
        });
      } catch (err) {
        lastError = err;
        console.warn(`[copilot/command] provider ${provider.name} failed:`, (err as any)?.message);
        // on tente le provider suivant
      }
    }

    console.error('[copilot/command] All providers failed:', lastError);
    return NextResponse.json({ error: 'Service IA momentanément indisponible' }, { status: 503 });
  } catch (error) {
    console.error('[copilot/command] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

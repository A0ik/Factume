import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserSubscriptionStatus, requireFeature } from '@/lib/subscription-guard';

// ---------------------------------------------------------------------------
// GET /api/copilot/proactive — CIBLE 1d (Copilot proactif, inspiré Notion AI).
// Surveille les données du cabinet/utilisateur et pousse des suggestions SANS
// qu'on lui demande : impayés en retard, facturations récurrentes (mémoire
// prédictive). Respecte copilot_preferences.proactive_enabled.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

interface Nudge {
  id: string;
  kind: 'overdue' | 'recurring';
  severity: 'critical' | 'info';
  title: string;
  description: string;
  cta: string; // commande pré-rédigée à envoyer au Copilot
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    try {
      const sub = await getUserSubscriptionStatus(user.id);
      requireFeature(sub, 'copilotFactu');
    } catch {
      return NextResponse.json({ nudges: [] });
    }

    // Préférence : l'utilisateur peut couper le mode proactif.
    try {
      const { data: prefs } = await supabase
        .from('copilot_preferences').select('proactive_enabled')
        .eq('user_id', user.id).maybeSingle();
      if (prefs?.proactive_enabled === false) return NextResponse.json({ nudges: [] });
    } catch {}

    const nudges: Nudge[] = [];

    // 1) Impayés en retard → suggestion de relance.
    try {
      const { data: overdue } = await supabase.from('invoices')
        .select('total, due_date, client_name_override, client:clients(name)')
        .eq('user_id', user.id).eq('document_type', 'invoice').eq('status', 'overdue')
        .order('due_date', { ascending: true }).limit(20);
      const list = (overdue || []) as any[];
      if (list.length) {
        const total = list.reduce((s, i) => s + (Number(i.total) || 0), 0);
        const top = list.slice(0, 3)
          .map(i => i.client?.name || i.client_name_override || '')
          .filter(Boolean);
        nudges.push({
          id: 'overdue',
          kind: 'overdue',
          severity: 'critical',
          title: `${list.length} facture${list.length > 1 ? 's' : ''} en retard · ${total.toFixed(2)} €`,
          description: top.length
            ? `Relancer ${top.join(', ')}${list.length > top.length ? '…' : ''}.`
            : 'Relancer vos clients en retard.',
          cta: 'Prépare une relance pour mes impayés',
        });
      }
    } catch {}

    // 2) Mémoire prédictive : facturations récurrentes (même client, ~même montant,
    //    sur plusieurs mois distincts) → suggestion de création.
    try {
      const since = new Date(Date.now() - 95 * 86_400_000).toISOString();
      const { data: recent } = await supabase.from('invoices')
        .select('total, paid_at, client_name_override, client:clients(name)')
        .eq('user_id', user.id).eq('document_type', 'invoice').eq('status', 'paid')
        .gte('paid_at', since);
      const byClient = new Map<string, { totals: number[]; months: Set<string> }>();
      for (const inv of (recent || []) as any[]) {
        const name = inv.client?.name || inv.client_name_override;
        if (!name) continue;
        const entry = byClient.get(name) || { totals: [], months: new Set<string>() };
        entry.totals.push(Number(inv.total) || 0);
        const m = (inv.paid_at || '').slice(0, 7); // YYYY-MM
        if (m) entry.months.add(m);
        byClient.set(name, entry);
      }
      let recurring = 0;
      for (const [name, { totals, months }] of byClient.entries()) {
        if (totals.length < 2 || months.size < 2) continue;
        const sorted = totals.slice().sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)];
        const similar = med > 0 && totals.every(t => Math.abs(t - med) / med <= 0.25);
        if (similar && recurring < 2) {
          recurring++;
          nudges.push({
            id: `recurring-${name}`,
            kind: 'recurring',
            severity: 'info',
            title: `Facture récurrente · ${name}`,
            description: `Vous facturez ${name} chaque mois (~${med.toFixed(2)} €). Créer celle de ce mois ?`,
            cta: `Crée une facture de ${med.toFixed(2)} euros pour ${name}`,
          });
        }
      }
    } catch {}

    return NextResponse.json({ nudges });
  } catch {
    return NextResponse.json({ nudges: [] });
  }
}

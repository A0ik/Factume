import { createAdminClient } from '@/lib/supabase-server';

interface HealthCheck {
  id: string;
  label: string;
  weight: number;
  icon: string;
  check: (admin: ReturnType<typeof createAdminClient>, userId: string) => Promise<{ score: number; issues: Array<{ severity: string; message: string; count: number }> }>;
}

interface ScanResult {
  overall_score: number;
  category_scores: Record<string, number>;
  issues: Array<{ category: string; severity: string; message: string; count: number }>;
  suggestions: Array<{ category: string; message: string }>;
}

const CHECKS: HealthCheck[] = [
  {
    id: 'duplicate_invoices',
    label: 'Factures en doublon',
    weight: 15,
    icon: '',
    check: async (admin, userId) => {
      const { data } = await admin
        .from('invoices')
        .select('client_id, total, issue_date, number')
        .eq('user_id', userId)
        .in('document_type', ['invoice']);

      const seen = new Map<string, number>();
      let duplicates = 0;
      (data || []).forEach((inv) => {
        const key = `${inv.client_id}-${inv.total}-${inv.issue_date}`;
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count === 2) duplicates++;
      });

      const total = (data || []).length;
      const score = total === 0 ? 100 : Math.max(0, 100 - (duplicates / total) * 500);
      return {
        score: Math.round(score),
        issues: duplicates > 0 ? [{ severity: 'warning', message: `${duplicates} facture(s) en doublon détectée(s)`, count: duplicates }] : [],
      };
    },
  },
  {
    id: 'duplicate_expenses',
    label: 'Dépenses en doublon',
    weight: 10,
    icon: '',
    check: async (admin, userId) => {
      const { data } = await admin
        .from('expenses')
        .select('vendor, amount, date')
        .eq('user_id', userId);

      const seen = new Map<string, number>();
      let duplicates = 0;
      (data || []).forEach((exp) => {
        const key = `${(exp.vendor || '').toLowerCase().trim()}-${exp.amount}-${exp.date}`;
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count === 2) duplicates++;
      });

      const total = (data || []).length;
      const score = total === 0 ? 100 : Math.max(0, 100 - (duplicates / total) * 500);
      return {
        score: Math.round(score),
        issues: duplicates > 0 ? [{ severity: 'warning', message: `${duplicates} dépense(s) en doublon détectée(s)`, count: duplicates }] : [],
      };
    },
  },
  {
    id: 'uncategorized_expenses',
    label: 'Dépenses non catégorisées',
    weight: 10,
    icon: '',
    check: async (admin, userId) => {
      const { count: total } = await admin
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: uncategorized } = await admin
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .or('category.is.null,category.eq.other');

      const score = !total ? 100 : Math.round(((total - (uncategorized || 0)) / total) * 100);
      return {
        score,
        issues: (uncategorized || 0) > 0 ? [{ severity: 'info', message: `${uncategorized} dépense(s) sans catégorie`, count: uncategorized || 0 }] : [],
      };
    },
  },
  {
    id: 'vat_consistency',
    label: 'Cohérence TVA',
    weight: 15,
    icon: '',
    check: async (admin, userId) => {
      const { data: expenses } = await admin
        .from('expenses')
        .select('amount, vat_amount')
        .eq('user_id', userId)
        .gt('amount', 0);

      let inconsistencies = 0;
      // Check if vat_amount is consistent with known French TVA rates (0%, 5.5%, 10%, 20%)
      const validInclusiveRatios = [0, 0.052, 0.091, 0.167]; // vat/amount TTC ratios
      const tolerance = 0.015;
      (expenses || []).forEach((exp) => {
        if (!exp.vat_amount || exp.vat_amount === 0) return;
        const ratio = exp.vat_amount / exp.amount;
        const isValid = validInclusiveRatios.some((r) => Math.abs(ratio - r) < tolerance);
        if (!isValid) inconsistencies++;
      });

      const total = (expenses || []).length;
      const score = total === 0 ? 100 : Math.max(0, 100 - (inconsistencies / total) * 300);
      return {
        score: Math.round(score),
        issues: inconsistencies > 0 ? [{ severity: 'error', message: `${inconsistencies} écart(s) TVA détecté(s) (> 1€)`, count: inconsistencies }] : [],
      };
    },
  },
  {
    id: 'unreconciled_transactions',
    label: 'Transactions non rapprochées',
    weight: 15,
    icon: '',
    check: async (admin, userId) => {
      const { count: total } = await admin
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: unreconciled } = await admin
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'unreconciled');

      const score = !total ? 100 : Math.round(((total - (unreconciled || 0)) / total) * 100);
      return {
        score,
        issues: (unreconciled || 0) > 0 ? [{ severity: 'warning', message: `${unreconciled} transaction(s) non rapprochée(s)`, count: unreconciled || 0 }] : [],
      };
    },
  },
  {
    id: 'overdue_invoices',
    label: 'Factures en retard',
    weight: 10,
    icon: '',
    check: async (admin, userId) => {
      const { count: total } = await admin
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('document_type', 'invoice');

      const { count: overdue } = await admin
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('document_type', 'invoice')
        .eq('status', 'overdue');

      const score = !total ? 100 : Math.max(0, 100 - ((overdue || 0) / total) * 500);
      return {
        score: Math.round(score),
        issues: (overdue || 0) > 0 ? [{ severity: 'error', message: `${overdue} facture(s) impayée(s) en retard`, count: overdue || 0 }] : [],
      };
    },
  },
  {
    id: 'missing_client_info',
    label: 'Infos clients manquantes',
    weight: 10,
    icon: '',
    check: async (admin, userId) => {
      const { count: total } = await admin
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: noEmail } = await admin
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('email', null);

      const { count: noSiret } = await admin
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .or('siret.is.null,siret.eq.');

      const incomplete = Math.max(noEmail || 0, noSiret || 0);
      const score = !total ? 100 : Math.round(((total - incomplete) / total) * 100);
      return {
        score,
        issues: incomplete > 0 ? [{ severity: 'info', message: `${incomplete} client(s) avec des infos manquantes (email/SIRET)`, count: incomplete }] : [],
      };
    },
  },
  {
    id: 'expenses_without_receipts',
    label: 'Dépenses sans justificatif',
    weight: 5,
    icon: '',
    check: async (admin, userId) => {
      const { count: total } = await admin
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: noReceipt } = await admin
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('receipt_url', null);

      const score = !total ? 100 : Math.round(((total - (noReceipt || 0)) / total) * 100);
      return {
        score,
        issues: (noReceipt || 0) > 0 ? [{ severity: 'info', message: `${noReceipt} dépense(s) sans justificatif`, count: noReceipt || 0 }] : [],
      };
    },
  },
  {
    id: 'supplier_consistency',
    label: 'Cohérence fournisseurs',
    weight: 5,
    icon: '',
    check: async (admin, userId) => {
      const { data } = await admin
        .from('expenses')
        .select('vendor')
        .eq('user_id', userId)
        .not('vendor', 'is', null);

      const vendors = new Map<string, Set<string>>();
      (data || []).forEach((exp) => {
        const name = (exp.vendor || '').toLowerCase().trim();
        if (!name) return;
        const first3 = name.substring(0, 3);
        if (!vendors.has(first3)) vendors.set(first3, new Set());
        vendors.get(first3)!.add(name);
      });

      let potentialDuplicates = 0;
      vendors.forEach((variations) => {
        if (variations.size > 1) potentialDuplicates += variations.size - 1;
      });

      const score = Math.max(0, 100 - potentialDuplicates * 20);
      return {
        score: Math.round(score),
        issues: potentialDuplicates > 0 ? [{ severity: 'info', message: `${potentialDuplicates} variante(s) de fournisseur(s) détectée(s)`, count: potentialDuplicates }] : [],
      };
    },
  },
  {
    id: 'accounting_completeness',
    label: 'Complétude comptable',
    weight: 5,
    icon: '',
    check: async (admin, userId) => {
      const { count: total } = await admin
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: withAccount } = await admin
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('category', 'is', null)
        .neq('category', 'other');

      const score = !total ? 100 : Math.round(((withAccount || 0) / total) * 100);
      return {
        score,
        issues: [],
      };
    },
  },
];

export async function runHealthScan(userId: string): Promise<ScanResult> {
  const admin = createAdminClient();

  const category_scores: Record<string, number> = {};
  const allIssues: Array<{ category: string; severity: string; message: string; count: number }> = [];
  const suggestions: Array<{ category: string; message: string }> = [];
  let totalWeight = 0;
  let weightedScore = 0;

  for (const check of CHECKS) {
    const result = await check.check(admin, userId);
    category_scores[check.id] = result.score;
    weightedScore += result.score * check.weight;
    totalWeight += check.weight;

    result.issues.forEach((issue) => {
      allIssues.push({ category: check.id, ...issue });
    });

    if (result.score < 80) {
      switch (check.id) {
        case 'duplicate_invoices':
          suggestions.push({ category: check.id, message: 'Vérifiez et supprimez les factures en doublon' });
          break;
        case 'duplicate_expenses':
          suggestions.push({ category: check.id, message: 'Utilisez la détection de doublons pour nettoyer vos dépenses' });
          break;
        case 'uncategorized_expenses':
          suggestions.push({ category: check.id, message: 'Catégorisez vos dépenses pour améliorer le suivi comptable' });
          break;
        case 'vat_consistency':
          suggestions.push({ category: check.id, message: 'Corrigez les montants TVA incohérents dans vos dépenses' });
          break;
        case 'unreconciled_transactions':
          suggestions.push({ category: check.id, message: 'Rapprochez vos transactions bancaires avec vos dépenses' });
          break;
        case 'overdue_invoices':
          suggestions.push({ category: check.id, message: 'Relancez vos clients pour les factures en retard' });
          break;
        case 'missing_client_info':
          suggestions.push({ category: check.id, message: 'Complétez les informations de vos clients (email, SIRET)' });
          break;
        case 'expenses_without_receipts':
          suggestions.push({ category: check.id, message: 'Ajoutez des justificatifs à vos dépenses' });
          break;
      }
    }
  }

  const overall_score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;

  return { overall_score, category_scores, issues: allIssues, suggestions };
}

export { CHECKS };

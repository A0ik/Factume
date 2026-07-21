// ---------------------------------------------------------------------------
// DÉDALOS / Dext-killer — Intelligence fournisseur + détection de doublons
// Server-side, partagé entre l'OCR save (lib/ocr-core) et les routes API.
// Reproduit le comportement phare de Dext : chaque document nourrit le profil
// fournisseur (montant typique, catégories, cadence, confiance) et est vérifié
// contre l'historique pour détecter un doublon.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface ExpenseSignal {
  vendor: string | null;
  category?: string | null;
  amount?: number | null;      // TTC
  date?: string | null;
  ocr_confidence?: number | null;
  ocr_invoice_number?: string | null;
}

export interface SavedExpenseRef {
  id: string;
  vendor?: string | null;
  amount?: number | null;
  vat_amount?: number | null;
  date?: string | null;
  ocr_invoice_number?: string | null;
}

/**
 * HERMÈS CIBLE 1 — Résout (ou crée) l'entrée vendor_intelligence d'un fournisseur.
 * Ordre de matching : SIRET exact → VAT exact → nom (ilike). Retourne l'id de la
 * ligne (ou null si aucun nom). Ne touche PAS aux stats — c'est le rôle de
 * learnVendorIntelligence, appelé après l'insert de l'expense.
 *
 * C'est le chaînon manquant : chaque facture scannée est maintenant reliée à une
 * entrée du référentiel fournisseur (la table vendor_intelligence qui alimente
 * la page /suppliers), via la FK expenses.vendor_intelligence_id.
 */
export async function resolveOrCreateVendor(
  supabase: SupabaseLike,
  userId: string,
  signal: {
    vendor: string | null;
    siret?: string | null;
    vat?: string | null;
  },
): Promise<string | null> {
  const vendorName = signal.vendor?.trim();
  if (!vendorName) return null;

  const siret = signal.siret?.trim() || null;
  const vat = signal.vat?.trim() || null;

  // 1) SIRET exact
  if (siret) {
    const { data: bySiret } = await supabase
      .from('vendor_intelligence')
      .select('id')
      .eq('user_id', userId)
      .eq('vendor_siret', siret)
      .maybeSingle();
    if (bySiret?.id) return bySiret.id;
  }

  // 2) VAT exact
  if (vat) {
    const { data: byVat } = await supabase
      .from('vendor_intelligence')
      .select('id')
      .eq('user_id', userId)
      .eq('vat_number', vat)
      .maybeSingle();
    if (byVat?.id) return byVat.id;
  }

  // 3) Nom (ilike) — cohérent avec le comportement historique
  const { data: byName } = await supabase
    .from('vendor_intelligence')
    .select('id')
    .eq('user_id', userId)
    .ilike('vendor_name', vendorName)
    .maybeSingle();
  if (byName?.id) return byName.id;

  // 4) Création minimale (les stats seront nourries par learnVendorIntelligence).
  //    vendor_siret a une contrainte UNIQUE → on ne l'insère que si présent.
  const insert: Record<string, unknown> = {
    user_id: userId,
    vendor_name: vendorName,
    typical_categories: [],
    typical_amount_range: { min: 0, max: 0 },
    total_invoices: 0,
    total_purchases: 0,
    ocr_confidence_avg: 0,
  };
  if (siret) insert.vendor_siret = siret;
  if (vat) insert.vat_number = vat;

  const { data: created, error } = await supabase
    .from('vendor_intelligence')
    .insert(insert)
    .select('id')
    .single();

  if (error || !created?.id) {
    // Race possible (double scan simultané) → on retente le match
    if (siret) {
      const { data: r } = await supabase
        .from('vendor_intelligence')
        .select('id')
        .eq('user_id', userId)
        .eq('vendor_siret', siret)
        .maybeSingle();
      if (r?.id) return r.id;
    }
    const { data: r2 } = await supabase
      .from('vendor_intelligence')
      .select('id')
      .eq('user_id', userId)
      .ilike('vendor_name', vendorName)
      .maybeSingle();
    return r2?.id ?? null;
  }
  return created.id;
}

/**
 * Apprend (crée ou met à jour) le profil d'intelligence d'un fournisseur
 * à partir d'une dépense. Idempotent. Cœur de l'automatisation
 * « Supplier Rules / auto-categorize » façon Dext.
 *
 * HERMÈS CIBLE 1 : accepte un `vendorId` optionnel (résolu par
 * resolveOrCreateVendor) pour mettre à jour la BONNE ligne même si le nom
 * OCR diffère d'une orthographe existante.
 */
export async function learnVendorIntelligence(
  supabase: SupabaseLike,
  userId: string,
  exp: ExpenseSignal,
  vendorId?: string | null,
): Promise<void> {
  const vendorName = exp.vendor?.trim();
  if (!vendorName && !vendorId) return;

  const now = new Date().toISOString();
  const amount = Number(exp.amount) || 0;
  const confidence = Number(exp.ocr_confidence) || 0.8;
  const day = exp.date ? `day_${new Date(exp.date).getDate()}` : null;

  // Priorise l'id résolu (SIRET/VAT/name) au matching ilike
  const { data: existing } = vendorId
    ? await supabase.from('vendor_intelligence').select('*').eq('id', vendorId).maybeSingle()
    : await supabase
        .from('vendor_intelligence')
        .select('*')
        .eq('user_id', userId)
        .ilike('vendor_name', vendorName ?? '')
        .maybeSingle();

  if (existing) {
    const total = (Number(existing.total_invoices) || 0) + 1;
    const curMin = existing.typical_amount_range?.min ?? amount;
    const curMax = existing.typical_amount_range?.max ?? amount;
    const cats: string[] = Array.isArray(existing.typical_categories) ? existing.typical_categories : [];
    const patterns: string[] = Array.isArray(existing.invoice_patterns) ? existing.invoice_patterns : [];

    const upd: Record<string, unknown> = {
      total_invoices: total,
      total_purchases: (Number(existing.total_purchases) || 0) + amount,
      last_seen: now,
      updated_at: now,
      ocr_confidence_avg:
        ((Number(existing.ocr_confidence_avg) || 0) * (total - 1) + confidence) / total,
      typical_amount_range: { min: Math.min(curMin, amount), max: Math.max(curMax, amount) },
      typical_categories: exp.category && !cats.includes(exp.category) ? [...cats, exp.category] : cats,
      invoice_patterns: day && !patterns.includes(day) ? [...patterns, day] : patterns,
    };

    await supabase.from('vendor_intelligence').update(upd).eq('id', existing.id);
    return;
  }

  // vendor_name est NOT NULL en BDD — garde-fou (cas tordu : vendorId fourni
  // mais ligne supprimée entre resolve et learn, sans nom exploitable).
  if (!vendorName) return;

  await supabase.from('vendor_intelligence').insert({
    user_id: userId,
    vendor_name: vendorName,
    typical_categories: exp.category ? [exp.category] : [],
    typical_amount_range: { min: amount, max: amount },
    total_invoices: 1,
    total_purchases: amount,
    last_seen: now,
    invoice_patterns: day ? [day] : [],
    ocr_confidence_avg: confidence,
  });
}

/**
 * Détecte un doublon d'une dépense nouvellement créée contre l'historique du
 * même fournisseur (score pondéré montant 50% / date 30% / n° facture 20%).
 * Persiste duplicate_of_expense_id + duplicate_score (la route check-duplicate
 * existait mais n'était jamais appelée — on rend la détection réelle).
 */
export async function detectDuplicate(
  supabase: SupabaseLike,
  userId: string,
  saved: SavedExpenseRef,
): Promise<{ id: string; score: number } | null> {
  const vendor = saved.vendor?.trim();
  const amt = Number(saved.amount) || 0;
  if (!vendor || !amt) {
    await supabase.from('expenses').update({ duplicate_check_performed: true }).eq('id', saved.id);
    return null;
  }

  const { data: candidates } = await supabase
    .from('expenses')
    .select('id, vendor, amount, vat_amount, date, ocr_invoice_number')
    .eq('user_id', userId)
    .ilike('vendor', vendor)
    .neq('id', saved.id)
    .order('created_at', { ascending: false })
    .limit(25);

  let best: { id: string; score: number } | null = null;

  for (const c of candidates || []) {
    const amtDiff = Math.abs(Number(c.amount) - amt);
    const amtScore = amt > 0 ? Math.max(0, 1 - amtDiff / amt) : 0;

    let dateScore = 0;
    if (c.date && saved.date) {
      const days = Math.abs(new Date(c.date).getTime() - new Date(saved.date).getTime()) / 86_400_000;
      dateScore = Math.max(0, 1 - days / 30);
    }

    const invScore =
      saved.ocr_invoice_number && c.ocr_invoice_number && saved.ocr_invoice_number === c.ocr_invoice_number
        ? 1
        : 0;

    const score = amtScore * 0.5 + dateScore * 0.3 + invScore * 0.2;
    if (score >= 0.85 && (!best || score > best.score)) best = { id: c.id, score };
  }

  if (best) {
    await supabase
      .from('expenses')
      .update({
        duplicate_of_expense_id: best.id,
        duplicate_score: Math.round(best.score * 100) / 100,
        duplicate_check_performed: true,
      })
      .eq('id', saved.id);
    return best;
  }

  await supabase.from('expenses').update({ duplicate_check_performed: true }).eq('id', saved.id);
  return null;
}

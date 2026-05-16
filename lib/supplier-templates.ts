import { createServerSupabaseClient } from '@/lib/supabase-server';

export interface SupplierTemplate {
  vendor_name: string;
  default_category?: string;
  default_account_code?: string;
  default_vat_rate?: number;
  default_payment_method?: string;
  invoice_format_hints?: Record<string, string>;
}

export async function findSupplierTemplate(userId: string, vendorName: string): Promise<SupplierTemplate | null> {
  const supabase = await createServerSupabaseClient();

  // Exact match on supplier_name
  const { data: exact } = await supabase
    .from('supplier_templates')
    .select('*')
    .eq('user_id', userId)
    .ilike('supplier_name', vendorName)
    .maybeSingle();

  if (exact) return mapRowToTemplate(exact);

  // Fuzzy match: partial name
  const normalized = vendorName.toLowerCase().split(/\s+/).slice(0, 2).join(' ');
  const { data: fuzzy } = await supabase
    .from('supplier_templates')
    .select('*')
    .eq('user_id', userId)
    .ilike('supplier_name', `%${normalized}%`)
    .limit(1)
    .maybeSingle();

  return fuzzy ? mapRowToTemplate(fuzzy) : null;
}

export async function saveSupplierTemplate(userId: string, template: SupplierTemplate): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const templateFields: Record<string, unknown> = {};
  if (template.default_category) templateFields.default_category = template.default_category;
  if (template.default_account_code) templateFields.default_account_code = template.default_account_code;
  if (template.default_vat_rate !== undefined) templateFields.default_vat_rate = template.default_vat_rate;
  if (template.default_payment_method) templateFields.default_payment_method = template.default_payment_method;
  if (template.invoice_format_hints) templateFields.invoice_format_hints = template.invoice_format_hints;

  await supabase
    .from('supplier_templates')
    .upsert({
      user_id: userId,
      supplier_name: template.vendor_name,
      template_fields: Object.keys(templateFields).length > 0 ? templateFields : null,
      usage_count: 1,
      sample_count: 1,
      confidence_score: 0.5,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'user_id,supplier_name' });
}

export async function incrementTemplateUsage(userId: string, vendorName: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.rpc('increment_supplier_usage', { p_user_id: userId, p_supplier_name: vendorName });
}

function mapRowToTemplate(row: Record<string, unknown>): SupplierTemplate {
  const fields = (row.template_fields || {}) as Record<string, unknown>;
  return {
    vendor_name: row.supplier_name as string,
    default_category: fields.default_category as string | undefined,
    default_account_code: fields.default_account_code as string | undefined,
    default_vat_rate: fields.default_vat_rate as number | undefined,
    default_payment_method: fields.default_payment_method as string | undefined,
    invoice_format_hints: fields.invoice_format_hints as Record<string, string> | undefined,
  };
}

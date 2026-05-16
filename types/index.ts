export interface Profile {
  id: string;
  email: string;
  company_name: string;
  first_name?: string;
  last_name?: string;
  siret?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  vat_number?: string;
  logo_url?: string;
  template_id: number;
  accent_color: string;
  legal_status: LegalStatus;
  subscription_tier: SubscriptionTier;
  invoice_count: number;
  monthly_invoice_count: number;
  invoice_month: string;
  invoice_prefix: string;
  currency?: string;
  onboarding_done: boolean;
  custom_template_html?: string;
  stripe_account_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  // Stripe Connect fields
  stripe_connect_account_id?: string;
  stripe_connect_access_token?: string;
  stripe_connect_refresh_token?: string;
  stripe_connect_token_expires_at?: string;
  stripe_connect_onboarding_completed?: boolean;
  sumup_access_token?: string;
  sumup_refresh_token?: string;
  sumup_token_expires_at?: string;
  sumup_merchant_id?: string;
  sumup_merchant_code?: string;
  sumup_email?: string;
  signature_url?: string;
  language?: 'fr' | 'en';
  web_push_subscription?: string;
  sector?: string;
  bank_name?: string;
  iban?: string;
  bic?: string;
  payment_terms?: string;
  legal_mention?: string;
  custom_payment_terms?: string;
  rcs_number?: string;
  rm_number?: string;
  capital_social?: string;
  naf_code?: string;
  regime_fiscal?: string;
  cgv_text?: string;
  voice_language?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  is_trial_active?: boolean;
  auto_contract_transitions?: boolean;
  website?: string;
  referral_code?: string;
  created_at: string;
}

export type PaymentTermsPreset = 'reception' | 'days15' | 'days30' | 'days45' | 'days60' | 'end_of_month' | 'end_of_month_plus_days' | 'end_of_next_month' | 'custom';

export interface PaymentTerm {
  id: string;
  user_id: string;
  name: string;
  days: number;
  is_default: boolean;
  created_at: string;
}

export type LegalStatus = 'auto-entrepreneur' | 'eirl' | 'eurl' | 'sarl' | 'sas' | 'sasu' | 'sa' | 'autre';
export type SubscriptionTier = 'free' | 'trial' | 'solo' | 'pro' | 'business';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  siret?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  vat_number?: string;
  notes?: string;
  tags?: string[];
  website?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface PartialPayment {
  id: string;
  invoice_id: string;
  amount: number;
  paid_at: string;
  method?: string;
  note?: string;
}

export interface WebhookEndpoint {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total: number;
}

export type DocumentType = 'invoice' | 'quote' | 'credit_note' | 'purchase_order' | 'delivery_note' | 'deposit';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'accepted' | 'refused' | 'cancelled' | 'refunded' | 'rejected' | 'expired' | 'pending' | 'partial' | 'delivered';

export interface Invoice {
  id: string;
  user_id: string;
  client_id?: string;
  client?: Client;
  client_name_override?: string;
  number: string;
  document_type: DocumentType;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string;
  items: InvoiceItem[];
  subtotal: number;
  vat_amount: number;
  discount_percent?: number | null;
  discount_amount?: number | null;
  total: number;
  notes?: string;
  pdf_url?: string;
  payment_link?: string;
  payment_method?: string;
  stripe_payment_url?: string;
  stripe_payment_link_id?: string;
  stripe_payment_link_url?: string;
  sumup_checkout_id?: string;
  partial_payments?: PartialPayment[];
  amount_paid?: number;
  voice_transcript?: string;
  linked_invoice_id?: string;
  sent_at?: string;
  paid_at?: string;
  client_signature_url?: string;
  signed_at?: string;
  signed_by?: string;
  signed_ip?: string;
  created_at: string;
  updated_at: string;
  // Détails supplémentaires
  order_reference?: string;
  order_number?: string;
  internal_notes?: string;
  legal_mentions?: string;
  // Contact client (modifiables même si client lié)
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_siret?: string;
  client_vat_number?: string;
  payment_terms_id?: string;
}

export interface ParsedVoiceInvoice {
  client_name: string | null;
  items: Array<{ description: string; quantity: number; unit_price: number; vat_rate: number }>;
  notes: string | null;
  due_days: number;
}

export interface DashboardStats {
  mrr: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  totalRevenue: number;
  pendingRevenue: number;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringInvoice {
  id: string;
  user_id: string;
  client_id?: string;
  client?: Client;
  client_name_override?: string;
  document_type: DocumentType;
  frequency: RecurringFrequency;
  items: InvoiceItem[];
  notes?: string;
  next_run_date: string;
  last_run_date?: string;
  is_active: boolean;
  auto_send: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFormData {
  document_type?: DocumentType;
  client_id?: string;
  client_name_override?: string;
  issue_date: string;
  due_date?: string;
  items: Omit<InvoiceItem, 'total'>[];
  notes?: string;
  linked_invoice_id?: string;
  discount_percent?: number;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_siret?: string;
  client_vat_number?: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  client_id?: string;
  client?: Client;
  title: string;
  description?: string;
  location?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  color: string;
  google_event_id?: string;
  created_at: string;
}

export type CaptureStatus = 'pending' | 'reviewed' | 'published';
export type InvoiceType = 'purchase' | 'sales' | 'expense' | 'receipt';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'cancelled';
export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
}

export interface CapturedDocument {
  id: string;
  user_id: string;
  client_id?: string;
  workspace_id?: string;
  file_url: string;
  file_type: string;
  status: CaptureStatus;
  ocr_data?: Record<string, any>;
  vendor?: string;
  description?: string;
  amount: number;
  vat_amount: number;
  vat_rate: number;
  document_date?: string;
  due_date?: string;
  category?: string;
  payment_method?: string;
  notes?: string;
  supplier_reference?: string;
  reviewed_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  confidence_score?: number;
  needs_review?: boolean;
  account_code?: string;
  account_name?: string;
  matched_transaction_id?: string;
  // New Dext fields
  line_items?: InvoiceLineItem[];
  invoice_type?: InvoiceType;
  // Payment fields (SEPA)
  supplier_iban?: string;
  supplier_bic?: string;
  supplier_bank_name?: string;
  payment_status?: PaymentStatus;
  payment_due_date?: string;
  sepa_generated?: boolean;
  sepa_file_url?: string;
}

export interface VendorMapping {
  id: string;
  user_id: string;
  vendor_name_pattern: string;
  account_code: string;
  account_name?: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  user_id: string;
  workspace_id?: string;
  amount: number;
  transaction_date: string;
  label: string;
  currency: string;
  source: string;
  status: 'unreconciled' | 'reconciled';
  bank_connection_id?: string;
  external_id?: string;
  description?: string;
  matched_expense_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  description?: string;
  logo_url?: string;
  plan: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  role: WorkspaceRole;
  status: 'pending' | 'active' | 'declined' | 'removed';
  invited_by?: string;
  joined_at?: string;
  created_at: string;
}

export interface MerchantConnection {
  id: string;
  user_id: string;
  workspace_id?: string;
  provider: string;
  provider_account_id?: string;
  credentials_encrypted: string;
  credentials_key_id?: string;
  status: 'active' | 'suspended' | 'error' | 'revoked';
  last_sync_at?: string;
  sync_error?: string;
  auto_import: boolean;
  import_settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type MerchantProvider = 'amazon' | 'orange' | 'uber' | 'apple' | 'google' | 'microsoft' | 'other';

export interface Integration {
  id: string;
  user_id: string;
  workspace_id?: string;
  provider: 'pennylane' | 'sage' | 'bridge' | 'other';
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BankConnection {
  id: string;
  user_id: string;
  workspace_id?: string;
  provider: string;
  connection_id?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  bank_name?: string;
  bank_logo?: string;
  status: 'active' | 'disconnected' | 'error';
  last_synced_at?: string;
  created_at: string;
}

export interface DataHealthScan {
  id: string;
  user_id: string;
  workspace_id?: string;
  overall_score: number;
  category_scores: Record<string, number>;
  issues: Array<{ category: string; severity: string; message: string; count: number }>;
  suggestions: Array<{ category: string; message: string }>;
  scanned_at: string;
  created_at: string;
}

export interface Cabinet {
  id: string;
  name: string;
  owner_id: string;
  siret?: string;
  logo_url?: string;
  settings: Record<string, any>;
  created_at: string;
  primary_color?: string;
  white_label_name?: string;
  hide_factu_branding?: boolean;
  custom_domain?: string;
}

export interface CabinetMember {
  id: string;
  cabinet_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'viewer';
  created_at: string;
}

export interface CabinetClient {
  id: string;
  cabinet_id: string;
  client_user_id: string;
  status: 'pending' | 'active' | 'disconnected';
  invited_at: string;
  connected_at?: string;
}

export const MERCHANT_PROVIDERS: Record<MerchantProvider, { name: string; icon: string; color: string; logoClass: string }> = {
  amazon: { name: 'Amazon Business', icon: 'package', color: 'bg-gradient-to-br from-orange-500 to-amber-600', logoClass: 'text-white' },
  orange: { name: 'Orange Business', icon: 'zap', color: 'bg-gradient-to-br from-orange-500 to-orange-600', logoClass: 'text-white' },
  uber: { name: 'Uber for Business', icon: 'car', color: 'bg-gradient-to-br from-gray-800 to-black', logoClass: 'text-white' },
  apple: { name: 'Apple Business', icon: 'smartphone', color: 'bg-gradient-to-br from-gray-700 to-gray-900', logoClass: 'text-white' },
  google: { name: 'Google Workspace', icon: 'layout-grid', color: 'bg-gradient-to-br from-blue-500 to-blue-600', logoClass: 'text-white' },
  microsoft: { name: 'Microsoft 365', icon: 'file-text', color: 'bg-gradient-to-br from-blue-600 to-blue-700', logoClass: 'text-white' },
  other: { name: 'Autre fournisseur', icon: 'more-horizontal', color: 'bg-gradient-to-br from-gray-400 to-gray-500', logoClass: 'text-white' },
};

// ============================
// CONTRATS DE TRAVAIL
// ============================

export type ContractType = 'cdi' | 'cdd' | 'other';
export type ContractCategory = 'apprentissage' | 'professionnalisation' | 'cui_cie' | 'cui_cae' | 'portage' | 'interim' | 'domicile' | 'stage' | 'freelance' | 'other';
export type ContractStatus = 'draft' | 'pending_signature' | 'signed' | 'active' | 'ended' | 'terminated' | 'cancelled';
export type SalaryFrequency = 'monthly' | 'hourly' | 'weekly' | 'flat_rate';

export interface ContractBase {
  id: string;
  user_id: string;
  contract_number: string;
  contract_type: ContractType;
  document_status: ContractStatus;

  employee_first_name: string;
  employee_last_name: string;
  employee_address: string;
  employee_postal_code: string;
  employee_city: string;
  employee_email?: string;
  employee_phone?: string;
  employee_birth_date: string;
  employee_social_security?: string;
  employee_nationality: string;
  employee_qualification?: string;

  company_name: string;
  company_address: string;
  company_postal_code: string;
  company_city: string;
  company_siret: string;
  employer_name: string;
  employer_title: string;

  job_title: string;
  work_location: string;
  work_schedule: string;
  salary_amount: number;
  salary_frequency: SalaryFrequency;

  has_transport: boolean;
  has_meal: boolean;
  has_health: boolean;
  has_other: boolean;
  other_benefits?: string;

  contract_start_date: string;
  trial_period_days?: number;

  contract_html?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractCDI extends ContractBase {
  contract_type: 'cdi';
  contract_classification?: string;
  working_hours?: string;
  collective_agreement?: string;
  probation_clause: boolean;
  non_compete_clause: boolean;
  non_compete_duration?: string;
  non_compete_compensation?: string;
  non_compete_area?: string;
  mobility_clause: boolean;
  mobility_area?: string;
}

export interface ContractCDD extends ContractBase {
  contract_type: 'cdd';
  contract_end_date: string;
  contract_reason: string;
  replaced_employee_name?: string;
  collective_agreement?: string;
  probation_clause: boolean;
  non_compete_clause: boolean;
  mobility_clause: boolean;
}

export interface ContractOther extends ContractBase {
  contract_type: 'other';
  contract_category: ContractCategory;
  contract_title?: string;
  duration_weeks?: string;
  end_date?: string;
  tutor_name?: string;
  school_name?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  working_hours?: string;
  collective_agreement?: string;
  statut?: string;
  salary_frequency: SalaryFrequency;
}

export type Contract = ContractCDI | ContractCDD | ContractOther;

export function isCDI(c: Contract): c is ContractCDI { return c.contract_type === 'cdi'; }
export function isCDD(c: Contract): c is ContractCDD { return c.contract_type === 'cdd'; }
export function isOther(c: Contract): c is ContractOther { return c.contract_type === 'other'; }

export interface ContractSummary {
  id: string;
  contract_number: string;
  contract_type: ContractType;
  contract_category?: ContractCategory;
  employee_name: string;
  company_name: string;
  job_title: string;
  start_date: string;
  end_date?: string;
  status: ContractStatus;
  salary_amount: number;
  salary_frequency: SalaryFrequency;
  created_at: string;
  // Signature tracking
  signing_token_expires_at?: string;
  signing_view_count?: number;
  // Renewal tracking
  renewal_count?: number;
}

export interface ContractDashboardStats {
  total: number;
  drafts: number;
  pendingSignature: number;
  signed: number;
  active: number;
  ended: number;
  byType: Record<ContractType, number>;
}

export interface ContractFormData {
  contract_type: ContractType;
  contract_category?: ContractCategory;
  contract_number?: string;

  employee_first_name: string;
  employee_last_name: string;
  employee_address: string;
  employee_postal_code: string;
  employee_city: string;
  employee_email?: string;
  employee_phone?: string;
  employee_birth_date: string;
  employee_social_security?: string;
  employee_nationality: string;
  employee_qualification?: string;

  company_name: string;
  company_address: string;
  company_postal_code: string;
  company_city: string;
  company_siret: string;
  employer_name: string;
  employer_title: string;

  job_title: string;
  work_location: string;
  work_schedule: string;
  salary_amount: string;
  salary_frequency: SalaryFrequency;

  has_transport: boolean;
  has_meal: boolean;
  has_health: boolean;
  has_other: boolean;
  other_benefits?: string;

  contract_start_date: string;
  trial_period_days?: string;

  contract_end_date?: string;
  contract_reason?: string;
  replaced_employee_name?: string;

  contract_classification?: string;
  working_hours?: string;
  collective_agreement?: string;
  probation_clause?: boolean;
  non_compete_clause?: boolean;
  non_compete_duration?: string;
  non_compete_compensation?: string;
  non_compete_area?: string;
  mobility_clause?: boolean;
  mobility_area?: string;

  contract_title?: string;
  duration_weeks?: string;
  tutor_name?: string;
  school_name?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  statut?: string;

  employer_signature?: string;
  employee_signature?: string;
  employer_signature_date?: string;
  employee_signature_date?: string;
}

export interface ContractRenewal {
  id: string;
  original_contract_id: string;
  renewed_contract_id: string | null;
  contract_type: ContractType;
  user_id: string;
  renewal_number: number;
  previous_end_date: string;
  new_end_date: string;
  renewal_reason: string | null;
  created_at: string;
}

export type AmendmentType = 'salary_change' | 'schedule_change' | 'location_change' | 'position_change' | 'other';

export interface ContractAmendment {
  id: string;
  contract_id: string;
  contract_type: ContractType;
  user_id: string;
  amendment_number: string;
  amendment_type: AmendmentType;
  description: string;
  changes: Record<string, { old: any; new: any; label: string }>;
  effective_date: string;
  document_status: ContractStatus;
  employer_signature?: string;
  employee_signature?: string;
  employer_signature_date?: string;
  employee_signature_date?: string;
  created_at: string;
}

export interface ContractAttachment {
  id: string;
  contract_id: string;
  contract_type: ContractType;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  description?: string;
  category: 'identity' | 'diploma' | 'contract' | 'other';
  created_at: string;
  updated_at: string;
}

export interface ContractComment {
  id: string;
  contract_id: string;
  contract_type: ContractType;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ============================
// TYPES FOR PROCESS VOICE API
// ============================

export interface VoiceExistingItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface VoiceParsedResponse {
  action: 'added' | 'modified' | 'removed' | 'replaced';
  summary: string | null;
  client_name: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_postal_code?: string | null;
  client_siret?: string | null;
  client_vat_number?: string | null;
  items: VoiceExistingItem[];
  due_days: number | null;
  notes: string | null;
  discount_percent?: number;
}

export interface VoiceProcessResponse {
  transcript: string;
  originalTranscript: string;
  wasTranslated: boolean;
  originalLanguage: string;
  parsed: VoiceParsedResponse;
  action: string;
  summary: string | null;
}

// ============================
// TYPES FOR DATA STORE
// ============================

export interface UserProfile {
  id: string;
  invoice_prefix?: string;
  invoice_count?: number;
  [key: string]: any;
}

export interface InvoiceUpdateData {
  items?: InvoiceItem[];
  discount_percent?: number | null;
  status?: InvoiceStatus;
  [key: string]: any;
}

// ============================
// TYPES FOR WORKFLOWS
// ============================

export interface Expense {
  id: string;
  amount: number;
  vendor?: string;
  category?: string;
  ocr_confidence?: number;
  category_confidence?: number;
  receipt_url?: string;
  line_items_count?: number;
  ocr_line_items?: Array<{ [key: string]: any }>;
  validation_status?: string;
  [key: string]: any;
}

export interface WorkflowHistoryEntry {
  user_id: string;
  expense_id: string;
  workflow_type: string;
  from_status: string | null;
  to_status: string | null;
  triggered_by: string;
  rule_id?: string;
  notes: string;
  [key: string]: any;
}

export interface ValidationResult {
  status: string;
  confidence: number;
  rule_used: string | null;
}

export interface ValidationRuleUpdateData {
  conditions: {
    min_amount?: number;
    max_amount?: number;
    category?: string[];
    vendor?: string[];
    ocr_confidence_min?: number;
    has_receipt?: boolean;
    line_items_count_min?: number;
    [key: string]: any;
  };
  actions: {
    auto_validate?: boolean;
    require_approval?: boolean;
    set_status?: string;
    add_note?: boolean;
    [key: string]: any;
  };
  priority?: number;
  is_active?: boolean;
  [key: string]: any;
}

// ============================
// ERROR TYPES
// ============================

export interface APIError extends Error {
  status?: number;
  code?: string;
  message: string;
}

// ============================
// TYPES FOR INVOICE VIEWER
// ============================

export interface UpdatedExpenseData {
  vendor?: string;
  amount?: number;
  date?: string;
  [key: string]: unknown;
}

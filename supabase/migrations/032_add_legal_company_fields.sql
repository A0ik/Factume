-- Add legal company fields for French invoice compliance
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rcs_number text,
  ADD COLUMN IF NOT EXISTS rm_number text,
  ADD COLUMN IF NOT EXISTS capital_social text,
  ADD COLUMN IF NOT EXISTS naf_code text,
  ADD COLUMN IF NOT EXISTS regime_fiscal text DEFAULT 'reel',
  ADD COLUMN IF NOT EXISTS cgv_text text,
  ADD COLUMN IF NOT EXISTS voice_language text DEFAULT 'fr';

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_email ON public.clients(user_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_date ON public.invoices(user_id, issue_date DESC);

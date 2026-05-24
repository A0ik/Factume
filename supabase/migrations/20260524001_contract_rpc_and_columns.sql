-- Migration: Contract RPC + missing columns
-- Date: 2024-05-24
-- Fixes: contract creation hangs because increment_contract_count RPC doesn't exist

-- 1. Create the increment_contract_count RPC function
CREATE OR REPLACE FUNCTION public.increment_contract_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET contract_count = COALESCE(contract_count, 0) + 1
  WHERE id = p_user_id
  RETURNING contract_count INTO new_count;

  RETURN new_count;
END;
$$;

-- 2. Add renewal_count column to all 3 contract tables
ALTER TABLE public.contracts_cdi ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;
ALTER TABLE public.contracts_cdd ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;
ALTER TABLE public.contracts_other ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;

-- 3. Add original_contract_id for renewal tracking
ALTER TABLE public.contracts_cdi ADD COLUMN IF NOT EXISTS original_contract_id UUID;
ALTER TABLE public.contracts_cdd ADD COLUMN IF NOT EXISTS original_contract_id UUID;
ALTER TABLE public.contracts_other ADD COLUMN IF NOT EXISTS original_contract_id UUID;

-- 4. Add view_count to contract_signing_tokens
ALTER TABLE public.contract_signing_tokens ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 5. Create contract_renewals table
CREATE TABLE IF NOT EXISTS public.contract_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_contract_id UUID NOT NULL,
  renewed_contract_id UUID NOT NULL,
  contract_type TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renewal_number INTEGER NOT NULL DEFAULT 1,
  previous_end_date DATE,
  new_end_date DATE,
  renewal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contract_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own renewals" ON public.contract_renewals
  FOR ALL USING (user_id = auth.uid());

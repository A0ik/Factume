-- White label branding for cabinets
ALTER TABLE public.cabinets
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS white_label_name text,
  ADD COLUMN IF NOT EXISTS hide_factu_branding boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain text;

-- Referral rewards tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_reward_months integer DEFAULT 0;

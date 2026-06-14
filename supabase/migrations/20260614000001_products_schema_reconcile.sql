-- Réconciliation du schéma `products` (drift constaté Juin 2026).
-- Les colonnes reference / is_active / updated_at existent en production mais
-- n'étaient présentes dans AUCUN fichier de migration committé. Sans ce fichier,
-- un rebuild depuis les migrations laisse l'appli cassée (le code les utilise).
-- Idempotent : ADD COLUMN IF NOT EXISTS → no-op sur une DB déjà à jour.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Horodateur updated_at automatique sur UPDATE (fonction shared du projet).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index utiles (déjà présents partiellement, on sécurise).
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(user_id, is_active);

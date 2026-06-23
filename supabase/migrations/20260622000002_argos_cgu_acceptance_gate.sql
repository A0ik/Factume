-- ARGOS (CIBLE 1) — Preuve d'acceptation des CGU/CGV opposable.
-- Ajoute une trace horodatée de l'acceptation sur le profil. Le middleware redirige tout
-- utilisateur non-acceptant vers /legal/accept avant l'accès à l'app (couvre Google OAuth
-- ET l'inscription email au même endroit). Backfill des utilisateurs existants à true
-- (ils ne sont pas interrompus ; seuls les nouveaux comptes passent par le gate).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cgu_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cgu_accepted_at timestamptz;

-- Backfill : les comptes déjà créés sont réputés avoir accepté (continuité de service).
UPDATE public.profiles
  SET cgu_accepted = true, cgu_accepted_at = COALESCE(cgu_accepted_at, created_at, now())
  WHERE cgu_accepted = false;

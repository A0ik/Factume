-- =====================================================================
-- 20260620000001_drop_referral_system.sql
-- PROMETHEUS — CIBLE 4 : Suppression définitive du parrainage.
--
-- Le système de parrainage ("1 mois gratuit par ami inscrit") n'a jamais
-- été réellement câblé côté serveur (aucune prolongation d'abonnement,
-- aucun coupon Stripe). On purge proprement la BDD.
--
-- `IF EXISTS` est obligatoire : `referrals` et `profiles.referral_code`
-- n'ont jamais figuré dans une migration (créés manuellement), tandis que
-- `referral_reward_months` provient de la migration 033_cabinet_white_label.
-- =====================================================================

-- 1) Table de suivi des parrainages (si elle existe).
DROP TABLE IF EXISTS public.referrals CASCADE;

-- 2) Colonnes de profil liées au parrainage.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_reward_months;

-- 3) Les index (s'ils existent) tombent automatiquement avec les colonnes /
--    la table, mais on nettoie explicitement au cas où ils auraient été créés
--    à la main avec un nom non conventionnel.
DROP INDEX IF EXISTS public.idx_profiles_referral_code;
DROP INDEX IF EXISTS public.idx_referrals_referrer_id;
DROP INDEX IF EXISTS public.idx_referrals_code;

-- ============================================================================
-- REVERT HERMÈS CIBLE 3 v2 — Abandon Swan (trop onéreux), retour Stripe pont.
-- Détruit les tables wallets/wallet_transactions introduites par la migration
-- 20260721000003 (supprimée du repo). Le pont Stripe Issuing (stripe_cards +
-- profiles.stripe_cardholder_id, migration 20260721000002) reste en place.
-- ============================================================================

DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;

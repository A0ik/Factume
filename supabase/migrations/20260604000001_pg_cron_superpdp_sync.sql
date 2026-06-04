-- ============================================================
-- pg_cron + pg_net : Synchronisation SuperPDP toutes les 10 min
-- ============================================================
--
-- Ce migration remplace le Vercel Cron (limité à 1x/jour en Hobby)
-- par un pg_cron qui appelle nos endpoints API toutes les 10 minutes.
--
-- PRÉREQUIS :
--   1. Activer pg_cron   : Dashboard → Database → Extensions → pg_cron
--   2. Activer pg_net    : Dashboard → Database → Extensions → pg_net
--   3. Définir APP_URL   : remplacez ci-dessous par votre URL de production
--   4. Définir CRON_SECRET : doit matcher la variable d'environnement Vercel
--
-- ⚠️  IMPORTANT : Remplacez les valeurs ci-dessous avant d'exécuter !
-- ============================================================

-- ── Étape 1 : Activer les extensions (si pas déjà fait) ────────────

-- NOTE : Sur Supabase, pg_cron et pg_net s'activent via le Dashboard
-- ou via les commandes SQL suivantes (décommentez si nécessaire) :

-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Étape 2 : Ajouter la colonne pour le cache de statut ───────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS einvoice_status_checked_at TIMESTAMPTZ;

-- Index pour accélérer les requêtes de sync (si pas déjà existant)
CREATE INDEX IF NOT EXISTS idx_invoices_einvoice_checked
  ON invoices (einvoice_status_checked_at)
  WHERE pdp_status = 'transmitted';

-- ── Étape 3 : Fonction de sync pg_cron ─────────────────────────────
-- Appelle POST /api/cron/pdp-sync avec le CRON_SECRET

CREATE OR REPLACE FUNCTION public.sync_superpdp_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url text := coalesce(
    current_setting('app.settings.url', true),
    'https://factu.me'  -- ⚠️ REMPLACEZ PAR VOTRE URL
  );
  cron_secret text := coalesce(
    current_setting('app.settings.cron_secret', true),
    ''  -- ⚠️ REMPLACEZ PAR VOTRE CRON_SECRET
  );
  request_id bigint;
BEGIN
  -- Vérifier que le secret est configuré
  IF cron_secret = '' THEN
    RAISE NOTICE 'CRON_SECRET non configuré — sync annulée';
    RETURN;
  END IF;

  -- Appeler l'endpoint pdp-sync
  SELECT net.http_post(
    url := app_url || '/api/cron/pdp-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000  -- 30 secondes max
  ) INTO request_id;

  RAISE NOTICE '[pg_cron] sync_superpdp_status appelé, request_id=%', request_id;
END;
$$;

-- ── Étape 4 : Fonction de retry pg_cron ────────────────────────────

CREATE OR REPLACE FUNCTION public.retry_superpdp_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url text := coalesce(
    current_setting('app.settings.url', true),
    'https://factu.me'  -- ⚠️ REMPLACEZ PAR VOTRE URL
  );
  cron_secret text := coalesce(
    current_setting('app.settings.cron_secret', true),
    ''  -- ⚠️ REMPLACEZ PAR VOTRE CRON_SECRET
  );
  request_id bigint;
BEGIN
  IF cron_secret = '' THEN
    RAISE NOTICE 'CRON_SECRET non configuré — retry annulé';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := app_url || '/api/cron/pdp-retry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) INTO request_id;

  RAISE NOTICE '[pg_cron] retry_superpdp_invoices appelé, request_id=%', request_id;
END;
$$;

-- ── Étape 5 : Planifier les jobs cron ──────────────────────────────
-- ATTENTION : Décommentez UNE SEULE FOIS après avoir configuré les secrets !

-- Sync des statuts : toutes les 10 minutes
-- SELECT cron.schedule(
--   'superpdp-status-sync',
--   '*/10 * * * *',
--   $$ SELECT public.sync_superpdp_status(); $$
-- );

-- Retry des factures en échec : toutes les 10 minutes (décalé de 5 min)
-- SELECT cron.schedule(
--   'superpdp-retry',
--   '5,15,25,35,45,55 * * * *',
--   $$ SELECT public.retry_superpdp_invoices(); $$
-- );

-- ── Étape 6 : Vérification ─────────────────────────────────────────
-- Pour vérifier que les jobs sont actifs :
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Pour voir les réponses HTTP :
-- SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;

-- Pour annuler un job :
-- SELECT cron.unschedule('superpdp-status-sync');
-- SELECT cron.unschedule('superpdp-retry');

-- ── AIDE-MÉMOIRE POUR CONFIGURER LES SECRETS ───────────────────────
-- Les secrets sont lus via current_setting(). Pour les configurer :
--
-- Option A : Via ALTER DATABASE (recommandé)
--   ALTER DATABASE postgres SET app.settings.url TO 'https://factu.me';
--   ALTER DATABASE postgres SET app.settings.cron_secret TO 'votre_secret_ici';
--
-- Option B : Directement dans les fonctions (modifiez le code ci-dessus)

-- ════════════════════════════════════════════════════════════════════
-- LOI 10 (Webhook Souverain) : idempotence des événements Stripe.
-- Stripe livre les événements "at-least-once" et retraite sur toute réponse
-- non-2xx. On déduplique par event.id pour éviter double-accès / double-charge.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.stripe_webhook_events (
  event_id   text        primary key,
  event_type text        not null,
  created_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_created_at_idx
  on public.stripe_webhook_events (created_at);

-- Table servie uniquement côté serveur (service_role) : RLS activée, aucune policy.
alter table public.stripe_webhook_events enable row level security;

-- Note : la purge des événements de >30j se fera via un cron job dédié
-- (ne pas référencer de table inexistante ici — la migration doit être auto-contenue).

# Cron Migration Guide — Vercel Cron → Supabase pg_cron + On-Demand Polling

> **Date**: 2026-06-04

---

## Why Vercel Cron Was Insufficient

Vercel's **Hobby tier** (free plan) has strict cron limitations:
- **Maximum 1 cron job** per deployment
- **Minimum 1-day interval** between runs
- Only supported on `vercel.json` `crons` section

Our PDP integration needed:
- `pdp-sync` every **10 minutes** (check invoice statuses)
- `pdp-retry` every **10 minutes** (retry failed transmissions)

With Hobby tier, these were limited to **once daily**, causing:
- Failed invoices waiting up to 24 hours for retry
- Stale e-invoicing status for users throughout the day

---

## New Architecture (3 Layers)

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: On-Demand Polling (Primary — 90% of traffic)  │
│  GET /api/invoices/[id]/einvoice-status                  │
│  • User views invoice → real-time SuperPDP check         │
│  • 2-minute cache to avoid excessive API calls           │
│  • Terminal statuses cached permanently                  │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Supabase pg_cron (Secondary — background)      │
│  • Every 10 min: sync transmitted invoice statuses       │
│  • Every 10 min: retry failed transmissions (offset 5m)  │
│  • Uses pg_net to call our API endpoints                 │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Vercel Cron (Tertiary — daily backup)          │
│  • Daily at 9:00 AM  → pdp-retry                         │
│  • Daily at 10:00 AM → pdp-sync                          │
│  • Safety net if pg_cron is misconfigured                │
└─────────────────────────────────────────────────────────┘
```

---

## Setup Instructions

### Step 1: Enable Supabase Extensions

Go to **Dashboard → Database → Extensions** and enable:
1. `pg_cron` (for scheduling)
2. `pg_net` (for HTTP requests)

Or run in SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Run the Migration

The migration file is at:
```
supabase/migrations/20260604000001_pg_cron_superpdp_sync.sql
```

This creates:
- `einvoice_status_checked_at` column on `invoices` table
- `public.sync_superpdp_status()` function
- `public.retry_superpdp_invoices()` function

### Step 3: Configure Secrets

Set the app URL and cron secret in PostgreSQL:

```sql
ALTER DATABASE postgres SET app.settings.url TO 'https://factu.me';
ALTER DATABASE postgres SET app.settings.cron_secret TO 'your_cron_secret_value';
```

> ⚠️ Use the same `CRON_SECRET` as your Vercel environment variable!

### Step 4: Activate the Scheduled Jobs

Open SQL Editor and run:

```sql
-- Sync statuses every 10 minutes
SELECT cron.schedule(
  'superpdp-status-sync',
  '*/10 * * * *',
  $$ SELECT public.sync_superpdp_status(); $$
);

-- Retry failed invoices every 10 minutes (offset by 5 min)
SELECT cron.schedule(
  'superpdp-retry',
  '5,15,25,35,45,55 * * * *',
  $$ SELECT public.retry_superpdp_invoices(); $$
);
```

### Step 5: Verify

```sql
-- Check jobs are registered
SELECT jobid, schedule, command, active FROM cron.job;

-- Check recent runs
SELECT runid, jobid, status, return_message, start_time
FROM cron.job_run_details
ORDER BY start_time DESC LIMIT 10;

-- Check HTTP responses from pg_net
SELECT id, status_code, content_type, created
FROM net._http_response
ORDER BY created DESC LIMIT 10;
```

---

## Monitoring

### Check pg_cron health
```sql
-- Is the scheduler running?
SELECT pid, application_name, state
FROM pg_stat_activity
WHERE application_name ILIKE 'pg_cron%';
```

### Debug failed jobs
```sql
SELECT *
FROM cron.job_run_details
WHERE status NOT IN ('succeeded', 'running')
  AND start_time > NOW() - INTERVAL '5 days'
ORDER BY start_time DESC LIMIT 10;
```

### Unschedule if needed
```sql
SELECT cron.unschedule('superpdp-status-sync');
SELECT cron.unschedule('superpdp-retry');
```

---

## Cost

- **pg_cron**: Free (included in all Supabase plans)
- **pg_net**: Free (included in all Supabase plans)
- **Edge Functions**: Not needed — pg_net calls existing API routes
- **Total additional cost**: **€0/month**

---

## Security

- Cron endpoints validate `CRON_SECRET` via:
  - `Authorization: Bearer {secret}` header (used by pg_cron)
  - `x-cron-secret` header (used by Vercel)
  - `?secret=` query param (fallback)
- All routes require the secret — 401 if missing/wrong
- SuperPDP credentials are never exposed to the client
- pg_cron functions use `SECURITY DEFINER` (runs as postgres)

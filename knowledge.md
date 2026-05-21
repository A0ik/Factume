# Factu.me — Project Knowledge

High-signal context for AI agents working in this repo.

## What this is
- **Factu.me** (`facturme-web`) — a French SaaS for invoicing, quotes, expenses, contracts/payroll, OCR, e-signature (eIDAS AdES), banking integrations, and a full **cabinet comptable** (accountant portfolio) module.
- Built on **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3 + Supabase (Postgres/Auth/Storage/RLS) + Stripe + Sentry**.
- Deployed on **Vercel** (region `cdg1`); cron jobs run via `vercel.json`.

## Quickstart
- Install: `npm install` (uses `package-lock.json`; do not switch to pnpm/yarn).
- Dev: `npm run dev` → http://localhost:3000
- Build: `npm run build`
- Start (prod): `npm run start`
- Lint: `npm run lint` (Next.js ESLint)
- Unit tests: `npm test` / `npm run test:watch` / `npm run test:coverage` (Vitest + jsdom + Testing Library; setup in `vitest.setup.tsx`).
- E2E tests: `npm run test:e2e` (Playwright; tests in `e2e/`, auto-starts `npm run dev` on :3000). First run: `npm run test:e2e:install`.
- Env: copy `.env.example` → `.env.local`. Supabase + Stripe + Resend + Groq + OpenRouter keys are required for full functionality.

## Architecture
Top-level Next.js App Router structure:

- `app/(app)/` — **authenticated app pages** (dashboard, invoices, clients, crm, expenses, products, banking, accounting, contracts, calendar, integrations, settings, paywall, trial, cabinet, cabinets, ocr, recurring, data-health, …). The **cabinet** module has its own sub-navigation: `app/(app)/cabinet/{clients,analytics,contrats,dpae,dsn,echeances,invitations,juridique,paie,reconciliation,salaries,social,clients/[id]/documents,…}` under `cabinet/layout.tsx`.
- `app/(auth)/` — login, register, callback, forgot/reset password.
- `app/(marketing)/` — 40+ SEO landing pages (FR keywords like `facturation-artisans`, `logiciel-facture-gratuit`, `alternative-tiime`, etc.).
- `app/(onboarding)/` — onboarding wizard.
- `app/api/` — **100+ route handlers** grouped by domain: `cabinet/*`, `contracts/*`, `expenses/*`, `stripe/*`, `sumup/*`, `cron/*`, `client-portal/*`, `share/*`, `payslips/*`, `lia/*`, `ml/*`, `webhooks/*`, etc.
- `app/blog/`, `app/legal/`, `app/share/`, `app/sign/`, `app/sign-quote/`, `app/verify/`, `app/client/[token]`, `app/workspace/join` — public pages.
- `app/sitemap.ts`, `app/robots.ts`, `app/feed.xml/` — SEO.

Other key dirs:
- `components/` — UI primitives (`components/ui/*`), feature folders (`cabinet/`, `calendar/`, `contracts/`, `invoices/`, `labor-law/`, `clients/`, `seo/`, `support/`, `legal/`, `onboarding/`, `layout/`, `providers/`, `emails/`).
- `lib/` — server/business logic: `supabase.ts` (browser client), `supabase-server.ts` (RSC/SSR), `supabase-admin.ts` (service role; **server-only**), `cabinet-helpers.ts`, `pdf-server.ts` / `pdf-react.tsx`, `ocr-*.ts`, `facturx.ts`, `rate-limit.ts`, `validation.ts`, `safe-math.ts`, `labor-law/*` (DSN, DPAE, bulletins paie, contrats), `services/*` (contract lifecycle, AI), `nordigen/`, `amazon/`, `sumup/`, `pennylane-client.ts`, `bridge-client.ts`.
- `stores/` — Zustand stores: `authStore`, `cabinetStore`, `contractStore`, `crmStore`, `dataStore`, `integrationStore`, `themeStore`, `workspaceStore`.
- `supabase/migrations/` — ~60 SQL migrations (000 → 037 + dated). Treat as the source of truth for DB schema (Postgres + RLS).
- `hooks/`, `i18n/`, `types/`, `e2e/`, `scripts/`, `public/`.
- `.agents/` (Codebuff agent definitions, includes `.agents/types/`), `skills/`, `.claude/skills/` (skill definitions used by Codebuff/Claude — e.g. `ui-ux-pro-max`, `supabase`, `supabase-postgres-best-practices`).
- `middleware.ts` — auth gate (cookie-based Supabase session), CSP/security headers (per-request `nonce`), and **rate limiting** (auth: 5/h, API: 100/min, pages: 300/min, crawler-aware).

### Path alias
- `@/*` → repo root. **Always import via `@/…`** (e.g. `@/lib/supabase-server`, `@/components/ui/Button`).

### Auth & access control
- Supabase Auth (cookies, SSR via `@supabase/ssr`).
- Public route prefixes & protected route prefixes are enumerated in `middleware.ts` — **update both lists when adding a new top-level section.**
- Server routes: use `lib/supabase-server.ts` for the user-scoped client; use `lib/supabase-admin.ts` (`createAdminClient`) **only on the server** for service-role operations. Never import `supabase-admin` from client components or middleware.
- Cabinet (multi-tenant accountant) features funnel through `lib/cabinet-helpers.ts` (`getCabinetForUser`, `getCabinetClients`, `getClientAggregatedData`).

### Background jobs (`vercel.json` crons)
- `/api/cron/reminders` — daily 08:00
- `/api/cron/contract-expirations` — daily 08:00
- `/api/recurring/send` — daily 08:00

## Conventions
- **Language**: TypeScript strict mode. **Do not cast to `any`**. UI/strings are mostly French (FR) — match existing tone when adding copy.
- **Styling**: Tailwind v3 with custom tokens (`brand`, `primary`, `accent`, `--background/--foreground/...`). Dark mode via `class` strategy. Reuse `components/ui/*` primitives; avoid new one-off variants.
- **State**: Zustand stores in `stores/`. Keep server data fetching in route handlers / server components; stores hold UI/session state.
- **Forms & validation**: Use `zod` schemas; share with `lib/validation.ts` / `lib/api-validation.ts`. Sanitize HTML with `isomorphic-dompurify`.
- **Money/math**: use `lib/safe-math.ts` (avoid raw float arithmetic on amounts).
- **PDF generation**:
  - React-PDF (`@react-pdf/renderer`) for templated docs (`lib/pdf-react.tsx`, `lib/labor-law/bulletin-paie-react-pdf.tsx`).
  - `pdf-lib` / `pdf-parse` / `canvas` are **server-only** (declared in `next.config.ts` `serverExternalPackages` + webpack externals). Don't import them in client components.
- **OCR**: hybrid Tesseract.js + OpenRouter LLM via `lib/ocr-*.ts` and `lib/ocr-queue.ts`.
- **Rate limiting**: `lib/rate-limit.ts` — in-memory by default; falls back to Upstash Redis when `UPSTASH_REDIS_REST_URL` / `_TOKEN` are set. The middleware already rate-limits broadly; only add per-route limits for sensitive endpoints (e.g. `stripe/trial-subscription` is capped at 3/day).
- **Imports performance**: `optimizePackageImports` is enabled for `lucide-react`, `framer-motion`, `recharts`, `date-fns` — prefer named imports from these.
- **Testing**:
  - Unit: place near code as `*.test.ts(x)` or under `lib/__tests__/`. Note: `tsconfig.json` excludes `lib/__tests__` from `tsc`/`next build` typecheck, so type errors in those tests will not fail the build — Vitest still executes them at runtime.
  - E2E: under `e2e/` (Playwright; chromium, firefox, webkit, mobile chrome).
- **Sentry**: configured in `sentry.{client,server,edge}.config.ts`, plus the modern Next.js hooks `instrumentation.ts` and `instrumentation-client.ts` at the repo root, and `next.config.ts` (`tunnelRoute: '/monitoring'`). Don't duplicate this setup elsewhere; don't disable.
- **Errors**: throw / return `NextResponse.json({ error }, { status })`. Use `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` for boundaries.

## Gotchas
- **Adding a new authenticated section**: append its prefix to `PROTECTED_PREFIXES` in `middleware.ts`, otherwise it stays public. Public-by-design routes go in `PUBLIC_PATHS` / `PUBLIC_PREFIXES`. ⚠️ **Known divergence**: `app/(app)/ocr/page.tsx` exists but `/ocr` is **not** in `PROTECTED_PREFIXES` — confirm intent before assuming the protected list is exhaustive of `(app)` routes.
- **CSP**: `middleware.ts` ships a strict CSP with a per-request `nonce`. Inline scripts must use the nonce (read via `headers().get('x-nonce')` in `app/layout.tsx`). Adding a new third-party domain (script/connect/img/frame) requires editing the CSP arrays.
- **Service-role leakage**: anything importing `lib/supabase-admin.ts` must be server-only (route handler, server action, server component). The codebase has had past regressions where it leaked into the client bundle — keep it out of shared client code.
- **Cabinet vs personal data**: clients can be `client_type: 'manual'` (no linked user account) or linked to a `client_user_id`. Manual clients **must skip** aggregated-data fetches that key off a user id (see `app/api/cabinet/dashboard/route.ts`).
- **DB changes**: add a new numbered file in `supabase/migrations/` (current head is `037_*` plus dated `20260520001_*`). Don't edit existing migrations. RLS is enabled almost everywhere — write policies for every new table.
- **Windows dev**: project is developed on Windows (`bash` shell). Avoid Unix-only shell tricks in package scripts.
- **Mixed in-progress UI**: there are paired `Magnificent*` and plain components (e.g. `MagnificentCalendarGrid` vs `CalendarGrid`). Check which one a page imports before editing — they are **not interchangeable**.
- **Heavy native deps**: `canvas`, `sharp`, `pdf-parse` — kept out of the client bundle via `serverExternalPackages` and webpack externals. Don't move them.
- **i18n**: scaffolding is in `i18n/` with `react-i18next` + `i18next-browser-languagedetector`. Most product copy is still hard-coded FR.
- **Trailing slash**: `trailingSlash: false` in `next.config.ts` — keep links without trailing slashes (sitemap relies on this).
- **Package manager**: stick with `npm`. Use `npm install <pkg>` to add deps so the version is resolved correctly (don't hand-edit `package.json` versions).

## Useful entry points when debugging
- Auth flow: `middleware.ts` → `app/(auth)/login/page.tsx` → `lib/supabase.ts` / `stores/authStore.ts`.
- Invoice creation: `app/(app)/invoices/page.tsx` → `app/api/invoices/create/route.ts` → `lib/pdf-react.tsx` / `lib/facturx.ts`.
- Cabinet dashboard: `app/(app)/cabinet/page.tsx` → `app/api/cabinet/dashboard/route.ts` → `lib/cabinet-helpers.ts`.
- Stripe billing: `app/api/stripe/*` (subscription, webhook, portal, trial-subscription, change-subscription).
- Crons: `app/api/cron/*` (also listed in `vercel.json`).

# E-Invoice Flow — factu.me + SuperPDP

> Step-by-step flow of electronic invoice submission and tracking

---

## Overview

```
User creates invoice
       │
       ▼
  Is it B2B? ──No──► Standard email send only (no PDP)
       │
      Yes
       │
       ▼
  Eligibility check (SIRET, VAT, address...)
       │
       ▼
  Generate Factur-X XML (EN 16931 / CII)
       │
       ▼
  POST /v1.beta/invoices → SuperPDP
       │
       ▼
  Store pdp_transmission_id in DB
       │
       ▼
  Polling: wait for lifecycle events (CDAR)
       │
       ├── fr:204 → Accepted ✓
       ├── fr:205 → Refused ✗
       ├── fr:212 → Paid ✓
       └── error  → Failed (auto-retry)
```

---

## Step 1: Invoice Creation

**Trigger**: User clicks "Envoyer" on an invoice in factu.me

**API Route**: `POST /api/send-invoice`

1. Validates invoice data (amounts, dates, client info)
2. Checks `client_type`:
   - `b2c` → Send by email only, skip PDP
   - `b2b` → Send by email AND transmit to PDP
3. Sends email via Resend (non-blocking)
4. If B2B, triggers PDP transmission in background

---

## Step 2: PDP Transmission

**Library**: `lib/superPdpClient.ts` → `transmitInvoice()`

1. **Eligibility check**:
   - Seller has SIRET? ✅
   - Invoice type is `invoice`, `credit_note`, or `deposit`? ✅
   - All required Factur-X fields present? ✅

2. **Generate CII XML**:
   - Uses `lib/facturx.ts` → `generateFacturXXml()`
   - Produces EN 16931 compliant Cross Industry Invoice XML
   - Includes: seller/buyer SIRET, VAT numbers, line items, totals

3. **Authenticate with SuperPDP**:
   - OAuth2 Client Credentials: `POST /oauth2/token`
   - Token cached in-process with 60-second safety margin
   - Token TTL: 30 minutes

4. **Submit to SuperPDP**:
   - `POST /v1.beta/invoices` with raw XML text body
   - Headers: `Authorization: Bearer {token}`
   - Returns: `{ id: 12345 }`

5. **Store result**:
   ```
   pdp_transmission_id = "12345"
   pdp_status = "transmitted"
   pdp_transmitted_at = NOW()
   ```

6. **On error**:
   - Retryable (500, network) → `pdp_status = "pending_retry"`, schedule retry
   - Non-retryable (400, 401, 404) → `pdp_status = "failed"`, store error

---

## Step 3: Status Tracking (3 Layers)

### Layer 1: On-Demand Polling (Primary)

**API Route**: `GET /api/invoices/[id]/einvoice-status`

**Trigger**: User views invoice in factu.me UI

**Logic**:
1. Check if invoice has `pdp_transmission_id`
2. If terminal status (accepted, refused, paid, failed) → return cached
3. If last check < 2 minutes ago → return cached
4. Otherwise → poll SuperPDP `GET /v1.beta/invoice_events`
5. Map status code → update DB → return fresh status

### Layer 2: pg_cron Background Sync (Every 10 min)

**Supabase pg_cron** → `public.sync_superpdp_status()`

**Logic**:
1. pg_cron triggers every 10 minutes
2. `pg_net.http_post()` calls `POST /api/cron/pdp-sync`
3. Endpoint queries all invoices with `pdp_status = 'transmitted'`
4. For each invoice, fetches events from SuperPDP
5. Maps French status codes (`fr:204`-`fr:212`) → updates DB
6. Logs changes to `invoice_audit_trail`

### Layer 3: pg_cron Retry (Every 10 min, offset 5 min)

**Supabase pg_cron** → `public.retry_superpdp_invoices()`

**Logic**:
1. Queries invoices with `pdp_status = 'pending_retry'` and `pdp_next_retry_at <= NOW()`
2. Re-calls `transmitInvoice()` for each
3. On success → `pdp_status = 'transmitted'`
4. On retryable failure → increment retry count, schedule next retry (+10 min)
5. After 6 retries → `pdp_status = 'failed'` (permanent failure)

---

## Step 4: Status Code Mapping

| SuperPDP Code | Meaning | factu.me Status |
|---|---|---|
| `fr:204` | Acceptation | `accepted` |
| `fr:205` | Refus | `refused` |
| `fr:206` | Accord montant | `accepted` |
| `fr:207` | Refus montant | `refused` |
| `fr:208` | Demande copie | _(no change)_ |
| `fr:209` | Suspension | _(no change)_ |
| `fr:210` | Rejet contentieux | `refused` |
| `fr:211` | Levée suspension | _(no change)_ |
| `fr:212` | Paiement | `paid` |

---

## Step 5: Audit Trail

Every status change is logged to `invoice_audit_trail`:

```json
{
  "invoice_id": "uuid",
  "user_id": "uuid",
  "action": "pdp_sync:fr:204",
  "from_status": "sent",
  "to_status": "accepted",
  "metadata": {
    "superpdp_event_id": "123",
    "superpdp_status_code": "fr:204",
    "superpdp_description": "Accepted by receiver",
    "sync_source": "on-demand-poll"
  }
}
```

This audit trail is **PAF-compliant** (Piste d'Audit Fiable) as required by French tax law.

---

## Database Schema

### Key columns on `invoices` table:

| Column | Type | Purpose |
|---|---|---|
| `pdp_transmission_id` | `text` | SuperPDP invoice ID |
| `pdp_status` | `text` | `not_transmitted`, `transmitting`, `transmitted`, `pending_retry`, `failed` |
| `pdp_last_error` | `text` | Last error message |
| `pdp_transmitted_at` | `timestamptz` | When transmitted |
| `pdp_retry_count` | `int` | Number of retries |
| `pdp_next_retry_at` | `timestamptz` | Next scheduled retry |
| `einvoice_status_checked_at` | `timestamptz` | Last on-demand poll |
| `client_type` | `text` | `b2b` or `b2c` |
| `client_siret` | `text` | Client SIRET (14 digits) |
| `client_vat_number` | `text` | Client VAT number |

---

## Error Handling

### Retry Logic
- Max **6 retries** with exponential backoff (10-min intervals)
- Retryable errors: HTTP 500+, network timeouts, connection refused
- Non-retryable: HTTP 400 (validation), 401 (auth), 404 (receiver not found)

### User-Facing Messages
| Error Code | User Message |
|---|---|
| `B2C_NOT_REQUIRED` | "Facture B2C — pas de transmission PDP requise" |
| `INELIGIBLE` | "Facture non éligible: {reason}" |
| `MISSING_SELLER_SIRET` | "SIRET de l'entreprise requis" |
| `VALIDATION_ERROR` | "Erreur de validation SuperPDP: {details}" |
| `AUTH_FAILED` | "Authentification SuperPDP échouée" |
| `RECEIVER_NOT_FOUND` | "Destinataire non trouvé dans l'annuaire" |
| `SERVER_ERROR` | "Erreur serveur SuperPDP — retry automatique" |
| `NETWORK_ERROR` | "Erreur réseau — retry automatique" |

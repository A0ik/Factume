# SuperPDP API Reference

> Extracted from official documentation at https://www.superpdp.tech/documentation/
> and the official quick_start.js example: https://github.com/superpdp/examples/blob/main/quick_start.js
>
> **Date**: 2026-06-04
> **API Version**: `v1.beta`

---

## 1. URLs

| Environment | Base URL | Determined By |
|---|---|---|
| **All environments** | `https://api.superpdp.tech/v1.beta/` | The same URL is used for both sandbox and production |
| **Sandbox vs Production** | Same URL, different credentials | `client_id` / `client_secret` determine the mode |

> ⚠️ **Important**: There is NO separate sandbox URL. The API key determines whether you access sandbox or production data.

### OAuth2 URLs

| Endpoint | URL |
|---|---|
| Token | `https://api.superpdp.tech/oauth2/token` |
| Authorize | `https://api.superpdp.tech/oauth2/authorize` |
| Revoke | `https://api.superpdp.tech/oauth2/revoke` |

---

## 2. Authentication (OAuth 2.1)

### Client Credentials Flow (for SaaS/server-to-server)

```
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded
```

**Request Body**:
```
grant_type=client_credentials
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

**Response**:
```json
{
  "access_token": "a1b2c3d4e5f6...",
  "token_type": "Bearer",
  "expires_in": 1800
}
```

**Key constraints**:
- Access token TTL: **30 minutes** (1800 seconds)
- Refresh token: NOT available for Client Credentials flow
- No scopes required

### Authorization Code Flow (for user delegation)

For SaaS platforms delegating access to their users' SuperPDP accounts:

| Parameter | URL |
|---|---|
| Authorization | `GET /oauth2/authorize` |
| Token | `POST /oauth2/token` |

**Request params for authorize URL**:
- `login_hint`: pre-fills user email
- `superpdp_company_number` + `superpdp_company_number_scheme`: pre-fills company info
- `scheme` values: `sandbox`, `fr_siren`, `be_numero_entreprise`

**Token request body**:
```
grant_type=authorization_code
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&redirect_uri=YOUR_REDIRECT_URI
&code=AUTHORIZATION_CODE
```

**Key constraints**:
- Refresh token TTL: **1 year**, extended by 1 year on each use
- OAuth 2.1 mandates refresh token rotation

### Token Revocation

```
POST /oauth2/revoke
```

RFC 7009 compliant. Revoking a refresh_token also revokes all linked access_tokens.

### Using the Token

```
Authorization: Bearer a1b2c3d4e5f6
```

Add this header to all API calls.

---

## 3. API Endpoints

### 3.1 Company

#### Get Current Company
```
GET /v1.beta/companies/me
Authorization: Bearer {token}
```

**Response**:
```json
{
  "id": "...",
  "formal_name": "Burger Queen",
  ...
}
```

### 3.2 Invoices

#### Send an Invoice
```
POST /v1.beta/invoices
Authorization: Bearer {token}
```

**Request Body**: Raw XML text (CII or UBL format). Do NOT use FormData.

From the official example:
```javascript
const response = await fetch(`${endpoint}/v1.beta/invoices`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: rawXmlText  // NOT FormData, NOT JSON
});
```

**Response**:
```json
{
  "id": 12345,
  ...
}
```

> ⚠️ The body is raw XML text. Content-Type is auto-detected by the API.
> Do NOT wrap in FormData. The `validation_reports` endpoint uses FormData, but `invoices` does not.

#### List Invoices
```
GET /v1.beta/invoices
GET /v1.beta/invoices?starting_after_id={id}
GET /v1.beta/invoices?order=desc
Authorization: Bearer {token}
```

**Response**:
```json
{
  "data": [
    { "id": 123, "en_invoice": {...}, ... }
  ],
  "has_after": true
}
```

**Key constraints**:
- IDs are strictly atomically increasing `bigint` — safe for pagination
- Use `starting_after_id` for cursor-based pagination (guaranteed no gaps)
- `has_after: true` means more results available
- Results scoped to the authenticated company

#### Get Single Invoice
```
GET /v1.beta/invoices/{id}
Authorization: Bearer {token}
```

**Response**: Invoice object with `en_invoice` field once processed.

#### Generate Test Invoice
```
GET /v1.beta/invoices/generate_test_invoice?format=ubl
Authorization: Bearer {token}
```

**Response**: Raw XML text (UBL format by default).

### 3.3 Validation

#### Validate an Invoice
```
POST /v1.beta/validation_reports
```

**Request Body**: `FormData` with `file` field containing XML text.

```javascript
const formData = new FormData();
formData.append("file", xmlText);
const response = await fetch(`${endpoint}/v1.beta/validation_reports`, {
  method: "POST",
  body: formData,
});
```

**Response**:
```json
{
  "data": [
    { "is_valid": true }
  ]
}
```

> ⚠️ Validation uses FormData, but invoice submission uses raw text.

### 3.4 Invoice Events (CDAR — Cycle de Vie)

#### List Invoice Events
```
GET /v1.beta/invoice_events?starting_after_id={id}
Authorization: Bearer {token}
```

Same pagination pattern as invoices (`starting_after_id`, `has_after`).

#### Send an Invoice Event (Status Update)
```
POST /v1.beta/invoice_events
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body** (example: payment status):
```json
{
  "invoice_id": 12345,
  "status_code": "fr:212",
  "details": [
    {
      "amounts": [
        {
          "net_amount": "1800.00",
          "currency_code": "EUR",
          "type_code": "MEN",
          "vat_rate": "20.0",
          "date": "2026-03-31"
        }
      ]
    }
  ]
}
```

### 3.5 Directory Lookup

#### French Directory
```
GET /v1.beta/french_directory/companies?number={siren_or_siret}
Authorization: Bearer {token}
```

Query the DGFiP electronic invoicing directory.

### 3.6 Create Invoice from JSON

From notes de version (2025-12-03): SuperPDP supports creating invoices with JSON (EN16931 model).

### 3.7 Create Factur-X from PDF + XML/JSON

From notes de version (2026-02-20): SuperPDP can create Factur-X PDFs from a readable PDF + XML or JSON.

---

## 4. French Status Codes (CDAR)

These are the lifecycle status codes for French e-invoicing:

| Code | Meaning | factu.me Mapping |
|---|---|---|
| `fr:204` | Acceptation par le destinataire | `accepted` |
| `fr:205` | Refus par le destinataire | `refused` |
| `fr:206` | Accord sur le montant à payer | `accepted` |
| `fr:207` | Refus sur le montant à payer | `refused` |
| `fr:208` | Demande de copie | _(no change)_ |
| `fr:209` | Suspension contentieuse | _(no change)_ |
| `fr:210` | Rejet contentieux | `refused` |
| `fr:211` | Levée de suspension | _(no change)_ |
| `fr:212` | Paiement (encaissée) | `paid` |

---

## 5. Invoice Formats

France supports three official formats:
1. **Factur-X France** (PDF + embedded CII XML)
2. **UBL France** (XML)
3. **CII France** (XML)

Peppol network uses:
4. **Peppol BIS / UBL** (XML)

All platforms must provide format conversion.

---

## 6. Electronic Addressing

### France
- `SIREN` (e.g., `853322915`)
- `SIREN_SIRET` (e.g., `853322915_85332291500010`)
- `SIREN_SUFFIXE` (e.g., `853322915_DEPARTEMENTJURIDIQUE`)
- `SIREN_SIRET_CODEROUTAGE` (e.g., `853322915_85332291500010_FACTURESPUBLIQUES`)

### Peppol (Belgium)
- Scheme ID `0208` + BCE number: `0208:0869763267`

---

## 7. Webhooks

**NOT YET AVAILABLE.** Listed as "À venir" (coming soon) in the release notes.

Until webhooks are available, polling is required using:
- `GET /v1.beta/invoices` + `starting_after_id` cursor pagination
- `GET /v1.beta/invoice_events` + `starting_after_id` cursor pagination

---

## 8. Synchronization Pattern

For reliable polling without missing data:

1. First call: `GET /v1/invoices` (no params) — store results
2. Subsequent calls: `GET /v1/invoices?starting_after_id={max_id}`
3. Repeat until `has_after: false`
4. Same pattern for `invoice_events`

**Guarantee**: SuperPDP guarantees atomically strictly increasing `id` sequences — no gaps possible.

---

## 9. Calendar / Availability

| Country | Sandbox | Production |
|---|---|---|
| **France** | Nov 2025 | March 2026 (pilot), Sept 2026 (reception mandate), Sept 2027 (emission mandate) |
| **Belgium** | Available | Jan 2026 |

---

## 10. Rate Limits

Not explicitly documented in the accessible pages. The quick_start.js adds 1-second delays between calls, and we use 100ms delays in our cron jobs as a conservative rate limit.

---

## 11. Error Handling

Page 5 (Erreurs) was inaccessible (403 Forbidden). Common errors from FAQ:

- `pre-check: receiver address does not exist in peppol directory` — recipient not registered
- HTTP 400 — validation error
- HTTP 401 — authentication error
- HTTP 404 — resource not found

---

## 12. API AFNOR (XP Z12-013)

The AFNOR interoperable API (standardized across all PAs) was published Nov 2025. SuperPDP plans to publish AFNOR API endpoints starting March 2026.

---

*Source: https://www.superpdp.tech/documentation/ (pages 1-4, 6-14) + https://github.com/superpdp/examples/blob/main/quick_start.js*

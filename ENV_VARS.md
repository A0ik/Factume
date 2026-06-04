# Environment Variables — SuperPDP E-Invoicing

---

## Required Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `SUPER_PDP_CLIENT_ID` | ✅ Yes | OAuth2 Client ID from SuperPDP dashboard | `sp_abc123def456` |
| `SUPER_PDP_CLIENT_SECRET` | ✅ Yes | OAuth2 Client Secret from SuperPDP dashboard | `sp_secret_abc123def456` |
| `CRON_SECRET` | ✅ Yes | Shared secret for cron endpoints | Generate with `openssl rand -hex 32` |

## Optional Variables

| Variable | Default | Description | Example |
|---|---|---|---|
| `SUPER_PDP_SANDBOX` | `false` | Sandbox mode toggle (informational only — mode is determined by credentials) | `true` |
| `NEXT_PUBLIC_APP_URL` | — | App URL used by pg_cron to call back to API | `https://factu.me` |

---

## How to Get SuperPDP Credentials

1. Create a free account at https://www.superpdp.tech
2. Go to **Applications** in the dashboard
3. Click **Nouvelle application…**
4. Select your company (sandbox company for testing)
5. Click **Créer**
6. Copy `client_id` and `client_secret` (shown only once!)

### For Production
- You must complete KYC (identity verification) and KYB (business verification)
- Create a new application linked to your production company
- Use the production credentials

### For Sandbox
- Sandbox companies are auto-created on account creation
- Create an application linked to a sandbox company
- Use the sandbox credentials
- Set `SUPER_PDP_SANDBOX=true` (informational — the credentials determine the mode)

---

## Setting Up pg_cron Secrets (Supabase SQL)

```sql
ALTER DATABASE postgres SET app.settings.url TO 'https://factu.me';
ALTER DATABASE postgres SET app.settings.cron_secret TO 'your_cron_secret_here';
```

---

## Vercel Environment Variables

Set these in **Vercel Dashboard → Settings → Environment Variables**:

```
SUPER_PDP_CLIENT_ID=sp_xxxxxxxx
SUPER_PDP_CLIENT_SECRET=sp_secret_xxxxxxxx
SUPER_PDP_SANDBOX=false          # true in preview, false in production
CRON_SECRET=your_generated_secret
NEXT_PUBLIC_APP_URL=https://factu.me
```

---

## Security Notes

- **NEVER** commit real credentials to git
- **NEVER** expose `SUPER_PDP_CLIENT_SECRET` to the client (it's server-only)
- **NEVER** expose `CRON_SECRET` to the client
- `NEXT_PUBLIC_APP_URL` is safe to expose (it's just the public URL)
- `SUPER_PDP_SANDBOX` is informational only and doesn't affect API behavior

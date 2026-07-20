# Import factures par email — Déploiement (Cloudflare, 0 €/mois)

Chaque utilisateur Business obtient une adresse unique `factures+<token>@factu.me`.
Un fournisseur envoie sa facture à cette adresse → le Cloudflare Email Worker extrait
la pièce jointe → POST vers `/api/inbox/email-import` → OCR Gemini auto → la facture
apparaît dans la file d'attente de `/ocr`, prête à valider.

## 1. Prérequis côté Cloudflare
- Le domaine **factu.me** est géré par Cloudflare (DNS). Si ce n'est pas le cas, migrer le DNS.
- Activer **Email Routing** : Dashboard Cloudflare → factu.me → Email → Email Routing → Enable.

## 2. Créer le Worker
1. Dashboard Cloudflare → Workers & Pages → Create → Worker.
   - Nom : `factume-inbox`.
   - Collez le contenu de `cloudflare/email-inbox-worker.ts` (éditeur).
   - Déployez.
2. **Variables/Secrets** (Worker → Settings → Variables):
   - `APP_URL` = `https://factu.me`
   - `INBOX_WEBHOOK_SECRET` = une chaîne aléatoire forte (ex. `openssl rand -hex 32`).
   - (optionnel) `INBOX_PREFIX` = `factures`, `INBOX_DOMAIN` = `factu.me`.
3. **Dépendance** `postal-mime` : ajoutez dans le Worker un `import PostalMime from 'postal-mime';`
   (Cloudflare le résout via npm auto, ou ajoutez un `package.json`/`wrangler.toml` avec la dépendance).

## 3. Router les emails vers le Worker
Dashboard Cloudflare → factu.me → Email → Email Routing → **Routes** :
- **Catch-all** (ou route custom) → action **Send to a Worker** → choisir `factume-inbox`.
- Recommandé : une route sur le pattern `factures+*@factu.me` (plus-addressing). Chaque token
  est unique par utilisateur (`factures+abc123@factu.me`).

## 4. Côté Vercel (factu.me)
Ajoutez ces variables d'environnement (même valeur que le Worker) :
- `INBOX_WEBHOOK_SECRET` = **la même** que Cloudflare (vérifie le header `x-inbox-secret`).
- `INBOX_DOMAIN` = `factu.me` (défaut).
- `INBOX_PREFIX` = `factures` (défaut).
- `OPENROUTER_API_KEY` = déjà présent (OCR Gemini).

## 5. Vérification
1. En tant qu'utilisateur Business, ouvrir **Paramètres → Boîte de réception email** (ou `/ocr`).
   → l'adresse `factures+<token>@factu.me` s'affiche (générée à la 1ère ouverture).
2. Envoyer un email avec une facture en PJ à cette adresse depuis une boîte externe.
3. La facture apparaît dans `/ocr` (file d'attente) sous ~30 s, OCR déjà fait.

## Sécurité
- Le webhook est authentifié par `INBOX_WEBHOOK_SECRET` (header `x-inbox-secret`).
- Le token résout l'utilisateur côté serveur (`email_inboxes.token` UNIQUE).
- Gate Business/trial vérifiée côté serveur.
- Plafond : 5 PJ max par email, 20 Mo/PJ, MIME restreint (JPEG/PNG/WebP/HEIC/PDF).
- Anti-abus : le propriétaire peut régénérer son token (POST `/api/inbox/address`) — l'ancienne adresse cesse de fonctionner.

## Coût
Cloudflare Email Routing + Email Workers : **gratuit** (free tier très large).
OCR : coût marginal Mistral/Gemini déjà payé (identique au scan manuel).

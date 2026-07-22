# Factu.me — Audit Mobile Légendaire (Conquête App Store / Play Store)

> ODIN · CIBLE 3 · 2026-07-22
> Stack retenue : **Expo (React Native) en monorepo**, Next.js conservé comme backend API.
> Décision utilisateur : **audit + estimation seulement** — aucun code mobile dans ce cycle.

---

## 1. Verdict exécutif

L'architecture de factu.me est **favorable** à une conquête mobile native :

- Auth = pattern Supabase standard (cookie → swappable en `AsyncStorage`/`SecureStore`).
- State = Zustand **sans middleware persist** (swap de stockage mécanique, propre).
- Voix = design **déjà centré sur Whisper serveur** (le Web Speech n'est qu'un repli jetable).
- Couche **offline-first mature** (`public/sw.js` + `manifest.json` + 12 pages miroir) → la logique de sync se réutilise.
- 250 routes API + RLS Supabase + logique Stripe/OCR/IA = **réutilisées telles quelles** (le backend Next.js devient l'API du mobile).

Les **3 gros chantiers** de recodage : (1) flux PDF viewer/générateur côté client, (2) recharts → charts natifs, (3) framer-motion → Reanimated sur toute l'UI.

---

## 2. Ce qui est RÉUTILISABLE TEL QUEL (zéro refonte)

- Tout le schéma Supabase + **RLS** (fonctionne à l'identique web/mobile).
- Les **250 routes API** `app/api/**` (Stripe, OCR, IA Groq/OpenAI, e-invoicing SuperPDP, email Resend, webhooks).
- La logique métier pure : calculs de factures, `zod`, `mathjs`, `lib/invoice-balance.ts` (acomptes), `lib/payment-link.ts`.
- Les chaînes i18n (`i18n/fr.ts`, `i18n/en.ts`).
- Le pipeline OCR serveur (`lib/ocr-core.ts`, `lib/ocr-queue.ts`).

---

## 3. Ce qui nécessite un WRAPPER FIN (swap de la couche I/O, même forme)

| Surface web | Devient sur mobile |
|---|---|
| `createBrowserClient` ([lib/supabase.ts:13](lib/supabase.ts#L13)) | client Supabase avec `storage: AsyncStorage`/`expo-secure-store`, `auth.detectSessionInUrl:false` ; drop du middleware cookie |
| `localStorage` (~8 fichiers : theme, cabinet, sidebar, authStore, i18n) | `AsyncStorage` |
| `crypto.subtle` ([lib/eidas-free-solution.ts:59](lib/eidas-free-solution.ts#L59)) | `expo-crypto` |
| `navigator.clipboard` / `navigator.share` | `expo-clipboard` / `expo-sharing` (déjà feature-détecté) |
| **Voix Groq Whisper** (`MediaRecorder`→upload) | `expo-av` recorder → mêmes endpoints `/api/*` |
| Caméra justificatifs ([components/ui/CameraCapture.tsx](components/ui/CameraCapture.tsx)) | `expo-camera` (même pipeline OCR) |
| Tous les `fetch('/api/...')` | inchangés si le backend Next.js est conservé |

---

## 4. ⚠️ Ce qui doit être ENTIÈREMENT RECODÉ (le cœur de l'audit)

### 4.1 Web Speech API (repli vocal) — **à SUPPRIMER**
Fichiers : [components/copilot/CopilotFAB.tsx:625](components/copilot/CopilotFAB.tsx#L625), [components/ui/VoiceInput.tsx:40](components/ui/VoiceInput.tsx#L40), [components/ui/VoiceAssistant.tsx:76](components/ui/VoiceAssistant.tsx#L76).
`webkitSpeechRecognition` n'existe pas en React Native. **Pas besoin de remplaçant** : le chemin primaire Groq Whisper (4.2) le couvre déjà — on supprime purement et simplement ce repli sur mobile.

### 4.2 Visionneuse PDF — pdfjs → react-native-pdf
[components/ui/PdfPreviewModal.tsx:89](components/ui/PdfPreviewModal.tsx#L89) (`getDocument`), [app/(app)/ocr/page.tsx:990](app/(app)/ocr/page.tsx#L990). pdfjs-dist repose sur le DOM/WebWorker. Remplacement natif : `react-native-pdf` (rendu natif).

### 4.3 Graphiques — recharts → gifted-charts
5 fichiers : [TreasuryWidget.tsx:7](components/dashboard/TreasuryWidget.tsx#L7), [accounting/page.tsx:18](app/(app)/accounting/page.tsx#L18), [offline/accounting/page.tsx:16](app/(app)/offline/accounting/page.tsx#L16), [cabinet/analytics/page.tsx:11](app/(app)/cabinet/analytics/page.tsx#L11), [cabinet/page.tsx:13](app/(app)/cabinet/page.tsx#L13). recharts = SVG/DOM. Remplacement : `react-native-gifted-charts` ou `victory-native`.

### 4.4 Animations — framer-motion → React Native Reanimated
framer-motion est utilisé massivement (voice, landing, UI). **Réécriture complète des déclarations d'animation** (API différente). C'est le chantier UI le plus large.

### 4.5 Primitives UI — Radix → composants natifs
`@radix-ui/react-dialog`, `-dropdown-menu`, `-switch`, `-avatar`… n'ont pas d'équivalent DOM en RN. Remplacement : `@gorhom/bottom-sheet`, modales RN natives, React Native Paper.

### 4.6 Notifications push — web-push/VAPID → expo-notifications
Pile actuelle : SW ([components/ui/ServiceWorkerRegistration.tsx:7](components/ui/ServiceWorkerRegistration.tsx#L7)) + `web-push` ([app/api/push/send/route.ts:3](app/api/push/send/route.ts#L3)) + subscribe ([stores/authStore.ts:268](stores/authStore.ts#L268)). Re-platforming : `expo-notifications` (FCM/APNs via Expo Push Notifications). Le serveur `web-push` doit être remplacé par l'API Expo Push.

### 4.7 Génération PDF côté client → 100% serveur
`@react-pdf/renderer` + `pdf-lib` produisent des Blob côté client via `URL.createObjectURL` (~30 sites). Sur mobile, générer côté serveur (déjà partiellement le cas) et visualiser via `react-native-pdf`.

### 4.8 File / Blob / URL.createObjectURL → expo-file-system
~30 sites : [lib/pdf.ts:123](lib/pdf.ts#L123), [CameraCapture.tsx:119](components/ui/CameraCapture.tsx#L119), etc. Remplacement : `expo-file-system` + URI de fichier natif.

### 4.9 Menus annexes
- `tesseract.js` (OCR client) → serveur-only ou ML Kit.
- `canvas-confetti` (marketing) → lib native (priorité basse).
- `@fingerprintjs/fingerprintjs` (anti-fraude trial) → solution device-id native.

---

## 5. 🆕 Features natives à AJOUTER (parité Pennylane)

Pennylane mobile propose : scanner de reçus natif, **login biométrique (Face ID/Touch ID)**, notifications push, trésorerie temps réel. Voire le détail des 2 plus structurants.

### 5.1 🔐 Face ID / Touch ID — connexion biométrique (exemple complet)

**Lib** : `expo-local-authentication`. Aujourd'hui factu.me n'a **aucune biométrie d'auth** (`@fingerprintjs/fingerprintjs` sert à l'anti-fraude trial, PAS à l'auth).

**Flow cible** :
1. L'utilisateur se connecte une fois (email/OTP) → session Supabase stockée chiffrée dans `expo-secure-store` (Keychain iOS / Keystore Android).
2. Un opt-in « Activer Face ID » pose un flag `biometric_enabled` (profil ou SecureStore).
3. Au lancement suivant, l'app :
   - lit la session depuis `SecureStore` ;
   - si `biometric_enabled` → `LocalAuthentication.authenticateAsync({ biometricsSecurityType })` ;
   - si succès → session restaurée silencieusement ; si échec/annulation → retour à l'écran de login.
4. Garde-fous : `LocalAuthentication.hasHardwareAsync()` + `isEnrolledAsync()` (pas de biométrie → fallback code PIN, comme Pennylane).

**Effort** : ~6-10 h (wrapper + écran opt-in + hook `useBiometricGate`). **Valeur** : parité directe avec Pennylane + facteur de conversion inscription (friction réduite au lancement).

### 5.2 📸 Scanner de reçus natif
`expo-camera` (détection de bords optionnelle) → le pipeline OCR existant (`/api/ocr/*`) est déjà là. Le composant [CameraCapture.tsx](components/ui/CameraCapture.tsx) est le point de départ du wrapper. Effort : ~8-12 h.

### 5.3 🔔 Push natives
`expo-notifications` + tokens Expo Push persistés côté serveur (table `push_tokens` à ajouter). Effort : ~8-12 h (push + backend).

### 5.4 Deep linking & offline
Deep linking Expo (`app.json` scheme) pour les liens `/pay/<token>` et portail client. La logique de sync offline existante (12 pages miroir) se réutilise via un store local + `@tanstack/react-query` `useQuery`.

---

## 6. Roadmap par sprint (v1 ≈ 40 écrans core)

| Sprint | Périmètre | Effort IA |
|---|---|---|
| 0 — Socle | Monorepo Expo+Next, client Supabase mobile, NativeWind, navigation (expo-router), auth email/OTP, **Face ID** | 14-18 h |
| 1 — Cœur facturation | Liste/création/édition factures & devis, clients, calculs + acomptes, **génération/visualisation PDF serveur** | 14-18 h |
| 2 — Argent | Stripe Connect, **lien de paiement solde restant** (déjà livré web), portail client, relances | 8-10 h |
| 3 — Dépenses & IA | Dépenses + **scanner reçus natif**, OCR, Copilot (Groq Whisper via expo-av) | 12-14 h |
| 4 — Cabinet-lite | Vue cabinet (factures/clients/relances scopés), messaging | 8-10 h |
| 5 — Polish natif | **Push**, biométrie finalisée, offline, animations Reanimated, soumission stores | 10-14 h |

**Total estimation IA (GLM-5 / Claude) : ~66-94 h** de code (≈ 2-3 semaines plein-temps), hors review stores.

**Reportés en v2** : 61 pages SEO marketing, 12 clones offline secondaires, e-invoicing B2B complet, paie/contrats avancés.

---

## 7. Prérequis stores & calendrier

- **Apple Developer Program** : 99 $/an. **Google Play Console** : 25 $ (unique).
- **Review App Store** : ~1 sem (première soumission souvent rejetée : guidelines 2.1 info périmée, 4.0 mini-fonctionnalité, 5.1.1 data collection). Budgeter 2-3 allers-retours.
- **Review Play Store** : ~2-5 jours (plus permissif).
- **Stripe mobile** : conserver le backend Checkout (déjà utilisé) — pas besoin du Stripe mobile SDK natif pour les liens de paiement.
- **RGPD / data** : privacy policy déjà en place (`/legal/cgu`) ; ajouter nutrition label Apple (data collection).

---

## 8. Risques & points d'attention

- **Voix** : bien valider `expo-av` (permissions micro iOS/Android, format `m4a` accepté par Groq Whisper).
- **PDF** : le rendu natif diffère du DOM — tester la conformité Factur-X / e-invoicing sur mobile.
- **Auth Supabase** : le refresh token côté RN se gère via le SDK (plus de middleware) — prévoir le hook `useFocusEffect` pour la restauration de session.
- **Réutilisation maximale** : viser 70-80 % de logique commune via un dossier `packages/shared` (types, schemas zod, helpers purs, client Supabase configuré).

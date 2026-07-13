# UI_AUDIT_DOCUMENTS.md - Audit anti-AI-slop : Création de documents & Templates PDF

**Auditeur :** ASTRÉE
**Date :** 2026-07-13
**Périmètre :** Écran de création (Canvas Copilot), liste `/documents`, moteur PDF (`lib/pdf-server.ts`), picker de templates.
**Méthode :** Lecture intégrale du code, citations de classes réelles. Aucune invention. **Aucune modification de code** (conformément à la consigne : ce fichier est le seul livrable de cette cible).
**Référence cible :** Standard SaaS 2026, niveau Abby / Tiime.

---

## Verdict en une ligne

Le create-flow est fonctionnel et soigné par endroits, mais il est **déguisé en "Canvas Copilot" alors qu'il n'a AUCUN aperçu PDF live** (le composant `LivePdfCanvas` est du code mort jamais rendu). La **palette dérive sérieusement** (éméraude brandé perdu au profit d'un dégradé bleu/indigo/violet/rose par type de doc), les **templates PDF premium 7/8/9 (PUR/AUDACE/ÉLÉGANCE) sont invisibles dans le picker** (aperçus identiques, accent identique), et le **PDF trahit la négligence** (accents français manquants sur tous les labels, colonnes numériques non alignées à droite).

---

## TOP 10 DÉFAUTS PRIORISÉS

| # | Défaut | Impact | `file:line` |
|---|---|---|---|
| 1 | `LivePdfCanvas` est **code mort** : aucun aperçu PDF live à la création. Le "Canvas Copilot" n'a pas de canvas. Création à l'aveugle. | Critique produit vs Abby/Tiime | `CanvasCopilotLayout.tsx` (n'importe `LivePdfCanvas` nulle part) ; composant mort dans `components/canvas-copilot/Canvas/LivePdfCanvas.tsx` |
| 2 | **Brand émeraude perdu** : le flux principal (facture) rend en bleu/indigo, devis en violet AI-slop, etc. via gradients par doc-type. | Identitaire | `documentTypeConfig.ts:48,75,102,128,154,180` |
| 3 | **PDF sans Inter** (Helvetica/Times) + **mix serif/sans** non assumé côté web. Le livrable ne ressemble pas à l'outil. | Cohérence premium | `pdf-server.ts:355-368` |
| 4 | **Accents français absents du PDF** ("Emis", "Echeance", "QTE", "FACTURER A", "COORDONNEES", mois "fevrier/aout/decembre") alors que la police les supporte. | Crédibilité légale | `pdf-server.ts:383,455,457,498,570,615,862` |
| 5 | **Colonnes numériques du PDF alignées à gauche** (Qté / P.U. / TVA via `drawText`) au lieu de droite. Défaut comptable majeur. | Lisibilité pro | `pdf-server.ts:636-638` |
| 6 | **Picker de templates menteur** : 7/8/9 (PUR/AUDACE/ÉLÉGANCE) ont aperçus identiques + accent identique ; 1-6 affichent des accents que le rendu ignore. Faute "Modele". | Choix utilisateur | `TemplateSelector.tsx:11-19,55-104,122` |
| 7 | **Cibles tactiles sous 44px** sur mobile : 4 boutons d'action ligne à 28px (`gap-0.5`), toggles remise ~24px, retour/undo 28-32px, bouton save 36px. | WCAG 2.5.5, UX mobile | `DocumentFormPanel.tsx:661,208,214` ; `CanvasCopilotLayout.tsx:82,108,150` |
| 8 | **Rainbow chips icônes de section** (bleu/éméraude/violet/ambre) + toggles remise bicolore (éméraude vs orange) + B2B/B2C bicolore. Palette interne non tenue. | Cohérence visuelle | `DocumentFormPanel.tsx:444,617,888,940,214-216,421-425,825-827` |
| 9 | **Double teinte émeraude** web `#10b981` vs PDF `#1D9E75`. Le vert du PDF ne matche pas celui de l'app. | Brand | `tailwind.config.ts:31` vs `pdf-server.ts:361` + `TemplateSelector.tsx:17-19` |
| 10 | **Tokens radius APEX (`card`/`control`/`pill`) définis mais ignorés** dans le canvas : `rounded-2xl/xl/lg` cohabitent dans `DocumentFormPanel` (3 rayons). | Cohérence système | `tailwind.config.ts:78-82` vs `DocumentFormPanel.tsx:45,160,207` |

---

## 1. LAYOUT & STRUCTURE

**Faux-ami structurel majeur : le "Canvas" n'existe pas.**
`CanvasCopilotLayout.tsx` ne rend **jamais** `LivePdfCanvas`. Le "canvas" est en réalité :
- une colonne unique `DocumentFormPanel` (formulaire),
- une barre basse `VoiceOneShot` + `SmartTextBar`.

`components/canvas-copilot/Canvas/LivePdfCanvas.tsx` (507 lignes : squelette PDF.js, zoom, iframe fallback, skeleton, quick-stats) est **code mort**. L'utilisateur crée sa facture **à l'aveugle**, sans aperçu du PDF final. C'est le défaut #1 vs Abby/Tiime qui affichent le PDF en live au-dessus du formulaire (desktop) / en sheet (mobile).

**Hiérarchie de la liste `/documents` (`app/(app)/documents/page.tsx`)** : propre et lisible.
- Header titre + compteur + CTA "Nouveau" (`:260`)
- Segment control type doc (`:272`)
- Search + filtres avancés (`:294`)
- Onglets statut (`:317`)
- Table desktop (`:355`) / cards mobile swipeables (`:394`)

Bonne progression de révélation. Seul point faible : `even:bg-muted/20` zébrage desktop (`:370`) sans séparation visuelle équivalente sur mobile hors `border-t` interne (`:423`).

**`DocumentFormPanel`** : 5 `FormSection` dépliables (Client / Lignes / Totaux / Options / Conformité). Mais **incohérent** : la section Totaux (`:782-883`) est un `motion.div` non repliable, tandis que Options et Conformité sont repliées par défaut. La section la plus importante (Totaux) ne respecte pas le pattern des autres.

**Barre sticky "Ajouter une ligne" (`:770`)** casse le flux via un hack `-mx-4 px-4 backdrop-blur-md` pour "sortir" de la card. Risque de superposition sale au-dessus de la card Totaux qui suit immédiatement.

---

## 2. COLOR : Dérive palette (défaut n°2)

Brand = émeraude (`globals.css:7` `--primary: #10b981`). Mais l'écran de création s'affiche en **BLEU/INDIGO** pour la facture (le flux principal).

| Endroit | Classe | Couleur | `file:line` |
|---|---|---|---|
| Bouton "Créer" facture | `from-blue-500 to-indigo-500` | bleu/indigo | `documentTypeConfig.ts:48` |
| Devis | `from-purple-500 to-violet-500` | violet (AI-tell) | `:75` |
| Avoir | `from-rose-500 to-pink-500` | rose | `:102` |
| Acompte | `from-emerald-500 to-teal-500` | émeraude | `:128` |
| Commande | `from-amber-500 to-orange-500` | ambre | `:154` |
| Livraison | `from-cyan-500 to-blue-500` | cyan | `:180` |

Six familles chromatiques sur un même écran selon le type. La loi de l'accent unique émeraude n'est tenue que pour les focus rings (`focus:ring-emerald-500/30`) et le total. Pour le flux principal (facture), **l'écran est bleu, pas émeraude**. Contradiction flagrante avec le brief brand.

**Offenseurs directs additionnels :**
- `VoiceOneShot.tsx:294` état processing = `from-blue-500 to-indigo-500 shadow-blue-500/30`. Le gradient violet/bleu "AI slop" classique sur le bouton micro.
- `SmartTextBar.tsx:147` bouton envoyer = `bg-blue-500` alors que le bouton micro idle est émeraude. Deux boutons côte-à-côte, deux couleurs.
- `DocumentFormPanel.tsx:444` Client = `text-blue-500` ; `:617` Lignes = `text-emerald-500` ; `:888` Options = `text-purple-500` ; `:940` Conformité = `text-amber-500`. Quatre chips icônes, quatre couleurs (rainbow chips).
- `:421-425` B2B = émeraude, B2C = bleu. Deux couleurs pour le même contrôle.
- `:214-216` toggle remise ligne actif = `bg-emerald-500` ; `:825-827` toggle remise globale actif = `bg-orange-500`. Même pattern de toggle, deux couleurs d'état actif.
- `:808-810` ligne "Remises lignes" = `text-orange-500`. Troisième accent (orange) dans les totaux.

**Double teinte émeraude :** `#10b981` (web, `tailwind.config.ts:31`) vs `#1D9E75` (défaut PDF `pdf-server.ts:361` + previews 7/8/9 `TemplateSelector.tsx:17-19`). Le PDF et le web ne tombent pas sur le même vert.

---

## 3. TYPOGRAPHY

**Inter est chargé** (`globals.css:77`, `cv11`/`ss01`, antialias). Bon.

**Mais le PDF n'utilise PAS Inter** : `pdf-server.ts:355-358` embarque `StandardFonts.Helvetica` + `TimesRoman`. L'app web est en Inter (sans-serif géométrique moderne), le PDF en Helvetica + TimesRoman (par défaut OS). C'est une **incohérence typographique majeure** entre l'expérience de création et le livrable. Une facture premium 2026 embarque sa police. pdf-lib supporte `embedFont(ttfBytes). Ce n'est pas fait.

**Mix serif/sans dans le PDF** (`:366-368`) : les "titres héroïques" (label doc, nom société, TOTAL TTC) en **TimesRoman Bold**, le corps en Helvetica. Le commentaire explique le choix ("serif prestige"). Mais l'app web est 100% sans-serif : l'utilisateur crée en sans-serif et reçoit un PDF en serif. Deal-breaker de cohérence "premium".

**Hiérarchie dans le form :**
- `CanvasCopilotLayout.tsx:96` h1 page = `text-sm font-bold` (14px pour le titre principal). Trop faible. Abby/Tiime ont un h1 à 18-22px.
- `:131` label "Total" = `text-[10px]`. Sous le seuil de lisibilité.
- `DocumentFormPanel.tsx:141` labels champs = `text-[11px] font-semibold uppercase tracking-wider`, micro-majuscules correctes mais **répété ~15x** (eyebrow overuse, voir §7).
- `:877` Total TTC = `text-xl font-black tracking-tight` émeraude. Hero number propre.
- Le label textarea (`:921-925`) et select TVA (`:725`) **réimplémentent** le style label au lieu d'utiliser `FormInput`. Drift.

---

## 4. SPACING & RHYTHM

- Sections externes `space-y-4`, internes `space-y-3`. Globalement tenus.
- **Valeurs arbitraires (pixel-nudging) :**
  - `DocumentFormPanel.tsx:724` `pb-[1px]` (alignement à 1px près du select TVA).
  - `:703` `grid-cols-[1fr_1fr_auto]` sans breakpoint responsive.
  - `:732` `w-[72px]` pour le select TVA.
  - `VoiceOneShot.tsx:271` `rounded-[20px] lg:rounded-[22px]` (2 valeurs arbitraires pour 2px de différence).
  - `LivePdfCanvas.tsx:466` `backdrop-blur-[2px]`.
- **3 paddings de barre différents** sur le même écran : header `px-3 sm:px-4 py-2.5` (`CanvasCopilotLayout.tsx:76`), barre voix desktop `px-4 py-3` (`:202`), barre voix mobile `px-3 py-2.5` (`:237`). Aucun token commun.
- `DocumentFormPanel.tsx:661` `mt-6 gap-0.5` : les 4 boutons d'action ligne sont collés (`gap-0.5` = 2px) puis poussés par `mt-6`. Contradiction rythmique.

---

## 5. CORNER RADII : Système défini mais ignoré

`tailwind.config.ts:78-82` définit **3 tokens propres** : `card: 1rem` (16px), `control: 0.75rem` (12px), `pill: 9999px`. Bonne intention APEX.

**Mais les composants canvas ignorent ces tokens et utilisent les classes Tailwind natives :**
- `DocumentFormPanel.tsx:45` section = `rounded-2xl`
- `:160` input = `rounded-xl`
- `:207` toggle %/EUR = `rounded-lg`
- `:770` bouton "Ajouter une ligne" = `rounded-control` (token, isolé)
- `CanvasCopilotLayout.tsx:150` bouton save = `rounded-xl`
- `:82` bouton back = `rounded-lg`

Sur le seul écran `DocumentFormPanel` : **3 rayons cohabitent** (`2xl`, `xl`, `lg`). Aucun n'utilise le token. La migration APEX annoncée dans le commentaire du config n'a jamais eu lieu dans le canvas.

Le PDF, lui, est cohérent : `drawRoundedRect` avec `radius: 8` partout (`pdf-server.ts:566,671,681,731,797,839,859,899`). Un seul rayon côté PDF. OK.

---

## 6. CONTRAST (WCAG)

Échecs AA avérés (texte normal = 4.5:1 requis) :

| Élément | Classe | Ratio estimé | Statut | `file:line` |
|---|---|---|---|---|
| Numéro de ligne | `text-gray-300 dark:text-gray-600` | ~1.7:1 (clair) | **fail critique** | `DocumentFormPanel.tsx:647` |
| Placeholder input | `placeholder:text-gray-400` | ~3.0:1 | fail (illisible) | `:164` |
| Suffixe "EUR" | `text-gray-400` | ~3:1 | fail | `:168` |
| Label "Total" header | `text-[10px] text-gray-500` | borderline @ 10px | fail taille | `CanvasCopilotLayout.tsx:131` |
| Libellé aperçu canvas | `text-[10px] text-gray-400` | fail | fail | `LivePdfCanvas.tsx:483,489` |
| Lignes "Remises" | `text-orange-500` | ~3.9:1 | borderline fail | `DocumentFormPanel.tsx:808-810` |
| Muted labels PDF | `muted = rgb(0.42,0.45,0.50)` | ~6.5:1 sur blanc | OK | `pdf-server.ts:373` |

Le durcissement (slate-600 `--muted-foreground`, OBSIDIAN zinc-400) **dans `globals.css` est bon**, mais le canvas-copilot n'en profite pas : il utilise `text-gray-400/500` en dur au lieu de `text-muted-foreground`.

---

## 7. AI-TELL CHECK

| Signal | Présent ? | Détail |
|---|---|---|
| Em-dashes décoratifs UI | Non | Propre côté UI. Le PDF utilise ` - ` séparateur légal, OK. |
| Decorative dots | Oui | `LivePdfCanvas.tsx:498` bullet décoratif devant le nom client (code mort, mais à purger si réactivé). |
| Version labels | Non | OK |
| Placeholder génériques "Acme"/"John Doe" | Non | Placeholders FR réalistes (`email@example.com`, `06 12 34 56 78`, `Paris`, `75001`). **Bon.** |
| SVG faits main | Oui mais soignés | `TemplateSelector.tsx:55-104` MiniPreview propre, pas du slop. |
| shadcn non customisé | Non | OK |
| Nombres "parfaits" | Mineur | `documentTypeConfig.ts:63,90` suggestions à 600/800/2500 EUR, acceptables pour exemples. |
| **AI-purple glows** | **OUI** | `VoiceOneShot.tsx:294` gradient `from-blue-500 to-indigo-500` + `shadow-blue-500/30` sur l'état "Analyse IA en cours". Classique tell. |
| "Quietly..." headers | Non | OK |
| Eyebrow overuse | Oui | `text-[10px]/[11px] font-bold/semibold uppercase tracking-[wide/wider]` répété ~15x (labels champs, badges B2B/B2C, header canvas, totaux). Sur-pattern. |
| Emoji | Mineur | Drapeaux dans détection langue voix, contextuel, OK. |

---

## 8. PDF / DOCUMENT TEMPLATES : PUR / AUDACE / ÉLÉGANCE

### Défaut STRUCTUREL du picker (`TemplateSelector.tsx`)
- `:17-19` : templates 7, 8, 9 ont **les trois exactement le même accent** `#1D9E75` et le même mini-SVG (`MiniPreview` identique pour tous, ne reflète ni `totalStyle: 'flat'/'card'/'boxed'`, ni `headerFull`, ni le `headerH`). **L'utilisateur ne peut pas les distinguer visuellement.** Seul le nom différencie. Pour un picker "premium", c'est un échec.
- Templates 1-6 (`:11-16`) affichent une **arc-en-ciel d'accents** (`#10b981`, `#3b82f6`, `#8b5cf6`, `#f59e0b`, `#64748b`, `#22c55e`) qui **ne correspond pas** à ce que `pdf-server.ts` rend réellement. **Le picker ment sur le rendu.**
- `:122` label `Modele` : **faute d'accent** ("Modèle"). Sur l'écran de sélection du template.

### Qualité du rendu PDF (`pdf-server.ts`)

**Bons points :**
- Numérique : `fmt()` via `Intl.NumberFormat('fr-FR', EUR)` propre (`:379`).
- Footer QR conforme ISO 18004 (64px, EC 'L'), annotation lien cliquable (`:812,820`). Bien.
- Gestion multi-page `needPage()` propre (`:408`).
- Contraste total géré par `bestTextOn` / `legibleAccentOn` (`:46-59`). Travail sérieux WCAG sur le total TTC.
- Logos `scaleToFit(220,60)` / `(240,80)` corrects.

**Défauts (citations `pdf-server.ts`) :**

1. **Accents français manquants partout.** Le commentaire `:71` admet que WinAnciEncoding **supporte** é/è/à/ç/œ, pourtant TOUS les labels sont écrits sans accents :
   - `:455` `Emis le` -> "Émis le"
   - `:457,498` `Echeance :` -> "Échéance :"
   - `:570` `FACTURER A` -> "FACTURÉ À"
   - `:615` `QTE` -> "QTÉ" (ou "Qté")
   - `:862` `COORDONNEES BANCAIRES` -> "COORDONNÉES BANCAIRES"
   - `:383` tableau des mois **sans accents** : "fevrier", "aout", "decembre" -> "février", "août", "décembre". Le rendu "15 aout 2026" sur une facture française est une baisse de crédibilité immédiate.

2. **Colonnes numériques non alignées à droite** (`:636-638`) : Quantité, P.U. HT, TVA utilisent `drawText` (alignement gauche). Seul "TOTAL HT" utilise `rightText` (`:639`). En comptabilité, toutes les colonnes numériques s'alignent à droite sur le séparateur décimal. Ici, "1 000,00" et "100" se collent à gauche. Défaut typographique comptable classique d'un produit non-premium.

3. **Tableaux sans structure sur templates PUR/défaut** (`:296-297,340`) : `rowEven = rowOdd = blanc`. Aucune séparation, pas de zebra, pas de lignes. Trop plat pour le template "épuré premium" annoncé.

4. **Asymétrie sender/client** (`:522-580`) : le bloc client a un card arrondi + barre accent 3px (`:566-568`) ; le bloc émetteur n'a **ni card ni barre**, juste label + texte brut. La hiérarchie visuelle penche vers le client alors que l'émetteur est l'expéditeur.

5. **Footer légal à 6.5pt** (`:955`) : `centreText(size: 6.5)`. Sous le seuil usuel 7pt pour mentions légales. Premium = >=7pt.

6. **Watermark "PAYÉ"/"EN RETARD"** (`lib/pdf.ts:13-23`) en `rgba(...0.07)` (7% opacité), rotation -35°. Très subtil, peut passer inaperçu. Le defect inverse du slop, peut-être trop discret.

7. **`headerH: 120` pour AUDACE** (`:428`) : 120pt de bande pleine accent (43% de la hauteur d'un en-tête). Très lourde. Si l'accent est saturé (#1D9E75), 120pt de vert pleine page = touche 90s, pas 2026.

8. **ÉLÉGANCE header noir** (`:324`) : `headerBg = rgb(0.07,0.07,0.07)` barre 6pt. Pour un template "élégance", une barre noire pleine largeur au lieu d'un filet capillaire est brutal.

---

## 9. MOBILE

**Bonne intention** : branches desktop/mobile séparées (`CanvasCopilotLayout.tsx:189,223`), `min-h-0` sur tous les flex, `100dvh` (`:73`), `SwipeableCard` sur la liste, `min-h-[44px] min-w-[44px]` sur le bouton relance (`documents/page.tsx:431`). Le bouton micro `VoiceOneShot.tsx:290` `w-14 h-14` (56px) est la **seule** cible tactile correcte.

**Défauts tactiles avérés :**
- `DocumentFormPanel.tsx:661-698` **4 boutons d'action ligne** (catalogue/vider/dupliquer/supprimer) en `w-7 h-7` (28px) à `gap-0.5` (2px). 28px < 44px seuil Apple/WCAG 2.5.5. Quatre cibles minuscules collées = intouchables au doigt.
- `:208-231` toggles %/EUR remise ligne en `px-2 py-1 text-[10px]` (~24px de haut). Trop petit.
- `CanvasCopilotLayout.tsx:82` bouton retour `w-8 h-8` (32px) < 44px.
- `:108,117` undo/redo `p-1.5` (~28px) < 44px.
- `:150` bouton save `py-2` (~36px). Sous le seuil.
- `SmartTextBar.tsx:144` bouton envoyer `w-9 h-9` (36px) < 44px.

**Aucun aperçu PDF mobile** : `LivePdfCanvas` étant code mort, le mobile (comme le desktop) crée la facture sans aperçu live. Gap majeur vs Tiime/Abby.

**Pas de responsive grid** : `DocumentFormPanel.tsx:703` `grid-cols-[1fr_1fr_auto]` (Qté/Prix/TVA) n'a pas de breakpoint. Sur <360px les 3 colonnes se compressent sans fallback.

**Total masqué sur mobile** : `CanvasCopilotLayout.tsx:129` `hidden md:flex`. Sur mobile, le total running n'apparaît qu'en bas de page dans la card Totaux. L'utilisateur perd la rétroaction "montant en cours" pendant la saisie.

---

## 10. RECOMMANDATIONS SaaS 2026 (digne d'Abby / Tiime)

Priorité 1 (bloquant pour la crédibilité) :
1. **Réactiver `LivePdfCanvas`** (ou le reconstruire proprement) pour un aperçu PDF live en création. Desktop : PDF à gauche, form à droite. Mobile : PDF en bottom-sheet. C'est LA fonctionnalité signature d'un atelier facture 2026.
2. **Réimposer l'éméraude brandé** partout : supprimer les gradients par doc-type dans `documentTypeConfig.ts`. Différencier les types par un **icône** et un **libellé**, pas par la couleur. Le bouton "Créer" et le bouton micro sont émeraude, point.
3. **Embarquer Inter dans le PDF** via `embedFont(ttfBytes)` (Inter est OFL, auto-hébergeable). Supprimer le mix Helvetica/TimesRoman. Cohérence web = PDF.
4. **Restaurer les accents français** dans tous les labels PDF (`Émis le`, `Échéance`, `QTÉ`, `FACTURÉ À`, `COORDONNÉES`, mois complets). C'est 5 minutes de travail pour un gain de crédibilité massif.
5. **Aligner les colonnes numériques à droite** (Qté / P.U. HT / TVA / Total HT) via `rightText` avec padding droit commun.

Priorité 2 (finitions premium) :
6. **Rendre le picker de templates honnête** : 3 mini-aperçus réellement différents pour 7/8/9 (reflétant `totalStyle` + `headerH`), accent unique émeraude `#10b981`. Corriger "Modèle".
7. **Aligner la teinte émeraude** web = PDF = `#10b981` (ou un token brand partagé).
8. **Migrer le canvas vers les tokens radius APEX** (`rounded-card` / `rounded-control` / `rounded-pill`).
9. **Respecter la cible tactile 44px** sur tous les boutons mobiles.
10. **Cibler `text-muted-foreground`** au lieu de `text-gray-400` pour hériter du durcissement WCAG de `globals.css`.

---

## Points bons (à conserver)

- Section collapse progressive disclosure (`FormSection`) : pattern propre.
- `bestTextOn` / `legibleAccentOn` côté PDF : vrai travail contraste WCAG sur le total TTC.
- QR ISO 18004 + annotation lien cliquable + URL courte : bien exécuté.
- `fmtEUR` Intl partout sur la liste : formatage monétaire correct.
- Placeholders FR réalistes (pas d'"Acme"/"John Doe").
- `SwipeableCard` + `min-h-[44px]` sur liste mobile : la liste est meilleure que le create.
- `globals.css` durci (slate-600, OBSIDIAN zinc) : fondations saines (mais le canvas les contourne avec `text-gray-400` en dur).

---

## Fichiers clés

- `components/canvas-copilot/CanvasCopilotLayout.tsx`
- `components/canvas-copilot/Form/DocumentFormPanel.tsx`
- `components/canvas-copilot/Voice/VoiceOneShot.tsx`
- `components/canvas-copilot/Voice/SmartTextBar.tsx`
- `components/canvas-copilot/Canvas/LivePdfCanvas.tsx` (code mort)
- `components/canvas-copilot/Form/TemplateSelector.tsx`
- `components/canvas-copilot/config/documentTypeConfig.ts`
- `lib/pdf-server.ts`
- `lib/pdf.ts`
- `app/(app)/documents/page.tsx`
- `tailwind.config.ts`
- `app/globals.css`

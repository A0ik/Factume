# Templates de Documents Commerciaux - Documentation

## 📋 Vue d'ensemble

Ce dossier contient les templates pour tous les documents commerciaux générés par FacturmeWeb. Les templates ont été améliorés pour être **conformes aux réglementations françaises et internationales** tout en conservant un design élégant et professionnel.

## 🎨 Templates Disponibles

### Templates Généraux
- **Minimaliste** (`templateMinimaliste`) - Design épuré et moderne
- **Classique** (`templateClassique`) - Style traditionnel français
- **Moderne** (`templateModerne`) - Design contemporain
- **Élégant** (`templateElegant`) - Typographie sophistiquée
- **Corporate** (`templateCorporate`) - Style entreprise
- **Nature** (`templateNature`) - Palette de couleurs naturelles

### Templates Spécialisés
- **Bon de commande** (`templatePurchaseOrder`) - Spécifique pour les commandes clients
- **Bon de livraison** (`templateDeliveryNote`) - Spécifique pour les livraisons

## 📄 Types de Documents Supportés

| Type | Description | Mentions Spécifiques |
|------|-------------|---------------------|
| `invoice` | Facture | Pénalités de retard, coordonnées bancaires |
| `quote` | Devis | Date de validité, signature "Bon pour accord" |
| `credit_note` | Avoir | Référence facture originale |
| `deposit` | Facture d'acompte | Mention acompte L.441-9 |
| `purchase_order` | Bon de commande | Conditions de vente, date de validité |
| `delivery_note` | Bon de livraison | Date de livraison, signature destinataire |

## ✅ Conformité Réglementaire

### France (Métropole)
- ✅ Article L.441-9 du Code de commerce (numérotation continue)
- ✅ Article L.441-10 (pénalités de retard: 3× taux légal + 40€)
- ✅ Article 293 B du CGI (auto-entrepreneur: TVA non applicable)
- ✅ Mentions SIRET, RCS, TVA intracommunautaire
- ✅ Clause de propriété intellectuelle
- ✅ Mention d'assurance professionnelle (auto-entrepreneurs/freelances)

### Royaume-Uni
- ✅ Late Payment of Commercial Debts Regulations 2013
- ✅ VAT number, Company registration
- ✅ Late payment penalties: 3× statutory + £40

### Belgique
- ✅ Loi relative aux délais de paiement
- ✅ Numéro d'entreprise, TVA
- ✅ Intérêts de retard: taux légal + 10% + 40€

### Suisse
- ✅ OR Art. 104 (Code des obligations)
- ✅ Handelsregister, MwSt-Nr.
- ✅ Verzugszinsen: 5% + 40 CHF

### Allemagne
- ✅ § 286 BGB, § 14 UStG
- ✅ Handelsregisternummer, USt-IdNr.
- ✅ Verzugszinsen: 5% + 40€

## 🌍 Support Multilingue

Les templates supportent plusieurs langues :
- **Français** (`fr-FR`, `fr-BE`) - France, Belgique
- **Anglais** (`en-GB`) - Royaume-Uni
- **Allemand** (`de-DE`, `de-CH`) - Allemagne, Suisse

## 🔧 Fonctionnalités Clés

### Mentions Obligatoires Automatiques
Chaque document inclut automatiquement :
- Numéro du document
- Date d'émission
- Date d'échéance (si applicable)
- Montant à régler (factures/acomptes)
- Coordonnées bancaires (si applicable)
- Mentions légales spécifiques au type de document

### Assurance Professionnelle
Pour les auto-entrepreneurs et freelances, une mention d'assurance RC Pro est ajoutée automatiquement :
```
Le prestataire déclare être couvert par une assurance Responsabilité Civile
Professionnelle pour les prestations effectuées dans le cadre de ce document.
```

### Propriété Intellectuelle
Une clause de protection de la propriété intellectuelle est incluse :
```
Tous les documents, logiciels, méthodes, procédés et savoir-faire demeurent
la propriété exclusive du prestataire. Toute reproduction, diffusion ou
utilisation non autorisée constitue une contrefaçon passible des sanctions
prévues aux articles L.335-2 et suivants du Code de la propriété intellectuelle.
```

### Paiement en Ligne
Intégration transparente avec :
- **Stripe** - QR code pour paiement instantané
- **SumUp** - Alternative de paiement
- **Virement bancaire** - Coordonnées IBAN/BIC

### Validation de Numérotation
Le module `invoice-validation.ts` assure :
- ✅ Numérotation continue (obligatoire L.441-9)
- ✅ Séquence chronologique
- ✅ Génération automatique du prochain numéro

## 📦 Structure des Fichiers

```
lib/
├── templates.ts              # Templates principaux
├── pdf.ts                    # Génération PDF/HTML
├── invoice-validation.ts     # Validation numérotation
├── legal-mentions.ts         # Mentions par pays
└── TEMPLATES_README.md       # Ce fichier
```

## 🚀 Utilisation

### Générer un document

```typescript
import { generateInvoiceHtml } from '@/lib/pdf';
import { validateInvoiceNumbering, generateNextInvoiceNumber } from '@/lib/invoice-validation';

// Valider la numérotation
const lastInvoice = await getLastInvoice();
const validation = validateInvoiceNumbering(lastInvoice, newInvoice);
if (!validation.isValid) {
  throw new Error(validation.error);
}

// Générer le HTML
const html = generateInvoiceHtml(invoice, profile);
```

### Template personnalisé

```typescript
import { applyCustomTemplate } from '@/lib/templates';

const customHtml = `
  <div>{{company_name}}</div>
  <div>{{invoice_number}}</div>
  ...
`;

const html = applyCustomTemplate(customHtml, templateData);
```

## 🎯 Variables Disponibles pour Templates Personnalisés

| Variable | Description |
|----------|-------------|
| `{{company_name}}` | Nom de l'entreprise |
| `{{company_logo}}` | Logo de l'entreprise |
| `{{invoice_number}}` | Numéro du document |
| `{{issue_date}}` | Date d'émission |
| `{{due_date}}` | Date d'échéance |
| `{{client_name}}` | Nom du client |
| `{{items_table}}` | Tableau des articles |
| `{{total}}` | Montant total TTC |
| `{{bank_block}}` | Coordonnées bancaires |
| `{{payment_section}}` | Section paiement en ligne |
| `{{mandatory_mentions}}` | Mentions obligatoires |
| `{{insurance_mention}}` | Mention assurance |
| `{{intellectual_property_mention}}` | Mention propriété intellectuelle |

## 📚 Références Légales

### France
- [Code de commerce - Article L.441-9](https://www.legifrance.gouv.fr/codes/id/LEGIARTI000006442567/)
- [Code de commerce - Article L.441-10](https://www.legifrance.gouv.fr/codes/id/LEGIARTI000006442568/)
- [Code général des impôts - Article 293 B](https://www.legifrance.gouv.fr/codes/id/LEGIARTI000006309074/)

### Royaume-Uni
- [Late Payment of Commercial Debts Regulations 2013](https://www.legislation.gov.uk/ukdsi/2013/395/contents/made)

### Union Européenne
- [Directive 2011/7/UE sur les délais de paiement](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32011L0007)

## 🔐 Sécurité et Conformité

- ✅ Protection des données personnelles (RGPD)
- ✅ Clause de confidentialité incluse
- ✅ Mention de juridiction compétente
- ✅ Numérotation continue et chronologique
- ✅ Mentions légales par type de document
- ✅ Support multi-devises et multilingue

## 📈 Évolutions Futures

Planned improvements:
- [ ] Support de l'arabe (droite à gauche)
- [ ] Templates pour l'export (certificat d'origine, proforma)
- [ ] Intégration electronic signature ( qualified electronic signature)
- [ ] Templates pour les factures électroniques (Chorus Pro, etc.)

---

**Version**: 2.0.0
**Dernière mise à jour**: 2026-05-01
**Mainteneur**: FacturmeWeb Team

'use client';

import {
  FileText, Clipboard, RefreshCw, Banknote,
  ShoppingCart, Truck, type LucideIcon,
} from 'lucide-react';
import { DocumentType } from '@/types';

/**
 * Configuration for each document type.
 * This is the single source of truth that replaces 6 duplicated pages.
 * Aligned with DOC_META in components/pdf-document.tsx
 * and DOC_TYPE_CONFIG in app/api/ai/generate-invoice/route.ts
 *
 * APEX (anti-AI-slop) — Un seul accent brand (éméraude #10b981) pour TOUS les
 * types. On différencie les documents par un ICÔNE (FileText, Clipboard…),
 * jamais par la couleur. Fini les gradients bleu/violet/rose par doc-type.
 */
export interface DocTypeConfig {
  type: DocumentType;
  label: string;
  shortLabel: string;
  slug: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  bgLight: string;
  bgDark: string;
  border: string;
  defaultPaymentDays: number;
  showPaymentTerms: boolean;
  showVat: boolean;
  showBankInfo: boolean;
  requireLinkedInvoice: boolean;
  hasDepositPercent: boolean;
  welcomeTitle: string;
  welcomePrompt: string;
  aiPromptPrefix: string;
  suggestions: string[];
  voiceMode: 'invoice' | 'quote' | 'credit_note' | 'order' | 'delivery' | 'deposit';
}

/** Apparence brand unifiée : émeraude partout. Les types se distinguent par l'icône. */
const BRAND = {
  color: 'text-emerald-600 dark:text-emerald-400',
  gradient: 'from-emerald-500 to-emerald-600',
  bgLight: 'bg-emerald-50',
  bgDark: 'dark:bg-emerald-500/10',
  border: 'border-emerald-200 dark:border-emerald-500/30',
} as const;

export const DOC_TYPE_CONFIGS: Record<DocumentType, DocTypeConfig> = {
  invoice: {
    type: 'invoice',
    ...BRAND,
    label: 'Nouvelle facture',
    shortLabel: 'Facture',
    slug: 'factures',
    icon: FileText,
    defaultPaymentDays: 30,
    showPaymentTerms: true,
    showVat: true,
    showBankInfo: true,
    requireLinkedInvoice: false,
    hasDepositPercent: false,
    welcomeTitle: 'Créez votre facture',
    welcomePrompt: 'Décrivez votre facture, ajoutez un client, des lignes...',
    aiPromptPrefix: 'FACTURE',
    voiceMode: 'invoice',
    suggestions: [
      'Facture pour Dupont, 3 jours de développement à 600€/jour',
      'Facture design logo 800€ HT pour Martin Consulting',
      'Facture hébergement web 120€/an, TVA 20%',
    ],
  },
  quote: {
    type: 'quote',
    ...BRAND,
    label: 'Nouveau devis',
    shortLabel: 'Devis',
    slug: 'devis',
    icon: Clipboard,
    defaultPaymentDays: 30,
    showPaymentTerms: true,
    showVat: true,
    showBankInfo: true,
    requireLinkedInvoice: false,
    hasDepositPercent: false,
    welcomeTitle: 'Créez votre devis',
    welcomePrompt: 'Décrivez votre devis en quelques mots...',
    aiPromptPrefix: 'DEVIS',
    voiceMode: 'quote',
    suggestions: [
      'Devis pour création site vitrine, 5 pages, 2500€ HT',
      'Devis refonte graphique pour Entreprise XYZ',
      'Devis prestation conseil, 10 jours à 500€/jour',
    ],
  },
  credit_note: {
    type: 'credit_note',
    ...BRAND,
    label: 'Nouvel avoir',
    shortLabel: 'Avoir',
    slug: 'avoirs',
    icon: RefreshCw,
    defaultPaymentDays: 30,
    showPaymentTerms: true,
    showVat: true,
    showBankInfo: true,
    requireLinkedInvoice: true,
    hasDepositPercent: false,
    welcomeTitle: 'Créez votre avoir',
    welcomePrompt: 'Décrivez votre avoir ou sélectionnez la facture associée...',
    aiPromptPrefix: 'AVOIR',
    voiceMode: 'credit_note',
    suggestions: [
      'Avoir de 200€ sur la facture pour Dupont',
      'Avoir partiel pour le client Martin, remise 15%',
    ],
  },
  deposit: {
    type: 'deposit',
    ...BRAND,
    label: "Nouvelle facture d'acompte",
    shortLabel: 'Acompte',
    slug: 'acomptes',
    icon: Banknote,
    defaultPaymentDays: 15,
    showPaymentTerms: true,
    showVat: true,
    showBankInfo: true,
    requireLinkedInvoice: true,
    hasDepositPercent: true,
    welcomeTitle: "Créez votre facture d'acompte",
    welcomePrompt: "Décrivez votre acompte ou sélectionnez la facture associée...",
    aiPromptPrefix: 'ACOMPTE',
    voiceMode: 'deposit',
    suggestions: [
      "Acompte de 30% sur le devis pour Dupont",
      "Facture d'acompte 1500€ pour le projet web de Martin",
    ],
  },
  purchase_order: {
    type: 'purchase_order',
    ...BRAND,
    label: 'Nouveau bon de commande',
    shortLabel: 'Commande',
    slug: 'commandes',
    icon: ShoppingCart,
    defaultPaymentDays: 30,
    showPaymentTerms: true,
    showVat: true,
    showBankInfo: false,
    requireLinkedInvoice: false,
    hasDepositPercent: false,
    welcomeTitle: 'Créez votre bon de commande',
    welcomePrompt: 'Décrivez votre bon de commande...',
    aiPromptPrefix: 'COMMANDE',
    voiceMode: 'order',
    suggestions: [
      'Commande de 10 licences logicielles à 150€/unité',
      'Bon de commande matériel informatique pour le bureau',
    ],
  },
  delivery_note: {
    type: 'delivery_note',
    ...BRAND,
    label: 'Nouveau bon de livraison',
    shortLabel: 'Livraison',
    slug: 'livraisons',
    icon: Truck,
    defaultPaymentDays: 0,
    showPaymentTerms: false,
    showVat: false,
    showBankInfo: false,
    requireLinkedInvoice: false,
    hasDepositPercent: false,
    welcomeTitle: 'Créez votre bon de livraison',
    welcomePrompt: 'Décrivez votre bon de livraison...',
    aiPromptPrefix: 'BON DE LIVRAISON',
    voiceMode: 'delivery',
    suggestions: [
      'Bon de livraison de 3 colis pour Dupont',
      'Livraison de matériel au client Martin, 5 articles',
    ],
  },
};

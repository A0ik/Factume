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

export const DOC_TYPE_CONFIGS: Record<DocumentType, DocTypeConfig> = {
  invoice: {
    type: 'invoice',
    label: 'Nouvelle facture',
    shortLabel: 'Facture',
    slug: 'factures',
    icon: FileText,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-indigo-500',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
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
    label: 'Nouveau devis',
    shortLabel: 'Devis',
    slug: 'devis',
    icon: Clipboard,
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-violet-500',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/30',
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
    label: 'Nouvel avoir',
    shortLabel: 'Avoir',
    slug: 'avoirs',
    icon: RefreshCw,
    color: 'text-rose-500',
    gradient: 'from-rose-500 to-pink-500',
    bgLight: 'bg-rose-50',
    bgDark: 'dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/30',
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
    label: "Nouvelle facture d'acompte",
    shortLabel: 'Acompte',
    slug: 'acomptes',
    icon: Banknote,
    color: 'text-emerald-500',
    gradient: 'from-emerald-500 to-teal-500',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
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
    label: 'Nouveau bon de commande',
    shortLabel: 'Commande',
    slug: 'commandes',
    icon: ShoppingCart,
    color: 'text-amber-500',
    gradient: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
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
    label: 'Nouveau bon de livraison',
    shortLabel: 'Livraison',
    slug: 'livraisons',
    icon: Truck,
    color: 'text-cyan-500',
    gradient: 'from-cyan-500 to-blue-500',
    bgLight: 'bg-cyan-50',
    bgDark: 'dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/30',
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

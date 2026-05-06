// ---------------------------------------------------------------------------
// Plan Comptable Général (PCG) — French chart of accounts mapping
// Used to assign proper accounting codes to OCR-extracted expenses.
// Reference: Plan Comptable Général 2024 (PCG)
// ---------------------------------------------------------------------------

export interface AccountCode {
  code: string;
  label: string;
  category: string;        // Our expense category
  journalType: string;     // Journal type: OD, AC, BQ, VT, etc.
  vatDeductible: boolean;  // Whether VAT is deductible on this account
  defaultVatRate: number;  // Default TVA rate for this account
}

export interface JournalEntry {
  debitAccount: string;
  debitLabel: string;
  creditAccount: string;
  creditLabel: string;
  amount: number;
  vatAmount: number;
  vatAccount: string;
  journalType: string;
}

// ---------------------------------------------------------------------------
// Category → Account code mapping (PCG)
// ---------------------------------------------------------------------------

const CATEGORY_ACCOUNT_MAP: Record<string, AccountCode> = {
  transport: {
    code: '625600',
    label: 'Missions, réceptions, déplacements — Transports',
    category: 'transport',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 10,
  },
  meals: {
    code: '625600',
    label: 'Missions, réceptions, déplacements — Repas',
    category: 'meals',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 10,
  },
  accommodation: {
    code: '625600',
    label: 'Missions, réceptions, déplacements — Hébergement',
    category: 'accommodation',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 10,
  },
  equipment: {
    code: '604000',
    label: 'Achats d\'études et prestations de services — Matériel',
    category: 'equipment',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  office: {
    code: '606400',
    label: 'Achats non stockés — Fournitures de bureau',
    category: 'office',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  shopping: {
    code: '601000',
    label: 'Achats stockés — Matières premières et fournitures',
    category: 'shopping',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  mileage: {
    code: '625100',
    label: 'Déplacements, missions — Indemnités kilométriques',
    category: 'mileage',
    journalType: 'OD',
    vatDeductible: false,
    defaultVatRate: 0,
  },
  telecom: {
    code: '626000',
    label: 'Services extérieurs — Frais de télécommunications',
    category: 'telecom',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  insurance: {
    code: '616000',
    label: 'Services extérieurs — Primes d\'assurance',
    category: 'insurance',
    journalType: 'AC',
    vatDeductible: false,
    defaultVatRate: 0,
  },
  software: {
    code: '618300',
    label: 'Services extérieurs — Abonnements logiciels et SaaS',
    category: 'software',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  other: {
    code: '648000',
    label: 'Autres charges de gestion courante',
    category: 'other',
    journalType: 'OD',
    vatDeductible: true,
    defaultVatRate: 20,
  },
};

// ---------------------------------------------------------------------------
// Supplier category → more precise account code overrides
// ---------------------------------------------------------------------------

const SUPPLIER_CATEGORY_MAP: Record<string, AccountCode> = {
  restaurant: {
    code: '625600',
    label: 'Réceptions — Restaurants',
    category: 'meals',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 10,
  },
  gas_station: {
    code: '606150',
    label: 'Achats non stockés — Carburants',
    category: 'transport',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  hotel: {
    code: '625600',
    label: 'Déplacements — Hôtels',
    category: 'accommodation',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 10,
  },
  supermarket: {
    code: '606800',
    label: 'Achats non stockés — Autres approvisionnements',
    category: 'shopping',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 5.5,
  },
  pharmacy: {
    code: '606800',
    label: 'Achats non stockés — Produits pharmaceutiques',
    category: 'other',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 2.1,
  },
  bookstore: {
    code: '618400',
    label: 'Services extérieurs — Documentation technique',
    category: 'office',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 5.5,
  },
  clothing: {
    code: '606800',
    label: 'Achats non stockés — Équipements professionnels',
    category: 'shopping',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  electronics: {
    code: '604000',
    label: 'Achats de prestations — Matériel informatique',
    category: 'equipment',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  telecom_provider: {
    code: '626000',
    label: 'Frais de télécommunications',
    category: 'telecom',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  insurance_company: {
    code: '616000',
    label: 'Primes d\'assurance',
    category: 'insurance',
    journalType: 'AC',
    vatDeductible: false,
    defaultVatRate: 0,
  },
  software_provider: {
    code: '618300',
    label: 'Abonnements logiciels et SaaS',
    category: 'software',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 20,
  },
  transport_company: {
    code: '625600',
    label: 'Transports de personnes',
    category: 'transport',
    journalType: 'AC',
    vatDeductible: true,
    defaultVatRate: 10,
  },
};

// ---------------------------------------------------------------------------
// TVA account codes
// ---------------------------------------------------------------------------

const TVA_ACCOUNTS: Record<string, string> = {
  '20': '445660',   // TVA déductible sur ABS 20%
  '10': '445660',   // TVA déductible sur ABS 10%
  '5.5': '445662',  // TVA déductible sur ABS 5,5%
  '2.1': '445662',  // TVA déductible sur ABS 2,1%
  '0': '',          // Pas de TVA
};

const TVA_COLLECTED_ACCOUNT = '445710';  // TVA collectée
const SUPPLIER_ACCOUNT = '401000';       // Fournisseurs
const BANK_ACCOUNT = '512000';           // Banque
const CASH_ACCOUNT = '530000';           // Caisse
const PERSONAL_ACCOUNT = '108000';       // Compte de l'exploitant

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the accounting code for an expense based on category and supplier type.
 */
export function getAccountCode(
  category: string,
  supplierCategory?: string | null,
): AccountCode {
  // Supplier-specific mapping takes priority
  if (supplierCategory && SUPPLIER_CATEGORY_MAP[supplierCategory]) {
    return SUPPLIER_CATEGORY_MAP[supplierCategory];
  }
  return CATEGORY_ACCOUNT_MAP[category] ?? CATEGORY_ACCOUNT_MAP.other;
}

/**
 * Get the TVA account code for a given VAT rate.
 */
export function getVatAccount(vatRate: number | null): string {
  if (!vatRate || vatRate === 0) return '';
  const key = String(vatRate);
  return TVA_ACCOUNTS[key] ?? '445660';
}

/**
 * Generate a full journal entry (écriture comptable) for an expense.
 */
export function generateJournalEntry(params: {
  category: string;
  supplierCategory?: string | null;
  amountTtc: number;
  amountHt: number | null;
  vatAmount: number | null;
  vatRate: number | null;
  paymentMethod: string | null;
}): JournalEntry {
  const {
    category,
    supplierCategory,
    amountTtc,
    amountHt,
    vatAmount,
    vatRate,
    paymentMethod,
  } = params;

  const account = getAccountCode(category, supplierCategory);
  const effectiveHt = amountHt ?? (amountTtc - (vatAmount ?? 0));
  const effectiveVat = vatAmount ?? 0;
  const vatAccount = getVatAccount(vatRate);

  // Credit account = supplier or bank/cash depending on payment
  let creditAccount: string;
  let creditLabel: string;

  if (paymentMethod === 'cash') {
    creditAccount = CASH_ACCOUNT;
    creditLabel = 'Caisse';
  } else if (paymentMethod === 'transfer' || paymentMethod === 'card') {
    creditAccount = BANK_ACCOUNT;
    creditLabel = 'Banque';
  } else {
    creditAccount = SUPPLIER_ACCOUNT;
    creditLabel = 'Fournisseurs';
  }

  return {
    debitAccount: account.code,
    debitLabel: account.label,
    creditAccount,
    creditLabel,
    amount: effectiveHt,
    vatAmount: effectiveVat,
    vatAccount,
    journalType: account.journalType,
  };
}

/**
 * Get all category-to-account mappings (for UI display).
 */
export function getAllAccountCodes(): AccountCode[] {
  return Object.values(CATEGORY_ACCOUNT_MAP);
}

/**
 * Get all supplier category mappings (for UI display).
 */
export function getAllSupplierMappings(): Record<string, AccountCode> {
  return { ...SUPPLIER_CATEGORY_MAP };
}

/**
 * Validate that an account code exists in our mapping.
 */
export function isValidAccountCode(code: string): boolean {
  return [
    ...Object.values(CATEGORY_ACCOUNT_MAP),
    ...Object.values(SUPPLIER_CATEGORY_MAP),
  ].some((a) => a.code === code);
}

export function getCategoryAccountCode(category: string | null | undefined): string {
  if (!category) return '648000';
  return CATEGORY_ACCOUNT_MAP[category]?.code ?? '648000';
}

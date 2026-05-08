// ---------------------------------------------------------------------------
// Currency Detection & Conversion - Multi-currency support
// Supports detection, validation, and conversion of multiple currencies
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Currency patterns for detection
// ---------------------------------------------------------------------------

const CURRENCY_PATTERNS: Record<
  string,
  {
    symbols: RegExp[];
    codes: RegExp[];
    name: string;
    symbol: string;
    code: string;
    decimalSeparator: ',' | '.';
    thousandSeparator: ',' | '.' | ' ' | 'nbsp';
  }
> = {
  EUR: {
    symbols: [/€\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*€/i],
    codes: [/EUR\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*EUR/i],
    name: 'Euro',
    symbol: '€',
    code: 'EUR',
    decimalSeparator: ',',
    thousandSeparator: ' ',
  },
  USD: {
    symbols: [/\$\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*\$/i],
    codes: [/USD\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*USD/i],
    name: 'US Dollar',
    symbol: '$',
    code: 'USD',
    decimalSeparator: '.',
    thousandSeparator: ',',
  },
  GBP: {
    symbols: [/£\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*£/i],
    codes: [/GBP\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*GBP/i, /£\s*(\d+[,\s*\d]*)/i],
    name: 'British Pound',
    symbol: '£',
    code: 'GBP',
    decimalSeparator: '.',
    thousandSeparator: ',',
  },
  CHF: {
    symbols: [/CHF\s*(\d+[,\s*\d]*)/i],
    codes: [/CHF\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*CHF/i],
    name: 'Swiss Franc',
    symbol: 'CHF',
    code: 'CHF',
    decimalSeparator: '.',
    thousandSeparator: ',',
  },
  CAD: {
    symbols: [/\$\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*\$/i],
    codes: [/CAD\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*CAD/i],
    name: 'Canadian Dollar',
    symbol: 'C$',
    code: 'CAD',
    decimalSeparator: '.',
    thousandSeparator: ',',
  },
  AUD: {
    symbols: [/\$\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*\$/i],
    codes: [/AUD\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*AUD/i],
    name: 'Australian Dollar',
    symbol: 'A$',
    code: 'AUD',
    decimalSeparator: '.',
    thousandSeparator: ',',
  },
  JPY: {
    symbols: [/¥\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*¥/i],
    codes: [/JPY\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*JPY/i],
    name: 'Japanese Yen',
    symbol: '¥',
    code: 'JPY',
    decimalSeparator: '.',
    thousandSeparator: ',',
  },
  CNY: {
    symbols: [/¥\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*¥/i],
    codes: [/CNY\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*CNY/i],
    name: 'Chinese Yuan',
    symbol: '¥',
    code: 'CNY',
    decimalSeparator: '.',
    thousandSeparator: ',',
  },
  SEK: {
    symbols: [/kr\s*(\d+[,\s*\d]*)/i],
    codes: [/SEK\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*SEK/i],
    name: 'Swedish Krona',
    symbol: 'kr',
    code: 'SEK',
    decimalSeparator: ',',
    thousandSeparator: ' ',
  },
  NOK: {
    symbols: [/kr\s*(\d+[,\s*\d]*)/i],
    codes: [/NOK\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*NOK/i],
    name: 'Norwegian Krone',
    symbol: 'kr',
    code: 'NOK',
    decimalSeparator: ',',
    thousandSeparator: ' ',
  },
  DKK: {
    symbols: [/kr\s*(\d+[,\s*\d]*)/i],
    codes: [/DKK\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*DKK/i],
    name: 'Danish Krone',
    symbol: 'kr',
    code: 'DKK',
    decimalSeparator: ',',
    thousandSeparator: ' ',
  },
  PLN: {
    symbols: [/zł\s*(\d+[,\s*\d]*)/i],
    codes: [/PLN\s*(\d+[,\s*\d]*)/i, /(\d+[,\s*\d]*)\s*PLN/i],
    name: 'Polish Zloty',
    symbol: 'zł',
    code: 'PLN',
    decimalSeparator: ',',
    thousandSeparator: ' ',
  },
};

// ---------------------------------------------------------------------------
// Exchange rates (EUR as base) - Updated periodically
// In production, use an API like exchangerate-api.com
// ---------------------------------------------------------------------------

const EXCHANGE_RATES_TO_EUR: Record<string, number> = {
  EUR: 1.0,
  USD: 0.92, // 1 USD = 0.92 EUR
  GBP: 1.17, // 1 GBP = 1.17 EUR
  CHF: 1.05, // 1 CHF = 1.05 EUR
  CAD: 0.68,
  AUD: 0.62,
  JPY: 0.0062,
  CNY: 0.13,
  SEK: 0.087,
  NOK: 0.085,
  DKK: 0.134,
  PLN: 0.23,
};

// VAT rates by country (for multi-currency support)
const VAT_RATES_BY_COUNTRY: Record<string, number[]> = {
  FR: [20, 10, 5.5, 2.1],
  DE: [19, 7],
  IT: [22, 10, 4],
  ES: [21, 10],
  GB: [20, 5, 0],
  CH: [8.1, 3.8, 2.5],
  AT: [20, 13, 10],
  BE: [21, 6, 0],
  NL: [21, 9, 0],
  LU: [17, 14, 8, 3],
  PT: [23, 13, 6],
  GR: [24, 13, 6, 4],
  IE: [23, 13.5, 9, 4.8],
  DK: [25, 5],
  SE: [25, 12, 6],
  FI: [25.5, 14, 10],
  PL: [23, 8, 5],
};

// ---------------------------------------------------------------------------
// Helper: Detect currency from text
// ---------------------------------------------------------------------------

export function detectCurrency(
  text: string
): { currency: string; amount: number; confidence: number } | null {
  if (!text) return null;

  for (const [currency, config] of Object.entries(CURRENCY_PATTERNS)) {
    // Try symbol patterns first (more specific)
    for (const pattern of config.symbols) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseAmount(match[1], config);
        if (amount !== null && amount > 0) {
          return {
            currency,
            amount,
            confidence: 0.9,
          };
        }
      }
    }

    // Try code patterns
    for (const pattern of config.codes) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseAmount(match[1], config);
        if (amount !== null && amount > 0) {
          return {
            currency,
            amount,
            confidence: 0.8,
          };
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helper: Parse amount based on locale format
// ---------------------------------------------------------------------------

function parseAmount(
  amountStr: string,
  config: typeof CURRENCY_PATTERNS.EUR
): number | null {
  if (!amountStr) return null;

  try {
    // Remove common formatting characters
    let cleaned = amountStr
      .trim()
      .replace(/\s/g, '')
      .replace(/nbsp/g, '')
      .replace(/[^\d.,-]/g, ''); // Keep digits, decimal points, commas, minus

    // Handle different decimal separators
    if (config.decimalSeparator === ',') {
      // European format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US/UK format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }

    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper: Convert currency to EUR
// ---------------------------------------------------------------------------

export function convertToEUR(
  amount: number,
  fromCurrency: string
): number {
  const rate = EXCHANGE_RATES_TO_EUR[fromCurrency];
  if (!rate) {
    // No conversion applied — amount returned as-is in original currency
    console.warn(`[currency-detection] Taux de change introuvable pour ${fromCurrency}. Montant retourné sans conversion.`);
    return amount;
  }
  return amount * rate;
}

// ---------------------------------------------------------------------------
// Helper: Format amount for display
// ---------------------------------------------------------------------------

export function formatCurrencyAmount(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'fr-FR'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

// ---------------------------------------------------------------------------
// Helper: Get exchange rate
// ---------------------------------------------------------------------------

export function getExchangeRate(
  fromCurrency: string,
  toCurrency: string = 'EUR'
): number | null {
  if (fromCurrency === toCurrency) return 1.0;

  const fromRate = EXCHANGE_RATES_TO_EUR[fromCurrency];
  const toRate = EXCHANGE_RATES_TO_EUR[toCurrency];

  if (!fromRate || !toRate) return null;

  // Convert: fromCurrency -> EUR -> toCurrency
  return toRate / fromRate;
}

// ---------------------------------------------------------------------------
// Helper: Get VAT rates for country
// ---------------------------------------------------------------------------

export function getVatRatesForCountry(countryCode: string): number[] {
  return VAT_RATES_BY_COUNTRY[countryCode] || [20]; // Default 20%
}

// ---------------------------------------------------------------------------
// Helper: Detect country from currency
// ---------------------------------------------------------------------------

export function detectCountryFromCurrency(currencyCode: string): string | null {
  const countryMap: Record<string, string> = {
    EUR: 'FR', // Default to France for EUR (could be any EU country)
    GBP: 'GB',
    CHF: 'CH',
    SEK: 'SE',
    NOK: 'NO',
    DKK: 'DK',
    PLN: 'PL',
    USD: 'US',
    CAD: 'CA',
    AUD: 'AU',
    JPY: 'JP',
    CNY: 'CN',
  };

  return countryMap[currencyCode] || null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CurrencyDetectionResult {
  currency: string;
  amount: number;
  confidence: number;
  converted_to_eur: number | null;
  exchange_rate: number;
}

export interface MultiCurrencyExpense {
  amount: number;
  currency: string;
  original_currency: string | null;
  original_amount: number | null;
  exchange_rate: number | null;
  exchange_date: string | null;
}

// ---------------------------------------------------------------------------
// Main detection function
// ---------------------------------------------------------------------------

export function detectAndConvertCurrency(
  text: string,
  targetCurrency: string = 'EUR'
): CurrencyDetectionResult | null {
  const detection = detectCurrency(text);

  if (!detection) {
    return null;
  }

  const { currency, amount } = detection;

  // Convert to target currency (default EUR)
  const exchangeRate = getExchangeRate(currency, targetCurrency);
  if (!exchangeRate) {
    return null;
  }

  const convertedAmount = amount * exchangeRate;

  return {
    currency,
    amount,
    confidence: detection.confidence,
    converted_to_eur: targetCurrency === 'EUR' ? convertedAmount : null,
    exchange_rate: exchangeRate,
  };
}

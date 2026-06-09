/**
 * Groq-powered translation service for multi-language to French translation
 * Supports: Arabic (all dialects), English, Spanish, German, Italian, Portuguese → French
 * Currency conversion: MAD, TND, DZD, GBP, USD, CAD, AUD, CHF, BRL, MXN, TRY, PLN, CZK, SEK, NOK, DKK, etc. → EUR
 */
import Groq from 'groq-sdk';

// Lazy Groq client — created on first use, fails fast if API key is missing
let _groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!_groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY non configuré');
    _groqClient = new Groq({ apiKey });
  }
  return _groqClient;
}

/**
 * Detect if text is Arabic (MSA or dialect)
 */
function isArabicText(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
}

/**
 * Detect if text is English
 */
function isEnglishText(text: string): boolean {
  // Check if text contains predominantly English words
  const englishWords = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const totalWords = text.match(/\b[a-z]+\b/gi) || [];

  // If more than 60% of words are English and text doesn't contain Arabic
  if (totalWords.length > 0 && englishWords.length / totalWords.length > 0.6) {
    return !isArabicText(text);
  }

  // Check for common English indicators
  const englishIndicators = /\b(the|and|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|cannot|invoice|quote|payment|client|customer|service|product|price|amount|total|vat|tax|euro|dollar|pound)\b/i;
  return englishIndicators.test(text) && !isArabicText(text) && !/[\u00E0\u00E2\u00E4\u00E9\u00E8\u00EA\u00EB\u00EF\u00EE\u00F4\u00F9\u00FB\u00FC\u00E7]/.test(text);
}

/**
 * Detect if text is Spanish
 */
export function isSpanishText(text: string): boolean {
  // Negative check: exclude French-only words to reduce false positives
  const frenchOnlyWords = ['facture', 'client', 'facturation', 'entreprise', 'facturer', 'montant', 'euros', ' euro ', 'pour'];
  if (frenchOnlyWords.some(w => text.toLowerCase().includes(w))) return false;

  const spanishIndicators = /\b(el|la|los|las|de|del|en|por|con|para|una|uno|que|es|son|factura|precio|total|empresa)\b/i;
  const spanishChars = /[ñ¿¡]/;
  return spanishIndicators.test(text) || spanishChars.test(text);
}

/**
 * Detect if text is German
 */
export function isGermanText(text: string): boolean {
  const germanIndicators = /\b(der|die|das|und|ist|ein|eine|von|für|mit|rechnung|betrag|unternehmen|rechnungsnummer)\b/i;
  const germanChars = /[äöüß]/;
  return germanIndicators.test(text) || germanChars.test(text);
}

/**
 * Detect if text is Italian
 */
export function isItalianText(text: string): boolean {
  const italianIndicators = /\b(il|la|lo|le|gli|di|del|in|per|con|una|fattura|prezzo|totale|azienda|numero)\b/i;
  return italianIndicators.test(text);
}

/**
 * Detect if text is Portuguese
 */
export function isPortugueseText(text: string): boolean {
  const portugueseIndicators = /\b(o|a|os|as|de|do|da|em|por|para|uma|fatura|preço|total|empresa|número)\b/i;
  const portugueseChars = /[ãõç]/;
  return portugueseIndicators.test(text) || portugueseChars.test(text);
}

/**
 * Translate Arabic (any dialect) to French using Groq
 */
export async function translateArabicToFrench(text: string): Promise<{ text: string; wasTranslated: boolean }> {
  if (!text || text.trim().length === 0) {
    return { text: '', wasTranslated: false };
  }

  const trimmed = text.trim();

  // Skip if not Arabic
  if (!isArabicText(trimmed)) {
    return { text: trimmed, wasTranslated: false };
  }

  try {
    const translation = await getGroqClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Tu es un traducteur professionnel expert. Ta tâche est de traduire de l'arabe (tous dialectes: marocain, algérien, tunisien, égyptien, libanais, syrien, du Golfe, etc.) vers le français.

RÈGLES IMPORTANTES :
- Traduis avec précision le sens et le contexte, pas mot à mot
- Adapte les expressions dialectales arabes au français professionnel
- Pour les contextes business/facturation/contrats, utilise un français professionnel
- Conserve les noms propres, les montants chiffrés, les dates
- Ne traduis PAS ce qui est déjà en français
- Retourne UNIQUEMENT la traduction française, sans commentaire, sans guillemets

Exemples :
- "أبغى أضيف فاتورة جديدة" → "Je veux ajouter une nouvelle facture"
- "المبلغ ألف يورو" → "Le montant est de 1000 euros"
- "بدنا نعقد موظف جديد" → "Nous voulons embaucher un nouveau salarié"
- "الراتب 3000 درهم" → "Le salaire est de 3000 dirhams"`,
        },
        {
          role: 'user',
          content: trimmed,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const translated = translation.choices[0]?.message?.content?.trim() || trimmed;

    // Double-check: if result still contains Arabic, try alternative approach
    if (isArabicText(translated)) {
      console.warn('[Groq Translator] Translation still contains Arabic, using original');
      return { text: trimmed, wasTranslated: false };
    }

    return { text: translated, wasTranslated: true };
  } catch (error) {
    console.error('[Groq Translator] Translation error:', error);
    // Fallback: return original text
    return { text: trimmed, wasTranslated: false };
  }
}

/**
 * Translate English to French using Groq
 */
export async function translateEnglishToFrench(text: string): Promise<{ text: string; wasTranslated: boolean }> {
  if (!text || text.trim().length === 0) {
    return { text: '', wasTranslated: false };
  }

  const trimmed = text.trim();

  // Skip if not English
  if (!isEnglishText(trimmed)) {
    return { text: trimmed, wasTranslated: false };
  }

  try {
    const translation = await getGroqClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Tu es un traducteur professionnel expert. Ta tâche est de traduire de l'anglais (US ou UK) vers le français.

RÈGLES IMPORTANTES :
- Traduis avec précision le sens et le contexte, pas mot à mot
- Pour les contextes business/facturation/contrats, utilise un français professionnel
- Conserve les noms propres, les montants chiffrés, les dates
- Ne traduis PAS ce qui est déjà en français
- Retourne UNIQUEMENT la traduction française, sans commentaire, sans guillemets

Exemples :
- "I want to add a new invoice" → "Je veux ajouter une nouvelle facture"
- "The amount is 1000 pounds" → "Le montant est de 1000 livres"
- "We need to hire a new employee" → "Nous voulons embaucher un nouveau salarié"
- "3 days of consulting at £800 per day" → "3 jours de conseil à 800£ par jour"`,
        },
        {
          role: 'user',
          content: trimmed,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const translated = translation.choices[0]?.message?.content?.trim() || trimmed;

    // Double-check: if result still contains English indicators, try alternative approach
    if (isEnglishText(translated)) {
      console.warn('[Groq Translator] Translation still contains English, using original');
      return { text: trimmed, wasTranslated: false };
    }

    return { text: translated, wasTranslated: true };
  } catch (error) {
    console.error('[Groq Translator] English translation error:', error);
    // Fallback: return original text
    return { text: trimmed, wasTranslated: false };
  }
}

/**
 * Language code to French name mapping for prompt context
 */
const LANGUAGE_NAMES: Record<string, string> = {
  ar: 'arabe (tous dialectes)',
  en: 'anglais',
  es: 'espagnol',
  de: 'allemand',
  it: 'italien',
  pt: 'portugais',
};

/**
 * Generic translation function: any supported language → French
 */
export async function translateToFrench(text: string, sourceLang: string): Promise<string> {
  if (sourceLang === 'fr') return text;

  const langName = LANGUAGE_NAMES[sourceLang] || sourceLang;

  const completion = await getGroqClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: `Traduis le texte suivant de ${langName} vers le français. Conserve les nombres, dates, noms propres et montants. Ne traduis que le texte, sans ajouter de commentaires. Tempérament: précis et professionnel.` },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
  });

  return completion.choices[0]?.message?.content || text;
}

/**
 * Convert currencies to EUR in text
 * Supports: MAD (dirham), TND (dinar tunisien), DZD (dinar algérien), GBP (livre), USD (dollar),
 * CAD (dollar canadien), AUD (dollar australien), CHF (franc suisse), SAR (riyal saoudien), EGP (livre égyptienne),
 * BRL (real brésilien), MXN (peso mexicain), TRY (livre turque), PLN (zloty polonais),
 * CZK (couronne tchèque), SEK (couronne suédoise), NOK (couronne norvégienne), DKK (couronne danoise)
 *
 * Approximate exchange rates (2024):
 * 1 MAD = 0.092 EUR
 * 1 TND = 0.30 EUR
 * 1 DZD = 0.007 EUR
 * 1 GBP = 1.16 EUR
 * 1 USD = 0.92 EUR
 * 1 CAD = 0.67 EUR
 * 1 AUD = 0.62 EUR
 * 1 CHF = 1.06 EUR
 * 1 SAR = 0.25 EUR
 * 1 EGP = 0.019 EUR
 * 1 BRL = 0.18 EUR
 * 1 MXN = 0.052 EUR
 * 1 TRY = 0.028 EUR
 * 1 PLN = 0.23 EUR
 * 1 CZK = 0.040 EUR
 * 1 SEK = 0.088 EUR
 * 1 NOK = 0.086 EUR
 * 1 DKK = 0.134 EUR
 */
export function convertCurrenciesToEur(text: string): string {
  const currencyRates: Record<string, number> = {
    // Symboles et codes
    'MAD': 0.092, 'درهم': 0.092, 'dh': 0.092, 'drh': 0.092,
    'TND': 0.30, 'دنانير': 0.30, 'dinar': 0.30,
    'DZD': 0.007, 'دج': 0.007,
    'GBP': 1.16, '£': 1.16, 'livre': 1.16, 'pounds': 1.16, '£GBP': 1.16,
    'USD': 0.92, '$': 0.92, 'dollar': 0.92, 'dollars': 0.92, '$US': 0.92,
    'CAD': 0.67, '$CA': 0.67, 'C$': 0.67,
    'AUD': 0.67, '$AU': 0.67, 'A$': 0.67,
    'CHF': 1.06, 'franc suisse': 1.06,
    'SAR': 0.25, 'riyal': 0.25, 'rial': 0.25, 'ر.س': 0.25, '﷼': 0.25,
    'EGP': 0.019, 'ج.م': 0.019, 'livre égyptienne': 0.019,
    'BRL': 0.18, 'R$': 0.18, 'real': 0.18, 'réal': 0.18,
    'MXN': 0.052, 'MX$': 0.052, 'peso mexicain': 0.052,
    'TRY': 0.028, '₺': 0.028, 'livre turque': 0.028,
    'PLN': 0.23, 'zł': 0.23, 'zloty': 0.23,
    'CZK': 0.040, 'Kč': 0.040, 'couronne tchèque': 0.040,
    'SEK': 0.088, 'kr SEK': 0.088, 'couronne suédoise': 0.088,
    'NOK': 0.086, 'kr NOK': 0.086, 'couronne norvégienne': 0.086,
    'DKK': 0.134, 'kr DKK': 0.134, 'couronne danoise': 0.134,
    'EUR': 1, '€': 1, 'euro': 1, 'euros': 1,
  };

  let convertedText = text;

  // Pattern pour trouver les montants avec devise: "500 €", "500 dollars", "£500", "500 MAD", etc.
  const amountPattern = /(\d+(?:[.,]\d+)?)\s*([a-zA-Z€£$؜ؠ-ۿ]+|درهم|دنانير|دج|ر\.س|ج\.م|دولار|livre|pound|dinar|riyal|rial)/gi;

  convertedText = convertedText.replace(amountPattern, (match, amountStr, currencyStr) => {
    // Normaliser le montant (remplacer la virgule par un point pour les nombres décimaux)
    const amount = parseFloat(amountStr.replace(',', '.'));

    if (isNaN(amount)) {
      return match;
    }

    // Chercher le taux de change
    let rate: number | undefined;
    for (const [currency, rateValue] of Object.entries(currencyRates)) {
      if (currencyStr.toLowerCase().includes(currency.toLowerCase()) ||
          currencyStr.includes(currency)) {
        rate = rateValue;
        break;
      }
    }

    // Si pas de taux trouvé ou taux = 1 (déjà en euros), retourner l'original
    if (!rate || rate === 1) {
      return match;
    }

    // Convertir en euros
    const eurAmount = amount * rate;

    // Arrondir à 2 décimales
    const roundedEur = Math.round(eurAmount * 100) / 100;

    // Formater le résultat
    let result = match;
    if (eurAmount > 0) {
      // Ajouter la conversion en euros entre parenthèses
      result = `${match} (~${roundedEur}€)`;
    }

    return result;
  });

  return convertedText;
}

/**
 * Process transcript with language detection and translation (7 languages → French)
 * Supported: Arabic, English, Spanish, German, Italian, Portuguese, French
 * Also converts currencies to EUR
 */
export async function processVoiceTranscript(rawTranscript: string): Promise<{
  transcript: string;
  wasTranslated: boolean;
  originalLanguage: 'arabic' | 'english' | 'spanish' | 'german' | 'italian' | 'portuguese' | 'french' | 'unknown';
}> {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return { transcript: '', wasTranslated: false, originalLanguage: 'unknown' };
  }

  let result = { text: rawTranscript, wasTranslated: false };

  // Step 1: Check for Arabic
  if (isArabicText(rawTranscript)) {
    result = await translateArabicToFrench(rawTranscript);
  }
  // Step 2: Check for English
  else if (isEnglishText(rawTranscript)) {
    result = await translateEnglishToFrench(rawTranscript);
  }
  // Step 3: Check for Spanish
  else if (isSpanishText(rawTranscript)) {
    const translated = await translateToFrench(rawTranscript, 'es');
    result = { text: translated, wasTranslated: true };
  }
  // Step 4: Check for German
  else if (isGermanText(rawTranscript)) {
    const translated = await translateToFrench(rawTranscript, 'de');
    result = { text: translated, wasTranslated: true };
  }
  // Step 5: Check for Italian
  else if (isItalianText(rawTranscript)) {
    const translated = await translateToFrench(rawTranscript, 'it');
    result = { text: translated, wasTranslated: true };
  }
  // Step 6: Check for Portuguese
  else if (isPortugueseText(rawTranscript)) {
    const translated = await translateToFrench(rawTranscript, 'pt');
    result = { text: translated, wasTranslated: true };
  }

  // Detect original language
  let originalLanguage: 'arabic' | 'english' | 'spanish' | 'german' | 'italian' | 'portuguese' | 'french' | 'unknown' = 'unknown';
  if (result.wasTranslated) {
    if (isArabicText(rawTranscript)) {
      originalLanguage = 'arabic';
    } else if (isEnglishText(rawTranscript)) {
      originalLanguage = 'english';
    } else if (isSpanishText(rawTranscript)) {
      originalLanguage = 'spanish';
    } else if (isGermanText(rawTranscript)) {
      originalLanguage = 'german';
    } else if (isItalianText(rawTranscript)) {
      originalLanguage = 'italian';
    } else if (isPortugueseText(rawTranscript)) {
      originalLanguage = 'portuguese';
    }
  } else if (/[a-zA-Zàâäéèêëïîôùûüç]/.test(rawTranscript)) {
    originalLanguage = 'french';
  }

  // Step 7: Convert currencies to EUR
  const transcriptWithConversion = convertCurrenciesToEur(result.text);

  return {
    transcript: transcriptWithConversion,
    wasTranslated: result.wasTranslated,
    originalLanguage,
  };
}

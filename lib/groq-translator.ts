/**
 * Groq-powered translation service for Arabic dialects and English to French
 * Supports: Modern Standard Arabic, Moroccan, Algerian, Tunisian, Egyptian, Levantine, Gulf dialects, English (US/UK)
 * Currency conversion: MAD, TND, DZD, GBP, USD, CAD, AUD, CHF, etc. → EUR
 */
import Groq from 'groq-sdk';

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
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const translation = await groq.chat.completions.create({
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
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const translation = await groq.chat.completions.create({
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
 * Convert currencies to EUR in text
 * Supports: MAD (dirham), TND (dinar tunisien), DZD (dinar algérien), GBP (livre), USD (dollar),
 * CAD (dollar canadien), AUD (dollar australien), CHF (franc suisse), SAR (riyal saoudien), EGP (livre égyptienne)
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
    'CHF': 1.06, 'franc suisse': 1.06, 'CHF': 1.06,
    'SAR': 0.25, 'riyal': 0.25, 'rial': 0.25, 'ر.س': 0.25, '﷼': 0.25,
    'EGP': 0.019, 'ج.م': 0.019, 'livre égyptienne': 0.019, 'EGP': 0.019,
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
 * Process transcript with language detection and translation (Arabic, English → French)
 * Also converts currencies to EUR
 */
export async function processVoiceTranscript(rawTranscript: string): Promise<{
  transcript: string;
  wasTranslated: boolean;
  originalLanguage: 'arabic' | 'english' | 'french' | 'unknown';
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

  // Detect original language
  let originalLanguage: 'arabic' | 'english' | 'french' | 'unknown' = 'unknown';
  if (result.wasTranslated) {
    if (isArabicText(rawTranscript)) {
      originalLanguage = 'arabic';
    } else if (isEnglishText(rawTranscript)) {
      originalLanguage = 'english';
    }
  } else if (/[a-zA-Zàâäéèêëïîôùûüç]/.test(rawTranscript)) {
    originalLanguage = 'french';
  }

  // Step 3: Convert currencies to EUR
  const transcriptWithConversion = convertCurrenciesToEur(result.text);

  return {
    transcript: transcriptWithConversion,
    wasTranslated: result.wasTranslated,
    originalLanguage,
  };
}

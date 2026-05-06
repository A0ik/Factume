import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// In-memory rate cache (persists for the lifetime of the serverless function)
// Key format: "{YYYY-MM-DD}:{FROM}:{TO}"
// ---------------------------------------------------------------------------
const rateCache = new Map<string, { rate: number; timestamp: number }>();

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// ---------------------------------------------------------------------------
// GET — Convert a single amount to EUR
// Query params: amount, currency (ISO), date (YYYY-MM-DD, optional)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const amountStr = searchParams.get('amount');
  const currency = (searchParams.get('currency') || '').toUpperCase().trim();
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  if (!amountStr) {
    return NextResponse.json({ error: 'amount query param is required' }, { status: 400 });
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount)) {
    return NextResponse.json({ error: 'amount must be a valid number' }, { status: 400 });
  }

  if (!currency || currency.length !== 3) {
    return NextResponse.json({ error: 'currency must be a valid 3-letter ISO code' }, { status: 400 });
  }

  // If already EUR, return as-is
  if (currency === 'EUR') {
    return NextResponse.json({
      original_amount: amount,
      original_currency: 'EUR',
      converted_amount: amount,
      converted_currency: 'EUR',
      rate: 1,
      date,
    });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
  }

  try {
    const rate = await fetchRate(currency, 'EUR', date);

    const converted = parseFloat((amount * rate).toFixed(2));

    return NextResponse.json({
      original_amount: amount,
      original_currency: currency,
      converted_amount: converted,
      converted_currency: 'EUR',
      rate,
      date,
    });
  } catch (err: any) {
    console.error('[currency-convert] Error fetching rate:', err);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate', details: err.message },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Batch convert multiple items
// Body: { items: Array<{ amount, currency, date }> }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: { items?: Array<{ amount: number; currency: string; date?: string }> };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
  }

  if (items.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 items per batch' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const results: Array<{
    original_amount: number;
    original_currency: string;
    converted_amount: number;
    converted_currency: string;
    rate: number;
    date: string;
    error?: string;
  }> = [];

  for (const item of items) {
    const { amount, currency, date } = item;
    const normalizedCurrency = (currency || '').toUpperCase().trim();
    const dateValue = date || today;

    if (typeof amount !== 'number' || isNaN(amount)) {
      results.push({
        original_amount: amount,
        original_currency: normalizedCurrency,
        converted_amount: 0,
        converted_currency: 'EUR',
        rate: 0,
        date: dateValue,
        error: 'Invalid amount',
      });
      continue;
    }

    if (!normalizedCurrency || normalizedCurrency.length !== 3) {
      results.push({
        original_amount: amount,
        original_currency: normalizedCurrency,
        converted_amount: 0,
        converted_currency: 'EUR',
        rate: 0,
        date: dateValue,
        error: 'Invalid currency code',
      });
      continue;
    }

    // If already EUR, skip API call
    if (normalizedCurrency === 'EUR') {
      results.push({
        original_amount: amount,
        original_currency: 'EUR',
        converted_amount: amount,
        converted_currency: 'EUR',
        rate: 1,
        date: dateValue,
      });
      continue;
    }

    try {
      const rate = await fetchRate(normalizedCurrency, 'EUR', dateValue);
      results.push({
        original_amount: amount,
        original_currency: normalizedCurrency,
        converted_amount: parseFloat((amount * rate).toFixed(2)),
        converted_currency: 'EUR',
        rate,
        date: dateValue,
      });
    } catch (err: any) {
      results.push({
        original_amount: amount,
        original_currency: normalizedCurrency,
        converted_amount: 0,
        converted_currency: 'EUR',
        rate: 0,
        date: dateValue,
        error: err.message || 'Rate fetch failed',
      });
    }
  }

  return NextResponse.json({ results });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchRate(from: string, to: string, date: string): Promise<number> {
  const cacheKey = `${date}:${from}:${to}`;

  // Check cache
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rate;
  }

  // Frankfurter API — free, no key needed
  // https://www.frankfurter.app/docs/
  const url = `https://api.frankfurter.app/${date}?from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 }, // let Next.js cache for 1 hour too
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Frankfurter API returned ${res.status}: ${text}`);
  }

  const data = await res.json();

  // Response format: { amount: 1, base: "USD", date: "2024-01-15", rates: { EUR: 0.918 } }
  const rate = data.rates?.[to];

  if (typeof rate !== 'number') {
    throw new Error(`No rate found for ${from}->${to} on ${date}`);
  }

  // Store in cache
  rateCache.set(cacheKey, { rate, timestamp: Date.now() });

  return rate;
}

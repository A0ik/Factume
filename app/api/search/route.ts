import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchFilters {
  query?: string;
  category?: string[];
  vendor?: string[];
  min_amount?: number;
  max_amount?: number;
  date_from?: string;
  date_to?: string;
  status?: string[];
  tags?: string[];
  folder_id?: string;
  has_receipt?: boolean;
  has_annotations?: boolean;
  ocr_confidence_min?: number;
  is_recurring?: boolean;
  currency?: string[];
}

interface SearchResult {
  expenses: any[];
  total: number;
  facets: {
    categories: { name: string; count: number }[];
    vendors: { name: string; count: number }[];
    tags: { id: string; name: string; count: number }[];
    statuses: { status: string; count: number }[];
    date_range: { min: string; max: string };
  };
  suggestions?: string[];
}

// ---------------------------------------------------------------------------
// POST handler - Advanced search
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { filters, sort = 'date', order = 'desc', page = 1, limit = 20 } = await req.json();

    // Build query
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply filters
    if (filters) {
      // Text search
      if (filters.query) {
        query = query.or(`vendor.ilike.%${filters.query}%,description.ilike.%${filters.query}%,invoice_number.ilike.%${filters.query}%,notes.ilike.%${filters.query}%`);
      }

      // Category filter
      if (filters.category?.length > 0) {
        query = query.in('category', filters.category);
      }

      // Vendor filter
      if (filters.vendor?.length > 0) {
        query = query.in('vendor', filters.vendor);
      }

      // Amount range
      if (filters.min_amount !== undefined) {
        query = query.gte('amount', filters.min_amount);
      }
      if (filters.max_amount !== undefined) {
        query = query.lte('amount', filters.max_amount);
      }

      // Date range
      if (filters.date_from) {
        query = query.gte('date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('date', filters.date_to);
      }

      // Status filter
      if (filters.status?.length > 0) {
        query = query.in('validation_status', filters.status);
      }

      // Tags filter
      if (filters.tags?.length > 0) {
        const { data: taggedExpenseIds } = await supabase
          .from('expense_tags')
          .select('expense_id')
          .in('tag_id', filters.tags);

        if (taggedExpenseIds && taggedExpenseIds.length > 0) {
          query = query.in('id', taggedExpenseIds.map(e => e.expense_id));
        } else {
          // No expenses match these tags
          return NextResponse.json({
            expenses: [],
            total: 0,
            facets: {
              categories: [],
              vendors: [],
              tags: [],
              statuses: [],
              date_range: { min: '', max: '' },
            },
          });
        }
      }

      // Folder filter
      if (filters.folder_id) {
        query = query.eq('folder_id', filters.folder_id);
      }

      // Has receipt
      if (filters.has_receipt === true) {
        query = query.not('receipt_url', 'is', null);
      } else if (filters.has_receipt === false) {
        query = query.is('receipt_url', null);
      }

      // Has annotations
      if (filters.has_annotations === true) {
        query = query.eq('has_annotations', true);
      } else if (filters.has_annotations === false) {
        query = query.eq('has_annotations', false);
      }

      // OCR confidence
      if (filters.ocr_confidence_min !== undefined) {
        query = query.gte('ocr_confidence', filters.ocr_confidence_min);
      }

      // Currency
      if (filters.currency?.length > 0) {
        query = query.in('original_currency', filters.currency);
      }

      // Recurring (check if matches a pattern)
      if (filters.is_recurring === true) {
        const { data: recurringVendors } = await supabase
          .from('recurring_patterns')
          .select('vendor')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (recurringVendors && recurringVendors.length > 0) {
          const vendors = recurringVendors.map(r => r.vendor);
          query = query.in('vendor', vendors);
        }
      }
    }

    // Apply sorting
    const validSorts = ['date', 'amount', 'vendor', 'category', 'created_at'];
    const sortField = validSorts.includes(sort) ? sort : 'date';
    query = query.order(sortField, { ascending: order === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: expenses, count, error } = await query;

    if (error) throw error;

    // Calculate facets for all matching expenses (without pagination)
    const facets = await calculateFacets(filters, user.id, supabase);

    // Generate suggestions based on query
    let suggestions: string[] = [];
    if (filters?.query) {
      suggestions = await generateSearchSuggestions(filters.query, user.id, supabase);
    }

    return NextResponse.json({
      expenses: expenses || [],
      total: count || 0,
      facets,
      suggestions,
      page,
      limit,
      has_more: (count || 0) > to + 1,
    } as SearchResult);
  } catch (error) {
    console.error('[Advanced Search] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: Calculate facets
// ---------------------------------------------------------------------------

async function calculateFacets(
  filters: SearchFilters,
  userId: string,
  supabase: any
) {
  // Get base query matching all filters
  let query = supabase
    .from('expenses')
    .select('id, category, vendor, validation_status, date, original_currency')
    .eq('user_id', userId);

  // Apply same filters (except pagination)
  if (filters) {
    if (filters.query) {
      query = query.or(`vendor.ilike.%${filters.query}%,description.ilike.%${filters.query}%,invoice_number.ilike.%${filters.query}%`);
    }
    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }
    if (filters.vendor && filters.vendor.length > 0) {
      query = query.in('vendor', filters.vendor);
    }
    if (filters.min_amount !== undefined) {
      query = query.gte('amount', filters.min_amount);
    }
    if (filters.max_amount !== undefined) {
      query = query.lte('amount', filters.max_amount);
    }
    if (filters.date_from) {
      query = query.gte('date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date', filters.date_to);
    }
  }

  const { data: results } = await query;

  if (!results || results.length === 0) {
    return {
      categories: [],
      vendors: [],
      tags: [],
      statuses: [],
      date_range: { min: '', max: '' },
    };
  }

  // Calculate facets
  const categoryMap = new Map<string, number>();
  const vendorMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  let minDate = results[0]?.date || '';
  let maxDate = results[0]?.date || '';

  for (const r of results) {
    if (r.category) {
      categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1);
    }
    if (r.vendor) {
      vendorMap.set(r.vendor, (vendorMap.get(r.vendor) || 0) + 1);
    }
    if (r.validation_status) {
      statusMap.set(r.validation_status, (statusMap.get(r.validation_status) || 0) + 1);
    }
    if (r.date < minDate) minDate = r.date;
    if (r.date > maxDate) maxDate = r.date;
  }

  // Get tags for these expenses
  const expenseIds = results.map((r: any) => r.id);
  const { data: tagLinks } = await supabase
    .from('expense_tags')
    .select('tag_id, tags(id, name)')
    .in('expense_id', expenseIds);

  const tagMap = new Map<string, { id: string; name: string; count: number }>();
  for (const link of tagLinks || []) {
    const tag = (link as any).tags;
    if (tag) {
      const existing = tagMap.get(tag.id);
      if (existing) {
        existing.count++;
      } else {
        tagMap.set(tag.id, { id: tag.id, name: tag.name, count: 1 });
      }
    }
  }

  return {
    categories: Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    vendors: Array.from(vendorMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    tags: Array.from(tagMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    statuses: Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    date_range: { min: minDate, max: maxDate },
  };
}

// ---------------------------------------------------------------------------
// Helper: Generate search suggestions
// ---------------------------------------------------------------------------

async function generateSearchSuggestions(
  query: string,
  userId: string,
  supabase: any
): Promise<string[]> {
  const suggestions: string[] = [];

  // Vendor suggestions
  const { data: vendorMatches } = await supabase
    .from('expenses')
    .select('vendor')
    .eq('user_id', userId)
    .ilike('vendor', `%${query}%`)
    .limit(5);

  for (const v of vendorMatches || []) {
    if (v.vendor && !suggestions.includes(v.vendor)) {
      suggestions.push(v.vendor);
    }
  }

  // Category suggestions
  const { data: categoryMatches } = await supabase
    .from('expenses')
    .select('category')
    .eq('user_id', userId)
    .ilike('category', `%${query}%`)
    .limit(5);

  for (const c of categoryMatches || []) {
    if (c.category && !suggestions.includes(c.category)) {
      suggestions.push(c.category);
    }
  }

  return suggestions.slice(0, 10);
}

// ---------------------------------------------------------------------------
// GET handler - Quick search (for autocomplete)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const type = searchParams.get('type'); // 'vendors', 'categories', 'all'

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const results: any[] = [];

    if (type === 'vendors' || type === 'all') {
      const { data: vendors } = await supabase
        .from('expenses')
        .select('vendor')
        .eq('user_id', user.id)
        .ilike('vendor', `%${q}%`)
        .limit(10);

      const uniqueVendors = [...new Set(vendors?.map(v => v.vendor).filter(Boolean))];
      for (const vendor of uniqueVendors.slice(0, 5)) {
        results.push({ type: 'vendor', value: vendor });
      }
    }

    if (type === 'categories' || type === 'all') {
      const { data: categories } = await supabase
        .from('expenses')
        .select('category')
        .eq('user_id', user.id)
        .ilike('category', `%${q}%`)
        .limit(10);

      const uniqueCategories = [...new Set(categories?.map(c => c.category).filter(Boolean))];
      for (const category of uniqueCategories.slice(0, 5)) {
        results.push({ type: 'category', value: category });
      }
    }

    if (type === 'all') {
      // Search in invoice numbers
      const { data: invoices } = await supabase
        .from('expenses')
        .select('invoice_number, vendor, amount')
        .eq('user_id', user.id)
        .ilike('invoice_number', `%${q}%`)
        .limit(5);

      for (const inv of invoices || []) {
        results.push({
          type: 'invoice',
          value: `${inv.invoice_number} (${inv.vendor})`,
          invoice_number: inv.invoice_number,
          vendor: inv.vendor,
          amount: inv.amount,
        });
      }
    }

    return NextResponse.json({
      results: results.slice(0, 10),
    });
  } catch (error) {
    console.error('[Quick Search] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
}

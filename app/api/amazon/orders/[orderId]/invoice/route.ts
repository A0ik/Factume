import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/amazon/orders/[orderId]/invoice
 * Generate an invoice from an Amazon order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Amazon order
    const { data: amazonOrder, error: orderError } = await supabase
      .from('amazon_orders')
      .select('*, amazon_order_items(*)')
      .eq('id', params.orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !amazonOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create invoice
    const invoiceNumber = `AMZ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Get user profile for invoice details
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        invoice_number: invoiceNumber,
        client_name: `Client Amazon - ${amazonOrder.amazon_order_id.slice(-8)}`,
        client_email: amazonOrder.customer_email,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        currency: amazonOrder.currency,
        subtotal: amazonOrder.total_amount,
        tax_amount: amazonOrder.tax_amount || 0,
        total_amount: amazonOrder.total_amount + (amazonOrder.tax_amount || 0),
        notes: `Commande Amazon : ${amazonOrder.amazon_order_id}`,
        status: 'paid',
        paid_at: amazonOrder.purchase_date,
        metadata: {
          source: 'amazon',
          amazon_order_id: amazonOrder.amazon_order_id,
        },
      })
      .select()
      .single();

    if (invoiceError) {
      throw invoiceError;
    }

    // Add invoice items
    if (amazonOrder.amazon_order_items && amazonOrder.amazon_order_items.length > 0) {
      const items = amazonOrder.amazon_order_items.map((item: any) => ({
        invoice_id: invoice.id,
        description: item.title || `Produit Amazon ${item.asin}`,
        quantity: item.quantity_ordered || 1,
        unit_price: item.unit_price || item.total_price / (item.quantity_ordered || 1),
        tax_rate: 0,
        total: item.total_price,
      }));

      await supabase.from('invoice_items').insert(items);
    }

    // Update Amazon order
    await supabase
      .from('amazon_orders')
      .update({
        invoice_id: invoice.id,
        invoice_generated: true,
      })
      .eq('id', params.orderId);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

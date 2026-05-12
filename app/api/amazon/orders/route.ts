import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAccessToken, getOrders, syncAmazonOrders } from '@/lib/amazon/sp-api-client';

/**
 * GET /api/amazon/orders
 * Get Amazon orders for connected seller
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: orders, error } = await supabase
      .from('amazon_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
    });
  } catch (error) {
    console.error('Error fetching Amazon orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/amazon/orders/sync
 * Sync orders from Amazon
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { success: false, error: 'connectionId is required' },
        { status: 400 }
      );
    }

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { success: false, error: 'Connection not found' },
        { status: 404 }
      );
    }

    const startTime = Date.now();

    // Get fresh access token
    const tokenData = await getAccessToken(connection.refresh_token);

    // Sync orders from last 30 days
    const createdAfter = connection.last_sync_at
      ? new Date(connection.last_sync_at)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orders = await getOrders(
      tokenData.access_token,
      connection.marketplace_id,
      createdAfter
    );

    // Sync to database
    const syncResult = await syncAmazonOrders({
      userId: user.id,
      connectionId: connection.id,
      orders,
    });

    // Update connection
    await supabase
      .from('amazon_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        access_token: tokenData.access_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      })
      .eq('id', connectionId);

    // Log sync
    await supabase
      .from('amazon_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: 'orders',
        status: 'success',
        records_added: syncResult.added,
        records_updated: syncResult.updated,
        sync_duration_ms: Date.now() - startTime,
        from_date: createdAfter.toISOString(),
        to_date: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      data: {
        ordersAdded: syncResult.added,
        ordersUpdated: syncResult.updated,
        totalOrders: orders.length,
      },
    });
  } catch (error) {
    console.error('Error syncing Amazon orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync orders' },
      { status: 500 }
    );
  }
}

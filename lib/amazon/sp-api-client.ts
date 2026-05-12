/**
 * Amazon Selling Partner API Client
 *
 * Documentation: https://developer-docs.amazon.com/sp-api
 */

import { createClient } from '@supabase/supabase-js';

const SP_API_BASE = 'https://sellingpartnerapi-eu.amazon.com';

// Marketplace IDs
const MARKETPLACES = {
  EUROPE: {
    FR: 'A13V1IB3VIYZZQ', // France
    DE: 'A1PA6795UKMFR9', // Germany
    IT: 'APJ6JRA9NG5V4',  // Italy
    ES: 'A1RKKUPIHCS9HS', // Spain
    UK: 'A1F83G8C2ARO7P', // United Kingdom
    NL: 'A1805IZSGTT6HS', // Netherlands
    PL: 'A1C3SOZRARQ6R3', // Poland
    SE: 'A2NODRKZP88ZB9', // Sweden
    BE: 'AMEN7PMS3EDWL',  // Belgium
  },
  NORTH_AMERICA: {
    US: 'ATVPDKIKX0DER',  // United States
    CA: 'A2EUQ1WTGCTBG2', // Canada
    MX: 'A1AM78C64UMOY8', // Mexico
  },
};

interface AmazonOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderStatus: string;
  FulfillmentChannel: string;
  ShipServiceLevel: string;
  NumberOfItemsShipped: number;
  NumberOfItemsUnshipped: number;
  PaymentMethod: string;
  OrderTotal: {
    Amount: string;
    CurrencyCode: string;
  };
}

interface AmazonFinancialEvent {
  SellerOrderId?: string;
  TransactionType: string;
  PostedDate: string;
  BusinessAmount: {
    CurrencyCode: string;
    Amount: string;
  };
}

/**
 * Exchange refresh token for access token via LWA
 */
export async function getAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch(
    'https://api.amazon.com/auth/o2/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.AMAZON_LWA_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get Amazon access token');
  }

  return response.json();
}

/**
 * Sign AWS request for SP-API
 */
async function signAwsRequest(
  method: string,
  url: string,
  accessToken: string,
  body?: string
): Promise<RequestInit> {
  // For development, we'll use a simplified approach
  // In production, use AWS Signature Version 4
  return {
    method,
    headers: {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    },
    body,
  };
}

/**
 * Get orders from Amazon
 */
export async function getOrders(
  accessToken: string,
  marketplaceId: string,
  createdAfter: Date,
  createdBefore?: Date
): Promise<AmazonOrder[]> {
  const params = new URLSearchParams({
    MarketplaceIds: marketplaceId,
    CreatedAfter: createdAfter.toISOString(),
  });

  if (createdBefore) {
    params.append('CreatedBefore', createdBefore.toISOString());
  }

  const signedRequest = await signAwsRequest(
    'GET',
    `${SP_API_BASE}/orders/v0/orders?${params.toString()}`,
    accessToken
  );

  const response = await fetch(
    `${SP_API_BASE}/orders/v0/orders?${params.toString()}`,
    signedRequest
  );

  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }

  const data = await response.json();
  return data.payload.Orders || [];
}

/**
 * Get order items
 */
export async function getOrderItems(
  accessToken: string,
  amazonOrderId: string
): Promise<any[]> {
  const response = await fetch(
    `${SP_API_BASE}/orders/v0/orders/${amazonOrderId}/orderItems`,
    {
      headers: {
        'x-amz-access-token': accessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch order items');
  }

  const data = await response.json();
  return data.payload.OrderItems || [];
}

/**
 * Get financial events for an order
 */
export async function getFinancialEvents(
  accessToken: string,
  amazonOrderId: string
): Promise<AmazonFinancialEvent[]> {
  const response = await fetch(
    `${SP_API_BASE}/finances/v0/orders/${amazonOrderId}/financialEvents`,
    {
      headers: {
        'x-amz-access-token': accessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch financial events');
  }

  const data = await response.json();
  return data.payload.FinancialEvents || [];
}

/**
 * Get list of marketplaces seller is registered in
 */
export async function getMarketplaceParticipations(
  accessToken: string
): Promise<Array<{ marketplaceId: string; marketplace: { name: string } }>> {
  const response = await fetch(
    `${SP_API_BASE}/sellers/v1/marketplaceParticipations`,
    {
      headers: {
        'x-amz-access-token': accessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch marketplace participations');
  }

  const data = await response.json();
  return data.payload || [];
}

/**
 * Store Amazon connection in Supabase
 */
export async function storeAmazonConnection(params: {
  userId: string;
  sellerId: string;
  marketplaceId: string;
  refreshToken: string;
  accessToken?: string;
  tokenExpiresAt?: Date;
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('amazon_connections')
    .insert({
      user_id: params.userId,
      seller_id: params.sellerId,
      marketplace_id: params.marketplaceId,
      refresh_token: params.refreshToken,
      access_token: params.accessToken,
      token_expires_at: params.tokenExpiresAt?.toISOString(),
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Sync Amazon orders to database
 */
export async function syncAmazonOrders(params: {
  userId: string;
  connectionId: string;
  orders: AmazonOrder[];
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let added = 0;
  let updated = 0;

  for (const order of params.orders) {
    const { data: existing } = await supabase
      .from('amazon_orders')
      .select('id')
      .eq('amazon_order_id', order.AmazonOrderId)
      .eq('connection_id', params.connectionId)
      .maybeSingle();

    const orderData = {
      user_id: params.userId,
      connection_id: params.connectionId,
      amazon_order_id: order.AmazonOrderId,
      marketplace_id: 'FR', // TODO: Get from connection
      purchase_date: order.PurchaseDate,
      total_amount: parseFloat(order.OrderTotal.Amount),
      currency: order.OrderTotal.CurrencyCode,
      status: order.OrderStatus,
      fulfillment_channel: order.FulfillmentChannel,
      ship_service_level: order.ShipServiceLevel,
      raw_order_data: order,
    };

    if (existing) {
      await supabase
        .from('amazon_orders')
        .update(orderData)
        .eq('id', existing.id);
      updated++;
    } else {
      await supabase
        .from('amazon_orders')
        .insert(orderData);
      added++;
    }
  }

  return { added, updated };
}

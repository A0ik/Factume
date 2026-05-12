-- ============================================================================
-- AMAZON SELLING PARTNER API INTEGRATION
-- ============================================================================

-- Amazon seller connections
CREATE TABLE IF NOT EXISTS amazon_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Seller details
  seller_id TEXT NOT NULL,                -- Amazon Seller ID
  seller_name TEXT,
  marketplace_id TEXT NOT NULL,           -- e.g., "A13V1IB3VIYZZQ" (France)

  -- Authentication
  refresh_token TEXT NOT NULL,            -- LWA refresh token (encrypted at rest)
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active',           -- active, error, expired
  last_sync_at TIMESTAMPTZ,
  sync_frequency INT DEFAULT 3600,        -- Auto-sync every hour

  -- Metadata
  region TEXT DEFAULT 'eu',               -- eu, na, fe
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, seller_id, marketplace_id)
);

-- Amazon orders
CREATE TABLE IF NOT EXISTS amazon_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES amazon_connections(id) ON DELETE CASCADE,

  -- Amazon order details
  amazon_order_id TEXT NOT NULL,          -- Amazon Order ID
  marketplace_id TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,

  -- Customer info
  customer_email TEXT,

  -- Order amounts
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,

  -- Order status
  status TEXT NOT NULL,                   -- Pending, Shipped, Delivered, etc.
  fulfillment_channel TEXT,               -- FBA, FBM
  ship_service_level TEXT,

  -- Invoice
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_generated BOOLEAN DEFAULT FALSE,

  -- Raw data
  raw_order_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(connection_id, amazon_order_id)
);

-- Amazon order items
CREATE TABLE IF NOT EXISTS amazon_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES amazon_orders(id) ON DELETE CASCADE,

  -- Item details
  amazon_order_item_id TEXT NOT NULL,
  asin TEXT,
  title TEXT NOT NULL,
  quantity_ordered INT NOT NULL,
  quantity_shipped INT DEFAULT 0,

  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,

  -- Product info
  sku TEXT,
  product_type TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(order_id, amazon_order_item_id)
);

-- Amazon financial events (fees, payouts, etc.)
CREATE TABLE IF NOT EXISTS amazon_financial_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES amazon_connections(id) ON DELETE CASCADE,

  -- Event details
  seller_order_id TEXT,                   -- Links to orders
  transaction_type TEXT NOT NULL,         -- Order, Refund, ServiceFee, etc.
  posted_date TIMESTAMPTZ NOT NULL,

  -- Amount
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Breakdown
  base_amount DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  shipping_amount DECIMAL(10,2),

  -- Fee details (for service fees)
  fee_type TEXT,                          -- ReferralFee, FBAFee, etc.
  fee_amount DECIMAL(10,2),

  -- Description
  description TEXT,
  transaction_event_id TEXT,

  -- Reconciliation
  reconciled BOOLEAN DEFAULT FALSE,
  amazon_payout_id TEXT,

  -- Raw data
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(connection_id, transaction_event_id)
);

-- Amazon product listings
CREATE TABLE IF NOT EXISTS amazon_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES amazon_connections(id) ON DELETE CASCADE,

  -- Product details
  asin TEXT NOT NULL,
  seller_sku TEXT,
  title TEXT NOT NULL,
  product_type TEXT,

  -- Pricing
  list_price DECIMAL(10,2),
  buybox_price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',

  -- Inventory
  quantity INT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active',           -- active, inactive

  -- Images
  image_url TEXT,

  -- Raw data
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(connection_id, asin)
);

-- Amazon sync logs
CREATE TABLE IF NOT EXISTS amazon_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES amazon_connections(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL,                -- orders, financial_events, products
  status TEXT NOT NULL,                   -- success, error, partial

  -- Counters
  records_added INT DEFAULT 0,
  records_updated INT DEFAULT 0,

  -- Error handling
  error_message TEXT,
  retry_after INT,

  -- Performance
  sync_duration_ms INT,

  -- Time range synced
  from_date TIMESTAMPTZ,
  to_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_amazon_connections_user ON amazon_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_user ON amazon_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_connection ON amazon_orders(connection_id);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_purchase_date ON amazon_orders(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_status ON amazon_orders(status);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_invoice ON amazon_orders(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_amazon_financial_events_user ON amazon_financial_events(user_id);
CREATE INDEX IF NOT EXISTS idx_amazon_financial_events_date ON amazon_financial_events(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_amazon_financial_events_type ON amazon_financial_events(transaction_type);
CREATE INDEX IF NOT EXISTS idx_amazon_products_asin ON amazon_products(asin);

-- Enable RLS
ALTER TABLE amazon_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own amazon_connections"
  ON amazon_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own amazon_connections"
  ON amazon_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own amazon_connections"
  ON amazon_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own amazon_connections"
  ON amazon_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own amazon_orders"
  ON amazon_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own amazon_orders"
  ON amazon_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own amazon_orders"
  ON amazon_orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Order items inherit from orders
CREATE POLICY "Users can view own amazon_order_items"
  ON amazon_order_items FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM amazon_orders WHERE id = amazon_order_items.order_id)
  );

-- Financial events policies
CREATE POLICY "Users can view own amazon_financial_events"
  ON amazon_financial_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own amazon_financial_events"
  ON amazon_financial_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Products policies
CREATE POLICY "Users can manage own amazon_products"
  ON amazon_products FOR ALL
  USING (auth.uid() = user_id);

-- Sync logs policies
CREATE POLICY "Users can view own amazon_sync_logs"
  ON amazon_sync_logs FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM amazon_connections WHERE id = amazon_sync_logs.connection_id)
  );

-- Grant access to service role
GRANT ALL ON amazon_connections TO service_role;
GRANT ALL ON amazon_orders TO service_role;
GRANT ALL ON amazon_order_items TO service_role;
GRANT ALL ON amazon_financial_events TO service_role;
GRANT ALL ON amazon_products TO service_role;
GRANT ALL ON amazon_sync_logs TO service_role;

-- Triggers for updated_at
CREATE TRIGGER update_amazon_connections_updated_at
  BEFORE UPDATE ON amazon_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_amazon_orders_updated_at
  BEFORE UPDATE ON amazon_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_amazon_products_updated_at
  BEFORE UPDATE ON amazon_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE: AMAZON SP-API INTEGRATION
-- ============================================================================

-- ============================================================================
-- NORDIGEN OPEN BANKING INTEGRATION
-- ============================================================================
-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Nordigen connections (bank accounts linked by users)
CREATE TABLE IF NOT EXISTS nordigen_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL,           -- e.g., "SOCIETE_GENERALE"
  institution_name TEXT NOT NULL,         -- e.g., "Société Générale"
  account_id TEXT NOT NULL,               -- Nordigen account ID
  account_iban TEXT,                      -- IBAN (masked)
  account_name TEXT,                      -- Account holder name
  status TEXT NOT NULL DEFAULT 'active',  -- active, error, expired
  last_sync_at TIMESTAMPTZ,
  sync_frequency INT DEFAULT 86400,       -- Auto-sync every 24h (in seconds)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one connection per account per user
  UNIQUE(user_id, account_id)
);

-- Transactions imported from banks
CREATE TABLE IF NOT EXISTS nordigen_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES nordigen_connections(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_id TEXT NOT NULL,           -- Unique ID from Nordigen
  transaction_date TIMESTAMPTZ NOT NULL,  -- Date of transaction
  value_date TIMESTAMPTZ,                 -- Value date
  booking_date TIMESTAMPTZ,               -- Booking date

  -- Amount and currency
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  operating_amount TEXT,                  -- Original amount (for foreign currency)

  -- Description
  description TEXT NOT NULL,              -- Transaction description
  merchant_name TEXT,                     -- Merchant if available
  merchant_category TEXT,                 -- Category code (MCC)
  raw_data JSONB,                         -- Full raw transaction data

  -- Categorization
  category TEXT,                          -- Custom category
  subcategory TEXT,
  tags TEXT[],

  -- Reconciliation
  reconciled BOOLEAN DEFAULT FALSE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  expense_report_id UUID,

  -- Enrichment
  notes TEXT,
  attachment_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique transaction per connection
  UNIQUE(connection_id, transaction_id)
);

-- Balance history
CREATE TABLE IF NOT EXISTS nordigen_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES nordigen_connections(id) ON DELETE CASCADE,
  balance_type TEXT NOT NULL,             -- closingBooked, interimBooked, etc.
  balance_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  reference_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(connection_id, balance_type, reference_date)
);

-- Sync logs
CREATE TABLE IF NOT EXISTS nordigen_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES nordigen_connections(id) ON DELETE CASCADE,
  status TEXT NOT NULL,                   -- success, error, partial
  transactions_added INT DEFAULT 0,
  transactions_updated INT DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories for transactions
CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  parent_category_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
  keywords TEXT[],                        -- Auto-match keywords
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- Create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO transaction_categories (user_id, name, icon, color, is_default) VALUES
    (user_id, 'Transport', '🚗', '#ef4444', true),
    (user_id, 'Restauration', '🍽️', '#f59e0b', true),
    (user_id, 'Logement', '🏠', '#10b981', true),
    (user_id, 'Shopping', '🛒', '#8b5cf6', true),
    (user_id, 'Santé', '💊', '#ec4899', true),
    (user_id, 'Loisirs', '🎮', '#06b6d4', true),
    (user_id, 'Salaires', '💰', '#22c55e', true),
    (user_id, 'Honoraires', '💼', '#3b82f6', true),
    (user_id, 'Cotisations', '📋', '#6b7280', true),
    (user_id, 'Autre', '📦', '#94a3b8', true)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nordigen_connections_user ON nordigen_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_nordigen_transactions_user ON nordigen_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_nordigen_transactions_connection ON nordigen_transactions(connection_id);
CREATE INDEX IF NOT EXISTS idx_nordigen_transactions_date ON nordigen_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_nordigen_transactions_category ON nordigen_transactions(category);
CREATE INDEX IF NOT EXISTS idx_nordigen_transactions_reconciled ON nordigen_transactions(reconciled) WHERE reconciled = false;

-- Enable RLS
ALTER TABLE nordigen_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nordigen_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nordigen_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE nordigen_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view own connections"
  ON nordigen_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON nordigen_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON nordigen_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON nordigen_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Same policies for transactions
CREATE POLICY "Users can view own transactions"
  ON nordigen_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON nordigen_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON nordigen_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Same for balances and sync logs
CREATE POLICY "Users can view own balances"
  ON nordigen_balances FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM nordigen_connections WHERE id = nordigen_balances.connection_id)
  );

CREATE POLICY "Users can view own sync logs"
  ON nordigen_sync_logs FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM nordigen_connections WHERE id = nordigen_sync_logs.connection_id)
  );

-- Categories policies
CREATE POLICY "Users can manage own categories"
  ON transaction_categories FOR ALL
  USING (auth.uid() = user_id OR is_default = true);

-- Grant access to service role for background jobs
GRANT ALL ON nordigen_connections TO service_role;
GRANT ALL ON nordigen_transactions TO service_role;
GRANT ALL ON nordigen_balances TO service_role;
GRANT ALL ON nordigen_sync_logs TO service_role;
GRANT ALL ON transaction_categories TO service_role;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_nordigen_connections_updated_at
  BEFORE UPDATE ON nordigen_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nordigen_transactions_updated_at
  BEFORE UPDATE ON nordigen_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE: NORDIGEN INTEGRATION
-- ============================================================================

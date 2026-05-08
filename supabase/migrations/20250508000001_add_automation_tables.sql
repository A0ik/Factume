-- Migration: Add automation and organization tables
-- This migration adds folders, sync rules/events, and notifications

-- Add folder_id to expenses
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create folders table for hierarchical organization
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name, parent_id)
);

-- Add indexes for folders
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id) WHERE parent_id IS NOT NULL;

-- Add foreign key constraint for expenses.folder_id
ALTER TABLE expenses
ADD CONSTRAINT fk_expenses_folder
FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;

-- Create sync_rules table for automation
CREATE TABLE IF NOT EXISTS sync_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'expense_created', 'expense_validated', etc.
  conditions JSONB DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL, -- Array of actions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for sync_rules
CREATE INDEX IF NOT EXISTS idx_sync_rules_user ON sync_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_rules_event ON sync_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_sync_rules_active ON sync_rules(is_active) WHERE is_active = true;

-- Create sync_events table for event tracking
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Add indexes for sync_events
CREATE INDEX IF NOT EXISTS idx_sync_events_user ON sync_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_type ON sync_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sync_events_entity ON sync_events(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_events_status ON sync_events(status);
CREATE INDEX IF NOT EXISTS idx_sync_events_created ON sync_events(created_at DESC);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  entity_id UUID,
  entity_type TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Update vendor_intelligence table to match our API
ALTER TABLE vendor_intelligence
ADD COLUMN IF NOT EXISTS vendor_domain TEXT,
ADD COLUMN IF NOT EXISTS typical_amount_range JSONB DEFAULT '{"min": 0, "max": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS avg_processing_time FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_patterns TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ocr_confidence_avg FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_invoices INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS typical_categories TEXT[] DEFAULT '{}';

-- Add index for vendor_intelligence updates
CREATE INDEX IF NOT EXISTS idx_vendor_intelligence_name ON vendor_intelligence(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_intelligence_total ON vendor_intelligence(total_invoices DESC);

-- Update supplier_templates to match our API
ALTER TABLE supplier_templates
ADD COLUMN IF NOT EXISTS supplier_domain TEXT,
ADD COLUMN IF NOT EXISTS field_mappings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'invoice';

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_rules_updated_at ON sync_rules;
CREATE TRIGGER update_sync_rules_updated_at
  BEFORE UPDATE ON sync_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_intelligence_updated_at ON vendor_intelligence;
CREATE TRIGGER update_vendor_intelligence_updated_at
  BEFORE UPDATE ON vendor_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

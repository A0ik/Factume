-- Migration: Add line items and OCR advanced features support
-- This migration adds support for line items extraction, multi-currency, and advanced OCR features

-- Add line items column to expenses
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS ocr_line_items JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS line_items_count INTEGER DEFAULT 0;

-- Add multi-currency support
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS original_amount FLOAT,
ADD COLUMN IF NOT EXISTS exchange_rate FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS exchange_date DATE;

-- Add supplier recognition support
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS supplier_template_id UUID,
ADD COLUMN IF NOT EXISTS supplier_confidence FLOAT;

-- Add duplicate detection support
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS duplicate_check_performed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_of_expense_id UUID REFERENCES expenses(id),
ADD COLUMN IF NOT EXISTS duplicate_score FLOAT;

-- Add categorization ML support
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS category_suggested TEXT,
ADD COLUMN IF NOT EXISTS category_confidence FLOAT,
ADD COLUMN IF NOT EXISTS category_auto_applied BOOLEAN DEFAULT false;

-- Add annotation support
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS has_annotations BOOLEAN DEFAULT false;

-- Add validation workflow support
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'auto_validated', 'manual_review', 'validated', 'rejected')),
ADD COLUMN IF NOT EXISTS validation_notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_template ON expenses(supplier_template_id) WHERE supplier_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_duplicate_of ON expenses(duplicate_of_expense_id) WHERE duplicate_of_expense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_validation_status ON expenses(validation_status);
CREATE INDEX IF NOT EXISTS idx_expenses_category_suggested ON expenses(category_suggested) WHERE category_suggested IS NOT NULL;

-- Create supplier_templates table for supplier recognition
CREATE TABLE IF NOT EXISTS supplier_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_siret TEXT,
  supplier_vat_number TEXT,
  template_fields JSONB DEFAULT '{}'::jsonb,
  sample_count INTEGER DEFAULT 1,
  confidence_score FLOAT DEFAULT 0.5,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, supplier_siret)
);

-- Add indexes for supplier_templates
CREATE INDEX IF NOT EXISTS idx_supplier_templates_user ON supplier_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_templates_siret ON supplier_templates(supplier_siret) WHERE supplier_siret IS NOT NULL;

-- Create vendor_intelligence table for supplier analytics
CREATE TABLE IF NOT EXISTS vendor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_siret TEXT UNIQUE,
  total_purchases FLOAT DEFAULT 0,
  average_amount FLOAT,
  purchase_count INTEGER DEFAULT 0,
  first_purchase_date DATE,
  last_purchase_date DATE,
  category_distribution JSONB DEFAULT '{}'::jsonb,
  typical_payment_terms TEXT,
  typical_vat_rate FLOAT,
  risk_score FLOAT DEFAULT 0,
  preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for vendor_intelligence
CREATE INDEX IF NOT EXISTS idx_vendor_intelligence_user ON vendor_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_intelligence_siret ON vendor_intelligence(vendor_siret) WHERE vendor_siret IS NOT NULL;

-- Create categorization_rules table for ML-based categorization
CREATE TABLE IF NOT EXISTS categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vendor_name TEXT,
  vendor_pattern TEXT,
  description_pattern TEXT,
  category TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  correction_count INTEGER DEFAULT 0,
  last_applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for categorization_rules
CREATE INDEX IF NOT EXISTS idx_categorization_rules_user ON categorization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_category ON categorization_rules(category);

-- Create categorization_feedback table for ML training
CREATE TABLE IF NOT EXISTS categorization_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  suggested_category TEXT,
  final_category TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for categorization_feedback
CREATE INDEX IF NOT EXISTS idx_categorization_feedback_user ON categorization_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_feedback_correct ON categorization_feedback(is_correct);

-- Create invoice_annotations table
CREATE TABLE IF NOT EXISTS invoice_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('highlight', 'note', 'field_marker', 'correction', 'approval')),
  position JSONB NOT NULL, -- { x, y, width, height, page }
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for invoice_annotations
CREATE INDEX IF NOT EXISTS idx_invoice_annotations_user ON invoice_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_annotations_expense ON invoice_annotations(expense_id);
CREATE INDEX IF NOT EXISTS idx_invoice_annotations_type ON invoice_annotations(annotation_type);

-- Create tags table for advanced organization
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Add indexes for tags
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);

-- Create expense_tags junction table
CREATE TABLE IF NOT EXISTS expense_tags (
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (expense_id, tag_id)
);

-- Add indexes for expense_tags
CREATE INDEX IF NOT EXISTS idx_expense_tags_expense ON expense_tags(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_tags_tag ON expense_tags(tag_id);

-- Create validation_rules table
CREATE TABLE IF NOT EXISTS validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL, -- { min_amount: 100, category: 'transport', ... }
  actions JSONB NOT NULL, -- { auto_validate: true, require approval: false, ... }
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for validation_rules
CREATE INDEX IF NOT EXISTS idx_validation_rules_user ON validation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_validation_rules_active ON validation_rules(is_active) WHERE is_active = true;

-- Create workflow_history table
CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  workflow_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  triggered_by TEXT CHECK (triggered_by IN ('auto', 'user', 'system')),
  rule_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for workflow_history
CREATE INDEX IF NOT EXISTS idx_workflow_history_user ON workflow_history(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_expense ON workflow_history(expense_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_type ON workflow_history(workflow_type);

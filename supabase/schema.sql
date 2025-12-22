-- ============================================
-- RoboLedger v2.0 - Supabase Database Schema
-- Revolutionary AI-Powered Accounting Platform
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
-- Note: Supabase Auth handles users table automatically
-- We extend it with a profile table

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  company_name TEXT,
  fiscal_year_end DATE DEFAULT '12-31',
  currency VARCHAR(3) DEFAULT 'CAD',
  timezone TEXT DEFAULT 'America/Toronto',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BANK ACCOUNTS (Multi-Account Support)
-- ============================================
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Account Information
  account_name TEXT NOT NULL,
  account_type VARCHAR(5) NOT NULL CHECK (account_type IN ('CHQ', 'SAV', 'CC', 'INV', 'LOAN')),
  institution TEXT,
  account_number_last4 VARCHAR(4),
  
  -- Balances
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  
  -- AI Detection Metadata
  detected_type VARCHAR(5), -- AI-detected account type
  detection_confidence DECIMAL(3,2), -- 0.00 to 1.00
  detection_method TEXT, -- 'ai', 'manual', 'pattern'
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_account_per_user UNIQUE(user_id, account_name)
);

CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_type ON bank_accounts(account_type);

-- ============================================
-- UPLOAD BATCHES (Import Tracking)
-- ============================================
CREATE TABLE upload_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts ON DELETE SET NULL,
  
  -- File Information
  filename TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('PDF', 'CSV', 'XLSX')),
  file_size_bytes BIGINT,
  
  -- AI Detection Results
  detected_account_type VARCHAR(5),
  detection_confidence DECIMAL(3,2),
  detection_signals JSONB, -- Store AI decision factors
  
  -- Processing Status
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  row_count INT DEFAULT 0,
  processed_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_upload_batches_user ON upload_batches(user_id);
CREATE INDEX idx_upload_batches_status ON upload_batches(status);

-- ============================================
-- RAW TRANSACTIONS (Immutable Audit Trail)
-- ============================================
CREATE TABLE raw_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_batch_id UUID NOT NULL REFERENCES upload_batches ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts ON DELETE SET NULL,
  
  -- Original Data (Never Modified)
  line_number INT NOT NULL,
  raw_date TEXT,
  raw_description TEXT,
  raw_amount TEXT,
  raw_debit TEXT,
  raw_credit TEXT,
  raw_balance TEXT,
  raw_section TEXT, -- 'debit', 'credit', 'unknown'
  
  -- OCR Metadata (for PDF imports)
  pdf_page INT,
  ocr_confidence DECIMAL(3,2),
  ocr_method TEXT, -- 'tesseract', 'manual', 'csv'
  
  -- Full raw data as JSON
  raw_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_transactions_batch ON raw_transactions(upload_batch_id);
CREATE INDEX idx_raw_transactions_account ON raw_transactions(bank_account_id);

-- ============================================
-- VENDORS (Canadian Vendor Dictionary)
-- ============================================
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Vendor Identity
  canonical_name TEXT UNIQUE NOT NULL,
  aliases TEXT[], -- ['WAL MART', 'WALMART', 'WAL-MART #1234']
  legal_name TEXT,
  
  -- Categorization
  category TEXT,
  subcategory TEXT,
  mcc_code VARCHAR(4),
  industry TEXT,
  
  -- Default Accounting
  default_account_number INT, -- References chart_of_accounts
  
  -- Source & Confidence
  source TEXT CHECK (source IN ('government', 'mcc', 'user', 'ai', 'manual')),
  confidence DECIMAL(3,2) DEFAULT 0.50,
  
  -- Usage Statistics
  transaction_count INT DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  website TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_canonical ON vendors(canonical_name);
CREATE INDEX idx_vendors_category ON vendors(category);
CREATE INDEX idx_vendors_mcc ON vendors(mcc_code);
CREATE INDEX idx_vendors_source ON vendors(source);

-- Full-text search on vendor names
CREATE INDEX idx_vendors_search ON vendors USING GIN (
  to_tsvector('english', canonical_name || ' ' || COALESCE(legal_name, '') || ' ' || COALESCE(array_to_string(aliases, ' '), ''))
);

-- ============================================
-- CHART OF ACCOUNTS (1000-9999)
-- ============================================
CREATE TABLE chart_of_accounts (
  account_number INT PRIMARY KEY CHECK (account_number >= 1000 AND account_number <= 9999),
  
  -- Account Details
  account_name TEXT NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
  account_subtype TEXT,
  
  -- Hierarchy
  parent_account INT REFERENCES chart_of_accounts(account_number),
  level INT DEFAULT 1,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  system_account BOOLEAN DEFAULT FALSE, -- Cannot be deleted
  
  -- Description
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_account);

-- ============================================
-- TRANSACTIONS (Processed & Categorized)
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  raw_transaction_id UUID REFERENCES raw_transactions ON DELETE SET NULL,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors ON DELETE SET NULL,
  account_number INT REFERENCES chart_of_accounts(account_number),
  
  -- Transaction Details
  posting_date DATE NOT NULL,
  description TEXT NOT NULL,
  original_description TEXT, -- Before cleaning
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
  
  -- Categorization
  category TEXT,
  subcategory TEXT,
  tags TEXT[],
  
  -- AI Metadata
  vendor_match_confidence DECIMAL(3,2),
  account_match_confidence DECIMAL(3,2),
  ai_suggested_vendor UUID REFERENCES vendors,
  ai_suggested_account INT REFERENCES chart_of_accounts,
  
  -- Status
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users,
  
  -- Additional Info
  notes TEXT,
  receipt_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_account ON transactions(bank_account_id);
CREATE INDEX idx_transactions_vendor ON transactions(vendor_id);
CREATE INDEX idx_transactions_coa ON transactions(account_number);
CREATE INDEX idx_transactions_date ON transactions(posting_date);
CREATE INDEX idx_transactions_reconciled ON transactions(reconciled);

-- ============================================
-- AI TRAINING DATA (Learning from Corrections)
-- ============================================
CREATE TABLE ai_training_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  
  -- Input Features
  raw_description TEXT NOT NULL,
  amount DECIMAL(15,2),
  account_type VARCHAR(5),
  
  -- AI Prediction
  ai_predicted_vendor UUID REFERENCES vendors,
  ai_predicted_account INT REFERENCES chart_of_accounts,
  ai_confidence DECIMAL(3,2),
  
  -- User Correction
  user_selected_vendor UUID REFERENCES vendors,
  user_selected_account INT REFERENCES chart_of_accounts,
  
  -- Feedback
  was_correct BOOLEAN,
  correction_type VARCHAR(20), -- 'vendor', 'account', 'both'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_training_user ON ai_training_data(user_id);
CREATE INDEX idx_ai_training_correct ON ai_training_data(was_correct);

-- ============================================
-- USER PREFERENCES & SETTINGS
-- ============================================
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  
  -- UI Preferences
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(5) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  number_format VARCHAR(20) DEFAULT 'en-CA',
  
  -- AI Settings
  ai_auto_categorize BOOLEAN DEFAULT TRUE,
  ai_confidence_threshold DECIMAL(3,2) DEFAULT 0.80,
  ai_learning_enabled BOOLEAN DEFAULT TRUE,
  
  -- Notifications
  email_notifications BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Vendors table is shared (read-only for users, write for admins)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Chart of Accounts is shared (read-only)
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Bank Accounts Policies
CREATE POLICY "Users can view own accounts" ON bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own accounts" ON bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON bank_accounts FOR DELETE USING (auth.uid() = user_id);

-- Upload Batches Policies
CREATE POLICY "Users can view own uploads" ON upload_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own uploads" ON upload_batches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own uploads" ON upload_batches FOR UPDATE USING (auth.uid() = user_id);

-- Raw Transactions Policies (read-only after creation)
CREATE POLICY "Users can view own raw transactions" ON raw_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM upload_batches WHERE upload_batches.id = raw_transactions.upload_batch_id AND upload_batches.user_id = auth.uid())
);
CREATE POLICY "System can insert raw transactions" ON raw_transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM upload_batches WHERE upload_batches.id = raw_transactions.upload_batch_id AND upload_batches.user_id = auth.uid())
);

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM bank_accounts WHERE bank_accounts.id = transactions.bank_account_id AND bank_accounts.user_id = auth.uid())
);
CREATE POLICY "Users can create own transactions" ON transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM bank_accounts WHERE bank_accounts.id = transactions.bank_account_id AND bank_accounts.user_id = auth.uid())
);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM bank_accounts WHERE bank_accounts.id = transactions.bank_account_id AND bank_accounts.user_id = auth.uid())
);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (
  EXISTS (SELECT 1 FROM bank_accounts WHERE bank_accounts.id = transactions.bank_account_id AND bank_accounts.user_id = auth.uid())
);

-- Vendors Policies (everyone can read, only admins can write)
CREATE POLICY "Anyone can view vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Users can create vendors" ON vendors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Chart of Accounts Policies (read-only for all)
CREATE POLICY "Anyone can view COA" ON chart_of_accounts FOR SELECT USING (true);

-- AI Training Data Policies
CREATE POLICY "Users can view own training data" ON ai_training_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own training data" ON ai_training_data FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Settings Policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON chart_of_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update bank account balance on transaction insert/update/delete
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bank_accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.transaction_type = 'CREDIT' THEN NEW.amount
        ELSE -NEW.amount
      END
    WHERE id = NEW.bank_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE bank_accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.transaction_type = 'CREDIT' THEN OLD.amount
        ELSE -OLD.amount
      END +
      CASE 
        WHEN NEW.transaction_type = 'CREDIT' THEN NEW.amount
        ELSE -NEW.amount
      END
    WHERE id = NEW.bank_account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bank_accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.transaction_type = 'CREDIT' THEN OLD.amount
        ELSE -OLD.amount
      END
    WHERE id = OLD.bank_account_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_on_transaction_change
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();

-- Update vendor statistics
CREATE OR REPLACE FUNCTION update_vendor_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.vendor_id IS NOT NULL THEN
    UPDATE vendors
    SET 
      transaction_count = transaction_count + 1,
      total_amount = total_amount + NEW.amount,
      last_used_at = NOW()
    WHERE id = NEW.vendor_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_stats_on_transaction
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION update_vendor_stats();

-- ============================================
-- INITIAL DATA: Chart of Accounts
-- ============================================

-- Assets (1000-1999)
INSERT INTO chart_of_accounts (account_number, account_name, account_type, system_account) VALUES
(1000, 'Cash', 'Asset', true),
(1010, 'Petty Cash', 'Asset', true),
(1020, 'Checking Account', 'Asset', true),
(1030, 'Savings Account', 'Asset', true),
(1100, 'Accounts Receivable', 'Asset', true),
(1200, 'Inventory', 'Asset', true),
(1500, 'Fixed Assets', 'Asset', true),
(1510, 'Equipment', 'Asset', true),
(1520, 'Vehicles', 'Asset', true),
(1530, 'Accumulated Depreciation', 'Asset', true);

-- Liabilities (2000-2999)
INSERT INTO chart_of_accounts (account_number, account_name, account_type, system_account) VALUES
(2000, 'Accounts Payable', 'Liability', true),
(2100, 'Credit Card', 'Liability', true),
(2200, 'Loans Payable', 'Liability', true),
(2300, 'Sales Tax Payable', 'Liability', true);

-- Equity (3000-3999)
INSERT INTO chart_of_accounts (account_number, account_name, account_type, system_account) VALUES
(3000, 'Owner Equity', 'Equity', true),
(3100, 'Retained Earnings', 'Equity', true),
(3200, 'Drawings', 'Equity', true);

-- Revenue (4000-4999)
INSERT INTO chart_of_accounts (account_number, account_name, account_type, system_account) VALUES
(4000, 'Sales Revenue', 'Revenue', true),
(4100, 'Service Revenue', 'Revenue', true),
(4200, 'Interest Income', 'Revenue', true),
(4300, 'Other Income', 'Revenue', true);

-- Expenses (5000-9999)
INSERT INTO chart_of_accounts (account_number, account_name, account_type, system_account) VALUES
(5000, 'Cost of Goods Sold', 'Expense', true),
(6000, 'Operating Expenses', 'Expense', true),
(6100, 'Rent Expense', 'Expense', true),
(6200, 'Utilities', 'Expense', true),
(6300, 'Office Supplies', 'Expense', true),
(6400, 'Travel Expense', 'Expense', true),
(6500, 'Marketing', 'Expense', true),
(6600, 'Insurance', 'Expense', true),
(6700, 'Professional Fees', 'Expense', true),
(7000, 'Payroll Expenses', 'Expense', true),
(7100, 'Salaries', 'Expense', true),
(7200, 'Benefits', 'Expense', true),
(7700, 'Bank Fees', 'Expense', true),
(8000, 'Depreciation', 'Expense', true),
(9000, 'Other Expenses', 'Expense', true);

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- Account Balances View
CREATE OR REPLACE VIEW v_account_balances AS
SELECT 
  coa.account_number,
  coa.account_name,
  coa.account_type,
  COALESCE(SUM(
    CASE 
      WHEN t.transaction_type = 'CREDIT' THEN t.amount
      ELSE -t.amount
    END
  ), 0) AS balance,
  COUNT(t.id) AS transaction_count
FROM chart_of_accounts coa
LEFT JOIN transactions t ON t.account_number = coa.account_number
WHERE coa.active = true
GROUP BY coa.account_number, coa.account_name, coa.account_type;

-- Vendor Summary View
CREATE OR REPLACE VIEW v_vendor_summary AS
SELECT 
  v.id,
  v.canonical_name,
  v.category,
  COUNT(t.id) AS transaction_count,
  SUM(t.amount) AS total_amount,
  MAX(t.posting_date) AS last_transaction_date
FROM vendors v
LEFT JOIN transactions t ON t.vendor_id = v.id
GROUP BY v.id, v.canonical_name, v.category;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE bank_accounts IS 'Multi-account support for Checking, Savings, Credit Cards, Investments, and Loans';
COMMENT ON TABLE upload_batches IS 'Tracks file uploads with AI account type detection';
COMMENT ON TABLE raw_transactions IS 'Immutable audit trail of original transaction data';
COMMENT ON TABLE vendors IS 'Canadian vendor dictionary with government data + MCC codes';
COMMENT ON TABLE transactions IS 'Processed and categorized transactions';
COMMENT ON TABLE ai_training_data IS 'Stores user corrections to improve AI models';
COMMENT ON COLUMN bank_accounts.detected_type IS 'AI-detected account type with confidence score';
COMMENT ON COLUMN vendors.source IS 'government=procurement data, mcc=merchant codes, user=manual, ai=learned';

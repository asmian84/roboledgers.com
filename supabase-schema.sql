-- ============================================
-- RoboLedgers Multi-Account Database Schema
-- Supabase PostgreSQL Database
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS & AUTHENTICATION
-- ============================================
-- Supabase Auth handles this, but we extend the user profile

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::JSONB
);

-- ============================================
-- 2. COMPANIES (Multi-Company Support)
-- ============================================
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    business_number TEXT, -- CRA business number
    incorporation_date DATE,
    fiscal_year_end TEXT, -- "12-31" format
    address JSONB, -- {street, city, province, postal, country}
    industry TEXT,
    settings JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company members (for multi-user access)
CREATE TABLE public.company_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
    permissions JSONB DEFAULT '[]'::JSONB,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(company_id, user_id)
);

-- ============================================
-- 3. BANK ACCOUNTS
-- ============================================
CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Business Chequing", "Visa"
    account_type TEXT NOT NULL CHECK (account_type IN ('chequing', 'savings', 'credit', 'investment', 'loan')),
    institution TEXT, -- "RBC", "TD"
    account_number TEXT, -- Last 4 digits
    currency TEXT DEFAULT 'CAD',
    opening_balance DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CHART OF ACCOUNTS
-- ============================================
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    category TEXT, -- "Bank Fees", "Sales", etc.
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE, -- TRUE for default chart
    is_active BOOLEAN DEFAULT TRUE,
    parent_account_id UUID REFERENCES public.accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- Default chart of accounts (company_id IS NULL means system-wide template)
CREATE INDEX idx_accounts_company ON public.accounts(company_id);
CREATE INDEX idx_accounts_code ON public.accounts(code);

-- ============================================
-- 5. TRANSACTIONS
-- ============================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    
    -- Transaction details
    date DATE NOT NULL,
    ref_number TEXT, -- Cheque #, reference
    payee TEXT NOT NULL,
    description TEXT,
    
    -- Amounts
    debit DECIMAL(12,2) DEFAULT 0,
    credit DECIMAL(12,2) DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL, -- Absolute value
    balance DECIMAL(12,2), -- Running balance
    
    -- Categorization
    account_id UUID REFERENCES public.accounts(id),
    vendor_id UUID REFERENCES public.vendors(id),
    category TEXT,
    
    -- Status
    status TEXT DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'reconciled', 'void')),
    reconciled_date DATE,
    
    -- AI metadata
    ai_confidence DECIMAL(3,2), -- 0.00 to 1.00
    ai_source TEXT, -- 'pattern', 'vendor_cache', 'fuzzy', 'google', 'manual'
    
    -- Attachments
    attachments JSONB DEFAULT '[]'::JSONB, -- [{url, name, type}]
    
    -- Notes
    notes TEXT,
    
   created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id)
);

CREATE INDEX idx_transactions_company ON public.transactions(company_id);
CREATE INDEX idx_transactions_bank ON public.transactions(bank_account_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_vendor ON public.transactions(vendor_id);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);

-- ============================================
-- 6. VENDORS (Global Learning)
-- ============================================
CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Vendor identity
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL, -- For fuzzy matching
    category TEXT,
    
    -- Account mapping
    default_account_id UUID REFERENCES public.accounts(id),
    confidence DECIMAL(3,2) DEFAULT 0.50, -- How confident we are
    times_referenced INT DEFAULT 0,
    
    -- Learning metadata
    sources JSONB DEFAULT '[]'::JSONB, -- ['pattern', 'manual', 'google']
    last_manual_override TIMESTAMPTZ,
    account_history JSONB DEFAULT '[]'::JSONB, -- [{date, account_id, source}]
    
    -- Google enrichment
    google_data JSONB, -- {business_type, category, website}
    
    -- Company-specific override (NULL = global vendor)
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Matching patterns
    patterns TEXT[], -- Generated keywords for fuzzy matching
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_name ON public.vendors(normalized_name);
CREATE INDEX idx_vendors_company ON public.vendors(company_id);
CREATE INDEX idx_vendors_account ON public.vendors(default_account_id);

-- ============================================
-- 7. AI PATTERN RULES (Pattern Matching Layer)
-- ============================================
CREATE TABLE public.ai_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Pattern definition
    name TEXT NOT NULL, -- "WCB", "PAY-FILE", "LOAN INTEREST"
    pattern TEXT NOT NULL, -- Regex pattern
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    
    -- Priority (higher = checked first)
    priority INT DEFAULT 50,
    
    -- Scope
    is_system BOOLEAN DEFAULT TRUE, -- System-wide vs company-specific
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Stats
    match_count INT DEFAULT 0,
    accuracy_rate DECIMAL(3,2), -- How often users keep this categorization
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_priority ON public.ai_patterns(priority DESC);

-- ============================================
-- 8. UPLOAD SESSIONS (Track CSV uploads)
-- ============================================
CREATE TABLE public.upload_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    
    filename TEXT NOT NULL,
    transaction_count INT DEFAULT 0,
    start_date DATE,
    end_date DATE,
    
    file_url TEXT, -- Supabase Storage URL
    
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    error_message TEXT,
    
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================
-- 9. AUDIT LOG
-- ============================================
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id),
    
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'categorize'
    entity_type TEXT NOT NULL, -- 'transaction', 'vendor', 'account'
    entity_id UUID,
    
    changes JSONB, -- {before: {}, after: {}}
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_company ON public.audit_log(company_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- User can see their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Company access: Owner + Members
CREATE POLICY "Company members can view company" ON public.companies
    FOR SELECT USING (
        owner_id = auth.uid() OR
        id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    );

-- Transactions: Company members only
CREATE POLICY "Members can view transactions" ON public.transactions
    FOR ALL USING (
        company_id IN (
            SELECT id FROM public.companies 
            WHERE owner_id = auth.uid()
            UNION
            SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
    );

-- Similar policies for other tables...
-- (Simplified for brevity - expand based on permissions needed)

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate transaction balance
CREATE OR REPLACE FUNCTION calculate_balance()
RETURNS TRIGGER AS $$
DECLARE
    prev_balance DECIMAL(12,2);
BEGIN
    -- Get previous transaction balance for this bank account
    SELECT balance INTO prev_balance
    FROM public.transactions
    WHERE bank_account_id = NEW.bank_account_id
      AND date <= NEW.date
      AND id != NEW.id
    ORDER BY date DESC, created_at DESC
    LIMIT 1;
    
    -- If no previous balance, get opening balance
    IF prev_balance IS NULL THEN
        SELECT opening_balance INTO prev_balance
        FROM public.bank_accounts
        WHERE id = NEW.bank_account_id;
    END IF;
    
    -- Calculate new balance
    NEW.balance = prev_balance + NEW.credit - NEW.debit;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_balance BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION calculate_balance();

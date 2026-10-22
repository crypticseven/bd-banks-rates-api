-- ==============================================================================
-- Migration: 0001_bte_evidence_and_products.sql
-- Bangladesh Banking Truth Engine (BTE) Schema
-- PostgreSQL DDL with cryptographic SHA-256 evidence vaulting and audit ledger
-- ==============================================================================

-- 1. Raw Source Evidence Vault
CREATE TABLE IF NOT EXISTS evidence_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_code VARCHAR(10) NOT NULL,
    source_url TEXT NOT NULL,
    source_type VARCHAR(30) NOT NULL, -- 'HTML_DOM', 'PDF_CIRCULAR', 'BB_REGULATORY_BULLETIN'
    sha256_hash VARCHAR(64) UNIQUE NOT NULL,
    storage_path TEXT NOT NULL,
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_status VARCHAR(40) NOT NULL -- 'RETRIEVED', 'ACCESS_BLOCKED', 'RETRIEVED_VIA_STEALTH_DRILL'
);

CREATE INDEX IF NOT EXISTS idx_evidence_bank_code ON evidence_vault(bank_code);
CREATE INDEX IF NOT EXISTS idx_evidence_sha256 ON evidence_vault(sha256_hash);

-- 2. Verified Deposit Products Table
CREATE TABLE IF NOT EXISTS verified_deposit_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES evidence_vault(id),
    bank_code VARCHAR(10) NOT NULL,
    product_slug VARCHAR(100) NOT NULL,
    cbs_prefix_code VARCHAR(20), -- e.g. '3523', '3427', '3510'
    official_product_name VARCHAR(200) NOT NULL,
    product_type VARCHAR(30) NOT NULL, -- 'FDR', 'DPS', 'SPECIAL_SCHEME', 'DOUBLE_BENEFIT'
    target_segment VARCHAR(50) NOT NULL, -- 'GENERAL_RETAIL', 'WOMEN_BANKING', 'SENIOR_CITIZEN', 'NRB', 'STUDENT_MINOR'
    tenure_months INTEGER NOT NULL,
    tenure_display VARCHAR(50) NOT NULL,
    headline_rate NUMERIC(5, 2) NOT NULL,
    compounding_frequency VARCHAR(20) DEFAULT 'MATURITY', -- 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'MATURITY'
    min_amount NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
    max_amount NUMERIC(12, 2),
    shariah_compliant BOOLEAN DEFAULT FALSE,
    confidence_score NUMERIC(4, 3) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'DISCONTINUED', 'QUARANTINED'
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_product_tenure UNIQUE(bank_code, product_slug, tenure_months)
);

CREATE INDEX IF NOT EXISTS idx_vdp_bank_code ON verified_deposit_products(bank_code);
CREATE INDEX IF NOT EXISTS idx_vdp_product_type ON verified_deposit_products(product_type);
CREATE INDEX IF NOT EXISTS idx_vdp_tenure_months ON verified_deposit_products(tenure_months);
CREATE INDEX IF NOT EXISTS idx_vdp_status ON verified_deposit_products(status);

-- 3. Rate Revision History Ledger
CREATE TABLE IF NOT EXISTS rate_change_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES verified_deposit_products(id),
    event_type VARCHAR(30) NOT NULL, -- 'INAUGURATED', 'RATE_REVISED', 'DISCONTINUED'
    old_rate NUMERIC(5, 2),
    new_rate NUMERIC(5, 2) NOT NULL,
    delta_bps INTEGER GENERATED ALWAYS AS ((new_rate - COALESCE(old_rate, new_rate)) * 100) STORED,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rcl_product_id ON rate_change_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_rcl_recorded_at ON rate_change_ledger(recorded_at);

-- 4. 48-Hour Outage Tracker
CREATE TABLE IF NOT EXISTS ingestion_outage_tracker (
    bank_code VARCHAR(10) PRIMARY KEY,
    consecutive_failures INTEGER DEFAULT 0,
    first_failure_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    stealth_escalation_triggered BOOLEAN DEFAULT FALSE
);

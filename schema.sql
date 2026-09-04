-- ==========================================
-- 1. PHYSICAL DOMAIN BOUNDARIES (SCHEMAS)
-- ==========================================
CREATE SCHEMA identity;     
CREATE SCHEMA commerce;     
CREATE SCHEMA events;       
CREATE SCHEMA finance;      
CREATE SCHEMA integration;  
CREATE SCHEMA system;       

-- ==========================================
-- 2. FINANCE DOMAIN (The Ledger)
-- ==========================================
CREATE TYPE finance.account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE finance.entry_direction AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE finance.transaction_status AS ENUM ('DRAFT', 'POSTING', 'POSTED', 'REVERSED');
CREATE TYPE finance.payout_destination_status AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED');
CREATE TYPE finance.payout_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT', 'SETTLED', 'FAILED');

CREATE TYPE finance.ledger_entry_input AS (
    account_id UUID,
    direction finance.entry_direction,
    amount NUMERIC(19,4)
);

CREATE TABLE finance.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(255) UNIQUE NOT NULL,
    account_type finance.account_type NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    owner_type VARCHAR(50), 
    owner_id UUID,          
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE finance.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(100) NOT NULL,
    reference_type VARCHAR(100) NOT NULL,
    reference_id UUID NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    status finance.transaction_status DEFAULT 'POSTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE finance.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES finance.ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
    direction finance.entry_direction NOT NULL,
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. COMMERCE & EVENTS DOMAINS
-- ==========================================
-- (Stub tables to allow foreign keys for the advanced schema to compile)
CREATE TABLE commerce.merchants ( id UUID PRIMARY KEY DEFAULT gen_random_uuid() );
CREATE TABLE commerce.orders ( id UUID PRIMARY KEY DEFAULT gen_random_uuid() );
CREATE TABLE events.events ( id UUID PRIMARY KEY DEFAULT gen_random_uuid() );
CREATE TABLE identity.users ( id UUID PRIMARY KEY DEFAULT gen_random_uuid() );

CREATE TYPE events.ticket_state AS ENUM ('AVAILABLE', 'RESERVED', 'ISSUED', 'SCANNED', 'CANCELLED', 'REFUNDED', 'VOIDED');
CREATE TYPE events.scan_result AS ENUM ('VALID', 'DUPLICATE', 'INVALID_SIGNATURE', 'WRONG_EVENT', 'VOIDED');

CREATE TABLE events.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id),
    order_id UUID REFERENCES commerce.orders(id),
    state events.ticket_state DEFAULT 'AVAILABLE',
    reserved_until TIMESTAMP WITH TIME ZONE,
    cryptographic_nonce VARCHAR(64) UNIQUE,
    issued_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE events.ticket_scan_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES events.tickets(id),
    event_id UUID NOT NULL REFERENCES events.events(id),
    scanner_id UUID NOT NULL REFERENCES identity.users(id),
    device_id VARCHAR(255),
    result events.scan_result NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. INTEGRATION & SYSTEM (Inbox/Outbox)
-- ==========================================
CREATE TYPE integration.processing_status AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'IGNORED');

CREATE TABLE integration.provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    provider_transaction_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    raw_payload JSONB NOT NULL,
    signature_verified BOOLEAN DEFAULT FALSE,
    status integration.processing_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id)
);

CREATE TABLE system.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. IMMUTABILITY TRIGGERS & PROCEDURES
-- ==========================================
CREATE OR REPLACE FUNCTION finance.prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'FATAL: Ledger entries are immutable. Post a reversal transaction instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_ledger_immutability
BEFORE UPDATE OR DELETE ON finance.ledger_entries
FOR EACH ROW EXECUTE FUNCTION finance.prevent_ledger_mutation();

CREATE OR REPLACE FUNCTION events.prevent_scan_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'FATAL: Ticket scan attempts are immutable audit logs.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_scan_immutability
BEFORE UPDATE OR DELETE ON events.ticket_scan_attempts
FOR EACH ROW EXECUTE FUNCTION events.prevent_scan_mutation();